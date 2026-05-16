import { Plus, Check } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '../context/CartContext'

const CATEGORY_GLYPH = {
  smartphone: '📱',
  accessory: '🎧',
  subscription: '📶',
  prepaid: '💳',
  tablet: '🪟',
  wearable: '⌚',
}

const eur = new Intl.NumberFormat('nl-NL', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
})

export function ProductCard({ product }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    add(product, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1100)
  }

  const isSub = product.category === 'subscription'
  const attrs = product.attributes || {}
  const subline = [
    attrs.brand,
    attrs.storage_gb && `${attrs.storage_gb}GB`,
    attrs.network,
    attrs.color,
    attrs.provider,
    attrs.data_gb && (attrs.data_gb === 'unlimited' ? 'Unlimited data' : `${attrs.data_gb}GB data`),
    attrs.wattage && `${attrs.wattage}W`,
  ].filter(Boolean).join(' · ')

  const lowStock = product.stock != null && product.stock <= 15

  return (
    <article className="card">
      <div className="card-thumb" data-category={product.category}>
        <span className="card-glyph">{CATEGORY_GLYPH[product.category] || '📦'}</span>
        <span className="card-category">{product.category}</span>
      </div>

      <div className="card-body">
        <h3 className="card-title">{product.name}</h3>
        {subline && <p className="card-sub">{subline}</p>}
        <p className="card-desc">{product.description}</p>
      </div>

      <div className="card-foot">
        <div className="card-price">
          <span className="price-amount">{eur.format(product.price)}</span>
          {isSub && <span className="price-period">/mo</span>}
        </div>
        <button
          className={'add-btn' + (added ? ' add-btn--done' : '')}
          onClick={handleAdd}
          aria-label={`Add ${product.name} to cart`}
        >
          {added ? <Check size={16} /> : <Plus size={16} />}
          <span>{added ? 'Added' : 'Add'}</span>
        </button>
      </div>

      {lowStock && (
        <span className="badge badge--warn">Only {product.stock} left</span>
      )}
    </article>
  )
}
