import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { useToast } from '../components/Toast'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const EMPTY = { name: '', number: '' }

// Overlays the personalised name + number on a design, like the back of a jersey.
function DesignPreview({ src, name, number, placeholder }) {
  return (
    <div className="ud-preview">
      {src ? <img src={src} alt={name ? `Design for ${name}` : 'Design preview'} /> : placeholder}
      {(name || number) && (
        <div className="ud-overlay">
          {name && <span className="ud-name">{name}</span>}
          {number && <span className="ud-number">{number}</span>}
        </div>
      )}
    </div>
  )
}

function useDesignImage(id) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let objectUrl
    let cancelled = false
    api
      .getMyDesignImage(id)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return url
}

function SavedDesign({ design, onDelete }) {
  const src = useDesignImage(design.id)
  return (
    <div className="card ud-card">
      <DesignPreview
        src={src}
        name={design.name}
        number={design.number}
        placeholder={<div className="skeleton ud-skeleton" />}
      />
      <div className="design-body">
        <h3>
          {design.name} <span className="page-sub">#{design.number}</span>
        </h3>
        <div className="design-meta">
          <span className="page-sub">{new Date(design.created_at).toLocaleDateString('en-IN')}</span>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(design)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyDesigns() {
  const [designs, setDesigns] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef()
  const toast = useToast()

  const load = () =>
    api
      .listMyDesigns()
      .then(setDesigns)
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  // Free the local preview URL when it is replaced or the page unmounts.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const setChosenFile = (f) => {
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  const pickFile = (f) => {
    if (!f) return
    if (!ACCEPTED.includes(f.type)) return setError('Please choose a PNG, JPEG or WebP image.')
    if (f.size > MAX_BYTES) return setError('Image must be 5 MB or smaller.')
    setError('')
    setChosenFile(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files?.[0])
  }

  const reset = () => {
    setForm(EMPTY)
    setChosenFile(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return setError('Please add your design image.')
    setError('')
    setBusy(true)
    try {
      await api.uploadMyDesign({ image: file, name: form.name.trim(), number: form.number })
      toast('Design saved')
      reset()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (d) => {
    if (!window.confirm(`Delete “${d.name} #${d.number}”? This can’t be undone.`)) return
    try {
      await api.deleteMyDesign(d.id)
      toast('Design deleted')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page container">
      <h1 className="page-title">
        My <span className="gradient-text">Designs</span>
      </h1>
      <p className="page-sub">Upload your own design and personalise it with a name and number.</p>

      <div className="console">
        <form className="card console-form" onSubmit={submit}>
          <h3>Add your design</h3>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label htmlFor="ud-image">Design</label>
            <div
              className={`ud-drop${dragging ? ' dragging' : ''}${preview ? ' has-file' : ''}`}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
            >
              <DesignPreview
                src={preview}
                name={form.name.trim()}
                number={form.number}
                placeholder={
                  <div className="ud-drop-hint">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    </svg>
                    <strong>Click or drag an image here</strong>
                    <span>PNG, JPEG or WebP · up to 5 MB</span>
                  </div>
                }
              />
            </div>
            <input
              id="ud-image"
              ref={fileInput}
              type="file"
              accept={ACCEPTED.join(',')}
              hidden
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {file && (
              <div className="ud-file">
                <span>{file.name}</span>
                <button type="button" className="link-btn" onClick={reset}>
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ud-name">Name</label>
              <input
                id="ud-name"
                className="input"
                required
                maxLength={40}
                placeholder="e.g. RAHUL"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="ud-number">Number</label>
              <input
                id="ud-number"
                className="input"
                required
                inputMode="numeric"
                pattern="\d{1,3}"
                maxLength={3}
                placeholder="e.g. 7"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value.replace(/\D/g, '') })}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Uploading…' : 'Save design'}
          </button>
        </form>

        <div>
          {designs === null ? (
            <div className="grid">
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : designs.length ? (
            <div className="grid">
              {designs.map((d) => (
                <SavedDesign key={d.id} design={d} onDelete={remove} />
              ))}
            </div>
          ) : (
            <div className="card empty">
              <h3>No designs yet</h3>
              <p>Upload your first design using the form.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
