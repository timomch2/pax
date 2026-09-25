'use client';

import { SERVICE_CATALOG } from '@/lib/service-navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SERVICE_COLORS = { practice: '#B26F09', talent: '#6A5CBF', market: '#C81E1E', community: '#6A5CBF', innovation: '#B26F09', investment: '#1F7A74', safety: '#C81E1E' };
const MODULES = SERVICE_CATALOG.map(service => ({ label: service.label, href: service.overviewPath, color: SERVICE_COLORS[service.id] }));

export function ModuleNavStrip() {
  const pathname = usePathname();

  return (
    <div className="border-t border-black/5 bg-[#F1EEE8]/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
          <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-gray-400 mr-2 flex-shrink-0 hidden sm:block">Services</span>
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
