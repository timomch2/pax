export const dynamic = 'force-dynamic';

import { MarketplaceBrowse } from '@/components/marketplace/marketplace-browse';

export default function MarketplacePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A2332]">Product Marketplace</h1>
        <p className="text-sm text-gray-400 mt-1">Discover trusted public-health innovations, tools, and services across four pillars</p>
      </div>
      <MarketplaceBrowse />
    </div>
  );
}
