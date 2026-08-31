export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — a single brief. Responses are visible only to the brief's author.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const brief = await prisma.challengeBrief.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { id: true, name: true } },
        responses: {
          orderBy: { createdAt: 'desc' },
          include: {
            responder: { select: { id: true, name: true, role: true, headline: true, credibilityScore: true } },
            gpsEntry: { select: { id: true, title: true, gap: true, solution: true, outcome: true } },
          },
        },
      },
    });
    if (!brief) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const isAuthor = brief.authorId === session.user.id;
    const viewerResponse = brief.responses.find((r) => r.responderId === session.user.id) || null;

    const { responses, authorId, ...rest } = brief;
    return NextResponse.json({
      brief: rest,
      isAuthor,
      responseCount: responses.length,
      viewerHasResponded: !!viewerResponse,
      viewerResponse: viewerResponse
        ? { id: viewerResponse.id, message: viewerResponse.message, gpsEntryId: viewerResponse.gpsEntryId, createdAt: viewerResponse.createdAt }
        : null,
      // Only the author may see who responded.
      responses: isAuthor ? responses : [],
    });
  } catch (error: any) {
    console.error('Challenge GET error:', error);
    return NextResponse.json({ error: 'Failed to load challenge brief' }, { status: 500 });
  }
}

// PATCH — edit fields or change status (author only).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const existing = await prisma.challengeBrief.findUnique({ where: { id: params.id } });
    if (!existing || existing.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const body = await req.json();
    const { title, organization, healthArea, geography, problem, lookingFor, deadline, status } = body ?? {};
    const brief = await prisma.challengeBrief.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(organization !== undefined ? { organization: organization?.trim() || null } : {}),
        ...(healthArea !== undefined ? { healthArea: healthArea?.trim() || null } : {}),
        ...(geography !== undefined ? { geography: geography?.trim() || null } : {}),
        ...(problem !== undefined ? { problem: problem.trim() } : {}),
        ...(lookingFor !== undefined ? { lookingFor: lookingFor.trim() } : {}),
        ...(deadline !== undefined ? { deadline: deadline?.trim() || null } : {}),
        ...(status === 'OPEN' || status === 'CLOSED' ? { status } : {}),
      },
    });
    return NextResponse.json({ brief });
  } catch (error: any) {
    console.error('Challenge PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update challenge brief' }, { status: 500 });
  }
}

// DELETE — remove a brief (author only). Responses cascade.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const existing = await prisma.challengeBrief.findUnique({ where: { id: params.id } });
    if (!existing || existing.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.challengeBrief.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Challenge DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete challenge brief' }, { status: 500 });
  }
}
