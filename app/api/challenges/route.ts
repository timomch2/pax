export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — browse Challenge Briefs. Filters: status (OPEN/CLOSED/ALL), healthArea, keyword, mine.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(req.url);
    const status = url.searchParams.get('status')?.trim().toUpperCase() || 'OPEN';
    const healthArea = url.searchParams.get('healthArea')?.trim() || '';
    const keyword = url.searchParams.get('q')?.trim() || '';
    const mine = url.searchParams.get('mine') === '1';

    const where: any = {};
    if (status === 'OPEN' || status === 'CLOSED') where.status = status;
    if (healthArea) where.healthArea = healthArea;
    if (mine) where.authorId = session.user.id;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { problem: { contains: keyword, mode: 'insensitive' } },
        { lookingFor: { contains: keyword, mode: 'insensitive' } },
        { organization: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const briefs = await prisma.challengeBrief.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { responses: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    const data = briefs.map((b) => ({
      id: b.id,
      title: b.title,
      organization: b.organization,
      healthArea: b.healthArea,
      geography: b.geography,
      problem: b.problem,
      lookingFor: b.lookingFor,
      deadline: b.deadline,
      status: b.status,
      createdAt: b.createdAt,
      author: b.author,
      responseCount: b._count.responses,
      isAuthor: b.authorId === session.user.id,
    }));
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Challenges GET error:', error);
    return NextResponse.json({ error: 'Failed to load challenge briefs' }, { status: 500 });
  }
}

// POST — create a Challenge Brief.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { title, organization, healthArea, geography, problem, lookingFor, deadline } = body ?? {};
    if (!title?.trim() || !problem?.trim() || !lookingFor?.trim()) {
      return NextResponse.json({ error: 'Title, Problem and What you are looking for are required.' }, { status: 400 });
    }
    const brief = await prisma.challengeBrief.create({
      data: {
        authorId: session.user.id,
        title: title.trim(),
        organization: organization?.trim() || null,
        healthArea: healthArea?.trim() || null,
        geography: geography?.trim() || null,
        problem: problem.trim(),
        lookingFor: lookingFor.trim(),
        deadline: deadline?.trim() || null,
      },
    });
    return NextResponse.json({ brief });
  } catch (error: any) {
    console.error('Challenge POST error:', error);
    return NextResponse.json({ error: 'Failed to post challenge brief' }, { status: 500 });
  }
}
