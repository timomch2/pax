import { NextResponse } from 'next/server';
import { isSameProductOrigin } from '@/lib/product-hosts';
import { ZodError } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { isEditableServiceProfile } from '@/lib/service-profile-validation';
import { readServiceProfile, saveServiceProfile, ServiceProfileError } from '@/lib/service-profiles';
export const dynamic = 'force-dynamic';

async function respond(request: Request, service: string, write: boolean) {
  const auth = await requirePermission(write ? 'profile.update' : 'profile.read', {}, request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (write && !isSameProductOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  if (!isEditableServiceProfile(service)) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  try {
    const result = write ? await saveServiceProfile(auth.userId, service, await request.json()) : await readServiceProfile(auth.userId, service);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Invalid profile' }, { status: 400 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    if (error instanceof ServiceProfileError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Unable to complete profile request' }, { status: 500 });
  }
}
export async function GET(request: Request, { params }: { params: { service: string } }) { return respond(request, params.service, false); }
export async function PATCH(request: Request, { params }: { params: { service: string } }) { return respond(request, params.service, true); }
