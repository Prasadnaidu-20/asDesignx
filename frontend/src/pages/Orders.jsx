import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, formatPrice } from '../api/client'
import { JerseyList } from '../components/JerseyTable'

export default function Orders() {
  const [orders, setOrders] = useState(null)
  const [names, setNames] = useState({})
  const [error, setError] = useState('')
  const placed = useLocation().state?.placed // set by the cart right after checkout

  useEffect(() => {
    // Order items only carry product_id, so look up names from the catalogue.
    Promise.all([api.listOrders(), api.listProducts(0, 100).catch(() => [])])
      .then(([o, products]) => {
        setOrders(o)
        setNames(Object.fromEntries(products.map((p) => [p.id, p.name])))
      })
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="page container">
      <h1 className="page-title">
        My <span className="gradient-text">orders</span>
      </h1>
      <p className="page-sub">Everything you’ve purchased, newest first.</p>

      <div className="mt-2" style={{ marginTop: 32 }}>
        {error && <div className="alert alert-error">{error}</div>}
        {orders === null && !error && <div className="skeleton" style={{ aspectRatio: '5 / 1' }} />}
        {orders?.length === 0 && (
          <div className="card empty">
            <h3>No orders yet</h3>
            <p>When you buy a design it will show up here.</p>
            <Link to="/designs" className="btn btn-primary">
              Browse designs
            </Link>
          </div>
        )}
        {placed && orders?.some((o) => o.id === placed) && (
          <div className="alert alert-success" role="status">
            Thanks! Order #{placed} is confirmed — your shirt mockups are saved below.
          </div>
        )}
        {orders?.map((o) => (
          <div key={o.id} className={`card order${o.id === placed ? ' just-placed' : ''}`}>
            <div className="order-head">
              <div>
                <h3>Order #{o.id}</h3>
                <small>{new Date(o.created_at).toLocaleString()}</small>
              </div>
              <span className="chip primary">{o.status}</span>
            </div>
            <div className="order-lines">
              {o.items.map((it) => (
                <div key={it.product_id}>
                  <div className="order-line">
                    <span>
                      <Link to={`/designs/${it.product_id}`}>{names[it.product_id] ?? `Design #${it.product_id}`}</Link>{' '}
                      × {it.quantity}
                    </span>
                    <span>{formatPrice(Number(it.unit_price) * it.quantity)}</span>
                  </div>
                  <JerseyList rows={it.jerseys} />
                  {it.customization && (
                    <div className="order-mockups">
                      {Object.entries(it.customization.views).map(([side, files]) => (
                        <a key={side} href={files.mockup_url} target="_blank" rel="noreferrer">
                          <img src={files.mockup_url} alt={`Shirt mockup, ${side}`} loading="lazy" />
                          {side === 'front' ? 'Front' : 'Back'}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="order-total">
              <span>Total</span>
              <span>{formatPrice(o.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
