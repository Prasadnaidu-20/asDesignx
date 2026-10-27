import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import DesignCard from '../components/DesignCard'

const PAGE_SIZE = 12

export default function Browse() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState(null)
  const [error, setError] = useState('')
  const [sort, setSort] = useState('newest')
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [page, setPage] = useState(0)
  const q = params.get('q') ?? ''

  useEffect(() => {
    api
      .listProducts(0, 100)
      .then(setProducts)
      .catch((e) => setError(e.message))
  }, [])

  const filtered = useMemo(() => {
    if (!products) return []
    const term = q.trim().toLowerCase()
    let list = products.filter(
      (p) =>
        (!term || p.name.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term)) &&
        (!onlyInStock || p.stock > 0),
    )
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'newest') list = [...list].sort((a, b) => b.id - a.id)
    return list
  }, [products, q, sort, onlyInStock])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  return (
    <div className="page container">
      <h1 className="page-title">
        Browse <span className="gradient-text">designs</span>
      </h1>
      <p className="page-sub">Discover original work from independent designers.</p>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search by name or description…"
          value={q}
          onChange={(e) => {
            setPage(0)
            setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })
          }}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
        <label className="check" style={{ margin: 0 }}>
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => {
              setPage(0)
              setOnlyInStock(e.target.checked)
            }}
          />
          In stock only
        </label>
        {products && <span className="chip primary">{filtered.length} results</span>}
      </div>

      {error && <div className="alert alert-error">Couldn’t load designs: {error}</div>}

      {products === null && !error ? (
        <div className="grid">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      ) : visible.length ? (
        <>
          <div className="grid">
            {visible.map((p) => (
              <DesignCard key={p.id} product={p} />
            ))}
          </div>
          {pages > 1 && (
            <div className="pager">
              <button className="btn btn-ghost btn-sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
                ← Previous
              </button>
              <span className="chip">
                Page {current + 1} of {pages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={current >= pages - 1}
                onClick={() => setPage(current + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        !error && (
          <div className="card empty">
            <h3>No designs found</h3>
            <p>{q ? `Nothing matches “${q}”. Try a different search.` : 'No designs have been published yet.'}</p>
          </div>
        )
      )}
    </div>
  )
}
