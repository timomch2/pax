import { productUrl } from '@/lib/product-hosts';

export type ServiceId = 'home' | 'practice' | 'talent' | 'market' | 'community';

/** Service destinations share the configured product origins used by authentication. */
export function serviceLinks() {
  return [
    { id: 'home' as const, label: 'Home', href: productUrl('main', '/'), profileHref: productUrl('main', '/dashboard/profile') },
    { id: 'practice' as const, label: 'Practitioner', href: productUrl('practice', '/practice'), profileHref: productUrl('practice', '/practice/profile') },
    { id: 'talent' as const, label: 'Talent Search', href: productUrl('talent', '/talent'), profileHref: productUrl('talent', '/talent/profile') },
    { id: 'market' as const, label: 'Market', href: productUrl('main', '/marketplace'), profileHref: productUrl('main', '/marketplace/profile') },
    { id: 'community' as const, label: 'Pax Exchange', href: productUrl('main', '/community'), profileHref: productUrl('main', '/community/profile') },
  ];
}

/** Match whole route segments so similarly named pages cannot select another profile. */
export function serviceForPath(path: string): ServiceId {
  const within = (prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
  if (within('/practice') || within('/dashboard/practice')) return 'practice';
  if (within('/talent')) return 'talent';
  if (within('/marketplace')) return 'market';
  if (within('/community') || within('/knowledge')) return 'community';
  return 'home';
}
