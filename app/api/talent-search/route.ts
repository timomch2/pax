export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';

const querySchema = z.object({
  q: z.string().trim().max(120).default(''),
  healthArea: z.string().trim().max(120).default(''),
  location: z.string().trim().max(120).default(''),
  role: z.enum(['PRACTITIONER', 'INNOVATOR', 'INVESTOR', 'EMPLOYER', 'POLICYMAKER', 'PATIENT', 'ADMIN']).optional(),
  minScore: z.coerce.number().int().min(0).max(100).default(0),
  after: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

export async function GET(req: NextRequest) {
  const allowed = await requirePermission('talent.job.read', { entityType: 'TalentSearch' }, req);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
    const { q, healthArea, location, role, minScore, after, limit } = parsed.data;
    const entryWhere: Prisma.GpsEntryWhereInput = {
      ...(healthArea ? { healthArea } : {}),
      ...(location ? { geography: { contains: location, mode: 'insensitive' } } : {}),
      ...(q ? { OR: [
        { title: { contains: q, mode: 'insensitive' } }, { gap: { contains: q, mode: 'insensitive' } },
        { solution: { contains: q, mode: 'insensitive' } }, { outcome: { contains: q, mode: 'insensitive' } },
        { healthArea: { contains: q, mode: 'insensitive' } }, { geography: { contains: q, mode: 'insensitive' } },
      ] } : {}),
    };
    const userWhere: Prisma.UserWhereInput = {
      accountStatus: 'ACTIVE', credibilityScore: { gte: minScore }, ...(role ? { role: role as UserRole } : {}),
      gpsEntries: { some: entryWhere },
      ...(q ? { OR: [
        { name: { contains: q, mode: 'insensitive' } }, { headline: { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } }, { gpsEntries: { some: entryWhere } },
      ] } : {}),
    };
    const members = await prisma.user.findMany({
      where: userWhere, take: limit + 1, ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      select: {
        id: true, name: true, role: true, headline: true, location: true, organization: true, credibilityScore: true,
        _count: { select: { gpsEntries: true } },
        gpsEntries: { where: entryWhere, take: 10, orderBy: { createdAt: 'desc' }, select: {
          id: true, title: true, entryType: true, healthArea: true, geography: true, gap: true, solution: true, outcome: true,
          _count: { select: { endorsements: true } },
        } },
      },
      orderBy: [{ credibilityScore: 'desc' }, { id: 'asc' }],
    });
    const hasMore = members.length > limit;
    const page = hasMore ? members.slice(0, limit) : members;
    const [healthAreaRows, locationRows] = await Promise.all([
      prisma.gpsEntry.findMany({ where: { healthArea: { not: '' } }, distinct: ['healthArea'], take: 200, select: { healthArea: true }, orderBy: { healthArea: 'asc' } }),
      prisma.gpsEntry.findMany({ where: { geography: { not: '' } }, distinct: ['geography'], take: 200, select: { geography: true }, orderBy: { geography: 'asc' } }),
    ]);
    return NextResponse.json({
      results: page.map((member) => ({
        id: member.id, name: member.name, role: member.role, headline: member.headline, location: member.location,
        organization: member.organization, credibilityScore: member.credibilityScore, totalEntries: member._count.gpsEntries,
        matchingEntries: member.gpsEntries.map((entry) => ({ id: entry.id, title: entry.title, entryType: entry.entryType, healthArea: entry.healthArea, geography: entry.geography, gap: entry.gap, solution: entry.solution, outcome: entry.outcome, endorsementCount: entry._count.endorsements })),
      })),
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
      filters: { healthAreas: healthAreaRows.map((row) => row.healthArea).filter(Boolean), locations: locationRows.map((row) => row.geography).filter(Boolean) },
    });
  } catch (error) {
    console.error('Talent search GET error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
