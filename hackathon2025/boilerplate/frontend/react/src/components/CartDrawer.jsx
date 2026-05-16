import { X, Minus, Plus, Trash2, Tag } from 'lucide-react'
import { useCart } from '../context/CartContext'

const eur = new Intl.NumberFormat('nl-NL', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
})

export function CartDrawer({ open, onClose, onCheckout }) {
  const { items, totals, setQuantity, remove, clear } = useCart()

  return (
    <>
      <div
        className={'drawer-backdrop' + (open ? ' drawer-backdrop--open' : '')}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={'drawer' + (open ? ' drawer--open' : '')}
        role="dialog"
        aria-label="Shopping cart"
      >
        <header className="drawer-head">
          <h2>Your cart <span className="muted">({totals.count})</span></h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close cart">
            <X size={20} />
          </button>
        </header>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="drawer-empty">
              <p className="drawer-empty-emoji">🛒</p>
              <h3>Your cart is empty</h3>
              <p>Pick a phone, pair it with a plan, and unlock a combo discount.</p>
            </div>
          ) : (
            <ul className="cart-list">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="cart-row">
                  <div className="cart-row-info">
                    <strong>{product.name}</strong>
                    <span className="muted small">
                      {eur.format(product.price)}
                      {product.category === 'subscription' && '/mo'}
                    </span>
                  </div>
                  <div className="cart-row-actions">
                    <div className="qty">
                      <button onClick={() => setQuantity(product.id, quantity - 1)}
                              aria-label="Decrease quantity">
                        <Minus size={14} />
                      </button>
                      <span>{quantity}</span>
                      <button onClick={() => setQuantity(product.id, quantity + 1)}
                              aria-label="Increase quantity">
                        <Plus size={14} />
                      </button>
                    </div>
                    <button className="icon-btn icon-btn--ghost"
                            onClick={() => remove(product.id)}
                            aria-label={`Remove ${product.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <span className="cart-row-subtotal">
                    {eur.format(product.price * quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {totals.comboEligible && (
            <div className="combo-callout">
              <Tag size={16} />
              <div>
                <strong>Combo unlocked!</strong>
                <span>15% off your subscription — savings of {eur.format(totals.discount)}</span>
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <footer className="drawer-foot">
            <div className="totals">
              <div className="totals-row">
                <span>Subtotal</span>
                <span>{eur.format(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="totals-row totals-row--discount">
                  <span>Combo discount</span>
                  <span>−{eur.format(totals.discount)}</span>
                </div>
              )}
              <div className="totals-row totals-row--total">
                <span>Total</span>
                <span>{eur.format(totals.total)}</span>
              </div>
            </div>
            <button className="btn-secondary" onClick={clear}>Clear</button>
            <button className="btn-primary" onClick={onCheckout}>
              Checkout →
            </button>
          </footer>
        )}
      </aside>
    </>
  )
}
