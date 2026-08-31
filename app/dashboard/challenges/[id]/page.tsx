export const dynamic = 'force-dynamic';

import { ChallengeDetail } from '@/components/dashboard/challenge-detail';

export default function ChallengeDetailPage({ params }: { params: { id: string } }) {
  return <ChallengeDetail id={params.id} />;
}
