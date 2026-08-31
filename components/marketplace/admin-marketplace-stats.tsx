'use client';

import { useEffect, useState } from 'react';
import { Store, Package, ShieldAlert, Loader2, Building2 } from 'lucide-react';

type Stats = {
  vendors: { total: number; byStatus: Record<string, number> };
  listings: { total: number; published: number; flagged: number };
  buyers: { total: number };
  marketplacePolicy: { transactionsOnPlatform: false; platformFees: false };
};

export function AdminMarketplaceStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/marketplace/admin/stats');
        if (res.ok) setStats(await res.json());
      } catch { /* noop */ }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#2ABFB0]" /></div>;
  }
  if (!stats) return null;

  const cards = [
    { label: 'Vendors', value: String(stats.vendors.total), sub: `${stats.vendors.byStatus.APPROVED || 0} approved · ${stats.vendors.byStatus.PENDING || 0} pending`, icon: Store, color: 'text-[#2ABFB0]' },
    { label: 'Live Listings', value: String(stats.listings.published), sub: `${stats.listings.total} total`, icon: Package, color: 'text-purple-400' },
    { label: 'Flagged for Review', value: String(stats.listings.flagged), sub: stats.listings.flagged > 0 ? 'Needs human review' : 'All clear', icon: ShieldAlert, color: stats.listings.flagged > 0 ? 'text-red-400' : 'text-gray-400' },
    { label: 'Institutional Buyers', value: String(stats.buyers.total), sub: 'Registered procurers', icon: Building2, color: 'text-amber-400' },
    { label: 'Platform Transactions', value: 'Off', sub: 'Buyers transact with vendors', icon: Building2, color: 'text-gray-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-[#E4E7EC] bg-white p-4">
          <div className="flex items-center justify-between">
            <c.icon className={`w-4 h-4 ${c.color === 'text-gold-400' ? 'text-[#FBBF24]' : c.color}`} />
          </div>
          <p className="mt-2 text-xl font-bold text-[#1A2332] leading-tight">{c.value}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{c.label}</p>
          <p className="text-[10px] text-gray-500 mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
