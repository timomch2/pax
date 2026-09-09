import { practiceOrigin } from '@/lib/practice-origin';
import { z } from 'zod';
import { practiceResponse } from '@/lib/practice-http';
import { assertPractice } from '@/lib/practice-policy';
import { enforceRateLimit, enforceIdentifierRateLimit } from '@/lib/rate-limit';
import { publicSlots, startBooking, confirmBookingToken } from '@/lib/practice-bookings';
export const dynamic = 'force-dynamic';
type Context = { params: { slug: string } };
export async function GET(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    assertPractice((await enforceRateLimit(request, { name: 'practice-slots', limit: 120, windowSeconds: 3600 })).allowed, 429, 'Too many requests. Try again later.');
    return publicSlots(params.slug, new URL(request.url).searchParams.get('date') ?? '');
  });
}
export async function POST(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    assertPractice((await enforceRateLimit(request, { name: 'practice-public-submit', limit: 20, windowSeconds: 3600 })).allowed, 429, 'Too many attempts. Try again later.');
    const body = await request.json(), origin = practiceOrigin(request);
    if (body.action === 'verify') { const { action: _action, ...input } = body; return confirmBookingToken(params.slug, input, origin); }
    const email = z.string().trim().email().parse(body.email).toLowerCase();
    assertPractice((await enforceIdentifierRateLimit({ name: 'practice-booking-email', limit: 5, windowSeconds: 3600 }, email)).allowed, 429, 'Please check your inbox or try again later.');
    return startBooking(params.slug, body, origin);
  });
}
