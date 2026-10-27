import { Link } from 'react-router-dom'
import { formatPrice } from '../api/client'
import DesignArt from './DesignArt'
import { LogoMark } from './Navbar'

// Shown only while the marketplace has no published designs, so the hero never looks empty.
const PLACEHOLDERS = [
  { id: 11, name: 'Aurora' },
  { id: 22, name: 'Nova' },
  { id: 33, name: 'Pulse' },
]

const designCode = (id) => `#DH${String(id).padStart(8, '0')}`

function ShowcaseCard({ product, index, placeholder }) {
  const body = (
    <>
      <div className="showcase-art">
        <DesignArt id={product.id} name={product.name} />
        <LogoMark className="showcase-badge" />
      </div>
      <div className="showcase-info">
        <h3>{product.name}</h3>
        {!placeholder && (
          <p>
            <span>{designCode(product.id)}</span>
            <span>{formatPrice(product.price)}</span>
          </p>
        )}
      </div>
    </>
  )

  const style = { '--i': index }
  // Only the front card is a tab stop; the cards behind it are mostly hidden.
  return placeholder ? (
    <div className="showcase-card" style={style}>
      {body}
    </div>
  ) : (
    <Link
      to={`/designs/${product.id}`}
      className="showcase-card"
      style={style}
      tabIndex={index === 0 ? 0 : -1}
      aria-label={`${product.name}, ${formatPrice(product.price)}`}
    >
      {body}
    </Link>
  )
}

export default function HeroShowcase({ products }) {
  if (products === null) {
    return (
      <div className="showcase" aria-hidden="true">
        {[2, 1, 0].map((i) => (
          <div key={i} className="showcase-card skeleton" style={{ '--i': i }} />
        ))}
      </div>
    )
  }

  const placeholder = products.length === 0
  const items = placeholder ? PLACEHOLDERS : products.slice(0, 3)

  return (
    <div className="showcase" role="group" aria-label="Featured designs" aria-hidden={placeholder || undefined}>
      {/* Rendered back-to-front so the first design sits on top. */}
      {items
        .map((p, i) => <ShowcaseCard key={p.id} product={p} index={i} placeholder={placeholder} />)
        .reverse()}
    </div>
  )
}
