'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VendorOnboardingForm } from '@/components/marketplace/vendor-onboarding-form';
import { PILLAR_LABELS, VENDOR_STATUS_LABELS, LISTING_TYPE_LABELS } from '@/lib/marketplace';
import { Button } from '@/components/ui/button';
import { Plus, Package, Loader2, BadgeCheck, Clock, XCircle, Snowflake } from 'lucide-react';
import Link from 'next/link';

type Listing = { id: string; title: string; pillar: string; listingType: string; isPublished: boolean; createdAt: string };
type VendorData = {
  id: string; corporateName: string; tradingName: string | null;
  status: string; primaryPillar: string; adminNotes: string | null;
  listings: Listing[];
};

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  PENDING: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  APPROVED: { icon: BadgeCheck, color: 'text-[#2ABFB0]', bg: 'bg-[#2ABFB0]/10' },
  REJECTED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  FROZEN: { icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-400/10' },
};

export default function VendorPage() {
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/marketplace/vendors')
      .then(r => r.json())
      .then(d => { setVendor(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#2ABFB0]" /></div>;

  // No vendor profile yet — show onboarding
  if (!vendor) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A2332]">Become a Vendor</h1>
          <p className="text-sm text-gray-400 mt-1">Complete the application below to list your products and services on PAX Marketplace</p>
        </div>
        <VendorOnboardingForm />
      </div>
    );
  }

  const sc = statusConfig[vendor.status] || statusConfig.PENDING;
  const StatusIcon = sc.icon;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A2332]">Vendor Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">{vendor.tradingName || vendor.corporateName}</p>
      </div>

      {/* Status card */}
      <div className={`p-4 rounded-xl border border-[#E4E7EC] ${sc.bg} mb-6`}>
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-6 h-6 ${sc.color}`} />
          <div>
            <p className={`text-sm font-semibold ${sc.color}`}>{VENDOR_STATUS_LABELS[vendor.status]}</p>
            <p className="text-xs text-gray-400">
              {vendor.status === 'PENDING' && 'Your application is under review. You will be notified once approved.'}
              {vendor.status === 'APPROVED' && 'Your account is active. You can create and manage listings.'}
              {vendor.status === 'REJECTED' && `Application rejected. ${vendor.adminNotes || 'Contact support for details.'}`}
              {vendor.status === 'FROZEN' && `Account frozen. ${vendor.adminNotes || 'Ensure your permits are up to date.'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Listings */}
      {vendor.status === 'APPROVED' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1A2332]">Your Listings</h2>
            <Link href="/marketplace/vendor/new-listing">
              <Button size="sm" className="bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90">
                <Plus className="w-4 h-4 mr-1" /> New Listing
              </Button>
            </Link>
          </div>

          {vendor.listings.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-[#E4E7EC] bg-white">
              <Package className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No listings yet</p>
              <p className="text-xs text-gray-500">Create your first listing to start reaching buyers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vendor.listings.map(l => (
                <Link key={l.id} href={`/marketplace/${l.id}`}
                  className="block p-4 rounded-xl border border-[#E4E7EC] bg-white hover:border-[#2ABFB0]/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#1A2332]">{l.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{PILLAR_LABELS[l.pillar]} · {LISTING_TYPE_LABELS[l.listingType]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${l.isPublished ? 'text-[#2ABFB0] bg-[#2ABFB0]/10' : 'text-gray-500 bg-gray-500/10'}`}>
                        {l.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
