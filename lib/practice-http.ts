import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { PracticeError } from '@/lib/practice-policy';

/** Consistent errors without exposing database content, credentials, or patient details. */
export async function practiceResponse(work: () => Promise<unknown>, status = 200): Promise<NextResponse> {
  try { return NextResponse.json(await work(), { status }); }
  catch (error) {
    if (error instanceof PracticeError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      return NextResponse.json({ error: 'The record changed or already exists. Refresh and try again.' }, { status: 409 });
    }
    console.error('Practice operation failed', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to complete this action' }, { status: 500 });
  }
}
