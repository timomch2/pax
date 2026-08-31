import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { authorizeUser } from '@/lib/authorization';
import type { PermissionKey } from '@/lib/permissions';

/**
 * Server-side guard for admin API routes.
 * Returns the admin user id when authorised, or a reason string otherwise.
 */
export async function requireAdmin(permission: PermissionKey = 'admin.system.manage'): Promise<
  { ok: true; userId: string } | { ok: false; status: number }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, status: 401 };
  const authorization = await authorizeUser(session.user.id, permission);
  if (!authorization.ok) return { ok: false, status: authorization.status };
  return { ok: true, userId: session.user.id };
}

// Re-export client-safe labels for convenience in server code.
export { ROLE_LABEL, TIER_LABEL, INNOVATION_STATUS_LABEL, VAULT_STATUS_LABEL } from '@/lib/admin-labels';

export { prisma };
