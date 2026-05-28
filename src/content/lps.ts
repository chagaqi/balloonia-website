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

// Shared brand constants (referenced by all 3 LPs)
const sharedMicroTrustAvatars: MicroTrustAvatar[] = [
  { src: '/images/microtrust/circle1.png', alt: 'Areta Fitness' },
  { src: '/images/microtrust/circle2.png', alt: 'Client logo' },
  { src: '/images/microtrust/circle3.png', alt: 'Client logo' },
  { src: '/images/microtrust/circle4.png', alt: 'Akeso Botanicals' },
  { src: '/images/microtrust/circle5.png', alt: 'Engel & Völkers' },
  { src: '/images/microtrust/circle6.png', alt: 'Ford' },
];

const sharedTopNav: TopNavConfig = {
  logoText: 'Balloonia Events',
  logoImage: '/images/brand/logo-header.png',
  phoneDisplay: '(226) 242-2244',
  phoneTel: '+12262422244',
  ctaLabel: 'Book a Call',
};

const sharedSocialProof: SocialProofConfig = {
  eyebrow: '',
  headline: 'Recent Clients We Have Worked With:',
  footnote: '',
};

const sharedClientLogos: ClientLogo[] = [
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
];

// ============================================================================
// /house — real estate ICP
// ============================================================================
export const house: LPConfig = {
  route: '/house',
  title: 'Balloonia Events',
  metaDescription: 'Custom balloon designs made just for your venue. London Ontario. No deposit, no commitments, love your design or it is free.',
  microTrustCaption: 'Trusted by over 200 brands',
  microTrustAvatars: sharedMicroTrustAvatars,
  topNav: sharedTopNav,
  socialStripLabel: 'Trusted by over 200 Brands',
  socialProof: sharedSocialProof,
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
  clientLogos: sharedClientLogos,
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

// ============================================================================
// /vroom — dealership ICP
// ============================================================================
export const vroom: LPConfig = {
  route: '/vroom',
  title: 'Balloonia Events',
  metaDescription: 'Custom showroom displays hand-built for your dealership weekend. London Ontario. No deposit, no commitments, love your design or it is free.',
  microTrustCaption: 'Trusted by over 200 brands',
  microTrustAvatars: sharedMicroTrustAvatars,
  topNav: sharedTopNav,
  socialStripLabel: 'Trusted by over 200 Brands',
  socialProof: sharedSocialProof,
  hero: {
    primaryCtaLabel: 'Request Your Custom Showroom Visual Analysis',
    primaryCtaHref: '#book',
    secondaryCtaLabel: '',
    secondaryCtaHref: '#',
    frictionKiller: 'No deposit required. No commitments. Love your custom design or it is completely free.',
    eyebrow: 'LIMITED SPOTS AVAILABLE',
    headline:
      'Command Showroom Authority & Pack Your Dealership This Weekend with High-Impact Custom Visual Blueprints',
    subhead:
      'Stop hosting quiet promotional weekends. No more wasting marketing dollars on cheap, sagging balloon strings that look unprofessional. We hand-build, install, photograph, and clean up premium custom showroom displays made just for your brand launch or holiday tent sale. It is the easiest way to capture highway attention, drive heavy foot traffic, and smash your sales goals this weekend.',
    imageCaption: '',
    heroImage: '/images/hero/vroom-ford.png',
    heroImageAlt: 'Ford dealership showroom with a large blue, silver, and white balloon archway framing a new vehicle reveal',
  },
  painPoint: {
    headline:
      'Your Showroom Looks Just Like the Competition & It Is Costing You Weekend Foot Traffic',
    body: 'Traditional roadside flags and basic balloon strings do not drive urgency anymore. If your holiday event or new model launch looks cookie-cutter, buyers will cruise right past your lot and head to the next dealership down the strip. Balloonia Events hand-builds high-stability, custom visual installations from scratch to turn your showroom floor into a local destination, completely hands-free.',
  },
  valueProps: [
    {
      eyebrow: 'PACKED SHOWROOMS',
      headline: 'Stop Blending In With Cheap Arches & Get 100% On-Site Precision Construction',
      body: 'We fabricate every design directly on your showroom floor with zero transport damage or pre-made catalog templates. Your promotional displays will look totally exclusive and high-end, giving your lot the massive visual gravity that pulls buyers in.',
      imageSrc: '/images/value-props/vroom-stop-blending-in.png',
      imageAlt: 'Custom dealership balloon installation that stands out from generic competitor displays',
    },
    {
      eyebrow: 'HIGHER SALES NOISE',
      headline: 'Drive Intense Urgency with Venue-Matched Showroom Designs',
      body: 'We tailor every layout to fit the exact scale, lighting, and architecture of your building. It highlights your newest vehicle models perfectly and naturally creates an exciting, high-revenue buying atmosphere that closes deals faster.',
      imageSrc: '/images/value-props/vroom-drive-intense.png',
      imageAlt: 'Venue-matched balloon design highlighting featured vehicles on the showroom floor',
    },
    {
      eyebrow: 'ZERO STAFF LABOR',
      headline: 'Put Your Sales Team to Work Selling Cars While We Handle the Entire Teardown',
      body: "Your sales staff shouldn't be popping balloons or dragging trash to the dumpsters after a long weekend. We handle the custom design, on-site setup, professional event photography, and rapid post-event cleanup so your team can focus entirely on moving units.",
      imageSrc: '/images/value-props/vroom-entire-teardown.png',
      imageAlt: 'Hands-free turnkey install and teardown for dealership weekend events',
    },
  ],
  differentiators: {
    sectionHeadline:
      "6 Unfair Advantages Designed Exclusively to Explode Your Dealership's Weekend Traffic",
    items: [
      {
        headline: 'On-Site Precision Construction',
        body: 'Everything is fabricated directly at your dealership to ensure perfect structural stability, massive scale, and zero transit damage before doors open.',
      },
      {
        headline: 'Turnkey Corporate Workflow',
        body: "Built specifically to meet high commercial standards, requiring absolutely zero manual labor, setup, or tracking from your dealership's staff.",
      },
      {
        headline: 'Rapid Hyper-Clean Dismantling',
        body: 'Post-event teardown is completed swiftly, cleanly, and professionally, leaving your showroom floor immaculate without a single piece of debris left behind.',
      },
      {
        headline: 'Multi-Day Structural Integrity',
        body: 'Our commercial-grade installations easily withstand heavy foot traffic and dealership air conditioning, looking just as firm and vibrant on Sunday evening as Friday morning.',
      },
      {
        headline: 'Strict On-Time Delivery',
        body: 'We lock in a rock-solid commitment to schedule accuracy, entirely removing the fear of late setups or chaotic, delayed weekend event launches.',
      },
      {
        headline: 'High-End Visual Assets',
        body: 'Professional photography of your showroom installation is included free, giving your marketing lead instant high-converting content for digital ads.',
      },
    ],
  },
  process: {
    sectionHeadline: 'Three Simple Steps to a High-Traffic Showroom Event',
    steps: [
      {
        headline: 'Step #1: The Visual Analysis',
        body: 'Book your quick 15-minute call where we review your lot layout, upcoming sales goals, and map out a custom visual blueprint for the event.',
      },
      {
        headline: 'Step #2: Hands-Free Setup',
        body: 'Our commercial team arrives on-site to build your bespoke display directly on the floor, making sure everything looks perfect before your sales team hits the floor.',
      },
      {
        headline: 'Step #3: Hyper-Clean Teardown',
        body: 'Once your massive weekend promotion wraps up, our crew handles the rapid cleanup and removal, leaving your showroom floor spotless and ready for regular business.',
      },
    ],
  },
  guarantee: {
    eyebrow: 'OUR GUARANTEE',
    headline: 'The Balloonia Events 100% Love-It-Or-It-Is-Free Ironclad Guarantee',
    body: 'We stand entirely behind our custom craftsmanship and its ability to drive showroom traffic. If your custom-built installation does not perfectly match your approved design blueprint, or if you do not completely love the exciting visual impact it brings to your lot, we will fix it instantly or remove it without charging you a single penny. You take on absolute zero financial risk, zero upfront commitment, and zero stress.',
    trustPoints: [],
  },
  finalCta: {
    eyebrow: 'LIMITED SPOTS AVAILABLE',
    headline: 'Claim your unfair advantage. Limited spots per city.',
    body: "Your next major weekend promotional campaign or grand opening is far too important to risk on an unreliable local hobbyist vendor. Partner with a dedicated commercial team that takes 100% responsibility for your dealership's visual impact so you can focus entirely on guest traffic, write ups, and sales. Showroom slots for major sales weekends fill up fast, so secure your custom blueprint today.",
    bullets: [
      'Turnkey Corporate Workflow Saving Valuable Staff Labor and Clean Up Time',
      'On-Site Precision Construction Engineering Flawless, High-Stability Visual Displays',
      'Ironclad 100% On-Time Delivery Contract to Fully Eliminate Launch-Day Anxiety',
    ],
    imageSrc: '/images/final-cta/vroom-unfair-advantage.png',
    imageAlt: 'Dealership floor with a custom balloon installation showcasing new vehicles',
  },
  portfolioPhotos: [],
  clientLogos: sharedClientLogos,
  faq: [
    {
      q: 'How long will the showroom installation stay inflated?',
      a: 'We use high-density, commercial-grade materials that easily look flawless, firm, and vibrant across a full 3-day or 4-day holiday weekend sale.',
    },
    {
      q: 'Does our staff have to help with setup or cleaning?',
      a: 'No. Our turnkey service handles everything from floor template design to final sweeping. Your team focuses entirely on sales.',
    },
    {
      q: 'Can you build displays outdoors for car lot visibility?',
      a: 'Yes. We engineer massive, heavy-duty outdoor installations designed specifically to stop highway traffic and bring buyers to the lot.',
    },
    {
      q: 'How far in advance do we need to schedule a major tent sale display?',
      a: 'Weekend promotional slots book up fast. We recommend booking your 15-minute analysis call at least 7 days prior to launch.',
    },
    {
      q: 'What happens if a vehicle needs to be moved near the display?',
      a: 'Our liability-first spatial designs are built to respect your showroom floor layout, ensuring easy car placement and vehicle accessibility.',
    },
  ],
};

// ============================================================================
// /corp-offer — corporate / hospitality / gallery ICP
// ============================================================================
export const corpOffer: LPConfig = {
  route: '/corp-offer',
  title: 'Balloonia Events',
  metaDescription: 'Custom balloon installations for corporate events, brand launches, and galas. London Ontario. No deposit, no commitments, love your design or it is free.',
  microTrustCaption: 'Trusted by over 200 brands',
  microTrustAvatars: sharedMicroTrustAvatars,
  topNav: sharedTopNav,
  socialStripLabel: 'Trusted by over 200 Brands',
  socialProof: sharedSocialProof,
  hero: {
    primaryCtaLabel: 'Book Your Free 15-Minute Event Prep Call',
    primaryCtaHref: '#book',
    secondaryCtaLabel: '',
    secondaryCtaHref: '#',
    frictionKiller: 'No deposit required. No commitments. Love your custom design or it is free.',
    eyebrow: 'LIMITED SPOTS AVAILABLE',
    headline:
      'Blow Your Competitors Away & Pack Your Corporate Events with Custom, Show-Stopping Visual Experiences',
    subhead:
      'Stop hosting boring corporate events. No more settling for cheap catalog decor that makes your high-stakes launch look like a backyard party. We hand-build, install, photograph, and clean up premium custom balloon designs made just for your brand palette. It is the easiest way to grab massive crowd attention, flood your social channels with tags, and look like an absolute rockstar to your leadership team.',
    imageCaption: '',
    heroImage: '/images/hero/corp-marriott.png',
    heroImageAlt: 'Marriott hotel lobby and bar area with a navy, gold, and cream balloon garland sweeping along the ceiling and walls',
  },
  painPoint: {
    headline:
      'Your Event Decor Looks Too Ordinary & It Is Risking Your Professional Standing',
    body: 'Cheap catalog kits and uninspired decorations do not cut it in a competitive market. If your brand launch or corporate gala looks cookie-cutter, your VIP guests and high-value clients will walk away unimpressed. Balloonia Events hand-builds custom visual installations from scratch to turn your brand spaces into packed, camera-ready local landmarks, completely hands-free.',
  },
  valueProps: [
    {
      eyebrow: 'MASSIVE CROWDS',
      headline: 'Stop Blending In With Boring Arches & Get 100% Custom Brand Builds',
      body: 'We build every design completely from scratch with zero recycled props or templates. Your corporate installation will look totally exclusive, giving you the high-end look that leaves your guests talking for weeks.',
      imageSrc: '/images/value-props/corp-stop-blending-in.png',
      imageAlt: 'Custom corporate balloon installation that elevates a brand event above the ordinary',
    },
    {
      eyebrow: 'CAMERA-READY LOOKS',
      headline: 'Skip the Shiny Plastic & Get Studio-Grade Matte Materials That Pop On Camera',
      body: "Standard balloons act like mirrors, creating ugly white glares under flash photography and harsh track lighting. We source premium matte-finish materials that absorb light perfectly. This ensures your installation looks stunning in person and translates to flawless digital marketing assets for your brand's social feed.",
      imageSrc: '/images/value-props/corp-drive-intense.png',
      imageAlt: 'Studio-grade matte balloon finishes photographing cleanly under event lighting',
    },
    {
      eyebrow: 'ZERO STRESS',
      headline: 'Put Your Feet Up While We Handle Everything From Design to Midnight Teardown',
      body: 'Your internal team already has enough on their plate, so let us do the heavy lifting. We handle the design, loading docks, on-site setup, and prompt late-night cleanup so you can focus entirely on your VIP clients and guests.',
      imageSrc: '/images/value-props/corp-entire-teardown.png',
      imageAlt: 'Full turnkey corporate event service from design through midnight teardown',
    },
  ],
  differentiators: {
    sectionHeadline:
      '6 Unfair Advantages Designed Exclusively to Protect Your Venue, Your Budget, & Your Professional Reputation',
    items: [
      {
        headline: 'Fully Custom Designs',
        body: 'Every installation is engineered entirely from scratch without templates or used frames, guaranteeing your brand is never associated with amateur party decor.',
      },
      {
        headline: 'Precise Brand Color Matching',
        body: 'We treat your corporate brand book with absolute respect. We custom-layer our materials to match your exact palette and Pantone tones for a flawless look.',
      },
      {
        headline: 'Absolute Turnkey Teardown',
        body: 'Our white-glove service includes a rapid dismantle team. We arrive precisely when your event ends to strike the structure so your staff never has to handle trash.',
      },
      {
        headline: 'Studio-Grade Matte Finishes',
        body: 'We source exclusive matte-finish materials that eliminate harsh lighting glares, making your event look incredible in person and publication-ready on camera.',
      },
      {
        headline: 'Flake-Proof Scheduling Guarantee',
        body: 'We run on a strict operational timeline, finishing your setup hours before your executives or first guests arrive, entirely eliminating pre-event panic.',
      },
      {
        headline: 'Liability-First Engineering',
        body: 'We utilize non-destructive, load-tested rigging methods specifically engineered to respect strict venue guidelines and keep your security deposit completely safe.',
      },
    ],
  },
  process: {
    sectionHeadline: 'Three Simple Steps to a Flawless, High-Impact Corporate Event',
    steps: [
      {
        headline: 'Step #1: The Prep Call',
        body: 'Book your brief 15-minute session where we map out a fixed-price budget blueprint and a custom spatial design tailored to your venue layout and goals.',
      },
      {
        headline: 'Step #2: Flawless Setup',
        body: 'Our professional corporate crew arrives on-site to build your bespoke sculpture, completing the build well before the doors open so everything is camera-ready.',
      },
      {
        headline: 'Step #3: Zero-Trace Dismantle',
        body: 'Once your highly successful event concludes, our team returns to quickly dismantle and remove the entire structure, leaving the venue completely spotless.',
      },
    ],
  },
  guarantee: {
    eyebrow: 'OUR GUARANTEE',
    headline: 'The Balloonia Events 100% Love-It-Or-It-Is-Free Ironclad Guarantee',
    body: 'We stand entirely behind our custom craftsmanship and its ability to transform your corporate event. If your custom-built installation does not perfectly match your approved blueprint, or if you do not completely love the jaw-dropping impact it creates for your brand, we will fix it on the spot or remove it immediately without charging you a single penny. You take on absolute zero financial risk, zero upfront commitment, and zero stress.',
    trustPoints: [],
  },
  finalCta: {
    eyebrow: 'LIMITED SPOTS AVAILABLE',
    headline: 'Claim your unfair advantage. Limited spots per city.',
    body: 'Your next brand launch or corporate event is too important to risk on a last-minute party decorator. Custom material sourcing and precision venue mapping take time, and we strictly limit our weekly corporate bookings to guarantee our signature white-glove focus. Claim your spot, pack your event, and blow your guests away risk-free today.',
    bullets: [
      '100% Bespoke Spatial Design Custom-Built from Scratch to Make Your Brand Stand Out',
      'Full Turnkey Setup & Zero-Trace Dismantle So Your Team Handles Zero Logistics',
      'Guaranteed Venue Policy Compliance with Non-Destructive Spatial Engineering',
    ],
    imageSrc: '/images/final-cta/corp-claim-your-unfair-advantage.png',
    imageAlt: 'Corporate event with a luxury matte-finish balloon installation',
  },
  portfolioPhotos: [],
  clientLogos: sharedClientLogos,
  faq: [
    {
      q: 'How long does the installation and dismantle process take?',
      a: 'Most corporate installations take 2 to 4 hours to build on-site. Dismantle takes under an hour.',
    },
    {
      q: 'Can you match our exact company brand colors?',
      a: 'Yes. We custom-layer specialized materials to perfectly mirror your corporate palette and brand guidelines.',
    },
    {
      q: 'Are you insured and venue-compliant?',
      a: 'Yes. We utilize non-destructive, liability-first rigging methods designed to protect luxury hotels and strict commercial spaces.',
    },
    {
      q: 'Is the professional photography included?',
      a: 'Yes. As part of our current campaign, high-end photography of the installation is built directly into your package.',
    },
    {
      q: 'What if our event schedule or load-in time changes?',
      a: "We operate with zero rigid contracts. Just let us know and we will adapt directly to your venue's loading dock timetable.",
    },
  ],
};
