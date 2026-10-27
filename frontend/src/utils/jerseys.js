// Jersey personalisation helpers. Rules mirror the backend JerseyEntry schema:
// name 1-40 chars, number 1-3 digits (both trimmed).
export const NAME_MAX = 40
const NUMBER_RE = /^\d{1,3}$/

export const emptyJersey = () => ({ name: '', number: '' })

// Keep what's typed, trim from the end, pad with blanks to match the quantity.
export function resizeJerseys(rows, quantity) {
  const list = Array.isArray(rows) ? rows : []
  const n = Math.max(0, quantity | 0)
  return Array.from({ length: n }, (_, i) => list[i] ?? emptyJersey())
}

export function jerseyErrors(row) {
  const name = String(row?.name ?? '').trim()
  const number = String(row?.number ?? '').trim()
  return {
    name: !name ? 'Enter a name' : name.length > NAME_MAX ? `Max ${NAME_MAX} characters` : '',
    number: !number ? 'Enter a number' : !NUMBER_RE.test(number) ? '1–3 digits only' : '',
  }
}

export const jerseyValid = (row) => {
  const e = jerseyErrors(row)
  return !e.name && !e.number
}

export const jerseysValid = (rows) => Array.isArray(rows) && rows.length > 0 && rows.every(jerseyValid)

// Focus the first jersey input whose value is invalid (independent of whether errors are shown yet).
// Pass a container to stay within one form when several are on the page.
export function focusFirstInvalid(root = document) {
  root?.querySelector('.jersey-table [data-invalid="true"]')?.focus()
}

// Unsaved jersey entries survive navigation (per tab, per design) and are shared by
// the browse cards and the design page.
const draftKey = (id) => `jersey-draft-${id}`

export function loadDraft(id) {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey(id))) ?? null
  } catch {
    return null
  }
}

export function saveDraft(id, draft) {
  try {
    if (draft) sessionStorage.setItem(draftKey(id), JSON.stringify(draft))
    else sessionStorage.removeItem(draftKey(id))
  } catch {
    /* storage unavailable: the draft just won't survive navigation */
  }
}

export const cleanJerseys = (rows) =>
  (rows ?? []).map((r) => ({ name: String(r.name ?? '').trim(), number: String(r.number ?? '').trim() }))
