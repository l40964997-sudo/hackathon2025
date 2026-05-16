# Gomibo — Mini E-Commerce Shopping Cart

Hackathon 2025 submission. A working e-commerce demo where customers can:

- Browse phones, accessories, subscriptions, prepaid plans, tablets, and wearables
- Filter by category, search by name, and sort by price or name
- Add items to a cart that **persists across page reloads**
- Get an **automatic 15% combo discount** on the subscription when buying a phone + plan together
- Check out with a customer form and see a confirmation summary
- Have orders stored in MySQL

## Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Frontend | React 18 + Vite, vanilla CSS (Bricolage Grotesque + Fraunces) |
| Backend  | Python · FastAPI · PyMySQL · Pydantic v2          |
| Database | MySQL 8                                           |
| Runtime  | Docker Compose                                    |

## Run it

One command, from the project root:

```bash
docker compose -f docker-compose_python.yml up --build
```

Then open:

- **Frontend** — http://localhost:5173
- **API docs** (Swagger UI) — http://localhost:8001/docs
- **API health** — http://localhost:8001/health

The first boot takes ~30 seconds while MySQL initialises and the backend seeds 50 products from `example_products.json`. After that, hot-reload is enabled for both frontend and backend, so any code change refreshes instantly.

## Project layout

```
hackathon2025/
├── docker-compose_python.yml          # one command runs everything
├── boilerplate/
│   ├── python/
│   │   ├── app.py                     # FastAPI app (products + orders)
│   │   ├── requirements.txt
│   │   └── example_products.json      # 50 seed products
│   └── frontend/
│       └── react/
│           ├── Dockerfile
│           ├── package.json
│           ├── vite.config.js         # proxies /api → backend
│           ├── index.html             # Google Fonts links
│           └── src/
│               ├── main.jsx
│               ├── App.jsx
│               ├── api.js             # fetch wrapper
│               ├── styles.css
│               ├── context/
│               │   └── CartContext.jsx  # global cart + localStorage
│               └── components/
│                   ├── Header.jsx
│                   ├── FilterBar.jsx
│                   ├── ProductCard.jsx
│                   ├── ProductGrid.jsx
│                   ├── CartDrawer.jsx
│                   └── CheckoutModal.jsx
```

## API

| Method | Path                  | Purpose                              |
|--------|-----------------------|--------------------------------------|
| GET    | `/health`             | Liveness probe                       |
| GET    | `/categories`         | Categories + product counts          |
| GET    | `/products`           | List products. `?category=`, `?search=`, `?sort=featured\|price_asc\|price_desc\|name` |
| GET    | `/products/{id}`      | Single product                       |
| POST   | `/orders`             | Place an order (validates + applies combo discount + persists) |
| GET    | `/orders/{order_id}`  | Retrieve an order                    |

### Order payload

```json
{
  "customer_name": "Tess de Vries",
  "customer_email": "tess@example.com",
  "customer_address": "Grote Markt 1, Groningen",
  "items": [
    { "product_id": 3, "quantity": 1 },
    { "product_id": 9, "quantity": 1 }
  ]
}
```

## Combo discount logic

If an order contains **at least one item from `smartphone`** and **at least one item from `subscription`**, the subscription line(s) get **15% off**. Computed on both client and server — the client preview matches the authoritative server calculation.

Constants live in:

- `boilerplate/python/app.py` → `COMBO_DISCOUNT_RATE`
- `boilerplate/frontend/react/src/context/CartContext.jsx` → `COMBO_RATE`

## Hackathon deliverables checklist

- [x] **Browse products** — phones, accessories, subscriptions, plus tablets, wearables, prepaid
- [x] **Add to cart** — single items, phone + subscription combos, multiple items
- [x] **View cart** — items, name, price, subtotal, total, with combo savings shown
- [x] **Simulate checkout** — customer form, summary, persisted order
- [x] **Bonus: combo discount** — 15% off subscription when paired with phone
- [x] **Bonus: persistent cart** — survives page reload via localStorage
- [x] **Bonus: responsive design** — mobile-friendly layout
- [x] **Bonus: theming** — distinctive editorial-tech aesthetic with custom typography
- [x] **Bonus: database** — orders saved to MySQL
- [x] **Bonus: customer information form** — name, email, address with validation
- [x] **Bonus: filtering/sorting** — search + category pills + sort selector

## Presentation talking points

1. **Architecture** — clean separation of concerns. Backend is the source of truth for pricing; frontend mirrors the logic only for live preview.
2. **DX** — single `docker compose up` boots everything, hot-reload enabled for both layers, OpenAPI docs auto-generated.
3. **UX** — combo discount is invisible to the user until they qualify; then it announces itself in the cart drawer.
4. **Design** — custom typography (Bricolage Grotesque + Fraunces italic) and editorial layout to stand out from generic e-commerce demos.
5. **Resilience** — backend retries MySQL connections on startup (the classic "MySQL not ready" gotcha is handled).

## Troubleshooting

**Port conflict on 5173, 8001, or 3306?** Edit the `ports:` mappings in `docker-compose_python.yml`.

**`Could not connect to MySQL`?** First boot can take 20–30s. The backend retries automatically; if it gives up, check `docker compose logs db`.

**Want to switch to PHP backend?** The data model is the same. Mirror the endpoints in `boilerplate/php/` and point the frontend's `VITE_API_TARGET` at `http://php-backend:8000`.

**Want to reset the database?**
```bash
docker compose -f docker-compose_python.yml down -v
docker compose -f docker-compose_python.yml up --build
```
