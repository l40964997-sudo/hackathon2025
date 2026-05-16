"""
Gomibo Hackathon — Shopping Cart API
FastAPI backend with MySQL persistence.

Endpoints:
  GET    /health
  GET    /products            ?category=&search=&sort=
  GET    /products/{id}
  GET    /categories
  POST   /orders              -> creates an order, returns summary
  GET    /orders/{order_id}
"""
from __future__ import annotations

import json
import os
import time
import uuid
from contextlib import contextmanager
from decimal import Decimal
from pathlib import Path
from typing import Optional

import pymysql
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DB_CONFIG = dict(
    host=os.getenv("DB_HOST", "db"),
    user=os.getenv("DB_USER", "hackathon"),
    password=os.getenv("DB_PASSWORD", "hackathon"),
    database=os.getenv("DB_NAME", "hackathon"),
    charset="utf8mb4",
    autocommit=False,
    cursorclass=pymysql.cursors.DictCursor,
)

PRODUCTS_JSON = Path(__file__).parent / "example_products.json"

# Combo discount: when a customer buys at least one phone AND at least one
# subscription in the same order, they get 15% off the subscription total.
COMBO_DISCOUNT_RATE = Decimal("0.15")
PHONE_CATEGORIES = {"smartphone"}
SUBSCRIPTION_CATEGORIES = {"subscription"}


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
def _connect_with_retry(max_attempts: int = 30, delay: float = 2.0):
    """MySQL container needs a few seconds on first boot. Retry until ready."""
    last_err = None
    for attempt in range(1, max_attempts + 1):
        try:
            return pymysql.connect(**DB_CONFIG)
        except pymysql.err.OperationalError as e:
            last_err = e
            print(f"[db] not ready (attempt {attempt}/{max_attempts}): {e}")
            time.sleep(delay)
    raise RuntimeError(f"Could not connect to MySQL: {last_err}")


