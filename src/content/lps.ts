// Per-LP swap matrix. Single source of truth for ICP variants.
// Edit copy here, the three pages pick it up automatically.

export interface ClientLogo {
  name: string;
  src?: string; // OLD: text-only / square logo (kept for backward compat)
  link?: string;
  media?: string; // path to 9:16 photo or .mp4 video for the vertical reel card
  mediaType?: 'image' | 'video';
  logo?: string; // path to the small client logo shown below the reel card
}

export interface MicroTrustAvatar {
  src: string;
  alt: string;
}

export interface ValueProp {
  eyebrow: string;
  tag?: string;
  headline: string;
  body: string;
  imageSrc?: string;
  imageAlt?: string;
  imageCaption?: string;
}

export interface Differentiator {
  headline: string;
  body: string;
}

export interface ProcessStep {
  headline: string;
  body: string;
}

export interface TopNavConfig {
  logoText: string;
  logoImage?: string; // optional logo image path. When set, replaces text wordmark.
  phoneDisplay: string;
  phoneTel: string;
  ctaLabel: string;
}

export interface SocialProofConfig {
  eyebrow: string;
  headline: string;
  footnote: string;
}

export interface LPConfig {
  route: string;
  title: string;
  metaDescription: string;
  microTrustCaption: string;
  microTrustAvatars?: MicroTrustAvatar[];
  topNav?: TopNavConfig;
  socialStripLabel?: string;
  socialProof?: SocialProofConfig;
  hero: {
    eyebrow?: string;
    headline: string;
    subhead: string;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    frictionKiller: string;
    imageCaption: string;
    heroImage: string;
    heroImageAlt: string;
  };
  painPoint: {
    headline: string;
    body: string;
  };
  valueProps: ValueProp[];
  differentiators: {
    sectionHeadline: string;
    items: Differentiator[];
  };
  process: {
    sectionHeadline: string;
    steps: ProcessStep[];
  };
  guarantee: {
    eyebrow: string;
    headline: string;
    body: string;
    trustPoints: string[];
  };
  finalCta: {
    eyebrow: string;
    headline: string;
    body: string;
    bullets: string[];
    imageSrc?: string;
    imageAlt?: string;
  };
  portfolioPhotos: { caption: string }[];
  clientLogos: ClientLogo[];
  faq: { q: string; a: string }[];
}

// Shared CTA config — same across all LPs
const sharedCta = {
  primaryCtaLabel: 'Book a 15-min call',
  primaryCtaHref: '#book',
  secondaryCtaLabel: 'Or text us: (226) 242-2244',
  secondaryCtaHref: 'sms:+12262422244',
  frictionKiller: "No deposit. No commitment. Love it or it's free.",
};

const sharedClientLogos: ClientLogo[] = [
  { name: 'Autism Ontario', src: '/images/logos/autism-ontario.png', link: 'https://www.autismontario.com/' },
  { name: 'The Church of Jesus Christ of Latter-day Saints', link: 'https://www.churchofjesuschrist.org/' },
  { name: 'London Ukrainian Centre', src: '/images/logos/london-ukrainian-centre.png', link: 'https://londonukrainiancentre.ca/' },
  { name: 'Cocina La Michoacana', src: '/images/logos/cocina-la-michoacana.png', link: 'https://cocinalamichoacanaon.com/' },
];

const sharedGuarantee = {
  eyebrow: 'The guarantee',
  headline: "Love it or it's free.",
  body: "No deposit. We design the install, build it, install it, and photograph it. On event day you walk the install with Brenda. If you love it, you pay the invoice. If you don't, you walk away owing nothing and we eat the cost of materials. We can offer this because Brenda is the artist on every build and we do not take a job we cannot deliver on.",
  trustPoints: ['$2M GL Insurance', '24-hour written quote', 'Render before build', '10+ years operating'],
};

