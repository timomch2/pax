import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasTier } from '@/lib/access';
import { authorizeUser } from '@/lib/authorization';
import type { PermissionKey } from '@/lib/permissions';

/**
 * Server-side guard for Practitioners Hub finance API routes.
 * Requires a health practitioner (or admin) who has joined the Hub
 * on a paid (Tier 2+) membership.
 */
export async function requireHubPractitioner(permission: PermissionKey = 'hub.patient.read'): Promise<
  { ok: true; userId: string; name: string; role: string } | { ok: false; status: number; error: string }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, status: 401, error: 'Unauthorized' };
  const permissionResult = await authorizeUser(session.user.id, permission);
  if (!permissionResult.ok) return { ok: false, status: permissionResult.status, error: permissionResult.error };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, tier: true, hubMember: true, name: true },
  });
  if (!user) return { ok: false, status: 404, error: 'Not found' };
  const eligible = user.role === 'ADMIN' || hasTier(user.tier as any, 'TIER2_PROFESSIONAL');
  if (!eligible) {
    return { ok: false, status: 403, error: 'A Professional (or higher) membership is required.' };
  }
  if (!user.hubMember && user.role !== 'ADMIN') {
    return { ok: false, status: 403, error: 'Join the Practitioners Hub to access finance tools.' };
  }
  return { ok: true, userId: session.user.id, name: user.name, role: user.role };
}

export { prisma };

/**
 * Generates the permanent, system-assigned patient ID shown on every hub
 * patient record (e.g. PAX-P-4K7Q2M). The alphabet excludes characters that
 * are easily confused when read aloud or written on a paper file (0/O, 1/I/L,
 * 5/S, 2/Z) so a practitioner can quote it to a returning patient safely.
 */
const CODE_ALPHABET = '34679ACDEFGHJKMNPQRTUVWXY';

export async function generatePatientCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    let body = '';
    for (let i = 0; i < 6; i++) {
      body += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    const code = `PAX-P-${body}`;
    const clash = await prisma.hubPatient.findUnique({ where: { patientCode: code }, select: { id: true } });
    if (!clash) return code;
  }
  // Astronomically unlikely fallback — guaranteed unique by timestamp.
  return `PAX-P-${Date.now().toString(36).toUpperCase()}`;
}

// Recompute an invoice's totalAmount + status from its payer lines,
// and refresh each line's derived status. Call after any payer change.
export async function recomputeInvoice(invoiceId: string): Promise<void> {
  const {
    computeInvoiceStatus,
    computePayerStatus,
  } = await import('@/lib/hub-finance');
  const payers = await prisma.invoicePayer.findMany({ where: { invoiceId } });
  const now = new Date();
  for (const p of payers) {
    const newStatus = computePayerStatus(p.amount, p.amountPaid, p.dueDate, now);
    const paidAt = p.amountPaid >= p.amount && p.amount > 0 ? p.paidAt ?? now : null;
    if (newStatus !== p.status || paidAt !== p.paidAt) {
      await prisma.invoicePayer.update({
        where: { id: p.id },
        data: { status: newStatus, paidAt },
      });
    }
  }
  const total = payers.reduce((s, p) => s + (p.amount || 0), 0);
  const status = computeInvoiceStatus(payers);
  await prisma.invoice.update({ where: { id: invoiceId }, data: { totalAmount: total, status } });
}
