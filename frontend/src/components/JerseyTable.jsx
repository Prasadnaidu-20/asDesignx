import { useState } from 'react'
import { NAME_MAX, jerseyErrors, jerseysValid } from '../utils/jerseys'

// Read-only "1. Name · #10" list used in the order summary and order history.
export function JerseyList({ rows }) {
  if (!rows?.length) return null
  return (
    <ol className="jersey-list">
      {rows.map((r, i) => {
        const name = String(r.name ?? '').trim()
        const number = String(r.number ?? '').trim()
        return (
          <li key={i}>
            <span className="jl-name">{name || <em>Name missing</em>}</span>
            <span className="jl-num">{number ? `#${number}` : <em>No number</em>}</span>
          </li>
        )
      })}
    </ol>
  )
}

export default function JerseyTable({
  rows,
  onChange,
  showErrors = false,
  idPrefix = 'j',
  title = 'Name & number for each jersey',
}) {
  const [touched, setTouched] = useState({})

  const update = (index, field, value) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))

  const touch = (key) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }))

  const done = jerseysValid(rows)

  return (
    <div className="jersey-block">
      <div className="jersey-head">
        <span>{title}</span>
        <span className={`chip${done ? ' primary' : ''}`}>
          {rows.filter((r) => !jerseyErrors(r).name && !jerseyErrors(r).number).length} / {rows.length} ready
        </span>
      </div>
      <div className="jersey-table-wrap">
        <table className="jersey-table">
          <thead>
            <tr>
              <th className="jt-no">S.No.</th>
              <th>Name</th>
              <th className="jt-num">Jersey Number</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const errors = jerseyErrors(row)
              const fields = [
                { key: 'name', label: 'Name', placeholder: 'Enter name', props: { maxLength: NAME_MAX, autoComplete: 'off' } },
                {
                  key: 'number',
                  label: 'Jersey number',
                  placeholder: 'Enter number',
                  props: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 3, autoComplete: 'off' },
                },
              ]
              return (
                <tr key={i}>
                  <td className="jt-no">{i + 1}</td>
                  {fields.map(({ key, label, placeholder, props }) => {
                    const id = `${idPrefix}-${key}-${i}`
                    const err = errors[key]
                    const visible = err && (showErrors || touched[id])
                    return (
                      <td key={key} className={key === 'number' ? 'jt-num' : undefined}>
                        <input
                          id={id}
                          className={`input${visible ? ' invalid' : ''}`}
                          value={row[key] ?? ''}
                          placeholder={placeholder}
                          aria-label={`Jersey ${i + 1} ${label.toLowerCase()}`}
                          aria-invalid={visible ? 'true' : undefined}
                          aria-describedby={visible ? `${id}-err` : undefined}
                          data-invalid={err ? 'true' : undefined}
                          onChange={(e) => update(i, key, e.target.value)}
                          onBlur={() => touch(id)}
                          {...props}
                        />
                        {visible && (
                          <span id={`${id}-err`} className="field-error">
                            {err}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
