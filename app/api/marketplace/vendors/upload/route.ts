export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'This upload endpoint is retired. Use the purpose-scoped upload asset flow.' },
    { status: 410 },
  );
}
