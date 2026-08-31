import { prisma } from '@/lib/db';

/**
 * Append-only audit trail.
 * Kenya Data Protection Act 2019 s.25 (accountability) and s.41 (security measures).
 * Entries are never updated or deleted by application code.
 */

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'ACCOUNT_LOCKED'
  | 'SIGNUP'
  | 'CONSENT_GRANTED'
  | 'CONSENT_WITHDRAWN'
  | 'PATIENT_VIEW'
  | 'PATIENT_CREATE'
  | 'PATIENT_UPDATE'
  | 'PATIENT_DELETE'
  | 'INVOICE_CREATE'
  | 'INVOICE_UPDATE'
  | 'INVOICE_DELETE'
  | 'REMINDER_SEND'
  | 'ROLE_CHANGE'
  | 'DATA_EXPORT'
  | 'DATA_ERASURE_REQUEST'
  | 'DATA_RECTIFICATION'
  | 'OBJECTION_LODGED';

type AuditInput = {
  userId?: string | null;
  actorEmail?: string | null;
  action: AuditAction | string;
  entityType?: string | null;
  entityId?: string | null;
  outcome?: 'SUCCESS' | 'FAILURE' | 'DENIED';
  request?: Request | null;
  context?: Record<string, unknown> | string | null;
};

function clientMeta(request?: Request | null) {
  if (!request) return { ipAddress: null as string | null, userAgent: null as string | null };
  const h = request.headers;
  const fwd = h.get('x-forwarded-for');
  return {
    ipAddress: (fwd ? fwd.split(',')[0].trim() : h.get('x-real-ip')) || null,
    userAgent: h.get('user-agent') || null,
  };
}

/** Never throws. Audit failures must not break a user journey. */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const { ipAddress, userAgent } = clientMeta(input.request);
    const context =
      input.context == null
        ? null
        : typeof input.context === 'string'
        ? input.context
        : JSON.stringify(input.context);
    await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        actorEmail: input.actorEmail || null,
        action: input.action,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        outcome: input.outcome || 'SUCCESS',
        ipAddress,
        userAgent,
        context,
      },
    });
  } catch (err) {
    console.error('[audit] failed to write audit entry', err);
  }
}

/** Variant for server contexts without a Request object (e.g. NextAuth callbacks). */
export async function logAuditRaw(
  input: Omit<AuditInput, 'request'> & { ipAddress?: string | null; userAgent?: string | null }
): Promise<void> {
  try {
    const context =
      input.context == null
        ? null
        : typeof input.context === 'string'
        ? input.context
        : JSON.stringify(input.context);
    await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        actorEmail: input.actorEmail || null,
        action: input.action,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        outcome: input.outcome || 'SUCCESS',
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        context,
      },
    });
  } catch (err) {
    console.error('[audit] failed to write audit entry', err);
  }
}
