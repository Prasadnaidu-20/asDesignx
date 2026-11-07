import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { MIN_PRINT_DPI, UploadError, prepareUpload, svgToDataUrl } from '../designer/assets'
import { DESIGN_VERSION, exportDesign } from '../designer/exporter'
import { DEFAULT_FONT } from '../designer/fonts'
import { History } from '../designer/history'
import { DesignEditor } from '../designer/renderer'
import { DEFAULT_COLOUR, VIEWS, colours, findTemplate } from '../designer/templates'
import { draftKey, idbGet, idbSet } from '../designer/store'
import DesignArt from './DesignArt'
import DesignerControls from './DesignerControls'

const TEXT_FILL = '#8b5cf6' // readable on every shirt colour

// Starting design in print space (1000 units = print-area width): the product's artwork on
// the front, and — for jerseys — name and number on the back, bound to jersey row 1.
function seedViews(artSrc, isJersey) {
  const text = (bind, top, fontSize) => ({
    type: 'IText',
    text: '',
    bind,
    left: 500,
    top,
    originX: 'center',
    originY: 'center',
    fontSize,
    fontFamily: DEFAULT_FONT.family,
    fontWeight: DEFAULT_FONT.weight,
    textAlign: 'center',
    fill: TEXT_FILL,
  })
  return {
    front: artSrc
      ? [
          {
            type: 'Image',
            src: artSrc,
            width: 800,
            height: 600,
            left: 500,
            top: 480,
            originX: 'center',
            originY: 'center',
            vector: true,
          },
        ]
      : [],
    back: isJersey ? [text('name', 200, 170), text('number', 640, 560)] : [],
  }
}

const freshState = (artSrc, isJersey) => ({
  version: DESIGN_VERSION,
  colour: DEFAULT_COLOUR,
  views: seedViews(artSrc, isJersey),
})

function artToDataUrl(host) {
  const svg = host?.querySelector('svg')
  if (!svg) return null
  const markup = svg.outerHTML.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"')
  return svgToDataUrl(markup)
}

const isTyping = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)

/**
 * Live shirt mockup editor. `jersey` (row 1 of the jersey table) feeds the bound name/number.
 * The parent calls ref.exportDesign() at Add to cart.
 */
