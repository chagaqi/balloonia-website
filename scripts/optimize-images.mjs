// One-off: convert the oversized public/images assets to compressed WebP.
// Resizes to a sane max width for web display (source PNGs were unoptimized
// raw exports, several 7-9MB at only 2000-2800px wide with full alpha).
import sharp from 'sharp';
import { readdirSync, statSync, unlinkSync } from 'fs';
import { join, extname, basename, dirname } from 'path';

const ROOT = 'public/images';
const MAX_WIDTH = 2000;
const QUALITY = 82;
const SIZE_THRESHOLD = 300 * 1024;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const targets = walk(ROOT)
  .filter((p) => ['.png', '.jpg', '.jpeg'].includes(extname(p).toLowerCase()))
  .filter((p) => statSync(p).size > SIZE_THRESHOLD);

const mapping = [];
let beforeTotal = 0;
let afterTotal = 0;

for (const src of targets) {
  const before = statSync(src).size;
  const dest = join(dirname(src), basename(src, extname(src)) + '.webp');
  const img = sharp(src);
  const meta = await img.metadata();
  const pipeline = meta.width > MAX_WIDTH ? img.resize({ width: MAX_WIDTH }) : img;
  await pipeline.webp({ quality: QUALITY }).toFile(dest);
  const after = statSync(dest).size;
  beforeTotal += before;
  afterTotal += after;
  mapping.push({
    old: '/' + src.replace(/\\/g, '/'),
    new: '/' + dest.replace(/\\/g, '/'),
  });
  console.log(
    `${src} -> ${dest}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (${(100 - (100 * after) / before).toFixed(0)}% smaller)`
  );
  unlinkSync(src);
}

console.log(`\nTOTAL: ${(beforeTotal / 1024 / 1024).toFixed(1)}MB -> ${(afterTotal / 1024 / 1024).toFixed(1)}MB`);
console.log(`\nMAPPING_JSON_START`);
console.log(JSON.stringify(mapping, null, 1));
console.log(`MAPPING_JSON_END`);
