import { productUrl } from '@/lib/product-hosts';

/** Stable enrollment keys; display names do not change stored account choices. */
export const SERVICE_CATALOG = [
  { id: 'practice', overviewPath: '/modules/practitioners-hub', label: 'Medical Practitioner', path: '/practice', product: 'practice', profilePath: '/practice/profile' },
  { id: 'talent', overviewPath: '/modules/talent-marketplace', label: 'Talent Marketplace', path: '/talent', product: 'talent', profilePath: '/talent/profile' },
  { id: 'market', overviewPath: '/modules/product-marketplace', label: 'Product Marketplace', path: '/marketplace', product: 'main', profilePath: '/marketplace/profile' },
  { id: 'community', overviewPath: '/modules/community-debate-hub', label: 'Knowledge Exchange', path: '/community', product: 'main', profilePath: '/community/profile' },
  { id: 'innovation', overviewPath: '/modules/innovation-hub', label: 'Innovation Hub', path: '/innovator', product: 'main', profilePath: null },
  { id: 'investment', overviewPath: '/modules/investment-platform', label: 'Investment Platform', path: '/investor', product: 'main', profilePath: null },
  { id: 'safety', overviewPath: '/safety', label: 'Pharmacovigilance', path: '/safety', product: 'main', profilePath: null },
] as const;

export type ServiceId = 'home' | typeof SERVICE_CATALOG[number]['id'];
export const SERVICE_PROFILE_PATHS: Record<ServiceId, string | null> = {
  home: '/dashboard/profile', practice: '/practice/profile', talent: '/talent/profile', market: '/marketplace/profile', community: '/community/profile',
  innovation: null, investment: null, safety: null,
};

/** Resolve product origins server-side; the public catalog contains no personal data. */
export function serviceLinks() {
  return [
    { id: 'home' as const, label: 'Home', href: productUrl('main', '/'), profileHref: productUrl('main', '/dashboard/profile') },
    ...SERVICE_CATALOG.map(service => ({
      id: service.id, label: service.label, href: productUrl(service.product, service.path),
      profileHref: service.profilePath ? productUrl(service.product, service.profilePath) : null,
    })),
  ];
}

/** Match whole segments, preserving existing aliases without creating new workspaces. */
export function serviceForPath(path: string): ServiceId {
  const within = (prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
  if (within('/dashboard/practice')) return 'practice';
  if (within('/knowledge')) return 'community';
  if (within('/admin/safety') || within('/policymaker/safety')) return 'safety';
  return SERVICE_CATALOG.find(service => within(service.path))?.id ?? 'home';
}
