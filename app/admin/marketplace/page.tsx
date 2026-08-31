'use client';

import { AdminVendorManagement } from '@/components/marketplace/admin-vendor-management';
import { AdminMarketplaceStats } from '@/components/marketplace/admin-marketplace-stats';
import { AdminListingModeration } from '@/components/marketplace/admin-listing-moderation';

export default function AdminMarketplacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A2332]">Marketplace Management</h2>
        <p className="text-gray-400 mt-1">Review vendor applications, track licences, and moderate listings.</p>
      </div>

      <AdminMarketplaceStats />

      <AdminListingModeration />

      <div>
        <h3 className="text-lg font-semibold text-[#1A2332] mb-3">Vendors</h3>
        <AdminVendorManagement />
      </div>
    </div>
  );
}
