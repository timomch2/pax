'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PILLAR_LABELS } from '@/lib/marketplace';
import { ShieldAlert, EyeOff, Eye, Check, Loader2 } from 'lucide-react';

type Listing = {
  id: string; title: string; description: string; pillar: string; isPublished: boolean;
  moderationStatus: string; moderationReason: string | null; moderationCategories: string | null;
  vendor: { corporateName: string; tradingName: string | null };
};

export function AdminListingModeration() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function fetchFlagged() {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/admin/listings?flagged=true');
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch { /* noop */ }
    setLoading(false);
  }

  useEffect(() => { fetchFlagged(); }, []);

  async function act(listingId: string, action: string) {
    setActing(listingId);
    try {
      await fetch('/api/marketplace/admin/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, action }),
      });
      await fetchFlagged();
    } catch { /* noop */ }
    setActing(null);
  }

  function categories(raw: string | null): string[] {
    if (!raw) return [];
    try { const a = JSON.parse(raw); return Array.isArray(a) ? a.map(String) : []; } catch { return []; }
  }

  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-semibold text-[#1A2332]">AI-Flagged Listings</h3>
      </div>
      <p className="text-[11px] text-gray-500 mb-4">The AI only flags — it never hides a listing. Flagged listings stay live until you decide. Unpublish to remove from the marketplace, or clear the flag if it’s a false positive.</p>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#2ABFB0]" /></div>
      ) : listings.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">No flagged listings — all clear.</p>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1A2332] truncate">{l.title}</p>
                  <p className="text-[11px] text-gray-500">{l.vendor.tradingName || l.vendor.corporateName} · {PILLAR_LABELS[l.pillar]}</p>
                  {l.moderationReason && <p className="text-xs text-red-300 mt-1">{l.moderationReason}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {categories(l.moderationCategories).map((c) => (
                      <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-300">{c}</span>
                    ))}
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${l.isPublished ? 'text-[#2ABFB0] bg-[#2ABFB0]/10' : 'text-gray-400 bg-gray-400/10'}`}>
                  {l.isPublished ? 'Live' : 'Unpublished'}
                </span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {l.isPublished ? (
                  <Button size="sm" variant="outline" onClick={() => act(l.id, 'unpublish')} disabled={acting === l.id}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <EyeOff className="w-3 h-3 mr-1" /> Unpublish
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => act(l.id, 'publish')} disabled={acting === l.id}
                    className="border-[#2ABFB0]/30 text-[#2ABFB0] hover:bg-[#2ABFB0]/10">
                    <Eye className="w-3 h-3 mr-1" /> Re-publish
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => act(l.id, 'clearFlag')} disabled={acting === l.id}
                  className="border-gray-500/30 text-gray-700 hover:bg-gray-500/10">
                  {acting === l.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />} Clear Flag (false positive)
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
