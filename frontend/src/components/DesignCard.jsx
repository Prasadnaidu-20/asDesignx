import { Link } from 'react-router-dom'
import { formatPrice } from '../api/client'
import DesignArt from './DesignArt'

export function StockChip({ stock }) {
  if (stock <= 0) return <span className="chip bad">Sold out</span>
  if (stock <= 5) return <span className="chip warn">Only {stock} left</span>
  return <span className="chip ok">In stock</span>
}

export default function DesignCard({ product }) {
  return (
    <Link to={`/designs/${product.id}`} className="card design-card">
      <DesignArt id={product.id} name={product.name} />
      <div className="design-body">
        <h3>{product.name}</h3>
        <div className="design-meta">
          <span className="price">{formatPrice(product.price)}</span>
          <StockChip stock={product.stock} />
        </div>
      </div>
    </Link>
  )
}