const sharedFaq = [
  {
    q: "How does the 'Love it or it's free' guarantee actually work?",
    a: "There's no deposit. We design the install, build it, install it, and photograph it. On event day you walk the install with Brenda. If you love it, you pay the invoice. If you don't, you walk away owing nothing. We eat the cost of materials. We can offer this because Brenda is the artist on every build and we don't take a job we can't deliver on.",
  },
  {
    q: 'What does an install cost?',
    a: 'Most B2B installs land between $500 and $3,000. Statement pieces (large arches, full-room transformations, multi-element builds) run $2,500 to $5,000+. Every quote is written and includes delivery, on-site setup, and clean-up. No hidden fees. Pricing is built around size, complexity, materials, and venue.',
  },
  {
    q: 'How fast can you turn around an install?',
    a: 'Standard lead time is 2 to 6 weeks. Rush slots inside 7 days are sometimes available and may include a rush fee depending on the build. Tell us your date on the call and we will tell you straight whether the timing works.',
  },
  {
    q: 'Do you carry insurance?',
    a: 'Yes. $2M commercial general liability. We send a Certificate of Insurance with the proposal and can name your venue or organization as additional insured if needed.',
  },
  {
    q: 'Can you match our brand colors exactly?',
    a: 'Yes. Send hex codes, swatches, brand guidelines, or a Pinterest board. Brenda matches or coordinates to what you send and includes a render with the proposal so you can approve the look before we build.',
  },
  {
    q: 'What if my event is outside London?',
    a: 'We cover London plus a 50km radius standard, which includes St Thomas, Strathroy, Woodstock, Ingersoll, and surrounding towns. Travel beyond that is available on request and may include a travel fee.',
  },
  {
    q: 'Do you handle dismantle and clean-up?',
    a: 'Yes. Every install includes delivery, setup, and post-event dismantle. Nothing is left behind for you to deal with.',
  },
  {
    q: 'What about post-event photos?',
    a: 'We photograph every install before guests arrive. You get the full set within 5 business days. Use them however you want for your own marketing, social, or press.',
  },
];

// Placeholder value-prop / differentiator / step / final-cta content per ICP.
// Copy lives behind [INSERT...] markers — search the codebase for "[INSERT" to find every gap.

