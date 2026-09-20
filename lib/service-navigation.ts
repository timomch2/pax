import { productUrl } from '@/lib/product-hosts';

export type ServiceId = 'home' | 'practice' | 'talent' | 'market' | 'community';

export const SERVICE_PROFILE_PATHS: Record<ServiceId, string> = {
  home: '/dashboard/profile', practice: '/practice/profile', talent: '/talent/profile', market: '/marketplace/profile', community: '/community/profile',
};

/** Service destinations share the configured product origins used by authentication. */
export function serviceLinks() {
  return [
    { id: 'home' as const, label: 'Home', href: productUrl('main', '/'), profileHref: productUrl('main', SERVICE_PROFILE_PATHS.home) },
    { id: 'practice' as const, label: 'Practitioner', href: productUrl('practice', '/practice'), profileHref: productUrl('practice', SERVICE_PROFILE_PATHS.practice) },
    { id: 'talent' as const, label: 'Talent Search', href: productUrl('talent', '/talent'), profileHref: productUrl('talent', SERVICE_PROFILE_PATHS.talent) },
    { id: 'market' as const, label: 'Market', href: productUrl('main', '/marketplace'), profileHref: productUrl('main', SERVICE_PROFILE_PATHS.market) },
    { id: 'community' as const, label: 'Pax Exchange', href: productUrl('main', '/community'), profileHref: productUrl('main', SERVICE_PROFILE_PATHS.community) },
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
