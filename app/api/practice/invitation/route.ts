import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { practiceResponse } from '@/lib/practice-http';
import { acceptPracticeInvitation } from '@/lib/practice-team';
import { enforceRateLimit } from '@/lib/rate-limit';
import { assertPractice } from '@/lib/practice-policy';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return practiceResponse(async () => {
    const rate = await enforceRateLimit(request, { name: 'practice-invitation', limit: 10, windowSeconds: 900 });
    assertPractice(rate.allowed, 429, 'Too many attempts. Try again later.');
    const session = await getServerSession(authOptions);
    return acceptPracticeInvitation(await request.json(), session?.user?.id);
  });
}
