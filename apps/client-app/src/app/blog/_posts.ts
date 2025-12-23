export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  readingTime: string;
  tags: string[];
  heroAlt: string;
  heroSrc: string;
  publishedAt: string;
  content: Array<{ type: 'p' | 'h2'; text: string }>;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'hello-world',
    title: 'Hello from a Dynamic Route',
    excerpt: 'A simple /blog/[slug] page you can navigate between to validate route normalization.',
    readingTime: '3 min',
    tags: ['routing', 'sdk'],
    heroAlt: 'Abstract gradient hero used as LCP candidate',
    heroSrc: '/cwv-hero.svg',
    publishedAt: '2025-12-19',
    content: [
      { type: 'p', text: 'This page is rendered from the App Router dynamic segment /blog/[slug].' },
      { type: 'p', text: 'Use the links in the header to navigate between slugs and watch route/path values.' },
      { type: 'h2', text: 'Why this exists' },
      {
        type: 'p',
        text: 'We want the SDK to attach a normalized route template (e.g. /blog/[slug]) while keeping the concrete path (e.g. /blog/hello-world).'
      }
    ]
  },
  {
    slug: 'lcp-playground',
    title: 'LCP Playground: Big Hero + Content',
    excerpt: 'A page with a prominent hero image and enough layout to make LCP easier to observe.',
    readingTime: '5 min',
    tags: ['lcp', 'images', 'perf'],
    heroAlt: 'Abstract gradient hero used as LCP candidate',
    heroSrc: '/cwv-hero.svg',
    publishedAt: '2025-12-19',
    content: [
      { type: 'p', text: 'The hero image above is intentionally large to become the LCP candidate.' },
      {
        type: 'p',
        text: 'Scroll a bit and interact with the page; web-vitals will usually report LCP after user input.'
      },
      { type: 'h2', text: 'Try navigating' },
      { type: 'p', text: 'Navigate between slugs: the path changes, but the route should stay /blog/[slug].' }
    ]
  },
  {
    slug: 'routing-and-metrics',
    title: 'Routing + Metrics: What We Attach',
    excerpt: 'What goes into the payload: route template vs concrete path, plus session behavior on page views.',
    readingTime: '4 min',
    tags: ['metrics', 'events'],
    heroAlt: 'Abstract gradient hero used as LCP candidate',
    heroSrc: '/cwv-hero.svg',
    publishedAt: '2025-12-19',
    content: [
      { type: 'p', text: 'Each page view rotates the in-memory session id.' },
      { type: 'p', text: 'CWV sampling is primed per page view so all vitals for that view are included/excluded together.' },
      { type: 'h2', text: 'Route vs path' },
      { type: 'p', text: 'Route is the template (/blog/[slug]). Path is the concrete URL (/blog/routing-and-metrics).' }
    ]
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}


