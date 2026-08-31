export const dynamic = 'force-dynamic';

import { TalentSearch } from '@/components/dashboard/talent-search';

export default function EmployerTalentPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Browse Talent</h2>
        <p className="text-sm text-muted-foreground">
          Discover practitioners and innovators by the real problems they&apos;ve solved.
        </p>
      </div>
      <TalentSearch />
    </div>
  );
}
