import { useRef } from 'react'
import { MAX_UPLOAD_MB, MIN_PRINT_DPI } from '../designer/assets'
import { FONTS } from '../designer/fonts'

// Toolbar for ShirtDesigner. Purely presentational: every action is a callback.
export default function DesignerControls({
  colours,
  colour,
  onColour,
  view,
  onView,
  disabled,
  selection,
  onUpdate,
  onAddText,
  onUpload,
  uploading,
  onDelete,
  onUndo,
  onRedo,
  onReset,
  canUndo,
  canRedo,
  lowDpi,
  error,
  printSize,
}) {
  const fileRef = useRef(null)
  const isText = selection?.kind === 'text'

  return (
    <div className="designer-controls">
      <div className="designer-row">
        <div className="swatches" role="radiogroup" aria-label="Shirt colour">
          {colours.map((c) => (
            <button
              key={c.colour}
              type="button"
              role="radio"
              aria-checked={c.colour === colour}
              aria-label={c.name}
              title={c.name}
              className="swatch"
              style={{ background: c.hex }}
              disabled={disabled}
              onClick={() => onColour(c.colour)}
            />
          ))}
        </div>
        <div className="segmented" role="tablist" aria-label="Shirt side">
          {['front', 'back'].map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={v === view}
              disabled={disabled}
              onClick={() => onView(v)}
            >
              {v === 'front' ? 'Front' : 'Back'}
            </button>
          ))}
        </div>
      </div>

      <div className="designer-row">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Adding image…' : 'Upload image'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,.svg"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = '' // allow re-selecting the same file
            if (file) onUpload(file)
          }}
        />
        <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={onAddText}>
          Add text
        </button>
        <span className="designer-tools">
          <button
            type="button"
            className="icon-btn"
            aria-label="Undo"
            title="Undo"
            disabled={disabled || !canUndo}
            onClick={onUndo}
          >
            ↶
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Redo"
            title="Redo"
            disabled={disabled || !canRedo}
            onClick={onRedo}
          >
            ↷
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Delete selected"
            title="Delete selected"
            disabled={disabled || !selection}
            onClick={onDelete}
          >
            🗑
          </button>
          <button type="button" className="link-btn" disabled={disabled} onClick={onReset}>
            Reset side
          </button>
        </span>
      </div>

      {isText && (
        <div className="designer-text">
          <label className="designer-field designer-field-wide">
            <span>Text</span>
            <input
              className="input"
              value={selection.text ?? ''}
              maxLength={40}
              disabled={!!selection.bind}
              onChange={(e) => onUpdate({ text: e.target.value })}
            />
            {selection.bind && <small>Shows jersey #1’s {selection.bind} — edit it in the table below.</small>}
          </label>
          <label className="designer-field">
            <span>Font</span>
            <select
              className="input"
              value={selection.fontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            >
              {FONTS.map((f) => (
                <option key={f.family} value={f.family}>
                  {f.family}
                </option>
              ))}
            </select>
          </label>
          <label className="designer-field designer-field-colour">
            <span>Colour</span>
            <input type="color" value={selection.fill} onChange={(e) => onUpdate({ fill: e.target.value })} />
          </label>
          <label className="designer-field">
            <span>Size</span>
            <input
              type="range"
              min="16"
              max="320"
              value={Math.round(selection.fontSize ?? 72)}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      {lowDpi != null && (
        <div className="chip warn designer-warning" role="status">
          Low resolution: about {lowDpi} DPI at this size ({MIN_PRINT_DPI}+ recommended). It may print blurry — make it
          smaller or use a bigger image.
        </div>
      )}
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      <p className="designer-hint">
        Drag, resize and rotate on the shirt. Print area {printSize.w}″ × {printSize.h}″ · PNG, JPG or SVG up to{' '}
        {MAX_UPLOAD_MB} MB.
      </p>
    </div>
  )
}
