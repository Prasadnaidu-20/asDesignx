import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, formatPrice } from '../api/client'
import DesignArt from '../components/DesignArt'
import JerseyTable, { JerseyList } from '../components/JerseyTable'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { cartDesignForm } from '../designer/store'
import { cleanJerseys, focusFirstInvalid, jerseysValid } from '../utils/jerseys'

// Jersey lines carry one { name, number } per unit; every other product sends no jersey data.
// Lines with a shirt design reference the customization uploaded just before the order.
const orderLine = ({ product, quantity, jerseys }, customizationId) => ({
  product_id: product.id,
  quantity,
  ...(product.is_jersey && { jerseys: cleanJerseys(jerseys) }),
  ...(customizationId && { customization_id: customizationId }),
})

export default function Cart() {
  const { items, setQuantity, setJerseys, setCustomizationId, remove, clear, count, total } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const incomplete = items.filter((i) => i.product.is_jersey && !jerseysValid(i.jerseys))

  const checkout = async () => {
    setError('')
    if (incomplete.length) {
      setShowErrors(true)
      setError(`Enter a name and jersey number for every jersey in ${incomplete.map((i) => `'${i.product.name}'`).join(', ')}.`)
      focusFirstInvalid()
      return
    }
    if (!user) {
      navigate('/login', { state: { from: '/cart' } })
      return
    }
    setBusy(true)
    try {
      // Upload each shirt design once; the id is kept on the line so a retry doesn't re-upload.
      const ids = {}
      for (const item of items) {
        const { product, design } = item
        if (!design) continue
        if (design.customizationId) {
          ids[product.id] = design.customizationId
          continue
        }
        setBusyLabel(`Uploading ${product.name} design…`)
        const form = await cartDesignForm(product.id, design)
        if (!form) {
          throw new Error(
            `The shirt design for '${product.name}' is no longer saved in this browser. Remove it and add it again from its design page.`,
          )
        }
        const custom = await api.uploadCustomization(form)
        ids[product.id] = custom.id
        setCustomizationId(product.id, custom.id)
      }
      setBusyLabel('Placing order…')
      const order = await api.placeOrder(items.map((i) => orderLine(i, ids[i.product.id])))
      clear()
      toast(`Order #${order.id} placed`)
      navigate('/orders', { state: { placed: order.id } })
    } catch (err) {
      // e.g. "Insufficient stock for 'Mug'" from the order service
      setError(err.message)
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  if (!items.length) {
    return (
      <div className="page container">
        <h1 className="page-title">Your cart</h1>
        <div className="card empty mt-2">
          <h3>Your cart is empty</h3>
          <p>Find something you love and add it here.</p>
          <Link to="/designs" className="btn btn-primary">
            Browse designs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page container">
      <h1 className="page-title">Your cart</h1>
      <p className="page-sub">
        {count} item{count === 1 ? '' : 's'}
      </p>

      <div className="cart-layout">
        <div>
          {items.map(({ product, quantity, jerseys, design }) => (
            <div key={product.id} className="card cart-item">
              <Link to={`/designs/${product.id}`} className="cart-thumb">
                {design?.previews?.[design.views[0]] ? (
                  <img
                    className="design-preview"
                    src={design.previews[design.views[0]]}
                    alt={`${product.name} shirt mockup (${design.views[0]})`}
                  />
                ) : (
                  <DesignArt id={product.id} name={product.name} />
                )}
              </Link>
              <div>
                <h3>{product.name}</h3>
                <span className="page-sub">{formatPrice(product.price)} each</span>
              </div>
              <div className="right">
                <div className="qty">
                  <button
                    aria-label="Decrease"
                    onClick={() => (quantity > 1 ? setQuantity(product.id, quantity - 1) : remove(product.id))}
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    aria-label="Increase"
                    disabled={quantity >= product.stock}
                    onClick={() => setQuantity(product.id, quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <strong>{formatPrice(Number(product.price) * quantity)}</strong>
                <button className="link-btn" onClick={() => remove(product.id)}>
                  Remove
                </button>
              </div>
              {product.is_jersey && (
                <div className="cart-jerseys">
                  <JerseyTable
                    rows={jerseys ?? []}
                    onChange={(rows) => setJerseys(product.id, rows)}
                    showErrors={showErrors}
                    idPrefix={`c${product.id}`}
                    title="Jersey names & numbers"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <aside className="card summary">
          <h3>Order summary</h3>
          <div className="summary-lines">
            {items.map(({ product, quantity, jerseys }) => (
              <div key={product.id} className="summary-line">
                <div className="summary-row">
                  <span>
                    {product.name} × {quantity}
                  </span>
                  <span>{formatPrice(Number(product.price) * quantity)}</span>
                </div>
                {product.is_jersey && <JerseyList rows={jerseys} />}
              </div>
            ))}
          </div>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="summary-row">
            <span>Fees</span>
            <span>{formatPrice(0)}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary btn-block" onClick={checkout} disabled={busy}>
            {busy ? busyLabel || 'Placing order…' : user ? 'Place order' : 'Log in to check out'}
          </button>
          <p className="form-foot">Final prices are confirmed by the server at checkout.</p>
        </aside>
      </div>
    </div>
  )
}
