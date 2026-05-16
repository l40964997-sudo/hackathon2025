import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

const CartContext = createContext(null)

const STORAGE_KEY = 'gomibo.cart.v1'
const COMBO_RATE = 0.15  // mirror of backend constant
const PHONE_CATEGORIES = new Set(['smartphone'])
const SUBSCRIPTION_CATEGORIES = new Set(['subscription'])

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const existing = state.find(i => i.product.id === action.product.id)
      if (existing) {
        return state.map(i =>
          i.product.id === action.product.id
            ? { ...i, quantity: Math.min(99, i.quantity + (action.quantity || 1)) }
            : i
        )
      }
      return [...state, { product: action.product, quantity: action.quantity || 1 }]
    }
    case 'remove':
      return state.filter(i => i.product.id !== action.productId)
    case 'set_quantity':
      if (action.quantity <= 0)
        return state.filter(i => i.product.id !== action.productId)
      return state.map(i =>
        i.product.id === action.productId
          ? { ...i, quantity: Math.min(99, action.quantity) }
          : i
      )
    case 'clear':
      return []
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, null, loadInitial)

  // Persist on every change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
  }, [items])

  const totals = useMemo(() => {
    let subtotal = 0
    let hasPhone = false
    let subscriptionTotal = 0
    for (const { product, quantity } of items) {
      const line = product.price * quantity
      subtotal += line
      if (PHONE_CATEGORIES.has(product.category)) hasPhone = true
      if (SUBSCRIPTION_CATEGORIES.has(product.category)) subscriptionTotal += line
    }
    const comboEligible = hasPhone && subscriptionTotal > 0
    const discount = comboEligible ? +(subscriptionTotal * COMBO_RATE).toFixed(2) : 0
    const total = +(subtotal - discount).toFixed(2)
    const count = items.reduce((n, i) => n + i.quantity, 0)
    return {
      subtotal: +subtotal.toFixed(2),
      discount,
      total,
      count,
      comboEligible,
      subscriptionTotal: +subscriptionTotal.toFixed(2),
    }
  }, [items])

  const value = {
    items,
    totals,
    add: (product, quantity) => dispatch({ type: 'add', product, quantity }),
    remove: (productId) => dispatch({ type: 'remove', productId }),
    setQuantity: (productId, quantity) =>
      dispatch({ type: 'set_quantity', productId, quantity }),
    clear: () => dispatch({ type: 'clear' }),
  }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
