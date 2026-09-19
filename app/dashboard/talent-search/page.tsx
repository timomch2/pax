import { redirect } from 'next/navigation';
import { talentEnabled, productUrl } from '@/lib/product-hosts';
export const dynamic = 'force-dynamic';

import { TalentSearch } from '@/components/dashboard/talent-search';

export default function TalentSearchPage() {
  if (talentEnabled()) redirect(productUrl('talent', '/talent/people'));
  return <TalentSearch />;
}
