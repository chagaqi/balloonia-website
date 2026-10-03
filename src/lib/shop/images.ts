// Responsive product images. The masters in Supabase Storage are 1600 px WebP; the
// build resizes them once (Astro + sharp) and serves the variants from Vercel's CDN.

import { getImage } from 'astro:assets';
import type { ShopImage } from './catalog';

export type Responsive = {
  src: string;
  srcset: string;
  sizes: string;
  width: number;
  height: number;
  alt: string;
};

const memo = new Map<string, Promise<Responsive>>();

export function responsive(img: ShopImage, widths: number[], sizes: string): Promise<Responsive> {
  const key = `${img.src}|${widths.join(',')}|${sizes}`;
  let p = memo.get(key);
  if (!p) {
    p = (async () => {
      const usable = widths.filter((w) => w <= img.width);
      const list = usable.length ? usable : [img.width];
      const max = Math.max(...list);
      const out = await getImage({
        src: img.src,
        width: max,
        height: Math.round((max * img.height) / img.width),
        widths: list,
        sizes,
        format: 'webp',
        quality: 80,
      });
      return {
        src: out.src,
        srcset: out.srcSet.attribute,
        sizes,
        width: img.width,
        height: img.height,
        alt: img.alt,
      };
    })();
    memo.set(key, p);
  }
  return p;
}

// Card sizes match the Sense grid: 2 columns under 990 px, 3 (collections) or 4 (search) above.
export const CARD_WIDTHS = [360, 533, 720];
export const CARD_SIZES = '(min-width: 1200px) 267px, (min-width: 990px) calc((100vw - 130px) / 4), calc((100vw - 35px) / 2)';
export const MEDIA_WIDTHS = [550, 720, 990, 1100, 1500];
export const MEDIA_SIZES = '(min-width: 1200px) 595px, (min-width: 750px) calc(55vw - 60px), calc(100vw - 50px)';
export const THUMB_WIDTHS = [360, 533, 720];
export const THUMB_SIZES = '(min-width: 1200px) 278px, (min-width: 750px) calc(27.5vw - 40px), calc(100vw - 50px)';
