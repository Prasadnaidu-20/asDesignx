import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { resizeJerseys } from '../utils/jerseys'

const CART_KEY = 'cart'
const CartContext = createContext(null)

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Jersey designs carry one { name, number } per unit; the list always matches the quantity.
const withQuantity = (item, quantity) =>
  item.product.is_jersey ? { ...item, quantity, jerseys: resizeJerseys(item.jerseys, quantity) } : { ...item, quantity }

// The backend has no cart table, so the cart lives in the browser and becomes
// a single POST /orders at checkout.
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items))
    } catch {
      /* storage unavailable: cart still works for this tab */
    }
  }, [items])

  const add = (product, quantity = 1, jerseys = []) =>
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        const merged = { ...existing, product, jerseys: [...(existing.jerseys ?? []), ...jerseys] }
        return prev.map((i) =>
          i.product.id === product.id ? withQuantity(merged, Math.min(i.quantity + quantity, product.stock)) : i,
        )
      }
      return [...prev, withQuantity({ product, jerseys }, Math.min(quantity, product.stock))]
    })

  const setQuantity = (productId, quantity) =>
    setItems((prev) => prev.map((i) => (i.product.id === productId ? withQuantity(i, quantity) : i)))

  const setJerseys = (productId, jerseys) =>
    setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, jerseys } : i)))

  // Refresh stored product snapshots (price, stock, jersey flag) from the server.
  const syncProducts = useCallback(
    (products) =>
      setItems((prev) =>
        prev.map((i) => {
          const fresh = products.find((p) => p.id === i.product.id)
          return fresh ? withQuantity({ ...i, product: fresh }, i.quantity) : i
        }),
      ),
    [],
  )

  const remove = (productId) => setItems((prev) => prev.filter((i) => i.product.id !== productId))
  const clear = () => setItems([])

  const count = items.reduce((n, i) => n + i.quantity, 0)
  const total = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, add, setQuantity, setJerseys, syncProducts, remove, clear, count, total }}>
      {children}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext)
