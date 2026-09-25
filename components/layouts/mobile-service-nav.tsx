'use client';

import { House, Scale, Users, Store, MoreHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import type { ProductsResponse } from '@/components/product-switcher';

/** Compact reference navigation, with origins supplied by the shared product registry. */
export function MobileServiceNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname() || '';
  const { data } = useSWR<ProductsResponse>('/api/products', (url: string) => fetch(url).then(response => response.json()));
  const originLink = (id: string, fallback: string) => data?.services.find(service => service.id === id)?.href || fallback;
  const items = [
    { label: 'Home', href: data?.homeHref || '/dashboard/feed', active: pathname === '/dashboard/feed', icon: House },
    { label: 'Debates', href: originLink('community', '/community'), active: /^\/(community|knowledge)(\/|$)/.test(pathname), icon: Scale },
    { label: 'Talent', href: originLink('talent', '/talent'), active: /^\/talent(\/|$)/.test(pathname), icon: Users },
    { label: 'Market', href: originLink('market', '/marketplace'), active: /^\/marketplace(\/|$)/.test(pathname), icon: Store },
  ];
  return <nav aria-label="Mobile PAX navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
    {items.map(({ label, href, active, icon: Icon }) => <a key={label} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Icon className="h-5 w-5" aria-hidden="true" />{label}</a>)}
    <button type="button" onClick={onMore} aria-label="More navigation" className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:bg-muted"><MoreHorizontal className="h-5 w-5" aria-hidden="true" />More</button>
  </nav>;
}
