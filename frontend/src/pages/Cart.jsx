import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, formatPrice } from '../api/client'
import DesignArt from '../components/DesignArt'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { items, setQuantity, remove, clear, count, total } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const checkout = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/cart' } })
      return
    }
    setError('')
    setBusy(true)
    try {
      const order = await api.placeOrder(items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })))
      clear()
      toast(`Order #${order.id} placed`)
      navigate('/orders')
    } catch (err) {
      // e.g. "Insufficient stock for 'Mug'" from the order service
      setError(err.message)
    } finally {
      setBusy(false)
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
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="card cart-item">
              <Link to={`/designs/${product.id}`} className="cart-thumb">
                <DesignArt id={product.id} name={product.name} />
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
            </div>
          ))}
        </div>

        <aside className="card summary">
          <h3>Order summary</h3>
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
            {busy ? 'Placing order…' : user ? 'Place order' : 'Log in to check out'}
          </button>
          <p className="form-foot">Final prices are confirmed by the server at checkout.</p>
        </aside>
      </div>
    </div>
  )
}
