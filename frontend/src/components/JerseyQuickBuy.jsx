import { useRef, useState } from 'react'
import { formatPrice } from '../api/client'
import { useCart } from '../context/CartContext'
import { cleanJerseys, emptyJersey, focusFirstInvalid, jerseysValid, loadDraft, resizeJerseys, saveDraft } from '../utils/jerseys'
import JerseyTable from './JerseyTable'
import { useToast } from './Toast'

// Inline "quantity + names & numbers + add to cart" for jersey designs on the browse grid.
// Shares its draft with the design page, so entries carry over in either direction.
export default function JerseyQuickBuy({ product }) {
  const { items, add } = useCart()
  const toast = useToast()
  const formRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(1)
  const [rows, setRows] = useState([emptyJersey()])
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')
  const [formKey, setFormKey] = useState(0) // bumped to reset the table's touched state

  const id = String(product.id)
  const inCart = items.find((i) => i.product.id === product.id)?.quantity ?? 0
  const room = product.stock - inCart

  const update = (q, next) => {
    setQty(q)
    setRows(next)
    saveDraft(id, { qty: q, jerseys: next })
  }

  const toggle = () => {
    if (!open) {
      const draft = loadDraft(id)
      const q = Math.max(1, Math.min(draft?.qty ?? 1, product.stock))
      setQty(q)
      setRows(resizeJerseys(draft?.jerseys, q))
    }
    setError('')
    setOpen(!open)
  }

  // Rows follow the quantity: keep what's typed, trim from the end, pad with blanks.
  const changeQty = (next) => {
    const q = Math.max(1, Math.min(product.stock, next))
    setError('')
    update(q, resizeJerseys(rows, q))
  }

  const addToCart = () => {
    setError('')
    if (qty > room) {
      setError(
        room > 0
          ? `Only ${room} more can be added — ${inCart} already in your cart.`
          : `All ${product.stock} available are already in your cart.`,
      )
      return
    }
    if (!jerseysValid(rows)) {
      setShowErrors(true)
      setError(`Enter a name and jersey number for all ${qty} jersey${qty === 1 ? '' : 's'}.`)
      focusFirstInvalid(formRef.current)
      return
    }
    add(product, qty, cleanJerseys(rows))
    toast(`Added ${qty} × ${product.name} to your cart`)
    saveDraft(id, null)
    setQty(1)
    setRows([emptyJersey()])
    setShowErrors(false)
    setFormKey((k) => k + 1)
    setOpen(false)
  }

  return (
    <div className="jersey-quick" ref={formRef}>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-block"
        aria-expanded={open}
        aria-controls={`jq-${id}`}
        onClick={toggle}
      >
        {open ? 'Hide customisation' : 'Customise jerseys'}
      </button>
      {open && (
        <div id={`jq-${id}`} className="jersey-quick-body">
          <div className="jersey-quick-qty">
            <span>Quantity</span>
            <div className="qty">
              <button type="button" onClick={() => changeQty(qty - 1)} disabled={qty <= 1} aria-label="Decrease">
                −
              </button>
              <span aria-live="polite">{qty}</span>
              <button
                type="button"
                onClick={() => changeQty(qty + 1)}
                disabled={qty >= product.stock}
                aria-label="Increase"
              >
                +
              </button>
            </div>
          </div>
          <JerseyTable
            key={formKey}
            rows={rows}
            onChange={(next) => update(qty, next)}
            showErrors={showErrors}
            idPrefix={`b${id}`}
          />
          {error && <div className="alert alert-error">{error}</div>}
          <button type="button" className="btn btn-primary btn-sm btn-block" onClick={addToCart}>
            Add to cart · {formatPrice(Number(product.price) * qty)}
          </button>
        </div>
      )}
    </div>
  )
}
