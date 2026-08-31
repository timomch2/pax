export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getUserCapabilities } from '@/lib/authorization';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    permissionVersion: session.user.permissionVersion ?? 1,
    permissions: await getUserCapabilities(session.user.id),
  });
}

