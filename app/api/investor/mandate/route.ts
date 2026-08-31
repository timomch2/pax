export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { INVESTOR_GEOGRAPHIES, INNOVATION_SECTORS, MANDATE_STAGES } from '@/lib/pax-labels';

const VALID_GEOS = new Set(INVESTOR_GEOGRAPHIES);
const VALID_SECTORS = new Set(INNOVATION_SECTORS);
const VALID_STAGES = new Set(MANDATE_STAGES.map((s) => s.key));

// GET the current investor's mandate (null if not yet set).
export async function GET(request: Request) {
  try {
    const allowed = await requirePermission('investment.mandate.manage', { entityType: 'InvestorMandate' }, request);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const mandate = await prisma.investorMandate.findUnique({
      where: { userId: allowed.userId },
    });
    return NextResponse.json({ mandate });
  } catch (e) {
    console.error('[investor/mandate GET]', e);
    return NextResponse.json({ error: 'Failed to load mandate' }, { status: 500 });
  }
}

// PUT (upsert) the current investor's mandate.
export async function PUT(req: NextRequest) {
  try {
    const allowed = await requirePermission('investment.mandate.manage', { entityType: 'InvestorMandate' }, req);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });

    const body = await req.json();
    const geographies: string[] = Array.isArray(body?.geographies)
      ? body.geographies.filter((g: string) => VALID_GEOS.has(g))
      : [];
    const sectors: string[] = Array.isArray(body?.sectors)
      ? body.sectors.filter((s: string) => VALID_SECTORS.has(s))
      : [];
    const stages: string[] = Array.isArray(body?.stages)
      ? body.stages.filter((s: string) => VALID_STAGES.has(s))
      : [];
    const ticketMinUsd = Math.max(0, Math.round(Number(body?.ticketMinUsd) || 0));
    let ticketMaxUsd = Math.max(0, Math.round(Number(body?.ticketMaxUsd) || 0));
    if (ticketMaxUsd > 0 && ticketMaxUsd < ticketMinUsd) {
      ticketMaxUsd = ticketMinUsd;
    }
    const notes = typeof body?.notes === 'string' ? body.notes.slice(0, 2000) : null;
    const notifyOnMatch = body?.notifyOnMatch !== false;
    const active = body?.active !== false;

    const data = {
      geographies,
      sectors,
      stages,
      ticketMinUsd,
      ticketMaxUsd,
      notes,
      notifyOnMatch,
      active,
    };

    const mandate = await prisma.investorMandate.upsert({
      where: { userId: allowed.userId },
      create: { userId: allowed.userId, ...data },
      update: data,
    });

    return NextResponse.json({ mandate });
  } catch (e) {
    console.error('[investor/mandate PUT]', e);
    return NextResponse.json({ error: 'Failed to save mandate' }, { status: 500 });
  }
}
