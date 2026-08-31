'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PILLAR_LABELS, LISTING_TYPE_LABELS, REGULATORY_DISCLAIMER } from '@/lib/marketplace';
import { ShieldCheck, Star, Package, Mail, Phone, MapPin, Building2, ExternalLink, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

type Review = {
  id: string; rating: number; comment: string | null;
  reviewer: { id: string; name: string; image: string | null; role: string; tier: string };
  createdAt: string;
};

type ListingData = {
  id: string; title: string; description: string; pillar: string; listingType: string;
  features: string | null; catalogNumber: string | null; manufacturer: string | null;
  regionFocus: string | null; externalUrl: string | null; imageUrls: string | null;
  priceDisplay: string | null;
  avgRating: number | null; reviewCount: number; createdAt: string;
  vendor: { id: string; corporateName: string; tradingName: string | null; country: string; contactEmail: string; contactPhone: string; status: string };
  reviews: Review[];
};

export function ListingDetail({ listingId }: { listingId: string }) {
  const { data: session } = useSession() || {};
  const [listing, setListing] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  useEffect(() => {
    fetch(`/api/marketplace/listings/${listingId}`)
      .then(r => r.json())
      .then(data => { setListing(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [listingId]);

  async function submitReview() {
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment || null }),
      });
      if (res.ok) {
        const updated = await fetch(`/api/marketplace/listings/${listingId}`);
        const data = await updated.json();
        setListing(data);
        setReviewComment('');
      }
    } catch { /* noop */ }
    setSubmittingReview(false);
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#2ABFB0]" /></div>;
  if (!listing) return <div className="text-center py-16 text-gray-400">Listing not found</div>;

  const images = listing.imageUrls ? JSON.parse(listing.imageUrls) : [];
  const features = listing.features ? JSON.parse(listing.features) : [];

  return (
    <div className="space-y-6">
      {/* Regulatory disclaimer */}
      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
        <p className="text-xs text-amber-400/80 leading-relaxed">{REGULATORY_DISCLAIMER}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-white">
            {images[0] ? (
              <Image src={images[0]} alt={listing.title} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full"><Package className="w-16 h-16 text-gray-700" /></div>
            )}
          </div>

          {/* Title & meta */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#2ABFB0]/10 text-[#2ABFB0] font-medium">{PILLAR_LABELS[listing.pillar]}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white text-gray-400">{LISTING_TYPE_LABELS[listing.listingType]}</span>
              {listing.vendor.status === 'APPROVED' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ABFB0] text-[#0B0F1A] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Vendor
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[#1A2332]">{listing.title}</h1>
            <div className="flex items-center gap-4 mt-3">
              {listing.priceDisplay && <span className="text-lg font-bold text-[#2ABFB0]">{listing.priceDisplay}</span>}
              {listing.avgRating && (
                <span className="flex items-center gap-1 text-sm text-[#FBBF24]">
                  <Star className="w-4 h-4 fill-current" /> {listing.avgRating.toFixed(1)} ({listing.reviewCount} review{listing.reviewCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="p-5 rounded-xl bg-white border border-[#E4E7EC]">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Description</h3>
            <p className="text-sm text-gray-400 whitespace-pre-line">{listing.description}</p>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <div className="p-5 rounded-xl bg-white border border-[#E4E7EC]">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Features</h3>
              <ul className="space-y-2">
                {features.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-[#2ABFB0] mt-0.5">•</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Specs */}
          {(listing.catalogNumber || listing.manufacturer || listing.regionFocus) && (
            <div className="p-5 rounded-xl bg-white border border-[#E4E7EC]">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Specifications</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {listing.catalogNumber && <div><span className="text-gray-500">Catalog #:</span> <span className="text-gray-700">{listing.catalogNumber}</span></div>}
                {listing.manufacturer && <div><span className="text-gray-500">Manufacturer:</span> <span className="text-gray-700">{listing.manufacturer}</span></div>}
                {listing.regionFocus && <div><span className="text-gray-500">Region:</span> <span className="text-gray-700">{listing.regionFocus}</span></div>}
              </div>
            </div>
          )}

          {/* External link */}
          {listing.externalUrl && (
            <a href={listing.externalUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#2ABFB0] hover:underline">
              <ExternalLink className="w-4 h-4" /> Visit vendor&apos;s external portal
            </a>
          )}

          {/* Reviews section */}
          <div className="p-5 rounded-xl bg-white border border-[#E4E7EC]">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Reviews ({listing.reviewCount})</h3>

            {session?.user && (
              <div className="mb-6 p-4 rounded-lg bg-[#FAF8F5] border border-[#E4E7EC]">
                <p className="text-xs text-gray-400 mb-2">Leave a review</p>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setReviewRating(s)}>
                      <Star className={`w-5 h-5 ${s <= (hoverRating || reviewRating) ? 'text-[#FBBF24] fill-current' : 'text-gray-600'}`} />
                    </button>
                  ))}
                </div>
                <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share your experience..." rows={2}
                  className="bg-white border-[#E4E7EC] text-[#1A2332] text-sm mb-2" />
                <Button size="sm" onClick={submitReview} disabled={submittingReview} className="bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90">
                  {submittingReview ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />} Submit
                </Button>
              </div>
            )}

            {listing.reviews.length === 0 ? (
              <p className="text-sm text-gray-500">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {listing.reviews.map(review => (
                  <div key={review.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2ABFB0]/20 flex items-center justify-center text-xs text-[#2ABFB0] font-bold flex-shrink-0">
                      {review.reviewer.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#1A2332] font-medium">{review.reviewer.name}</span>
                        <span className="flex items-center gap-0.5 text-xs text-[#FBBF24]">
                          {Array.from({ length: review.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                        </span>
                      </div>
                      {review.comment && <p className="text-xs text-gray-400 mt-1">{review.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Vendor info */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-white border border-[#E4E7EC] sticky top-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#2ABFB0]" /> Vendor
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-[#1A2332] font-medium">{listing.vendor.tradingName || listing.vendor.corporateName}</p>
              {listing.vendor.status === 'APPROVED' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ABFB0]/15 text-[#2ABFB0] font-semibold flex items-center gap-1 border border-[#2ABFB0]/30">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            {listing.vendor.tradingName && <p className="text-xs text-gray-500">{listing.vendor.corporateName}</p>}
            {listing.vendor.status === 'APPROVED' && (
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">PAX has verified this vendor’s legal registration, operating licence and regulatory documents. Verification is renewed annually.</p>
            )}
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400"><MapPin className="w-3 h-3" /> {listing.vendor.country}</div>
              <div className="flex items-center gap-2 text-gray-400"><Mail className="w-3 h-3" />
                <a href={`mailto:${listing.vendor.contactEmail}`} className="hover:text-[#2ABFB0] transition-colors">
                  <span suppressHydrationWarning>{listing.vendor.contactEmail}</span>
                </a>
              </div>
              <div className="flex items-center gap-2 text-gray-400"><Phone className="w-3 h-3" />
                <span suppressHydrationWarning>{listing.vendor.contactPhone}</span>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-[#FAF8F5] border border-[#E4E7EC]">
              <p className="text-[10px] text-gray-500 leading-relaxed">All negotiations, contracts, and payments occur directly between you and this vendor. PAX is a passive intermediary and assumes no liability.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