@contextmanager
def db_cursor():
    conn = _connect_with_retry(max_attempts=2, delay=0.5)
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_schema():
    conn = _connect_with_retry()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id           INT PRIMARY KEY,
                    name         VARCHAR(255) NOT NULL,
                    description  TEXT,
                    price        DECIMAL(10,2) NOT NULL,
                    currency     VARCHAR(8) NOT NULL DEFAULT 'EUR',
                    stock        INT NULL,
                    category     VARCHAR(64) NOT NULL,
                    attributes   JSON,
                    INDEX idx_category (category)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id              VARCHAR(36) PRIMARY KEY,
                    customer_name   VARCHAR(255) NOT NULL,
                    customer_email  VARCHAR(255) NOT NULL,
                    customer_address TEXT,
                    subtotal        DECIMAL(10,2) NOT NULL,
                    discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
                    total           DECIMAL(10,2) NOT NULL,
                    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS order_items (
                    id          INT AUTO_INCREMENT PRIMARY KEY,
                    order_id    VARCHAR(36) NOT NULL,
                    product_id  INT NOT NULL,
                    name        VARCHAR(255) NOT NULL,
                    unit_price  DECIMAL(10,2) NOT NULL,
                    quantity    INT NOT NULL,
                    subtotal    DECIMAL(10,2) NOT NULL,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
        conn.commit()
    finally:
        conn.close()


def seed_products_if_empty():
    """Load example_products.json into the DB if the table is empty."""
    if not PRODUCTS_JSON.exists():
        print(f"[seed] {PRODUCTS_JSON} not found, skipping seed")
        return

    conn = _connect_with_retry()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS c FROM products")
            if cur.fetchone()["c"] > 0:
                print("[seed] products table already populated")
                return

            data = json.loads(PRODUCTS_JSON.read_text())
            for p in data:
                cur.execute(
                    """INSERT INTO products
                       (id, name, description, price, currency, stock, category, attributes)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (
                        p["id"],
                        p["name"],
                        p.get("description", ""),
                        p["price"],
                        p.get("currency", "EUR"),
                        p.get("stock"),
                        p["category"],
                        json.dumps(p.get("attributes", {})),
                    ),
                )
            print(f"[seed] inserted {len(data)} products")
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class CartItemIn(BaseModel):
    product_id: int
    quantity: int = Field(gt=0, le=99)


class CheckoutIn(BaseModel):
    customer_name: str = Field(min_length=1, max_length=255)
    customer_email: EmailStr
    customer_address: Optional[str] = None
    items: list[CartItemIn] = Field(min_length=1)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Gomibo Cart API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hackathon convenience; tighten for production
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    init_schema()
    seed_products_if_empty()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/categories")
def categories():
    with db_cursor() as cur:
        cur.execute(
            "SELECT category, COUNT(*) AS count FROM products "
            "GROUP BY category ORDER BY count DESC"
        )
        return cur.fetchall()


@app.get("/products")
def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = Query("featured", pattern="^(featured|price_asc|price_desc|name)$"),
):
    sql = "SELECT * FROM products WHERE 1=1"
    params: list = []
    if category and category != "all":
        sql += " AND category = %s"
        params.append(category)
    if search:
        sql += " AND (name LIKE %s OR description LIKE %s)"
        like = f"%{search}%"
        params += [like, like]

    sql += {
        "featured": " ORDER BY id ASC",
        "price_asc": " ORDER BY price ASC",
        "price_desc": " ORDER BY price DESC",
        "name": " ORDER BY name ASC",
    }[sort]

    with db_cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return [_serialize_product(r) for r in rows]


@app.get("/products/{product_id}")
def get_product(product_id: int):
    with db_cursor() as cur:
        cur.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(404, "Product not found")
    return _serialize_product(row)


@app.post("/orders", status_code=201)
def create_order(payload: CheckoutIn):
    # 1. Load referenced products
    ids = [i.product_id for i in payload.items]
    placeholders = ",".join(["%s"] * len(ids))
    with db_cursor() as cur:
        cur.execute(f"SELECT * FROM products WHERE id IN ({placeholders})", ids)
        products_by_id = {r["id"]: r for r in cur.fetchall()}

    missing = [pid for pid in ids if pid not in products_by_id]
    if missing:
        raise HTTPException(400, f"Unknown products: {missing}")

    # 2. Compute line totals
    line_items = []
    subtotal = Decimal("0.00")
    has_phone = False
    subscription_total = Decimal("0.00")

    for it in payload.items:
        prod = products_by_id[it.product_id]
        unit = Decimal(str(prod["price"]))
        line_sub = unit * it.quantity
        subtotal += line_sub
        if prod["category"] in PHONE_CATEGORIES:
            has_phone = True
        if prod["category"] in SUBSCRIPTION_CATEGORIES:
            subscription_total += line_sub
        line_items.append({
            "product_id": prod["id"],
            "name": prod["name"],
            "unit_price": unit,
            "quantity": it.quantity,
            "subtotal": line_sub,
        })

    # 3. Combo discount
    discount = Decimal("0.00")
    if has_phone and subscription_total > 0:
        discount = (subscription_total * COMBO_DISCOUNT_RATE).quantize(Decimal("0.01"))

    total = (subtotal - discount).quantize(Decimal("0.01"))

    # 4. Persist
    order_id = str(uuid.uuid4())
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO orders
               (id, customer_name, customer_email, customer_address,
                subtotal, discount, total)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (
                order_id,
                payload.customer_name,
                payload.customer_email,
                payload.customer_address,
                subtotal,
                discount,
                total,
            ),
        )
        for li in line_items:
            cur.execute(
                """INSERT INTO order_items
                   (order_id, product_id, name, unit_price, quantity, subtotal)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                (order_id, li["product_id"], li["name"],
                 li["unit_price"], li["quantity"], li["subtotal"]),
            )

    return _fetch_order(order_id)


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    order = _fetch_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    return order


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _serialize_product(row: dict) -> dict:
    attrs = row.get("attributes")
    if isinstance(attrs, (bytes, bytearray)):
        attrs = attrs.decode()
    if isinstance(attrs, str):
        try:
            attrs = json.loads(attrs)
        except json.JSONDecodeError:
            attrs = {}
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "price": float(row["price"]),
        "currency": row["currency"],
        "stock": row["stock"],
        "category": row["category"],
        "attributes": attrs or {},
    }


def _fetch_order(order_id: str) -> Optional[dict]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        order = cur.fetchone()
        if not order:
            return None
        cur.execute(
            "SELECT product_id, name, unit_price, quantity, subtotal "
            "FROM order_items WHERE order_id = %s", (order_id,)
        )
        items = cur.fetchall()

    return {
        "id": order["id"],
        "customer_name": order["customer_name"],
        "customer_email": order["customer_email"],
        "customer_address": order["customer_address"],
        "subtotal": float(order["subtotal"]),
        "discount": float(order["discount"]),
        "total": float(order["total"]),
        "created_at": order["created_at"].isoformat() if order["created_at"] else None,
        "items": [
            {
                "product_id": i["product_id"],
                "name": i["name"],
                "unit_price": float(i["unit_price"]),
                "quantity": i["quantity"],
                "subtotal": float(i["subtotal"]),
            }
            for i in items
        ],
    }
