import { useState } from 'react'
import { X, CheckCircle2, Loader2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { api } from '../api'

const eur = new Intl.NumberFormat('nl-NL', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
})

export function CheckoutModal({ open, onClose }) {
  const { items, totals, clear } = useCart()
  const [form, setForm] = useState({ name: '', email: '', address: '' })
  const [state, setState] = useState('idle')  // idle | submitting | success | error
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setState('submitting')
    setError(null)
    try {
      const result = await api.createOrder({
        customer_name: form.name,
        customer_email: form.email,
        customer_address: form.address || null,
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
      })
      setOrder(result)
      setState('success')
      clear()
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  const handleClose = () => {
    setState('idle')
    setOrder(null)
    setError(null)
    setForm({ name: '', email: '', address: '' })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <button className="icon-btn modal-close" onClick={handleClose} aria-label="Close">
          <X size={20} />
        </button>

        {state === 'success' && order ? (
          <SuccessScreen order={order} onClose={handleClose} />
        ) : (
          <form onSubmit={handleSubmit} className="checkout">
            <h2 className="checkout-title">Almost there.</h2>
            <p className="checkout-sub">Confirm your details to place the order.</p>

            <label>
              Full name
              <input
                type="text" required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tess de Vries"
              />
            </label>
            <label>
              Email
              <input
                type="email" required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tess@example.com"
              />
            </label>
            <label>
              Shipping address <span className="muted small">(optional)</span>
              <textarea
                rows="2"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Grote Markt 1, Groningen"
              />
            </label>

            <div className="order-summary">
              <h3>Order summary</h3>
              <ul>
                {items.map(({ product, quantity }) => (
                  <li key={product.id}>
                    <span>{quantity} × {product.name}</span>
                    <span>{eur.format(product.price * quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="order-totals">
                <div><span>Subtotal</span><span>{eur.format(totals.subtotal)}</span></div>
                {totals.discount > 0 && (
                  <div className="discount">
                    <span>Combo discount (15% off subscription)</span>
                    <span>−{eur.format(totals.discount)}</span>
                  </div>
                )}
                <div className="grand"><span>Total</span><span>{eur.format(totals.total)}</span></div>
              </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <button
              type="submit"
              className="btn-primary btn-block"
              disabled={state === 'submitting' || items.length === 0}
            >
              {state === 'submitting'
                ? <><Loader2 size={16} className="spin" /> Placing order…</>
                : <>Place order · {eur.format(totals.total)}</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function SuccessScreen({ order, onClose }) {
  return (
    <div className="success">
      <CheckCircle2 size={48} className="success-icon" />
      <h2>Order placed!</h2>
      <p className="muted">Reference <code>{order.id.slice(0, 8)}</code></p>

      <div className="success-card">
        <div className="success-row"><span>Name</span><strong>{order.customer_name}</strong></div>
        <div className="success-row"><span>Email</span><strong>{order.customer_email}</strong></div>
        {order.customer_address && (
          <div className="success-row"><span>Ship to</span><strong>{order.customer_address}</strong></div>
        )}
      </div>

      <ul className="success-items">
        {order.items.map((i, idx) => (
          <li key={idx}>
            <span>{i.quantity} × {i.name}</span>
            <span>{eur.format(i.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="success-totals">
        <div><span>Subtotal</span><span>{eur.format(order.subtotal)}</span></div>
        {order.discount > 0 && (
          <div className="discount">
            <span>Combo discount</span>
            <span>−{eur.format(order.discount)}</span>
          </div>
        )}
        <div className="grand"><span>Total paid</span><span>{eur.format(order.total)}</span></div>
      </div>

      <button className="btn-primary btn-block" onClick={onClose}>
        Keep shopping
      </button>
    </div>
  )
}
