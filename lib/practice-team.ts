import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorizePracticeUser } from '@/lib/authorization';
import { assertPractice, practiceMembershipActive } from '@/lib/practice-policy';
import { practiceTransaction, lockPractice } from '@/lib/practice-db';
import { enqueueNotification } from '@/lib/notification-service';
import { strongPasswordSchema } from '@/lib/password-policy';

export const teamRolesSchema = z.array(z.enum(['RECEPTION', 'FINANCE'])).min(1).max(2).transform((roles) => [...new Set(roles)]);
export const practiceTokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function invitePracticeMember(actorId: string, workspaceId: string, raw: unknown, origin: string) {
  const body = z.object({ email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()), roles: teamRolesSchema }).strict().parse(raw);
  const token = randomBytes(32).toString('hex');
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId);
    const auth = await authorizePracticeUser(actorId, workspaceId, 'team.manage', tx);
    const owner = await tx.user.findUniqueOrThrow({ where: { id: auth.ownerId }, select: { email: true } });
    assertPractice(owner.email.toLowerCase() !== body.email, 400, 'The workspace owner already has access');
    await tx.practiceInvitation.updateMany({ where: { workspaceId, email: body.email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    const invitation = await tx.practiceInvitation.create({ data: { workspaceId, email: body.email, roles: body.roles, invitedById: actorId, tokenHash: practiceTokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400000) } });
    const delivery = await enqueueNotification(tx, { templateSlug: 'practice.invitation', recipient: body.email, variables: { ownerName: auth.ownerName, invitationUrl: `${origin}/practice/invitation#${token}` }, idempotencyKey: `practice:invite:${invitation.id}` });
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: 'TEAM_INVITED', entityId: invitation.id, context: { roles: body.roles } } });
    return { id: invitation.id, expiresAt: invitation.expiresAt, deliveryStatus: delivery.status };
  });
}

/** Existing identities require their own authenticated session; an invitation never resets an account password. */
export async function acceptPracticeInvitation(raw: unknown, sessionUserId?: string) {
  assertPractice(process.env.PRACTICE_WORKSPACE_ENABLED === 'true', 404, 'Practice workspace is not enabled');
  const body = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), name: z.string().trim().min(2).max(120).optional(), password: strongPasswordSchema.optional() }).strict().parse(raw);
  const tokenHash = practiceTokenHash(body.token);
  const preview = await prisma.practiceInvitation.findUnique({ where: { tokenHash }, select: { workspaceId: true } });
  assertPractice(preview, 404, 'Invitation not found');
  // Slow password work runs before, never inside, the database transaction.
  const passwordHash = body.password ? await bcrypt.hash(body.password, 12) : null;
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, preview.workspaceId);
    const invitation = await tx.practiceInvitation.findUnique({ where: { tokenHash }, include: { workspace: { include: { owner: true } } } });
    assertPractice(invitation && !invitation.acceptedAt && !invitation.revokedAt && invitation.expiresAt > new Date(), 410, 'Invitation is expired or no longer available');
    assertPractice(practiceMembershipActive(invitation.workspace.owner), 403, 'This workspace is not currently accepting staff');
    let account = await tx.user.findUnique({ where: { email: invitation.email } });
    if (account) {
      assertPractice(account.id === sessionUserId && account.accountStatus === 'ACTIVE' && account.emailVerified, 403, 'Sign in to the invited email account before accepting');
    } else {
      assertPractice(!sessionUserId, 403, 'Sign out before creating the invited staff account');
      assertPractice(body.name && passwordHash, 400, 'Name and a strong password are required');
      account = await tx.user.create({ data: { email: invitation.email, name: body.name, password: passwordHash, role: 'STAFF', emailVerified: new Date(), verificationLevel: 'EMAIL_VERIFIED' } });
    }
    assertPractice(account.id !== invitation.workspace.ownerId, 400, 'The owner does not need a staff invitation');
    await tx.practiceMember.upsert({ where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: account.id } }, create: { workspaceId: invitation.workspaceId, userId: account.id, roles: invitation.roles }, update: { roles: invitation.roles, revokedAt: null } });
    await tx.practiceInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    await tx.user.update({ where: { id: account.id }, data: { permissionVersion: { increment: 1 } } });
    await tx.practiceAuditEvent.create({ data: { workspaceId: invitation.workspaceId, actorId: account.id, action: 'TEAM_INVITATION_ACCEPTED', entityId: invitation.id } });
    return { workspaceId: invitation.workspaceId, signInRequired: !sessionUserId };
  });
}
