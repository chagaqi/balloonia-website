export type Review = {
  id: string;
  rating: number;
  quote: string;
  reviewer: string;
  installRef: string;
  /** Maps to portfolio collection slug for thumbnail pairing. Optional. */
  portfolioSlug?: string;
  /** Which event-type pages this review can appear on. */
  tags: ('weddings' | 'showers' | 'corporate' | 'birthdays' | 'graduations' | 'kids')[];
};

export const reviews: Review[] = [
  {
    id: 'sarah-mark',
    rating: 5,
    quote:
      "Absolutely stunning! The balloon arch was the perfect, elegant backdrop for our outdoor head table. The blend of peach and blush tones looked incredibly high-end and photographed beautifully against the natural greenery. Our guests couldn't stop complimenting how sophisticated it looked.",
    reviewer: 'Sarah & Mark L.',
    installRef: 'Peach and blush outdoor wedding arch',
    portfolioSlug: 'peach-wedding-arch',
    tags: ['weddings'],
  },
  {
    id: 'principal-davies',
    rating: 5,
    quote:
      'We hired them for our senior graduation ceremony, and they completely transformed the space. The black and gold theme looked sharp, the starburst details added a great touch of flair, and the teddy bear graduate was an absolute hit for student photo-ops. Professional setup and flawless execution.',
    reviewer: 'Principal Davies',
    installRef: 'Class of 2025 grad backdrop',
    portfolioSlug: 'class-2025-grad',
    tags: ['graduations'],
  },
  {
    id: 'elena-r',
    rating: 5,
    quote:
      'I wanted something earthy and organic for our woodland micro-wedding, and this completely exceeded my expectations. The mix of sage greens, whites, and golds woven onto the hoop looked like a piece of art. It perfectly matched our bohemian theme and held up beautifully outdoors.',
    reviewer: 'Elena R.',
    installRef: 'Forest boho hoop arch',
    portfolioSlug: 'forest-boho-hoop-arch',
    tags: ['weddings'],
  },
  {
    id: 'jessica-m',
    rating: 5,
    quote:
      'They managed to make a massive school gymnasium feel incredibly bright, festive, and fun! The giant primary-coloured balloon frame with the built-in daisies was massive and perfect for our son\'s birthday party. It gave the kids an amazing backdrop for pictures and brought the whole room to life.',
    reviewer: 'Jessica M.',
    installRef: 'Primary-colour gym birthday frame',
    portfolioSlug: 'gym-birthday-frame',
    tags: ['birthdays', 'kids'],
  },
  {
    id: 'henderson',
    rating: 5,
    quote:
      "For our son's wild-one first birthday, this jungle backdrop was everything we wanted and more. The deep greens and gold balloons matched the safari theme perfectly, and the way they styled the hoop with greenery and the little plush animals was just adorable. A wonderful team to work with!",
    reviewer: 'The Henderson Family',
    installRef: 'Jungle safari first birthday',
    portfolioSlug: 'jungle-safari-birthday',
    tags: ['birthdays', 'kids'],
  },
];

export function reviewsByTag(tag: Review['tags'][number]): Review[] {
  return reviews.filter((r) => r.tags.includes(tag));
}