// vroom — exact copy of /house content, only route differs. Customize per ICP later.
export const vroom: LPConfig = {
  route: '/vroom',
  title: 'Balloonia Events',
  metaDescription: 'Custom balloon designs made just for your venue. London Ontario. No deposit, no commitments, love your design or it is free.',
  microTrustCaption: 'Trusted by over 200 brands',
  microTrustAvatars: [
    { src: '/images/microtrust/circle1.png', alt: 'Areta Fitness' },
    { src: '/images/microtrust/circle2.png', alt: 'Client logo' },
    { src: '/images/microtrust/circle3.png', alt: 'Client logo' },
    { src: '/images/microtrust/circle4.png', alt: 'Akeso Botanicals' },
    { src: '/images/microtrust/circle5.png', alt: 'Engel & Völkers' },
    { src: '/images/microtrust/circle6.png', alt: 'Ford' },
  ],
  topNav: {
    logoText: 'Balloonia Events',
    logoImage: '/images/brand/logo-header.png',
    phoneDisplay: '(226) 242-2244',
    phoneTel: '+12262422244',
    ctaLabel: 'Book a Call',
  },
  socialStripLabel: 'Trusted by over 200 Brands',
  socialProof: {
    eyebrow: '',
    headline: 'Recent Clients We Have Worked With:',
    footnote: '',
  },
  hero: {
    primaryCtaLabel: 'Book a Call & Claim Offer Here',
    primaryCtaHref: '#book',
    secondaryCtaLabel: '',
    secondaryCtaHref: '#',
    frictionKiller: 'No deposit required. No commitments. Love your design or it is free.',
    eyebrow: 'LIMITED SPOTS AVAILABLE',
    headline:
      'Pack Your Open Houses & Pack Your Wallet with Custom, Show-Stopping Balloon Displays Built in 24 Hours',
    subhead:
      'Stop hosting boring open houses. No more disappearing into a crowded social feed. We hand-build, install, photograph, and clean up premium custom balloon designs made just for your venue. It is the easiest way to grab neighborhood attention, get tons of online tags, and land your next listing.',
    imageCaption: '',
    heroImage: '/images/hero/house-abovefold.png',
    heroImageAlt: 'Premium green, cream, and gold balloon archway framing a luxury London brokerage entrance',
  },
  painPoint: {
    headline:
      "Your Staging Looks Just Like Everyone Else's & It Is Costing You Premium Listings",
    body: 'Traditional signs and basic staging do not cut it anymore. If your open houses look cookie-cutter, high-end sellers will pass you by and choose the discount brokerage down the street instead. Balloonia Events hand-builds custom visual installations from scratch to turn your properties into neighborhood block events, completely hands-free.',
  },
  valueProps: [
    {
      eyebrow: 'UNFORGETTABLE CROWDS',
      headline: 'Stop Blending In With Boring Arches & Get 100% Custom Visual Builds',
      body: 'We build every design completely from scratch with zero recycled props or templates. Your events will look totally exclusive, giving you the high-end look that luxury buyers and sellers remember.',
      imageSrc: '/images/value-props/house-unforgettable-crowds.png',
      imageAlt: 'A packed corporate event with guests gathered around a dramatic neutral-toned balloon installation',
    },
    {
      eyebrow: 'HIGHER OFFERS',
      headline: 'Skip the Catalog & Get Venue-Matched Designs That Sell Homes Faster',
      body: 'We tailor every design to fit the exact layout, lighting, and style of your specific listing. It highlights the absolute best parts of the house and naturally makes the property feel worth way more.',
      imageSrc: '/images/value-props/house-skip-the-catalog.png',
      imageAlt: 'Balloon installation tailored to a high-end home interior',
    },
    {
      eyebrow: 'ZERO STRESS',
      headline: 'Put Your Feet Up While We Handle Everything From Design to Midnight Teardown',
      body: 'You have enough on your plate, so let us do the heavy lifting. We handle the design, on-site setup, professional photography, and late-night cleanup so you can just focus on your clients.',
      imageSrc: '/images/value-props/house-put-your-feet-up.png',
      imageAlt: 'Hands-free, fully-managed balloon installation experience for real estate agents',
    },
  ],
  differentiators: {
    sectionHeadline:
      '6 Unfair Advantages Designed Exclusively to Turn London Real Estate Agents into Undisputed Top Producers',
    items: [
      {
        headline: 'Fully Custom Designs',
        body: 'Every installation is engineered entirely from scratch without templates or used frames, guaranteeing your brand is never associated with cheap party decor.',
      },
      {
        headline: 'Architectural Integration',
        body: 'Bespoke designs are carefully adapted to the specific scale, lighting, and layout of the home to emphasize its premium selling features.',
      },
      {
        headline: 'Turnkey Execution',
        body: 'A comprehensive, all-inclusive service covering initial design, on-site build, prompt installation, and complete midnight dismantle so you never lift a finger.',
      },
      {
        headline: 'Built-In High-End Photography',
        body: 'Professional photography of the installation and event spaces is built directly into your package, giving you instant luxury marketing assets.',
      },
      {
        headline: 'Psychological Stopping Power',
        body: 'Massive, immersive scale designed specifically to alter human foot traffic patterns, drawing drive-by traffic and neighbors straight to your door.',
      },
      {
        headline: 'Real Estate Conversion Focus',
        body: 'Installations are structured strategically around specific agent touchpoints like luxury listing reveals, open houses, and premium welcome-home post-purchase gifts.',
      },
    ],
  },
  process: {
    sectionHeadline: 'Three Simple Steps to a Flawless, High-Traffic Luxury Event',
    steps: [
      {
        headline: 'Step #1: The Blueprint Call',
        body: 'Book your brief 15-minute session where we map out a custom spatial design tailored entirely to your upcoming listing, venue layout, and event goals.',
      },
      {
        headline: 'Step #2: Hands-Free Install',
        body: 'Our elite team arrives on-site to build and install your bespoke sculpture, capturing professional marketing photography before the first guest walks through the door.',
      },
      {
        headline: 'Step #3: Zero-Trace Dismantle',
        body: 'Once your highly successful, packed event concludes, our crew returns to carefully dismantle and remove everything, leaving the venue completely spotless.',
      },
    ],
  },
  guarantee: {
    eyebrow: 'OUR GUARANTEE',
    headline: 'The Balloonia Events 100% Love-It-Or-It-Is-Free Ironclad Guarantee',
    body: 'We stand entirely behind our custom craftsmanship and its ability to transform your real estate event. If your custom-built installation does not perfectly match your approved design blueprint, or if you do not completely love the jaw-dropping impact it creates at your venue, we will fix it on the spot or remove it immediately without charging you a single penny. You take on absolute zero financial risk, zero upfront commitment, and zero stress.',
    trustPoints: [],
  },
  finalCta: {
    eyebrow: 'LIMITED SPOTS AVAILABLE',
    headline: 'Claim your unfair advantage. Limited spots per city.',
    body: 'The London market moves fast, and agents are fighting for the exact same high-net-worth sellers. Stick to basic signs and you will just blend in. As part of our flyer campaign, the next 5 agents to book a call get our professional photography package completely free. We only build one custom installation per day to keep quality elite, and weekend slots fill up fast. Claim your spot, pack your open house, and secure your next listing risk-free today.',
    bullets: [
      '100% From-Scratch Custom Designs Built Exclusively for Your Luxury Brand Status',
      'Full Turnkey Design-to-Dismantle Service Letting You Focus Purely on Your Clients',
      'Built-In Professional Event Photography Included Free to Explode Your Inbound Referral Pipeline',
    ],
    imageSrc: '/images/final-cta/house-claim-your-unfair-advantage.png',
    imageAlt: 'Real estate agent handing over keys in front of a SOLD sign with a luxury balloon archway in the background',
  },
  portfolioPhotos: [],
  clientLogos: [
    {
      name: 'Autism Ontario',
      media: '/images/social-proof/1.jpeg',
      mediaType: 'image',
      logo: '/images/logos/aut.png',
    },
    {
      name: 'The Church of Jesus Christ of Latter-day Saints',
      media: '/images/social-proof/2.mp4',
      mediaType: 'video',
      logo: '/images/logos/latterday.png',
    },
    {
      name: 'London Ukrainian Centre',
      media: '/images/social-proof/3.mp4',
      mediaType: 'video',
      logo: '/images/logos/luc.png',
    },
    {
      name: 'Cocina La Michoacana',
      media: '/images/social-proof/4.mp4',
      mediaType: 'video',
      logo: '/images/logos/mecho.png',
    },
  ],
  faq: [
    {
      q: 'How long does the installation and dismantle process take?',
      a: 'Most custom installations take between 2 and 4 hours to build on-site. Once your event is over, our team handles the complete dismantle quickly and cleanly, usually in under an hour.',
    },
    {
      q: 'Is the professional photography really included in the package?',
      a: 'Yes. As part of our current flyer campaign, high-end professional photography of your custom installation and key property angles is built directly into the service to fuel your social media assets.',
    },
    {
      q: 'Can these installations be built outdoors for curb attraction?',
      a: 'Yes. We design high-impact, weather-resistant outdoor structures from the curb to the ceiling, engineered specifically to stop neighborhood traffic and guide them straight into your open house.',
    },
    {
      q: 'What happens if I need to change or reschedule an event date?',
      a: 'We understand that the real estate market moves quickly. Because we operate with zero deposits and zero rigid commitments, we will gladly work with you to adapt to your shifting schedule.',
    },
    {
      q: 'How far in advance do I need to book my Blueprint Session?',
      a: 'Because every installation is custom-built and venue-matched, we recommend scheduling your 15-minute blueprint call at least 7 to 10 days before your listing launch to lock in your date.',
    },
  ],
};

