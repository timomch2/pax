export const dynamic = 'force-dynamic';

import { ListingDetail } from '@/components/marketplace/listing-detail';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function ListingPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <Link href="/marketplace" className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#2ABFB0] mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Marketplace
      </Link>
      <ListingDetail listingId={params.id} />
    </div>
  );
}
