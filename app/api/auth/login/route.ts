export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is retired. Use the NextAuth sign-in flow.' },
    { status: 410 },
  );
}
