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

export const cleanJerseys = (rows) =>
  (rows ?? []).map((r) => ({ name: String(r.name ?? '').trim(), number: String(r.number ?? '').trim() }))
