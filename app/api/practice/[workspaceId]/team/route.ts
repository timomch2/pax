import { practiceOrigin } from '@/lib/practice-origin';
import { z } from 'zod';
import { requirePractice, authorizePracticeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { practiceResponse } from '@/lib/practice-http';
import { assertPractice } from '@/lib/practice-policy';
import { invitePracticeMember, teamRolesSchema } from '@/lib/practice-team';
import { practiceTransaction, lockPractice } from '@/lib/practice-db';
export const dynamic = 'force-dynamic';
type Context = { params: { workspaceId: string } };

export async function GET(_request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'team.manage');
    const [members, invitations] = await Promise.all([
      prisma.practiceMember.findMany({ where: { workspaceId: auth.workspaceId }, select: { id: true, roles: true, revokedAt: true, user: { select: { name: true, email: true } } } }),
      prisma.practiceInvitation.findMany({ where: { workspaceId: auth.workspaceId }, select: { id: true, email: true, roles: true, expiresAt: true, acceptedAt: true, revokedAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    return { members, invitations };
  });
}
export async function POST(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'team.manage');
    return invitePracticeMember(auth.actorId, auth.workspaceId, await request.json(), practiceOrigin(request));
  }, 201);
}
export async function PATCH(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'team.manage');
    const body = z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('member'), id: z.string().cuid(), roles: teamRolesSchema.optional(), revoke: z.boolean().default(false) }).strict(),
      z.object({ kind: z.literal('invitation'), id: z.string().cuid() }).strict(),
    ]).parse(await request.json());
    return practiceTransaction(async (tx) => {
      await lockPractice(tx, auth.workspaceId);
      await authorizePracticeUser(auth.actorId, auth.workspaceId, 'team.manage', tx);
      if (body.kind === 'member') {
        const member = await tx.practiceMember.findFirst({ where: { id: body.id, workspaceId: auth.workspaceId } });
        assertPractice(member, 404, 'Staff member not found');
        assertPractice(body.revoke || body.roles, 400, 'Choose roles or revoke access');
        await tx.practiceMember.update({ where: { id: member.id }, data: { ...(body.roles ? { roles: body.roles } : {}), ...(body.revoke ? { revokedAt: new Date() } : {}) } });
        await tx.user.update({ where: { id: member.userId }, data: { permissionVersion: { increment: 1 } } });
      } else {
        const changed = await tx.practiceInvitation.updateMany({ where: { id: body.id, workspaceId: auth.workspaceId, acceptedAt: null }, data: { revokedAt: new Date() } });
        assertPractice(changed.count, 404, 'Pending invitation not found');
      }
      await tx.practiceAuditEvent.create({ data: { workspaceId: auth.workspaceId, actorId: auth.actorId, action: 'TEAM_ACCESS_CHANGED', entityId: body.id } });
      return { ok: true };
    });
  });
}
