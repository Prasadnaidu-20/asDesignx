import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatPrice } from '../api/client'
import DesignArt from '../components/DesignArt'
import { StockChip } from '../components/DesignCard'
import { useToast } from '../components/Toast'

const EMPTY = { name: '', description: '', price: '', stock: 0, is_jersey: false }

export default function Console() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  // The public list only returns active designs; retired ones disappear from here too.
  const load = () =>
    api
      .listProducts(0, 100)
      .then(setProducts)
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const reset = () => {
    setForm(EMPTY)
    setEditingId(null)
    setError('')
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setForm({ name: p.name, description: p.description ?? '', price: p.price, stock: p.stock, is_jersey: p.is_jersey })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: String(form.price),
      stock: Number(form.stock),
      is_jersey: form.is_jersey,
    }
    try {
      if (editingId) {
        await api.updateProduct(editingId, payload)
        toast('Design updated')
      } else {
        await api.createProduct(payload)
        toast('Design published')
      }
      reset()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const retire = async (p) => {
    if (!window.confirm(`Retire “${p.name}”? It will be hidden from the marketplace.`)) return
    try {
      await api.deleteProduct(p.id)
      toast('Design retired')
      if (editingId === p.id) reset()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page container">
      <h1 className="page-title">
        Designer <span className="gradient-text">Console</span>
      </h1>
      <p className="page-sub">Publish new designs and manage your catalogue.</p>

      <div className="console">
        <form className="card console-form" onSubmit={submit}>
          <h3>{editingId ? `Edit design #${editingId}` : 'Publish a new design'}</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              className="input"
              required
              maxLength={255}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="desc">Description</label>
            <textarea
              id="desc"
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="price">Price (₹)</label>
              <input
                id="price"
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="stock">Stock</label>
              <input
                id="stock"
                className="input"
                type="number"
                min="0"
                step="1"
                required
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={form.is_jersey}
              onChange={(e) => setForm({ ...form, is_jersey: e.target.checked })}
            />
            Jersey design — buyers enter a name and number for each jersey
          </label>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Publish design'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost btn-block mt-2" onClick={reset}>
              Cancel
            </button>
          )}
        </form>

        <div className="card table-wrap">
          {products.length ? (
            <table>
              <thead>
                <tr>
                  <th>Design</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/designs/${p.id}`} className="name-cell">
                        <div className="mini-art">
                          <DesignArt id={p.id} name={p.name} />
                        </div>
                        {p.name}
                        {p.is_jersey && <span className="chip primary">Jersey</span>}
                      </Link>
                    </td>
                    <td>{formatPrice(p.price)}</td>
                    <td>
                      <StockChip stock={p.stock} /> <span className="page-sub">{p.stock}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => retire(p)}>
                          Retire
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              <h3>No designs yet</h3>
              <p>Publish your first design using the form.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
