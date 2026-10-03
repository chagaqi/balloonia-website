/** @jsxImportSource preact */
// /cart page (client only: the cart lives in localStorage). Layout follows the
// store's Sense cart: lines with image, title, unit price, selections, quantity,
// remove, line total; then the order note, estimated total and Check out.

import { useEffect, useState } from 'preact/hooks';
import type { Cart } from '../../lib/shop/types';
import { cartSubtotal, onCartChange, readCart, setNote, setQuantity, removeItem, MAX_QTY } from '../../lib/shop/cart';
import { money } from '../../lib/shop/price';
import { icons } from './icons';

function Svg({ html }: { html: string }) {
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart>(() => readCart());
  const [note, setNoteText] = useState(cart.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onCartChange((c) => setCart(c)), []);

  // Coming back from Stripe with the browser's back button restores this page from
  // the bfcache with busy=true; reset it.
  useEffect(() => {
    const onShow = () => setBusy(false);
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (note !== cart.note) setNote(note);
    }, 400);
    return () => window.clearTimeout(t);
  }, [note]);

  async function checkout() {
    if (busy) return;
    setBusy(true);
    setError('');
    if (note !== cart.note) setNote(note);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          items: cart.items.map((i) => ({
            key: i.key,
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
            selections: i.selections,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout is unavailable right now. Please try again or call 226-242-2244.');
      const w = window as unknown as { gtag?: (...a: unknown[]) => void };
      w.gtag?.('event', 'begin_checkout', { currency: 'CAD', value: cartSubtotal(cart) });
      location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setBusy(false);
    }
  }

  if (!cart.items.length) {
    return (
      <div class="s-width s-cart-empty">
        <h1 class="s-h1">Your cart is empty</h1>
        <a class="s-button" href="/collections/all">
          Continue shopping
        </a>
      </div>
    );
  }

  const subtotal = cartSubtotal(cart);

  return (
    <div class="s-width s-cart">
      <div class="s-cart__title">
        <h1 class="s-h1">Your cart</h1>
        <a href="/collections/all">Continue shopping</a>
      </div>

      <div class="s-cart-head" aria-hidden="true">
        <span>Product</span>
        <span class="s-cart-head__qty">Quantity</span>
        <span>Total</span>
      </div>
      <ul class="s-cart-items">
        {cart.items.map((item) => (
          <li class="s-cart-item" key={item.key}>
            <a class="s-cart-item__media" href={`/products/${item.handle}`} tabIndex={-1} aria-hidden="true">
              {item.image && <img src={item.image} alt="" width={150} height={150} loading="lazy" />}
            </a>
            <div class="s-cart-item__details">
              <a class="s-cart-item__name" href={`/products/${item.handle}`}>
                {item.title}
              </a>
              <p class="s-cart-item__opt">{money(item.unitPrice)}</p>
              {(item.options?.length || item.selections.length > 0) && (
                <dl class="s-cart-item__props">
                  {(item.options ?? []).map((o) => (
                    <div key={`o-${o.name}`}>
                      <dt>{o.name}: </dt>
                      <dd>{o.value}</dd>
                    </div>
                  ))}
                  {item.selections.map((s) => (
                    <div key={s.id}>
                      <dt>{s.label}: </dt>
                      <dd>
                        {s.value}
                        {s.price > 0 ? ` (+ ${money(s.price)})` : ''}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <div class="s-cart-item__qty">
              <div class="s-qty">
                <button
                  type="button"
                  aria-label={`Decrease quantity for ${item.title}`}
                  onClick={() => setQuantity(item.key, item.quantity - 1)}
                >
                  <Svg html={icons.minus} />
                </button>
                <input
                  type="number"
                  min={0}
                  max={MAX_QTY}
                  value={item.quantity}
                  aria-label={`Quantity for ${item.title}`}
                  onChange={(e) => {
                    const n = Math.floor(Number((e.target as HTMLInputElement).value));
                    setQuantity(item.key, Number.isFinite(n) ? n : 1);
                  }}
                />
                <button
                  type="button"
                  aria-label={`Increase quantity for ${item.title}`}
                  disabled={item.quantity >= MAX_QTY}
                  onClick={() => setQuantity(item.key, item.quantity + 1)}
                >
                  <Svg html={icons.plus} />
                </button>
              </div>
              <button type="button" class="s-cart-item__remove" aria-label={`Remove ${item.title}`} onClick={() => removeItem(item.key)}>
                <Svg html={icons.trash} />
              </button>
            </div>
            <div class="s-cart-item__total">{money(Math.round(item.unitPrice * 100 * item.quantity) / 100)}</div>
          </li>
        ))}
      </ul>

      <div class="s-cart__footer">
        <div class="s-cart__note">
          <label for="CartNote">Order special instructions</label>
          <textarea id="CartNote" maxLength={1000} value={note} onInput={(e) => setNoteText((e.target as HTMLTextAreaElement).value)} />
        </div>
        <div class="s-cart__blocks">
          <div class="s-totals">
            <h2>Estimated total</h2>
            <p class="s-totals__value">{money(subtotal)} CAD</p>
          </div>
          <p class="s-tax-note">
            Taxes, discounts and <a href="/policies/shipping-policy">shipping</a> calculated at checkout.
          </p>
          <div class="s-cart__checkout">
            <button type="button" class="s-button" onClick={checkout} disabled={busy} aria-busy={busy}>
              {busy ? 'Loading…' : 'Check out'}
            </button>
            {error && (
              <p class="s-cart__error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
