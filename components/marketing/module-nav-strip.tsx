'use client';

import { ProductSwitcher } from '@/components/product-switcher';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MODULES = [
  { label: 'GPS Profiles', href: '/modules/gps-profiles', color: '#1F7A74' },
  { label: 'Innovation Hub', href: '/modules/innovation-hub', color: '#B26F09' },
  { label: 'Talent Marketplace', href: '/modules/talent-marketplace', color: '#6A5CBF' },
  { label: 'Product Marketplace', href: '/modules/product-marketplace', color: '#C81E1E' },
  { label: 'Investment Platform', href: '/modules/investment-platform', color: '#1F7A74' },
  { label: 'Practitioners Hub', href: '/modules/practitioners-hub', color: '#B26F09' },
  { label: 'Community & Debate', href: '/modules/community-debate-hub', color: '#6A5CBF' },
  { label: 'Safety Hub', href: '/safety', color: '#C81E1E' },
];

export function ModuleNavStrip() {
  const pathname = usePathname();

  return (
    <div className="border-t border-black/5 bg-[#F1EEE8]/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <ProductSwitcher />
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
          <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-gray-400 mr-2 flex-shrink-0 hidden sm:block">Modules</span>
          {MODULES.map((m) => {
            const active = pathname === m.href || (m.href !== '/safety' && pathname?.startsWith(m.href));
            return (
              <Link
                key={m.href}
                href={m.href}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium no-underline transition-all"
                style={
                  active
                    ? { background: m.color, color: '#fff', boxShadow: `0 2px 8px ${m.color}40` }
                    : { color: '#6B7280' }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = `${m.color}14`;
                    e.currentTarget.style.color = m.color;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6B7280';
                  }
                }}
              >
                {m.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
