#!/usr/bin/env node
// Generate placeholder SVGs for products, services, ICP heroes, and portfolio.
// These are intentionally simple — clearly placeholders, never confused for real photos.

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicImages = join(root, 'public', 'images');

const palettes = {
  arches: ['#efc6b9', '#d28b75', '#fbf9f5'],
  walls: ['#e7e1d6', '#d28b75', '#1a1a1a'],
  centerpieces: ['#fbf9f5', '#efc6b9', '#b06a55'],
  columns: ['#1a1a1a', '#d28b75', '#fbf9f5'],
  ceiling: ['#3a3a3a', '#efc6b9', '#fbf9f5'],
  'photo-booth': ['#d28b75', '#1a1a1a', '#fbf9f5'],
  showers: ['#efc6b9', '#fbf9f5', '#e7e1d6'],
  weddings: ['#fbf9f5', '#efc6b9', '#1a1a1a'],
  corporate: ['#1a1a1a', '#d28b75', '#3a3a3a'],
  custom: ['#b06a55', '#efc6b9', '#fbf9f5'],
  birthdays: ['#efc6b9', '#d28b75', '#1a1a1a'],
  graduations: ['#1a1a1a', '#d28b75', '#fbf9f5'],
};

function balloonCluster(width, height, palette, label) {
  const [bg, c1, c2] = palette;
  const cx = width / 2;
  const cy = height / 2;
  const balloons = [];
  const rng = mulberry32(label.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
  for (let i = 0; i < 14; i++) {
    const r = 28 + rng() * 18;
    const x = rng() * width;
    const y = rng() * height * 0.85;
    const fill = i % 2 === 0 ? c1 : c2;
    const opacity = 0.7 + rng() * 0.3;
    balloons.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${opacity.toFixed(2)}"/>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${bg}"/>
  <g>${balloons.join('')}</g>
  <text x="${cx}" y="${height - 18}" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#3a3a3a" opacity="0.6">${label}</text>
</svg>`;
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

// Product placeholders (1:1)
const products = JSON.parse(readFileSync(join(root, 'src', 'data', 'catalog', 'products.json'), 'utf8'));
ensureDir(join(publicImages, 'products'));
for (const p of products) {
  const palette = palettes[p.category] ?? palettes.custom;
  const filename = p.image.src.replace('/images/', '');
  const out = join(publicImages, filename.replace('products/', 'products/'));
  ensureDir(dirname(out));
  writeFileSync(out, balloonCluster(800, 800, palette, p.title));
}

// Service placeholders (4:3)
const services = [
  { slug: 'balloon-arches', title: 'Balloon Arches', palette: 'arches' },
  { slug: 'balloon-walls', title: 'Balloon Walls', palette: 'walls' },
  { slug: 'centerpieces', title: 'Centerpieces', palette: 'centerpieces' },
  { slug: 'number-letter-columns', title: 'Number Columns', palette: 'columns' },
  { slug: 'ceiling-installations', title: 'Ceiling Installs', palette: 'ceiling' },
  { slug: 'photo-booth', title: 'Photo Booth', palette: 'photo-booth' },
  { slug: 'shower-packages', title: 'Shower Packages', palette: 'showers' },
  { slug: 'wedding-decor', title: 'Wedding Decor', palette: 'weddings' },
  { slug: 'corporate-packages', title: 'Corporate Events', palette: 'corporate' },
  { slug: 'custom-themed', title: 'Custom Themed', palette: 'custom' },
];
ensureDir(join(publicImages, 'services'));
for (const s of services) {
  writeFileSync(
    join(publicImages, 'services', `${s.slug}.svg`),
    balloonCluster(800, 600, palettes[s.palette], s.title)
  );
}

// ICP heroes (16:9)
const icps = [
  { slug: 'weddings-hero', title: 'Wedding Decor', palette: 'weddings' },
  { slug: 'corporate-hero', title: 'Corporate Events', palette: 'corporate' },
  { slug: 'showers-hero', title: 'Showers', palette: 'showers' },
  { slug: 'birthdays-hero', title: 'Birthdays', palette: 'birthdays' },
  { slug: 'graduations-hero', title: 'Graduations', palette: 'graduations' },
];
ensureDir(join(publicImages, 'icp'));
for (const i of icps) {
  writeFileSync(
    join(publicImages, 'icp', `${i.slug}.svg`),
    balloonCluster(1600, 900, palettes[i.palette], i.title)
  );
}

// Portfolio (4:5)
const portfolio = [
  { slug: 'wedding-pampas-arch', title: 'Boho wedding arch', palette: 'weddings' },
  { slug: 'baby-shower-pastel', title: 'Pastel baby shower', palette: 'showers' },
  { slug: 'corporate-grand-opening', title: 'Grand opening', palette: 'corporate' },
  { slug: 'birthday-30th-jewel', title: '30th birthday', palette: 'birthdays' },
  { slug: 'graduation-class-2025', title: 'Class of 2025', palette: 'graduations' },
  { slug: 'wedding-ceiling-cluster', title: 'Wedding ceiling', palette: 'ceiling' },
  { slug: 'bridal-shower-floral', title: 'Bridal shower floral', palette: 'showers' },
  { slug: 'corporate-holiday-party', title: 'Holiday party', palette: 'corporate' },
  { slug: 'kid-birthday-unicorn', title: 'Unicorn birthday', palette: 'birthdays' },
  { slug: 'grad-school-colors', title: 'Grad arch', palette: 'graduations' },
  { slug: 'wedding-photo-wall', title: 'Wedding photo wall', palette: 'weddings' },
  { slug: 'dealership-launch', title: 'Dealership launch', palette: 'corporate' },
];
ensureDir(join(publicImages, 'portfolio'));
for (const p of portfolio) {
  writeFileSync(
    join(publicImages, 'portfolio', `${p.slug}.svg`),
    balloonCluster(800, 1000, palettes[p.palette], p.title)
  );
}

// Default OG image
writeFileSync(
  join(root, 'public', 'og-default.jpg.svg'),
  balloonCluster(1200, 630, palettes.weddings, 'Balloonia Events')
);

// Favicon
writeFileSync(
  join(root, 'public', 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="14" r="11" fill="#d28b75"/><path d="M16 25 Q17 30 14 32" stroke="#1a1a1a" stroke-width="1" fill="none"/><polygon points="16,25 14,28 18,28" fill="#d28b75"/></svg>`
);

console.log(`Generated placeholder images:
  - ${products.length} products
  - ${services.length} services
  - ${icps.length} ICP heroes
  - ${portfolio.length} portfolio
  - 1 favicon
`);
