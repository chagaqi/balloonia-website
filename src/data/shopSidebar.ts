// "SHOP BY CATEGORY" sidebar on collection pages. Same labels and order as the
// sidebar on the Shopify store (04_Operations/shopify-theme/main-collection-product-grid.liquid).
export const sidebarCategories: { handle: string; label: string }[] = [
  { handle: 'arches-garlands', label: 'Arches and garlands' },
  { handle: 'walls-backdrops', label: 'Walls and backdrops' },
  { handle: 'centerpieces-columns', label: 'Centerpieces and columns' },
  { handle: 'ceiling-installations', label: 'Ceiling installations' },
  { handle: 'bouquets', label: 'Bouquets' },
  { handle: 'themed-setups', label: 'Themed setups' },
  { handle: 'holiday-seasonal', label: 'Holiday and seasonal' },
  { handle: 'specialty', label: 'Specialty' },
  { handle: 'add-ons-rentals', label: 'Add-ons and rentals' },
];

export const sortOptions: { value: string; label: string }[] = [
  { value: 'manual', label: 'Featured' },
  { value: 'most-relevant', label: 'Most relevant' },
  { value: 'best-selling', label: 'Best selling' },
  { value: 'title-ascending', label: 'Alphabetically, A-Z' },
  { value: 'title-descending', label: 'Alphabetically, Z-A' },
  { value: 'price-ascending', label: 'Price, low to high' },
  { value: 'price-descending', label: 'Price, high to low' },
  { value: 'created-ascending', label: 'Date, old to new' },
  { value: 'created-descending', label: 'Date, new to old' },
];
