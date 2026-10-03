// /search-index.json: the whole catalog in a compact form for the header's predictive
// search and the /search page (MiniSearch runs in the browser). Written at build.
import type { APIRoute } from 'astro';
import { getCatalog, plainText } from '../lib/shop/catalog';
import { responsive, CARD_WIDTHS, CARD_SIZES } from '../lib/shop/images';
import type { SearchDoc } from '../lib/shop/types';

export const GET: APIRoute = async () => {
  const catalog = await getCatalog();
  const docs: SearchDoc[] = [];
  for (const p of catalog.products) {
    const img = p.images[0];
    const card = img ? await responsive(img, CARD_WIDTHS, CARD_SIZES) : null;
    const thumb = img ? await responsive(img, [360], '180px') : null;
    docs.push({
      id: p.id,
      h: p.handle,
      t: p.title,
      ty: p.type,
      tg: p.tags.join(' '),
      d: plainText(p.bodyHtml).slice(0, 600),
      v: p.variants.map((v) => (v.title === 'Default Title' ? '' : v.title)).join(' ').trim(),
      p: p.minPrice,
      pv: p.priceVaries,
      a: p.available,
      c: p.createdAt,
      pos: p.position,
      img: card?.src ?? null,
      srcset: card?.srcset ?? null,
      th: thumb?.src ?? null,
      w: img?.width ?? 1,
      ht: img?.height ?? 1,
    });
  }
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json' } });
};
