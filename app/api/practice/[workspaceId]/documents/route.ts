import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePractice } from '@/lib/authorization';
import { practiceResponse } from '@/lib/practice-http';
import { practiceFinancialDocument } from '@/lib/practice-documents';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: { workspaceId: string } }) {
  let document: NextResponse | null = null;
  const result = await practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'billing.read');
    const input = z.object({ kind: z.enum(['invoice', 'receipt']), id: z.string().cuid() }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
    const pdf = await practiceFinancialDocument(auth.actorId, auth.workspaceId, input.kind, input.id);
    document = new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="pax-${input.kind}-${input.id}.pdf"`, 'Cache-Control': 'no-store' } }); return { ok: true };
  });
  return document ?? result;
}
