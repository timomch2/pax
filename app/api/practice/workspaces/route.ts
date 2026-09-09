import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { practiceResponse } from '@/lib/practice-http';
import { assertPractice, practiceCapabilities, practiceMembershipActive } from '@/lib/practice-policy';
export const dynamic = 'force-dynamic';

export async function GET() {
  return practiceResponse(async () => {
    assertPractice(process.env.PRACTICE_WORKSPACE_ENABLED === 'true', 404, 'Practice workspace is not enabled');
    const session = await getServerSession(authOptions);
    assertPractice(session?.user?.id, 401, 'Unauthorized');
    const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
    assertPractice(actor?.accountStatus === 'ACTIVE', 403, 'Forbidden');
    const rows = await prisma.practiceWorkspace.findMany({ where: { OR: [{ ownerId: actor.id }, { members: { some: { userId: actor.id, revokedAt: null } } }] }, include: {
      owner: { select: { id: true, name: true, accountStatus: true, role: true, additionalRoles: true, tier: true, hubMember: true } },
      members: { where: { userId: actor.id, revokedAt: null }, select: { roles: true } },
    }, orderBy: { createdAt: 'asc' } });
    return { canCreate: practiceMembershipActive(actor), workspaces: rows.flatMap((row) => {
      const active = practiceMembershipActive(row.owner), isOwner = row.ownerId === actor.id;
      if (!active && !isOwner) return [];
      return [{ id: row.id, name: row.owner.name, active, isOwner, bookingSlug: row.bookingSlug, capabilities: practiceCapabilities(isOwner, active, row.members[0]?.roles ?? []) }];
    }) };
  });
}

export async function POST() {
  return practiceResponse(async () => {
    assertPractice(process.env.PRACTICE_WORKSPACE_ENABLED === 'true', 404, 'Practice workspace is not enabled');
    const session = await getServerSession(authOptions);
    assertPractice(session?.user?.id, 401, 'Unauthorized');
    const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
    assertPractice(actor && practiceMembershipActive(actor), 403, 'Professional membership is required to create a workspace');
    const workspace = await prisma.practiceWorkspace.upsert({ where: { ownerId: actor.id }, update: {}, create: { ownerId: actor.id } });
    return { id: workspace.id };
  }, 201);
}
