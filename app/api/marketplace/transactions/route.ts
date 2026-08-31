export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const RETIRED_RESPONSE = {
  error: 'Marketplace transaction recording is retired. PAX is a passive intermediary; buyers and vendors transact directly off-platform.',
};

export async function GET() {
  return NextResponse.json(RETIRED_RESPONSE, { status: 410 });
}

export async function POST() {
  return NextResponse.json(RETIRED_RESPONSE, { status: 410 });
}