// HOUSE LP — bare Figma template. Zero custom copy. All text below is from the
// PDF placeholder. Fill in section by section using
// 04_Operations/landing-pages/template-text-by-section.md
export const house: LPConfig = {
  route: '/house',
  title: 'Balloonia Events',
  metaDescription: 'Custom balloon designs made just for your venue. London Ontario. No deposit, no commitments, love your design or it is free.',
  microTrustCaption: 'Trusted by over 200 brands',
  microTrustAvatars: [
    { src: '/images/microtrust/circle1.png', alt: 'Areta Fitness' },
    { src: '/images/microtrust/circle2.png', alt: 'Client logo' },
    { src: '/images/microtrust/circle3.png', alt: 'Client logo' },
    { src: '/images/microtrust/circle4.png', alt: 'Akeso Botanicals' },
    { src: '/images/microtrust/circle5.png', alt: 'Engel & Völkers' },
    { src: '/images/microtrust/circle6.png', alt: 'Ford' },
  ],
  topNav: {
    logoText: 'Balloonia Events',
    logoImage: '/images/brand/logo-header.png',
    phoneDisplay: '(226) 242-2244',
    phoneTel: '+12262422244',
    ctaLabel: 'Book a Call',
  },
  socialStripLabel: 'Trusted by over 200 Brands',
  socialProof: {
    eyebrow: '',
    headline: 'Recent Clients We Have Worked With:',
    footnote: '',
  },
  hero: {
    primaryCtaLabel: 'Book a Call & Claim Offer Here',
    primaryCtaHref: '#book',
    secondaryCtaLabel: '',
    secondaryCtaHref: '#',
    frictionKiller: 'No deposit required. No commitments. Love your design or it is free.',
    eyebrow: 'LIMITED SPOTS AVAILABLE',
    headline:
      'Pack Your Open Houses & Pack Your Wallet with Custom, Show-Stopping Balloon Displays Built in 24 Hours',
    subhead:
      'Stop hosting boring open houses. No more disappearing into a crowded social feed. We hand-build, install, photograph, and clean up premium custom balloon designs made just for your venue. It is the easiest way to grab neighborhood attention, get tons of online tags, and land your next listing.',
    imageCaption: '',
    heroImage: '/images/hero/house-abovefold.png',
    heroImageAlt: 'Premium green, cream, and gold balloon archway framing a luxury London brokerage entrance',
  },
  painPoint: {
    headline:
      "Your Staging Looks Just Like Everyone Else's & It Is Costing You Premium Listings",
    body: 'Traditional signs and basic staging do not cut it anymore. If your open houses look cookie-cutter, high-end sellers will pass you by and choose the discount brokerage down the street instead. Balloonia Events hand-builds custom visual installations from scratch to turn your properties into neighborhood block events, completely hands-free.',
  },
  valueProps: [
    {
      eyebrow: 'UNFORGETTABLE CROWDS',
      headline: 'Stop Blending In With Boring Arches & Get 100% Custom Visual Builds',
      body: 'We build every design completely from scratch with zero recycled props or templates. Your events will look totally exclusive, giving you the high-end look that luxury buyers and sellers remember.',
      imageSrc: '/images/value-props/house-unforgettable-crowds.png',
      imageAlt: 'A packed corporate event with guests gathered around a dramatic neutral-toned balloon installation',
    },
    {
      eyebrow: 'HIGHER OFFERS',
      headline: 'Skip the Catalog & Get Venue-Matched Designs That Sell Homes Faster',
      body: 'We tailor every design to fit the exact layout, lighting, and style of your specific listing. It highlights the absolute best parts of the house and naturally makes the property feel worth way more.',
      imageSrc: '/images/value-props/house-skip-the-catalog.png',
      imageAlt: 'Balloon installation tailored to a high-end home interior',
    },
    {
      eyebrow: 'ZERO STRESS',
      headline: 'Put Your Feet Up While We Handle Everything From Design to Midnight Teardown',
      body: 'You have enough on your plate, so let us do the heavy lifting. We handle the design, on-site setup, professional photography, and late-night cleanup so you can just focus on your clients.',
      imageSrc: '/images/value-props/house-put-your-feet-up.png',
      imageAlt: 'Hands-free, fully-managed balloon installation experience for real estate agents',
    },
  ],
  differentiators: {
    sectionHeadline:
      '6 Unfair Advantages Designed Exclusively to Turn London Real Estate Agents into Undisputed Top Producers',
    items: [
      {
        headline: 'Fully Custom Designs',
        body: 'Every installation is engineered entirely from scratch without templates or used frames, guaranteeing your brand is never associated with cheap party decor.',
      },
      {
        headline: 'Architectural Integration',
        body: 'Bespoke designs are carefully adapted to the specific scale, lighting, and layout of the home to emphasize its premium selling features.',
      },
      {
        headline: 'Turnkey Execution',
        body: 'A comprehensive, all-inclusive service covering initial design, on-site build, prompt installation, and complete midnight dismantle so you never lift a finger.',
      },
      {
        headline: 'Built-In High-End Photography',
        body: 'Professional photography of the installation and event spaces is built directly into your package, giving you instant luxury marketing assets.',
      },
      {
        headline: 'Psychological Stopping Power',
        body: 'Massive, immersive scale designed specifically to alter human foot traffic patterns, drawing drive-by traffic and neighbors straight to your door.',
      },
      {
        headline: 'Real Estate Conversion Focus',
        body: 'Installations are structured strategically around specific agent touchpoints like luxury listing reveals, open houses, and premium welcome-home post-purchase gifts.',
      },
    ],
  },
  process: {
    sectionHeadline: 'Three Simple Steps to a Flawless, High-Traffic Luxury Event',
    steps: [
      {
        headline: 'Step #1: The Blueprint Call',
        body: 'Book your brief 15-minute session where we map out a custom spatial design tailored entirely to your upcoming listing, venue layout, and event goals.',
      },
      {
        headline: 'Step #2: Hands-Free Install',
        body: 'Our elite team arrives on-site to build and install your bespoke sculpture, capturing professional marketing photography before the first guest walks through the door.',
      },
      {
        headline: 'Step #3: Zero-Trace Dismantle',
        body: 'Once your highly successful, packed event concludes, our crew returns to carefully dismantle and remove everything, leaving the venue completely spotless.',
      },
    ],
  },
  guarantee: {
    eyebrow: 'OUR GUARANTEE',
    headline: 'The Balloonia Events 100% Love-It-Or-It-Is-Free Ironclad Guarantee',
    body: 'We stand entirely behind our custom craftsmanship and its ability to transform your real estate event. If your custom-built installation does not perfectly match your approved design blueprint, or if you do not completely love the jaw-dropping impact it creates at your venue, we will fix it on the spot or remove it immediately without charging you a single penny. You take on absolute zero financial risk, zero upfront commitment, and zero stress.',
    trustPoints: [],
  },
  finalCta: {
    eyebrow: 'LIMITED SPOTS AVAILABLE',
    headline: 'Claim your unfair advantage. Limited spots per city.',
    body: 'The London market moves fast, and agents are fighting for the exact same high-net-worth sellers. Stick to basic signs and you will just blend in. As part of our flyer campaign, the next 5 agents to book a call get our professional photography package completely free. We only build one custom installation per day to keep quality elite, and weekend slots fill up fast. Claim your spot, pack your open house, and secure your next listing risk-free today.',
    bullets: [
      '100% From-Scratch Custom Designs Built Exclusively for Your Luxury Brand Status',
      'Full Turnkey Design-to-Dismantle Service Letting You Focus Purely on Your Clients',
      'Built-In Professional Event Photography Included Free to Explode Your Inbound Referral Pipeline',
    ],
    imageSrc: '/images/final-cta/house-claim-your-unfair-advantage.png',
    imageAlt: 'Real estate agent handing over keys in front of a SOLD sign with a luxury balloon archway in the background',
  },
  portfolioPhotos: [],
  clientLogos: [
    {
      name: 'Autism Ontario',
      media: '/images/social-proof/1.jpeg',
      mediaType: 'image',
      logo: '/images/logos/aut.png',
    },
    {
      name: 'The Church of Jesus Christ of Latter-day Saints',
      media: '/images/social-proof/2.mp4',
      mediaType: 'video',
      logo: '/images/logos/latterday.png',
    },
    {
      name: 'London Ukrainian Centre',
      media: '/images/social-proof/3.mp4',
      mediaType: 'video',
      logo: '/images/logos/luc.png',
    },
    {
      name: 'Cocina La Michoacana',
      media: '/images/social-proof/4.mp4',
      mediaType: 'video',
      logo: '/images/logos/mecho.png',
    },
  ],
  faq: [
    {
      q: 'How long does the installation and dismantle process take?',
      a: 'Most custom installations take between 2 and 4 hours to build on-site. Once your event is over, our team handles the complete dismantle quickly and cleanly, usually in under an hour.',
    },
    {
      q: 'Is the professional photography really included in the package?',
      a: 'Yes. As part of our current flyer campaign, high-end professional photography of your custom installation and key property angles is built directly into the service to fuel your social media assets.',
    },
    {
      q: 'Can these installations be built outdoors for curb attraction?',
      a: 'Yes. We design high-impact, weather-resistant outdoor structures from the curb to the ceiling, engineered specifically to stop neighborhood traffic and guide them straight into your open house.',
    },
    {
      q: 'What happens if I need to change or reschedule an event date?',
      a: 'We understand that the real estate market moves quickly. Because we operate with zero deposits and zero rigid commitments, we will gladly work with you to adapt to your shifting schedule.',
    },
    {
      q: 'How far in advance do I need to book my Blueprint Session?',
      a: 'Because every installation is custom-built and venue-matched, we recommend scheduling your 15-minute blueprint call at least 7 to 10 days before your listing launch to lock in your date.',
    },
  ],
};

