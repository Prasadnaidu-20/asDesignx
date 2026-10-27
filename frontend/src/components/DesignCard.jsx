import { Link } from 'react-router-dom'
import { formatPrice } from '../api/client'
import DesignArt from './DesignArt'
import JerseyQuickBuy from './JerseyQuickBuy'

export function StockChip({ stock }) {
  if (stock <= 0) return <span className="chip bad">Sold out</span>
  if (stock <= 5) return <span className="chip warn">Only {stock} left</span>
  return <span className="chip ok">In stock</span>
}

function CardContent({ product }) {
  return (
    <>
      <DesignArt id={product.id} name={product.name} />
      <div className="design-body">
        <h3>{product.name}</h3>
        <div className="design-meta">
          <span className="price">{formatPrice(product.price)}</span>
          <StockChip stock={product.stock} />
        </div>
      </div>
    </>
  )
}

// `customizable` adds the inline jersey name/number form to in-stock jersey designs.
export default function DesignCard({ product, customizable = false }) {
  if (customizable && product.is_jersey && product.stock > 0) {
    return (
      <div className="card design-card design-card-jersey">
        <Link to={`/designs/${product.id}`} className="design-card-link">
          <CardContent product={product} />
        </Link>
        <JerseyQuickBuy product={product} />
      </div>
    )
  }
  return (
    <Link to={`/designs/${product.id}`} className="card design-card">
      <CardContent product={product} />
    </Link>
  )
}
