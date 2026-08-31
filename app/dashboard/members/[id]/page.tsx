export const dynamic = 'force-dynamic';

import { MemberProfile } from '@/components/dashboard/member-profile';

export default function MemberProfilePage({ params }: { params: { id: string } }) {
  return <MemberProfile id={params.id} />;
}
