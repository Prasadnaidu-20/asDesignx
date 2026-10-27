import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, formatPrice } from '../api/client'
import DesignArt from '../components/DesignArt'
import { StockChip } from '../components/DesignCard'
import JerseyTable from '../components/JerseyTable'
import { useToast } from '../components/Toast'
import { useCart } from '../context/CartContext'
import {
  cleanJerseys,
  emptyJersey,
  focusFirstInvalid,
  jerseysValid,
  loadDraft,
  resizeJerseys,
  saveDraft,
} from '../utils/jerseys'

export default function DesignDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)
  const [jerseys, setJerseys] = useState([emptyJersey()])
  const [showErrors, setShowErrors] = useState(false)
  const [buyError, setBuyError] = useState('')
  const [formKey, setFormKey] = useState(0) // bumped to reset the table's touched state
  const { items, add } = useCart()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    setProduct(null)
    setError('')
    setShowErrors(false)
    setBuyError('')
    api
      .getProduct(id)
      .then((p) => {
        const draft = p.is_jersey ? loadDraft(id) : null
        const startQty = Math.max(1, Math.min(draft?.qty ?? 1, p.stock))
        setQty(startQty)
        setJerseys(resizeJerseys(draft?.jerseys, startQty))
        setProduct(p)
      })
      .catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    if (product?.is_jersey && String(product.id) === id) saveDraft(id, { qty, jerseys })
  }, [id, product, qty, jerseys])

  if (error) {
    return (
      <div className="page container">
        <div className="card empty">
          <h3>Design not available</h3>
          <p>{error}</p>
          <Link to="/designs" className="btn btn-ghost">
            Back to designs
          </Link>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="page container">
        <div className="detail">
          <div className="skeleton" style={{ aspectRatio: '1' }} />
          <div className="skeleton" />
        </div>
      </div>
    )
  }

  const soldOut = product.stock <= 0

  const isJersey = product.is_jersey
  const inCart = items.find((i) => i.product.id === product.id)?.quantity ?? 0
  const room = product.stock - inCart

  // Rows follow the quantity: keep what's typed, trim from the end, pad with blanks.
  const changeQty = (next) => {
    const q = Math.max(1, Math.min(product.stock, next))
    setQty(q)
    setBuyError('')
    if (isJersey) setJerseys((rows) => resizeJerseys(rows, q))
  }

  const addToCart = (goToCart) => {
    setBuyError('')
    if (qty > room) {
      setBuyError(
        room > 0
          ? `Only ${room} more can be added — ${inCart} already in your cart.`
          : `All ${product.stock} available are already in your cart.`,
      )
      return
    }
    if (isJersey && !jerseysValid(jerseys)) {
      setShowErrors(true)
      setBuyError(`Enter a name and jersey number for all ${qty} jersey${qty === 1 ? '' : 's'}.`)
      focusFirstInvalid()
      return
    }

    add(product, qty, isJersey ? cleanJerseys(jerseys) : [])
    if (isJersey) {
      saveDraft(id, null)
      setQty(1)
      setJerseys([emptyJersey()])
      setShowErrors(false)
      setFormKey((k) => k + 1)
    }
    if (goToCart) navigate('/cart')
    else toast(`Added ${qty} × ${product.name} to your cart`)
  }

  return (
    <div className="page container">
      <Link to="/designs" className="back-link">
        ← All designs
      </Link>
      <div className="detail">
        <div className="card detail-art">
          <DesignArt id={product.id} name={product.name} />
        </div>

        <div className="card detail-info">
          <StockChip stock={product.stock} />
          <h1>{product.name}</h1>
          <p className="desc">{product.description || 'No description provided for this design.'}</p>

          <div className="detail-price">{formatPrice(product.price)}</div>
          <p className="page-sub" style={{ marginTop: 0 }}>
            Per licence · {product.stock} available
          </p>

          {!soldOut && (
            <>
              <div className="buy-row">
                <div className="qty">
                  <button onClick={() => changeQty(qty - 1)} aria-label="Decrease">
                    −
                  </button>
                  <span aria-live="polite">{qty}</span>
                  <button onClick={() => changeQty(qty + 1)} aria-label="Increase">
                    +
                  </button>
                </div>
              </div>
              {isJersey && (
                <JerseyTable
                  key={`${product.id}-${formKey}`}
                  rows={jerseys} onChange={setJerseys} showErrors={showErrors} idPrefix={`d${product.id}`} />
              )}
              {buyError && <div className="alert alert-error">{buyError}</div>}
              <div className="buy-row">
                <button className="btn btn-primary" onClick={() => addToCart(true)}>
                  Buy now
                </button>
                <button className="btn btn-ghost" onClick={() => addToCart(false)}>
                  Add to cart
                </button>
              </div>
            </>
          )}

          <div className="perks">
            <span>✓ Price locked at checkout</span>
            <span>✓ Saved to your order history</span>
            <span>✓ Secure account-based checkout</span>
          </div>
        </div>
      </div>
    </div>
  )
}
