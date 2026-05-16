import { useEffect, useState } from 'react'
import { api } from './api'
import { Header } from './components/Header'
import { FilterBar } from './components/FilterBar'
import { ProductGrid } from './components/ProductGrid'
import { CartDrawer } from './components/CartDrawer'
import { CheckoutModal } from './components/CheckoutModal'

export default function App() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('featured')

  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  // Load categories once
  useEffect(() => {
    api.categories().then(setCategories).catch(() => {})
  }, [])

  // Debounced product fetch on any filter change
  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(() => {
      api.products({ category, search, sort })
        .then((data) => { setProducts(data); setError(null) })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, search ? 250 : 0)
    return () => clearTimeout(handle)
  }, [category, search, sort])

  return (
    <div className="app">
      <Header onCartOpen={() => setCartOpen(true)} />

      <main>
        <Hero />

        <section id="shop" className="shop">
          <FilterBar
            categories={categories}
            category={category} onCategory={setCategory}
            search={search} onSearch={setSearch}
            sort={sort} onSort={setSort}
            resultCount={products.length}
          />
          {error && <div className="error-banner">⚠️ {error}</div>}
          <ProductGrid products={products} loading={loading} />
        </section>
      </main>

      <Footer />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }}
      />
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </div>
  )
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <span className="eyebrow">Hackathon Demo · 2025</span>
        <h1 className="hero-title">
          A phone.<br />
          A plan.<br />
          <span className="hero-accent">A combo.</span>
        </h1>
        <p className="hero-lede">
          Pair any smartphone with a subscription and get <strong>15% off</strong> the plan —
          automatically applied at checkout. No promo codes.
        </p>
        <div className="hero-meta">
          <span>50 products</span>
          <span aria-hidden="true">·</span>
          <span>6 categories</span>
          <span aria-hidden="true">·</span>
          <span>EU shipping</span>
        </div>
      </div>
      <div className="hero-deco" aria-hidden="true">
        <div className="hero-phone" />
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-row">
        <strong>gomibo</strong>
        <span>Built for the 2025 hackathon · 3.5 hours · 4–5 devs</span>
      </div>
    </footer>
  )
}
