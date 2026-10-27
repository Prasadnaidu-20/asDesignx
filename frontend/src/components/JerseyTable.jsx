import { useState } from 'react'
import { NAME_MAX, jerseyErrors, jerseysValid } from '../utils/jerseys'

// Focus the first jersey input whose value is invalid (independent of whether errors are shown yet).
export function focusFirstInvalid() {
  document.querySelector('.jersey-table [data-invalid="true"]')?.focus()
}

export default function JerseyTable({ rows, onChange, showErrors = false, idPrefix = 'j' }) {
  const [touched, setTouched] = useState({})

  const update = (index, field, value) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))

  const touch = (key) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }))

  const done = jerseysValid(rows)

  return (
    <div className="jersey-block">
      <div className="jersey-head">
        <span>Name &amp; number for each jersey</span>
        <span className={`chip${done ? ' primary' : ''}`}>
          {rows.filter((r) => !jerseyErrors(r).name && !jerseyErrors(r).number).length} / {rows.length} ready
        </span>
      </div>
      <div className="jersey-table-wrap">
        <table className="jersey-table">
          <thead>
            <tr>
              <th className="jt-no">#</th>
              <th>Name</th>
              <th className="jt-num">Number</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const errors = jerseyErrors(row)
              const fields = [
                { key: 'name', label: 'Name', props: { maxLength: NAME_MAX, autoComplete: 'off' } },
                { key: 'number', label: 'Number', props: { inputMode: 'numeric', maxLength: 3, autoComplete: 'off' } },
              ]
              return (
                <tr key={i}>
                  <td className="jt-no">{i + 1}</td>
                  {fields.map(({ key, label, props }) => {
                    const id = `${idPrefix}-${key}-${i}`
                    const err = errors[key]
                    const visible = err && (showErrors || touched[id])
                    return (
                      <td key={key} className={key === 'number' ? 'jt-num' : undefined}>
                        <input
                          id={id}
                          className={`input${visible ? ' invalid' : ''}`}
                          value={row[key] ?? ''}
                          placeholder={label}
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
