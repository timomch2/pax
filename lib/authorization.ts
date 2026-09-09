import type { AccessScope } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import type { PermissionKey } from '@/lib/permissions';
import type { Prisma } from '@prisma/client';
import { assertPractice, practiceCapabilities, practiceMembershipActive, type PracticeAction } from '@/lib/practice-policy';

export type AuthorizationResource = {
  ownerId?: string | null;
  organizationId?: string | null;
  resourceId?: string | null;
  entityType?: string | null;
};

export type AuthorizationResult =
  | { ok: true; userId: string; scope: AccessScope }
  | { ok: false; status: 401 | 403; error: 'Unauthorized' | 'Forbidden' };

function scopeAllows(
  scope: AccessScope,
  userId: string,
  grantOrganizationId: string | null,
  resource: AuthorizationResource,
): boolean {
  if (scope === 'ALL') return true;
  if (scope === 'ORGANIZATION') {
    if (!resource.organizationId) return !resource.ownerId;
    return Boolean(
      resource.organizationId &&
      grantOrganizationId &&
      resource.organizationId === grantOrganizationId,
    );
  }
  return !resource.ownerId || resource.ownerId === userId;
}

function narrowerScope(left: AccessScope, right: AccessScope): AccessScope {
  const rank: Record<AccessScope, number> = { OWN: 0, ORGANIZATION: 1, ALL: 2 };
  return rank[left] <= rank[right] ? left : right;
}

export async function authorizeUser(
  userId: string,
  permissionKey: PermissionKey,
  resource: AuthorizationResource = {},
): Promise<AuthorizationResult> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountStatus: true,
      directPermissions: {
        where: {
          permission: { key: permissionKey },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { effect: true, scope: true, organizationId: true },
      },
      accessRoleAssignments: {
        where: {
          accessRole: { active: true },
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        select: {
          scope: true,
          organizationId: true,
          accessRole: {
            select: {
              permissions: {
                where: { permission: { key: permissionKey } },
                select: { scope: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.accountStatus !== 'ACTIVE') {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  if (
    user.directPermissions.some(
      (grant) =>
        grant.effect === 'DENY' &&
        scopeAllows(grant.scope, userId, grant.organizationId, resource),
    )
  ) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  for (const grant of user.directPermissions) {
    if (
      grant.effect === 'ALLOW' &&
      scopeAllows(grant.scope, userId, grant.organizationId, resource)
    ) {
      return { ok: true, userId, scope: grant.scope };
    }
  }

  for (const assignment of user.accessRoleAssignments) {
    for (const rolePermission of assignment.accessRole.permissions) {
      const scope = narrowerScope(rolePermission.scope, assignment.scope);
      if (scopeAllows(scope, userId, assignment.organizationId, resource)) {
        return { ok: true, userId, scope };
      }
    }
  }

  return { ok: false, status: 403, error: 'Forbidden' };
}

export async function requirePermission(
  permissionKey: PermissionKey,
  resource: AuthorizationResource = {},
  request?: Request,
): Promise<AuthorizationResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const result = await authorizeUser(session.user.id, permissionKey, resource);
  if (!result.ok) {
    await logAudit({
      userId: session.user.id,
      actorEmail: session.user.email,
      action: 'AUTHORIZATION_DENIED',
      entityType: resource.entityType || null,
      entityId: resource.resourceId || null,
      outcome: 'DENIED',
      request,
      context: { permissionKey },
    });
  }
  return result;
}

export async function getUserCapabilities(userId: string): Promise<string[]> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountStatus: true,
      directPermissions: {
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { effect: true, permission: { select: { key: true } } },
      },
      accessRoleAssignments: {
        where: { accessRole: { active: true }, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        select: { accessRole: { select: { permissions: { select: { permission: { select: { key: true } } } } } } },
      },
    },
  });
  if (!user || user.accountStatus !== 'ACTIVE') return [];
  const allowed = new Set(user.accessRoleAssignments.flatMap((assignment) => assignment.accessRole.permissions.map((grant) => grant.permission.key)));
  for (const grant of user.directPermissions) {
    if (grant.effect === 'DENY') allowed.delete(grant.permission.key);
    else allowed.add(grant.permission.key);
  }
  if (process.env.PRACTICE_WORKSPACE_ENABLED === 'true') {
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, additionalRoles: true } });
    const workspace = await prisma.practiceWorkspace.findFirst({ where: { OR: [{ ownerId: userId }, { members: { some: { userId, revokedAt: null } } }] }, select: { id: true } });
    if (workspace || actor?.role === 'PRACTITIONER' || actor?.role === 'ADMIN' || actor?.additionalRoles.includes('PRACTITIONER')) allowed.add('practice.read');
  }
  return [...allowed].sort();
}

/** Workspace selection is an identifier only: access always comes from the current database membership. */
export async function authorizePracticeUser(userId: string, workspaceId: string, action: PracticeAction, db: Prisma.TransactionClient = prisma) {
  assertPractice(process.env.PRACTICE_WORKSPACE_ENABLED === 'true', 404, 'Practice workspace is not enabled');
  const [actor, workspace] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true, accountStatus: true } }),
    db.practiceWorkspace.findUnique({ where: { id: workspaceId }, include: { owner: {
      select: { id: true, name: true, role: true, additionalRoles: true, accountStatus: true, tier: true, hubMember: true },
    }, members: { where: { userId, revokedAt: null }, select: { roles: true } } } }),
  ]);
  assertPractice(actor?.accountStatus === 'ACTIVE', 403, 'Forbidden');
  assertPractice(workspace, 404, 'Workspace not found');
  const isOwner = workspace.ownerId === userId;
  assertPractice(isOwner || workspace.members.length > 0, 404, 'Workspace not found');
  const active = practiceMembershipActive(workspace.owner);
  const capabilities = practiceCapabilities(isOwner, active, workspace.members[0]?.roles ?? []);
  assertPractice(capabilities.includes(action), 403, active ? 'You do not have access to this action' : 'Professional membership is required; only the owner retains read access');
  return { actorId: userId, workspaceId, ownerId: workspace.ownerId, ownerName: workspace.owner.name, isOwner, active, capabilities };
}

export async function requirePractice(workspaceId: string, action: PracticeAction) {
  const session = await getServerSession(authOptions);
  assertPractice(session?.user?.id, 401, 'Unauthorized');
  return authorizePracticeUser(session.user.id, workspaceId, action);
}
