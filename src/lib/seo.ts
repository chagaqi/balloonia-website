export function buildTitle(topic: string): string {
  // Topics that already carry the brand (the homepage) skip the suffix so the
  // title doesn't double up on "Balloonia" and "London Ontario".
  if (topic.toLowerCase().includes('balloonia')) return topic;
  return `${topic} | Balloonia Events London Ontario`;
}

export function canonicalFor(pathname: string, siteUrl = 'https://balloonia.events'): string {
  const path = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  return `${siteUrl}${path}`;
}
