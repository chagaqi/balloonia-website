import { defineCollection, z } from 'astro:content';

const services = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    serviceId: z.string(),
    startingPrice: z.number(),
    summary: z.string(),
    order: z.number(),
    image: z.string(),
    imageAlt: z.string(),
    category: z.enum(['weekend-market', 'b2b']),
  }),
});

const icp = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    eventType: z.enum(['weddings', 'corporate', 'showers', 'birthdays', 'graduations']),
    heroImage: z.string(),
    heroAlt: z.string(),
    metaDescription: z.string(),
    pricingMin: z.number(),
    pricingMax: z.number(),
    order: z.number(),
  }),
});

const faq = defineCollection({
  type: 'content',
  schema: z.object({
    question: z.string(),
    pages: z.array(
      z.enum([
        'services',
        'weddings',
        'corporate',
        'showers',
        'birthdays',
        'graduations',
        'contact',
        'about',
      ])
    ),
    order: z.number().default(0),
  }),
});

const portfolio = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    eventType: z.enum(['weddings', 'corporate', 'showers', 'birthdays', 'graduations', 'custom']),
    image: z.string(),
    alt: z.string(),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

export const collections = { services, icp, faq, portfolio };
