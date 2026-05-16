import { ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'

export function Header({ onCartOpen }) {
  const { totals } = useCart()
  return (
    <header className="site-header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <span>g</span>
        </div>
        <div className="brand-text">
          <strong>gomibo</strong>
          <span className="brand-tagline">phones · plans · gear</span>
        </div>
      </div>

      <nav className="header-nav">
        <a href="#shop">shop</a>
        <a href="#combo">combos</a>
        <a href="#" onClick={(e) => { e.preventDefault(); onCartOpen() }}>cart</a>
      </nav>

      <button className="cart-button" onClick={onCartOpen} aria-label="Open cart">
        <ShoppingBag size={18} strokeWidth={2.2} />
        <span>Cart</span>
        {totals.count > 0 && (
          <span className="cart-badge" aria-label={`${totals.count} items`}>
            {totals.count}
          </span>
        )}
      </button>
    </header>
  )
}
