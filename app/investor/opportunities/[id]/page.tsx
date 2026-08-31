export const dynamic = 'force-dynamic';

import { DealRoom } from '@/components/investor/deal-room';

export default function DealRoomPage({ params }: { params: { id: string } }) {
  return <DealRoom id={params.id} />;
}
