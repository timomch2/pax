export const dynamic = 'force-dynamic';

import { ChallengesList } from '@/components/dashboard/challenges-list';

export default function PolicymakerDebatesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Open Calls &amp; Debates</h2>
        <p className="text-sm text-muted-foreground">
          Monitor the open challenges, briefs and debates shaping health innovation across the network.
        </p>
      </div>
      <ChallengesList />
    </div>
  );
}
