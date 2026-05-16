export function buildTitle(topic: string): string {
  return `${topic} | Balloonia Events London Ontario`;
}

export function canonicalFor(pathname: string, siteUrl = 'https://balloonia.events'): string {
  const path = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  return `${siteUrl}${path}`;
}
