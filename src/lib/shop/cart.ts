// Browser cart. Lives in localStorage so it survives reloads and works on a fully
// static site. Every change fires `cart:changed` on window (the header count and
// the cart page listen for it); other tabs hear it through the storage event.

import type { Cart, CartItem } from './types';

const KEY = 'bln_cart_v1';
export const CART_EVENT = 'cart:changed';
export const MAX_QTY = 99;

function empty(): Cart {
  return { items: [], note: '' };
}

export function readCart(): Cart {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const c = JSON.parse(raw) as Cart;
    if (!c || !Array.isArray(c.items)) return empty();
    return { items: c.items, note: typeof c.note === 'string' ? c.note : '' };
  } catch {
    return empty();
  }
}

function write(cart: Cart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    /* private mode or storage full: the cart still works for this page view */
  }
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: cart }));
}

export function cartCount(cart: Cart = readCart()): number {
  return cart.items.reduce((n, i) => n + i.quantity, 0);
}

export function cartSubtotal(cart: Cart = readCart()): number {
  return Math.round(cart.items.reduce((s, i) => s + Math.round(i.unitPrice * 100) * i.quantity, 0)) / 100;
}

export function addItem(item: CartItem): Cart {
  const cart = readCart();
  const existing = cart.items.find((i) => i.key === item.key);
  if (existing) existing.quantity = Math.min(MAX_QTY, existing.quantity + item.quantity);
  else cart.items.push(item);
  write(cart);
  return cart;
}

export function setQuantity(key: string, quantity: number): Cart {
  const cart = readCart();
  if (quantity <= 0) cart.items = cart.items.filter((i) => i.key !== key);
  else {
    const it = cart.items.find((i) => i.key === key);
    if (it) it.quantity = Math.min(MAX_QTY, Math.floor(quantity));
  }
  write(cart);
  return cart;
}

export function removeItem(key: string): Cart {
  return setQuantity(key, 0);
}

export function setNote(note: string): Cart {
  const cart = readCart();
  cart.note = note.slice(0, 1000);
  write(cart);
  return cart;
}

export function clearCart(): void {
  write(empty());
}

export function onCartChange(fn: (cart: Cart) => void): () => void {
  const local = (e: Event) => fn((e as CustomEvent<Cart>).detail ?? readCart());
  const remote = (e: StorageEvent) => {
    if (e.key === KEY) fn(readCart());
  };
  window.addEventListener(CART_EVENT, local);
  window.addEventListener('storage', remote);
  return () => {
    window.removeEventListener(CART_EVENT, local);
    window.removeEventListener('storage', remote);
  };
}
