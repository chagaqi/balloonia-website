// GET /api/order-status?session_id=cs_...
// The thank-you page polls this until the webhook has written the order.
// The Checkout Session id is a long random secret only the buyer's browser holds.

import { json, sbSelect } from '../src/lib/shop/server';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const id = new URL(req.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(id)) return json({ error: 'Invalid session' }, 400);
  try {
    const [order] = await sbSelect(
      `orders?stripe_session_id=eq.${encodeURIComponent(id)}&select=number,name,email,delivery_method,shipping,subtotal,shipping_total,tax_total,discount_total,total,promo_code,status,order_items(title,variant_title,quantity,line_total,selections)`,
    );
    if (!order) return json({ status: 'pending' });
    return json({
      status: order.status,
      number: order.number,
      firstName: (order.name || '').split(' ')[0] || null,
      email: order.email,
      deliveryMethod: order.delivery_method,
      totals: {
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping_total),
        tax: Number(order.tax_total),
        discount: Number(order.discount_total),
        total: Number(order.total),
      },
      items: (order.order_items || []).map((i: any) => ({
        title: i.title,
        variantTitle: i.variant_title,
        quantity: i.quantity,
        lineTotal: Number(i.line_total),
        selections: (i.selections || []).map((s: any) => ({ label: s.label, value: s.value })),
      })),
    });
  } catch (err) {
    console.error('order-status failed', err instanceof Error ? err.message : err);
    return json({ error: 'unavailable' }, 500);
  }
}
