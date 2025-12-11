from __future__ import annotations
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, Response, Request, HTTPException
from pydantic import BaseModel, PositiveInt

# Reuse your catalog/pricing 
from models import CATALOG, PLANS  # same dicts you used before

# ---------- Models ----------
class CartItemIn(BaseModel):
    sku: str                     # "p-iphone-15", "plan-basic", or "p-iphone-15|plan-basic"
    kind: str                    # "phone" | "plan" | "bundle"
    qty: PositiveInt = 1

class CartItemOut(BaseModel):
    sku: str
    kind: str
    qty: int
    label: str
    upfront_subtotal: float
    monthly_subtotal: float

class CartTotals(BaseModel):
    upfront_total: float
    monthly_total: float
    item_count: int

class CartView(BaseModel):
    items: List[CartItemOut]
    totals: CartTotals

# ---------- Simple in-memory store ----------
# carts[session_id] = dict[(sku, kind)] = qty
carts: Dict[str, Dict[tuple, int]] = {}

SESSION_COOKIE = "phono_session"

def get_session(request: Request, response: Response) -> str:
    sid = request.cookies.get(SESSION_COOKIE)
    if not sid:
        sid = uuid4().hex
        # 7 days cookie
        response.set_cookie(SESSION_COOKIE, sid, max_age=7*24*3600, httponly=False, samesite="Lax")
    return sid

# ---------- Pricing helpers ----------
def price_for_item(sku: str, kind: str) -> tuple[str, float, float]:
    if kind == "phone":
        prod = CATALOG.get(sku)
        if not prod: raise KeyError(sku)
        return prod["name"], float(prod["price"]), 0.0
    if kind == "plan":
        plan = PLANS.get(sku)
        if not plan: raise KeyError(sku)
        return plan["name"], 0.0, float(plan["monthly"])
    if kind == "bundle":
        try:
            phone_sku, plan_sku = sku.split("|", 1)
        except ValueError:
            raise KeyError("invalid bundle sku")
        phone_name, up, _ = price_for_item(phone_sku, "phone")
        plan_name, _, mo = price_for_item(plan_sku, "plan")
        return f"{phone_name} + {plan_name}", up, mo
    raise KeyError("unknown kind")

def materialize_cart(cart_map: Dict[tuple, int]) -> CartView:
    items_out: List[CartItemOut] = []
    upfront_total = 0.0
    monthly_total = 0.0
    for (sku, kind), qty in cart_map.items():
        label, up, mo = price_for_item(sku, kind)
        up_sub = up * qty
        mo_sub = mo * qty
        upfront_total += up_sub
        monthly_total += mo_sub
        items_out.append(CartItemOut(
            sku=sku, kind=kind, qty=qty, label=label,
            upfront_subtotal=round(up_sub, 2), monthly_subtotal=round(mo_sub, 2)
        ))
    return CartView(
        items=items_out,
        totals=CartTotals(
            upfront_total=round(upfront_total, 2),
            monthly_total=round(monthly_total, 2),
            item_count=sum(cart_map.values()),
        ),
    )

# ---------- Router ----------
router = APIRouter(prefix="/cart", tags=["cart"])

@router.get("", response_model=CartView)
def view_cart(response: Response, session_id: str = Depends(get_session)):
    cart = carts.setdefault(session_id, {})
    return materialize_cart(cart)

@router.post("/items", response_model=CartView)
def add_to_cart(payload: CartItemIn, response: Response, session_id: str = Depends(get_session)):
    # validate sku/kind by trying to price it
    try:
        price_for_item(payload.sku, payload.kind)
    except KeyError:
        raise HTTPException(400, detail="Unknown sku/kind or invalid bundle format")

    cart = carts.setdefault(session_id, {})
    key = (payload.sku, payload.kind)
    cart[key] = cart.get(key, 0) + payload.qty
    return materialize_cart(cart)

@router.patch("/items/{sku}/{kind}", response_model=CartView)
def update_qty(
    sku: str, kind: str, qty: PositiveInt, response: Response, session_id: str = Depends(get_session)
):
    cart = carts.setdefault(session_id, {})
    key = (sku, kind)
    if key not in cart:
        raise HTTPException(404, "Item not in cart")
    cart[key] = int(qty)
    return materialize_cart(cart)

@router.delete("/items/{sku}/{kind}", response_model=CartView)
def remove_item(sku: str, kind: str, response: Response, session_id: str = Depends(get_session)):
    cart = carts.setdefault(session_id, {})
    key = (sku, kind)
    cart.pop(key, None)
    return materialize_cart(cart)

@router.delete("", response_model=CartView)
def clear_cart(response: Response, session_id: str = Depends(get_session)):
    carts[session_id] = {}
    return materialize_cart(carts[session_id])