// corpOffer — exact copy of /house content, only route differs. Customize per ICP later.
export const corpOffer: LPConfig = {
  route: '/corp-offer',
  title: 'Balloonia Events',
  metaDescription: 'Custom balloon designs made just for your venue. London Ontario. No deposit, no commitments, love your design or it is free.',
  microTrustCaption: 'Trusted by over 200 brands',
  microTrustAvatars: [
    { src: '/images/microtrust/circle1.png', alt: 'Areta Fitness' },
    { src: '/images/microtrust/circle2.png', alt: 'Client logo' },
    { src: '/images/microtrust/circle3.png', alt: 'Client logo' },
    { src: '/images/microtrust/circle4.png', alt: 'Akeso Botanicals' },
    { src: '/images/microtrust/circle5.png', alt: 'Engel & Völkers' },
    { src: '/images/microtrust/circle6.png', alt: 'Ford' },
  ],
  topNav: {
    logoText: 'Balloonia Events',
    logoImage: '/images/brand/logo-header.png',
    phoneDisplay: '(226) 242-2244',
    phoneTel: '+12262422244',
    ctaLabel: 'Book a Call',
  },
  socialStripLabel: 'Trusted by over 200 Brands',
  socialProof: {
    eyebrow: '',
    headline: 'Recent Clients We Have Worked With:',
    footnote: '',
  },
  hero: {
    primaryCtaLabel: 'Book a Call & Claim Offer Here',
    primaryCtaHref: '#book',
    secondaryCtaLabel: '',
    secondaryCtaHref: '#',
    frictionKiller: 'No deposit required. No commitments. Love your design or it is free.',
    eyebrow: 'LIMITED SPOTS AVAILABLE',
    headline:
      'Pack Your Open Houses & Pack Your Wallet with Custom, Show-Stopping Balloon Displays Built in 24 Hours',
    subhead:
      'Stop hosting boring open houses. No more disappearing into a crowded social feed. We hand-build, install, photograph, and clean up premium custom balloon designs made just for your venue. It is the easiest way to grab neighborhood attention, get tons of online tags, and land your next listing.',
    imageCaption: '',
    heroImage: '/images/hero/house-abovefold.png',
    heroImageAlt: 'Premium green, cream, and gold balloon archway framing a luxury London brokerage entrance',
  },
  painPoint: {
    headline:
      "Your Staging Looks Just Like Everyone Else's & It Is Costing You Premium Listings",
    body: 'Traditional signs and basic staging do not cut it anymore. If your open houses look cookie-cutter, high-end sellers will pass you by and choose the discount brokerage down the street instead. Balloonia Events hand-builds custom visual installations from scratch to turn your properties into neighborhood block events, completely hands-free.',
  },
  valueProps: [
    {
      eyebrow: 'UNFORGETTABLE CROWDS',
      headline: 'Stop Blending In With Boring Arches & Get 100% Custom Visual Builds',
      body: 'We build every design completely from scratch with zero recycled props or templates. Your events will look totally exclusive, giving you the high-end look that luxury buyers and sellers remember.',
      imageSrc: '/images/value-props/house-unforgettable-crowds.png',
      imageAlt: 'A packed corporate event with guests gathered around a dramatic neutral-toned balloon installation',
    },
    {
      eyebrow: 'HIGHER OFFERS',
      headline: 'Skip the Catalog & Get Venue-Matched Designs That Sell Homes Faster',
      body: 'We tailor every design to fit the exact layout, lighting, and style of your specific listing. It highlights the absolute best parts of the house and naturally makes the property feel worth way more.',
      imageSrc: '/images/value-props/house-skip-the-catalog.png',
      imageAlt: 'Balloon installation tailored to a high-end home interior',
    },
    {
      eyebrow: 'ZERO STRESS',
      headline: 'Put Your Feet Up While We Handle Everything From Design to Midnight Teardown',
      body: 'You have enough on your plate, so let us do the heavy lifting. We handle the design, on-site setup, professional photography, and late-night cleanup so you can just focus on your clients.',
      imageSrc: '/images/value-props/house-put-your-feet-up.png',
      imageAlt: 'Hands-free, fully-managed balloon installation experience for real estate agents',
    },
  ],
  differentiators: {
    sectionHeadline:
      '6 Unfair Advantages Designed Exclusively to Turn London Real Estate Agents into Undisputed Top Producers',
    items: [
      {
        headline: 'Fully Custom Designs',
        body: 'Every installation is engineered entirely from scratch without templates or used frames, guaranteeing your brand is never associated with cheap party decor.',
      },
      {
        headline: 'Architectural Integration',
        body: 'Bespoke designs are carefully adapted to the specific scale, lighting, and layout of the home to emphasize its premium selling features.',
      },
      {
        headline: 'Turnkey Execution',
        body: 'A comprehensive, all-inclusive service covering initial design, on-site build, prompt installation, and complete midnight dismantle so you never lift a finger.',
      },
      {
        headline: 'Built-In High-End Photography',
        body: 'Professional photography of the installation and event spaces is built directly into your package, giving you instant luxury marketing assets.',
      },
      {
        headline: 'Psychological Stopping Power',
        body: 'Massive, immersive scale designed specifically to alter human foot traffic patterns, drawing drive-by traffic and neighbors straight to your door.',
      },
      {
        headline: 'Real Estate Conversion Focus',
        body: 'Installations are structured strategically around specific agent touchpoints like luxury listing reveals, open houses, and premium welcome-home post-purchase gifts.',
      },
    ],
  },
  process: {
    sectionHeadline: 'Three Simple Steps to a Flawless, High-Traffic Luxury Event',
    steps: [
      {
        headline: 'Step #1: The Blueprint Call',
        body: 'Book your brief 15-minute session where we map out a custom spatial design tailored entirely to your upcoming listing, venue layout, and event goals.',
      },
      {
        headline: 'Step #2: Hands-Free Install',
        body: 'Our elite team arrives on-site to build and install your bespoke sculpture, capturing professional marketing photography before the first guest walks through the door.',
      },
      {
        headline: 'Step #3: Zero-Trace Dismantle',
        body: 'Once your highly successful, packed event concludes, our crew returns to carefully dismantle and remove everything, leaving the venue completely spotless.',
      },
    ],
  },
  guarantee: {
    eyebrow: 'OUR GUARANTEE',
    headline: 'The Balloonia Events 100% Love-It-Or-It-Is-Free Ironclad Guarantee',
    body: 'We stand entirely behind our custom craftsmanship and its ability to transform your real estate event. If your custom-built installation does not perfectly match your approved design blueprint, or if you do not completely love the jaw-dropping impact it creates at your venue, we will fix it on the spot or remove it immediately without charging you a single penny. You take on absolute zero financial risk, zero upfront commitment, and zero stress.',
    trustPoints: [],
  },
  finalCta: {
    eyebrow: 'LIMITED SPOTS AVAILABLE',
    headline: 'Claim your unfair advantage. Limited spots per city.',
    body: 'The London market moves fast, and agents are fighting for the exact same high-net-worth sellers. Stick to basic signs and you will just blend in. As part of our flyer campaign, the next 5 agents to book a call get our professional photography package completely free. We only build one custom installation per day to keep quality elite, and weekend slots fill up fast. Claim your spot, pack your open house, and secure your next listing risk-free today.',
    bullets: [
      '100% From-Scratch Custom Designs Built Exclusively for Your Luxury Brand Status',
      'Full Turnkey Design-to-Dismantle Service Letting You Focus Purely on Your Clients',
      'Built-In Professional Event Photography Included Free to Explode Your Inbound Referral Pipeline',
    ],
    imageSrc: '/images/final-cta/house-claim-your-unfair-advantage.png',
    imageAlt: 'Real estate agent handing over keys in front of a SOLD sign with a luxury balloon archway in the background',
  },
  portfolioPhotos: [],
  clientLogos: [
    {
      name: 'Autism Ontario',
      media: '/images/social-proof/1.jpeg',
      mediaType: 'image',
      logo: '/images/logos/aut.png',
    },
    {
      name: 'The Church of Jesus Christ of Latter-day Saints',
      media: '/images/social-proof/2.mp4',
      mediaType: 'video',
      logo: '/images/logos/latterday.png',
    },
    {
      name: 'London Ukrainian Centre',
      media: '/images/social-proof/3.mp4',
      mediaType: 'video',
      logo: '/images/logos/luc.png',
    },
    {
      name: 'Cocina La Michoacana',
      media: '/images/social-proof/4.mp4',
      mediaType: 'video',
      logo: '/images/logos/mecho.png',
    },
  ],
  faq: [
    {
      q: 'How long does the installation and dismantle process take?',
      a: 'Most custom installations take between 2 and 4 hours to build on-site. Once your event is over, our team handles the complete dismantle quickly and cleanly, usually in under an hour.',
    },
    {
      q: 'Is the professional photography really included in the package?',
      a: 'Yes. As part of our current flyer campaign, high-end professional photography of your custom installation and key property angles is built directly into the service to fuel your social media assets.',
    },
    {
      q: 'Can these installations be built outdoors for curb attraction?',
      a: 'Yes. We design high-impact, weather-resistant outdoor structures from the curb to the ceiling, engineered specifically to stop neighborhood traffic and guide them straight into your open house.',
    },
    {
      q: 'What happens if I need to change or reschedule an event date?',
      a: 'We understand that the real estate market moves quickly. Because we operate with zero deposits and zero rigid commitments, we will gladly work with you to adapt to your shifting schedule.',
    },
    {
      q: 'How far in advance do I need to book my Blueprint Session?',
      a: 'Because every installation is custom-built and venue-matched, we recommend scheduling your 15-minute blueprint call at least 7 to 10 days before your listing launch to lock in your date.',
    },
  ],
};