export default function ShirtDesigner({ ref, product, jersey }) {
  const hostRef = useRef(null)
  const artRef = useRef(null)
  const editorRef = useRef(null)
  const stateRef = useRef(null)
  const viewRef = useRef('front')
  const historyRef = useRef({ front: new History(), back: new History() })
  const saveTimer = useRef(0)

  const [colour, setColour] = useState(DEFAULT_COLOUR)
  const [view, setView] = useState('front')
  const [ready, setReady] = useState(false)
  const [selection, setSelection] = useState(null)
  const [minDpi, setMinDpi] = useState(null)
  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false })
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const binding = useMemo(
    () =>
      product.is_jersey
        ? { name: (jersey?.name?.trim() || 'Your name').toUpperCase(), number: jersey?.number?.trim() || '10' }
        : null,
    [product.is_jersey, jersey?.name, jersey?.number],
  )
  const bindingRef = useRef(binding)

  const syncUndo = useCallback(() => {
    const h = historyRef.current[viewRef.current]
    setUndoState({ canUndo: h.canUndo, canRedo: h.canRedo })
  }, [])

  const saveDraft = useCallback(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (stateRef.current) idbSet(draftKey(product.id), stateRef.current).catch(() => {})
    }, 500)
  }, [product.id])

  const show = useCallback(
    async (nextColour, nextView) => {
      const editor = editorRef.current
      const shown = await editor.load(findTemplate(nextColour, nextView), stateRef.current.views[nextView])
      if (shown) {
        setMinDpi(editor.minDpi())
        syncUndo()
      }
    },
    [syncUndo],
  )

  // Create the canvas imperatively so React StrictMode's mount/unmount/mount gets a fresh element.
  useEffect(() => {
    let cancelled = false
    const el = document.createElement('canvas')
    hostRef.current.appendChild(el)
    const editor = new DesignEditor(el, {
      onSelection: setSelection,
      onTransform: (desc) => {
        setSelection(desc)
        setMinDpi(editor.minDpi())
      },
      onChange: (objects) => {
        const v = viewRef.current
        stateRef.current.views[v] = objects
        historyRef.current[v].push(JSON.stringify(objects))
        setMinDpi(editor.minDpi())
        syncUndo()
        saveDraft()
      },
    })
    editor.binding = bindingRef.current
    editorRef.current = editor
    const observer = new ResizeObserver(([entry]) => editor.resize(Math.floor(entry.contentRect.width)))
    observer.observe(hostRef.current)

    ;(async () => {
      const draft = await idbGet(draftKey(product.id))
      if (cancelled) return
      const state =
        draft?.version === DESIGN_VERSION ? draft : freshState(artToDataUrl(artRef.current), product.is_jersey)
      stateRef.current = state
      VIEWS.forEach((v) => historyRef.current[v].reset(JSON.stringify(state.views[v] ?? [])))
      viewRef.current = 'front'
      setView('front')
      setColour(state.colour)
      await show(state.colour, 'front')
      if (!cancelled) setReady(true)
    })().catch((e) => !cancelled && setError(e.message))

    return () => {
      cancelled = true
      clearTimeout(saveTimer.current)
      if (stateRef.current) idbSet(draftKey(product.id), stateRef.current).catch(() => {})
      observer.disconnect()
      editorRef.current = null
      Promise.resolve(editor.dispose()).finally(() => el.remove())
    }
  }, [product.id, product.is_jersey, show, syncUndo, saveDraft])

  // Jersey row 1 → bound name/number text (a live preview, not an undo step).
  useEffect(() => {
    bindingRef.current = binding
    const editor = editorRef.current
    if (binding && editor?.template && editor.setBinding(binding)) {
      stateRef.current.views[viewRef.current] = editor.serialize()
    }
  }, [binding])

  // Delete / Backspace removes the selected element when not typing.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping() && editorRef.current?.deleteActive()) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useImperativeHandle(ref, () => ({
    async exportDesign() {
      if (!stateRef.current) return null
      if (editorRef.current?.template) stateRef.current.views[viewRef.current] = editorRef.current.serialize()
      return exportDesign(stateRef.current, { productId: product.id, binding: bindingRef.current })
    },
  }))

  // Runs an action from an event handler and shows any failure as a friendly message.
  const guard = async (fn) => {
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof UploadError ? e.message : e.message || 'Something went wrong. Please try again.')
    }
  }

  const switchView = (next) =>
    guard(async () => {
      if (next === viewRef.current || !ready) return
      stateRef.current.views[viewRef.current] = editorRef.current.serialize()
      viewRef.current = next
      setView(next)
      await show(stateRef.current.colour, next)
    })

  const switchColour = (next) =>
    guard(async () => {
      if (next === stateRef.current.colour || !ready) return
      stateRef.current.views[viewRef.current] = editorRef.current.serialize()
      stateRef.current.colour = next
      setColour(next)
      saveDraft()
      await show(next, viewRef.current) // positions are print-relative, so the design carries over
    })

  const restore = async (snapshot) => {
    if (snapshot == null) return
    stateRef.current.views[viewRef.current] = JSON.parse(snapshot)
    saveDraft()
    await show(stateRef.current.colour, viewRef.current)
  }

  const upload = (file) =>
    guard(async () => {
      setUploading(true)
      try {
        await editorRef.current.addImage(await prepareUpload(file))
      } finally {
        setUploading(false)
      }
    })

  const reset = () =>
    guard(async () => {
      const v = viewRef.current
      const seed = freshState(artToDataUrl(artRef.current), product.is_jersey).views[v]
      stateRef.current.views[v] = seed
      historyRef.current[v].push(JSON.stringify(seed)) // reset can be undone
      saveDraft()
      await show(stateRef.current.colour, v)
    })

  const template = findTemplate(colour, view)

  return (
    <div className="designer">
      <div className="designer-stage" style={{ '--shirt-bg': template.colourHex }}>
        <div ref={hostRef} className="designer-canvas" />
        {!ready && !error && <div className="designer-loading skeleton" aria-label="Loading shirt preview" />}
      </div>
      <div ref={artRef} hidden>
        <DesignArt id={product.id} name={product.name} />
      </div>
      <DesignerControls
        colours={colours()}
        colour={colour}
        onColour={switchColour}
        view={view}
        onView={switchView}
        disabled={!ready}
        selection={selection}
        onUpdate={(props) => guard(() => editorRef.current.updateActive(props))}
        onAddText={() => guard(() => editorRef.current.addText({ text: 'TEXT', fill: TEXT_FILL }))}
        onUpload={upload}
        uploading={uploading}
        onDelete={() => editorRef.current?.deleteActive()}
        onUndo={() => guard(() => restore(historyRef.current[viewRef.current].undo()))}
        onRedo={() => guard(() => restore(historyRef.current[viewRef.current].redo()))}
        onReset={reset}
        canUndo={undoState.canUndo}
        canRedo={undoState.canRedo}
        lowDpi={minDpi != null && minDpi < MIN_PRINT_DPI ? minDpi : null}
        error={error}
        printSize={template.printSizeInches}
      />
    </div>
  )
}
