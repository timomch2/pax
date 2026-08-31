'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PILLAR_LABELS, PILLAR_DESCRIPTIONS, LISTING_TYPE_LABELS, PILLAR_LISTING_TYPES, REGULATORY_DISCLAIMER } from '@/lib/marketplace';
import { Search, Star, Cpu, ShieldCheck, Microscope, Pill, ChevronLeft, ChevronRight, Package, Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const ICON_MAP: Record<string, React.ElementType> = { Cpu, ShieldCheck, Microscope, Pill };
import { PILLAR_ICONS } from '@/lib/marketplace';

type Listing = {
  id: string; title: string; description: string; pillar: string; listingType: string;
  priceDisplay: string | null; avgRating: number | null; reviewCount: number;
  imageUrls: string | null; manufacturer: string | null; regionFocus: string | null;
  vendor: { corporateName: string; tradingName: string | null; country: string; status: string };
};

export function MarketplaceBrowse() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pillar, setPillar] = useState('');
  const [listingType, setListingType] = useState('');
  const [region, setRegion] = useState('');
  const [regionDebounced, setRegionDebounced] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Category options depend on selected pillar (else all listing types)
  const categoryOptions = pillar
    ? (PILLAR_LISTING_TYPES[pillar] || [])
    : Object.keys(LISTING_TYPE_LABELS);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setRegionDebounced(region), 400);
    return () => clearTimeout(t);
  }, [region]);

  // Reset category when it is no longer valid for the selected pillar
  useEffect(() => {
    if (listingType && !categoryOptions.includes(listingType)) setListingType('');
  }, [pillar]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (pillar) params.set('pillar', pillar);
      if (listingType) params.set('type', listingType);
      if (regionDebounced) params.set('region', regionDebounced);
      if (searchDebounced) params.set('search', searchDebounced);
      params.set('page', String(page));
      const res = await fetch(`/api/marketplace/listings?${params}`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { console.error('Failed to fetch listings'); }
    setLoading(false);
  }, [pillar, listingType, regionDebounced, searchDebounced, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [pillar, listingType, regionDebounced, searchDebounced]);

  return (
    <div className="space-y-6">
      {/* Regulatory disclaimer */}
      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
        <p className="text-xs text-amber-400/80 leading-relaxed">{REGULATORY_DISCLAIMER}</p>
      </div>

      {/* Pillar filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(PILLAR_LABELS).map(([key, label]) => {
          const IconComp = ICON_MAP[PILLAR_ICONS[key]] || Package;
          return (
            <button key={key} onClick={() => setPillar(p => p === key ? '' : key)}
              className={`p-4 rounded-xl border text-left transition-all ${
                pillar === key ? 'border-[#2ABFB0] bg-[#2ABFB0]/10' : 'border-[#E4E7EC] bg-white hover:border-gray-600'
              }`}>
              <IconComp className={`w-5 h-5 mb-2 ${pillar === key ? 'text-[#2ABFB0]' : 'text-gray-500'}`} />
              <p className={`text-sm font-medium ${pillar === key ? 'text-[#2ABFB0]' : 'text-[#1A2332]'}`}>{label}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{PILLAR_DESCRIPTIONS[key]}</p>
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, services, vendors..."
            className="pl-10 bg-white border-[#E4E7EC] text-[#1A2332]" />
        </div>
        <select value={listingType} onChange={e => setListingType(e.target.value)}
          className="h-10 rounded-md border border-[#E4E7EC] bg-white text-sm text-[#1A2332] px-3 focus:outline-none focus:border-[#2ABFB0]">
          <option value="">All categories</option>
          {categoryOptions.map(t => (
            <option key={t} value={t}>{LISTING_TYPE_LABELS[t] || t}</option>
          ))}
        </select>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input value={region} onChange={e => setRegion(e.target.value)} placeholder="Region"
            className="pl-9 w-full sm:w-40 bg-white border-[#E4E7EC] text-[#1A2332]" />
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-400">{total} listing{total !== 1 ? 's' : ''} found</p>

      {/* Listings grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#2ABFB0]" /></div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No listings found</p>
          <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(listing => {
            const images = listing.imageUrls ? JSON.parse(listing.imageUrls) : [];
            return (
              <button key={listing.id} onClick={() => router.push(`/marketplace/${listing.id}`)}
                className="rounded-xl border border-[#E4E7EC] bg-white overflow-hidden hover:border-[#2ABFB0]/40 transition-all text-left group">
                <div className="relative aspect-[16/10] bg-[#FAF8F5]">
                  {images[0] ? (
                    <Image src={images[0]} alt={listing.title} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><Package className="w-10 h-10 text-gray-700" /></div>
                  )}
                  {listing.vendor.status === 'APPROVED' && (
                    <div className="absolute top-2 left-2 bg-[#2ABFB0] text-[#0B0F1A] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-[#FAF8F5]/80 text-[10px] text-gray-700 px-2 py-0.5 rounded">
                    {LISTING_TYPE_LABELS[listing.listingType] || listing.listingType}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-[#1A2332] group-hover:text-[#2ABFB0] transition-colors line-clamp-2">{listing.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{listing.vendor.tradingName || listing.vendor.corporateName} · {listing.vendor.country}</p>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{listing.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    {listing.priceDisplay && <span className="text-sm font-bold text-[#2ABFB0]">{listing.priceDisplay}</span>}
                    {listing.avgRating && (
                      <span className="flex items-center gap-1 text-xs text-[#FBBF24]">
                        <Star className="w-3 h-3 fill-current" /> {listing.avgRating.toFixed(1)} ({listing.reviewCount})
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="border-[#E4E7EC] text-gray-400"><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-gray-400 flex items-center">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="border-[#E4E7EC] text-gray-400"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  );
}
