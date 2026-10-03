// Client-side filter / sort / paginate for a server-rendered product grid.
// Every product in the collection is in the HTML (so it is crawlable and works
// without JS); this script shows one page at a time, Shopify style, and keeps the
// URL in Shopify's query format (sort_by, filter.v.availability, filter.v.price.gte/lte, page).

import { icons } from '../../components/shop/icons';

type Item = {
  el: HTMLElement;
  title: string;
  price: number;
  created: number;
  pos: number;
  avail: boolean;
};

type State = {
  sort: string;
  avail: string[];
  min: number | null;
  max: number | null;
  page: number;
};

export type ListingOptions = {
  root: HTMLElement;
  perPage: number;
  defaultSort: string;
  noun: 'products' | 'results';
};

function num(v: string | null): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function initListing({ root, perPage, defaultSort, noun }: ListingOptions) {
  const grid = root.querySelector<HTMLElement>('[data-grid]');
  if (!grid) return;
  const items: Item[] = Array.from(grid.querySelectorAll<HTMLElement>('[data-item]')).map((el, i) => ({
    el,
    title: (el.dataset.title || '').toLowerCase(),
    price: Number(el.dataset.price || 0),
    created: Date.parse(el.dataset.created || '') || 0,
    pos: el.dataset.pos ? Number(el.dataset.pos) : i,
    avail: el.dataset.avail !== '0',
  }));
  const total = items.length;
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const nav = root.querySelector<HTMLElement>('[data-pagination]');

  const params = new URLSearchParams(location.search);
  const state: State = {
    sort: params.get('sort_by') || defaultSort,
    avail: params.getAll('filter.v.availability'),
    min: num(params.get('filter.v.price.gte')),
    max: num(params.get('filter.v.price.lte')),
    page: Math.max(1, Number(params.get('page')) || 1),
  };

  function sorted(list: Item[]): Item[] {
    const out = list.slice();
    switch (state.sort) {
      case 'title-ascending':
        return out.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-descending':
        return out.sort((a, b) => b.title.localeCompare(a.title));
      case 'price-ascending':
        return out.sort((a, b) => a.price - b.price || a.pos - b.pos);
      case 'price-descending':
        return out.sort((a, b) => b.price - a.price || a.pos - b.pos);
      case 'created-ascending':
        return out.sort((a, b) => a.created - b.created);
      case 'created-descending':
        return out.sort((a, b) => b.created - a.created);
      default:
        return out.sort((a, b) => a.pos - b.pos);
    }
  }

  function filtered(): Item[] {
    return items.filter((it) => {
      if (state.avail.length && !state.avail.includes(it.avail ? '1' : '0')) return false;
      if (state.min != null && it.price < state.min) return false;
      if (state.max != null && it.price > state.max) return false;
      return true;
    });
  }

  function writeUrl() {
    const p = new URLSearchParams(location.search);
    ['sort_by', 'filter.v.availability', 'filter.v.price.gte', 'filter.v.price.lte', 'page'].forEach((k) => p.delete(k));
    if (state.sort !== defaultSort) p.set('sort_by', state.sort);
    state.avail.forEach((a) => p.append('filter.v.availability', a));
    if (state.min != null) p.set('filter.v.price.gte', String(state.min));
    if (state.max != null) p.set('filter.v.price.lte', String(state.max));
    if (state.page > 1) p.set('page', String(state.page));
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
  }

  function syncInputs() {
    root.querySelectorAll<HTMLInputElement>('input[data-filter="avail"]').forEach((i) => {
      i.checked = state.avail.includes(i.value);
    });
    root.querySelectorAll<HTMLInputElement>('input[data-filter="min"]').forEach((i) => {
      if (document.activeElement !== i) i.value = state.min != null ? String(state.min) : '';
    });
    root.querySelectorAll<HTMLInputElement>('input[data-filter="max"]').forEach((i) => {
      if (document.activeElement !== i) i.value = state.max != null ? String(state.max) : '';
    });
    root.querySelectorAll<HTMLSelectElement>('select[data-sort]').forEach((s) => {
      s.value = state.sort;
    });
    const active = state.avail.length > 0 || state.min != null || state.max != null;
    root.querySelectorAll<HTMLElement>('.s-facets [data-reset]').forEach((b) => (b.hidden = !active));
  }

  function renderPagination(pages: number) {
    if (!nav) return;
    if (pages <= 1) {
      nav.hidden = true;
      nav.innerHTML = '';
      return;
    }
    nav.hidden = false;
    const link = (p: number, label: string, extra = '') =>
      `<li><a href="?page=${p}" data-page="${p}" ${extra}>${label}</a></li>`;
    let html = '';
    if (state.page > 1) html += link(state.page - 1, `<span class="s-visually-hidden">Previous page</span>${icons.chevronLeft}`);
    for (let p = 1; p <= pages; p++) {
      if (pages > 7 && Math.abs(p - state.page) > 2 && p !== 1 && p !== pages) {
        if (!html.endsWith('<li><span>…</span></li>')) html += '<li><span>…</span></li>';
        continue;
      }
      html +=
        p === state.page
          ? `<li><span aria-current="page" aria-label="Page ${p}">${p}</span></li>`
          : link(p, String(p), `aria-label="Page ${p}"`);
    }
    if (state.page < pages) html += link(state.page + 1, `<span class="s-visually-hidden">Next page</span>${icons.chevronRight}`);
    nav.innerHTML = html;
  }

  function render(scroll = false) {
    const list = sorted(filtered());
    const pages = Math.max(1, Math.ceil(list.length / perPage));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * perPage;
    const visible = new Set(list.slice(start, start + perPage));
    for (const it of list) grid!.appendChild(it.el);
    for (const it of items) it.el.hidden = !visible.has(it);
    const filteredCount = list.length;
    const countText =
      noun === 'results'
        ? `${filteredCount} result${filteredCount === 1 ? '' : 's'}`
        : filteredCount === total
          ? `${total} product${total === 1 ? '' : 's'}`
          : `${filteredCount} of ${total} products`;
    root.querySelectorAll<HTMLElement>('[data-count]').forEach((c) => (c.textContent = countText));
    if (empty) empty.hidden = filteredCount > 0 || total === 0;
    renderPagination(pages);
    syncInputs();
    writeUrl();
    if (scroll) {
      const top = grid!.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    if (t.matches('select[data-sort]')) {
      state.sort = t.value;
      state.page = 1;
      render();
    } else if (t.matches('input[data-filter="avail"]')) {
      const v = (t as HTMLInputElement).value;
      state.avail = (t as HTMLInputElement).checked ? [...new Set([...state.avail, v])] : state.avail.filter((a) => a !== v);
      state.page = 1;
      render();
    } else if (t.matches('input[data-filter="min"]')) {
      state.min = num(t.value);
      state.page = 1;
      render();
    } else if (t.matches('input[data-filter="max"]')) {
      state.max = num(t.value);
      state.page = 1;
      render();
    }
  });
  let typing: number | undefined;
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (!t.matches('input[data-filter="min"], input[data-filter="max"]')) return;
    window.clearTimeout(typing);
    typing = window.setTimeout(() => {
      if (t.dataset.filter === 'min') state.min = num(t.value);
      else state.max = num(t.value);
      state.page = 1;
      render();
    }, 500);
  });
  root.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-page]');
    if (a) {
      e.preventDefault();
      state.page = Number(a.dataset.page) || 1;
      render(true);
      return;
    }
    if ((e.target as HTMLElement).closest('[data-reset]')) {
      state.avail = [];
      state.min = null;
      state.max = null;
      state.page = 1;
      render();
    }
  });

  // Mobile "Filter and sort" drawer.
  const drawer = root.querySelector<HTMLElement>('[data-drawer]');
  const openDrawer = (open: boolean) => {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) drawer.querySelector<HTMLElement>('[data-drawer-close]')?.focus();
  };
  root.querySelectorAll('[data-drawer-open]').forEach((b) => b.addEventListener('click', () => openDrawer(true)));
  drawer?.querySelectorAll('[data-drawer-close]').forEach((b) => b.addEventListener('click', () => openDrawer(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer?.classList.contains('is-open')) openDrawer(false);
  });

  render();
}
