import { ProductCard } from './ProductCard'

export function ProductGrid({ products, loading }) {
  if (loading) {
    return (
      <div className="grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card card--skeleton" />
        ))}
      </div>
    )
  }
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <h3>No products match your filters.</h3>
        <p>Try removing the search term or selecting a different category.</p>
      </div>
    )
  }
  return (
    <div className="grid">
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
