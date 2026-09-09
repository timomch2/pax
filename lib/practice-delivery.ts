import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { enqueueNotification } from '@/lib/notification-service';
import { practiceMembershipActive } from '@/lib/practice-policy';
import { payerBalance, generatePracticeRetainers } from '@/lib/practice-finance';
import { formatPracticeMoney } from '@/lib/practice-money';

type Db = Prisma.TransactionClient;
const timeText = (value: Date) => value.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

/** Queue only contact and time information; templates never receive clinical fields. */
export async function queueCalendarMessage(tx: Db, eventId: string, message: string, requestOrigin?: string) {
  const event = await tx.practiceEvent.findUniqueOrThrow({ where: { id: eventId }, include: { patient: true, workspace: true } });
  if (!event.patient?.email) return;
  const origin = requestOrigin ?? process.env.NEXTAUTH_URL;
  if (!origin) throw new Error('Application URL is not configured');
  await enqueueNotification(tx, { recipient: event.patient.email, templateSlug: 'practice.booking-update', variables: { message, time: timeText(event.startsAt), actionUrl: `${new URL(origin).origin}/book/${event.workspace.bookingSlug}` }, idempotencyKey: `practice:calendar:${event.id}:${event.version}` });
}

/** Re-read mutable state immediately before delivery, including each retry. */
export async function practiceDeliveryAllowed(key: string, recipient: string): Promise<boolean> {
  if (!key.startsWith('practice:')) return true;
  if (process.env.PRACTICE_WORKSPACE_ENABLED !== 'true') return false;
  const [, kind, id, version, period] = key.split(':');
  const now = new Date();
  if (kind === 'invite') {
    const row = await prisma.practiceInvitation.findUnique({ where: { id }, include: { workspace: { include: { owner: true } } } });
    return Boolean(row && row.email === recipient && !row.revokedAt && !row.acceptedAt && row.expiresAt > now && practiceMembershipActive(row.workspace.owner));
  }
  if (kind === 'verify' || kind === 'booking') {
    const row = await prisma.practiceBookingRequest.findUnique({ where: { id }, include: { workspace: { include: { owner: true } } } });
    if (!row || row.email !== recipient || !practiceMembershipActive(row.workspace.owner)) return false;
    if (kind === 'verify') return row.workspace.bookingEnabled && row.status === 'UNVERIFIED' && !row.tokenUsedAt && row.tokenExpiresAt > now;
    if (row.version !== Number(version)) return false;
    if (row.status === 'PROPOSED') return row.workspace.bookingEnabled && !row.tokenUsedAt && row.tokenExpiresAt > now;
    if (row.eventId) { const event = await prisma.practiceEvent.findUnique({ where: { id: row.eventId } }); return Boolean(event && event.status === 'SCHEDULED' && event.startsAt.getTime() === row.startsAt.getTime()); }
    return true;
  }
  if (kind === 'calendar' || kind === 'reminder') {
    const row = await prisma.practiceEvent.findUnique({ where: { id }, include: { patient: true, workspace: { include: { owner: true } } } });
    if (!row || row.version !== Number(version) || row.patient?.email !== recipient || !practiceMembershipActive(row.workspace.owner)) return false;
    if (kind === 'calendar') return true;
    const booking = await prisma.practiceBookingRequest.findUnique({ where: { eventId: row.id } });
    return row.workspace.remindersEnabled && row.patient.remindersEnabled && booking?.remindersEnabled !== false && row.status === 'SCHEDULED' && row.startsAt > now && row.startsAt.getTime() <= now.getTime() + row.workspace.appointmentReminderHours * 3600000;
  }
  if (kind === 'balance') {
    const line = await prisma.practiceInvoicePayer.findUnique({ where: { id }, include: { payer: true, invoice: { include: { workspace: { include: { owner: true } } } } } });
    if (!line || line.payer.email !== recipient || !line.payer.remindersEnabled || !line.invoice.workspace.remindersEnabled || !practiceMembershipActive(line.invoice.workspace.owner) || !line.dueAt || line.dueAt > now) return false;
    const days = Number(version), current = await payerBalance(prisma, id, line.invoice.workspaceId);
    // The queued balance is part of the key, so payment or adjustment invalidates stale amounts.
    return line.invoice.workspace.overdueReminderDays.includes(days) && now.getTime() >= line.dueAt.getTime() + days * 86400000 && now.getTime() < line.dueAt.getTime() + (days + 1) * 86400000 && current.outstandingMinor > 0 && current.outstandingMinor === Number(period);
  }
  return false;
}

/** A bounded scan; callers continue using the returned cursor. Outbox keys make repeated scans safe. */
export async function queuePracticeReminders(after?: string) {
  if (process.env.PRACTICE_WORKSPACE_ENABLED !== 'true') return { queued: 0, nextCursor: null };
  const origin = process.env.NEXTAUTH_URL;
  if (!origin) throw new Error('Application URL is not configured');
  const workspaces = await prisma.practiceWorkspace.findMany({ include: { owner: true }, orderBy: { id: 'asc' }, take: 10, ...(after ? { cursor: { id: after }, skip: 1 } : {}) });
  let queued = 0;
  for (const workspace of workspaces) {
    if (!practiceMembershipActive(workspace.owner)) continue;
    const now = new Date();
    await generatePracticeRetainers(workspace.ownerId, workspace.id, { month: new Date(now.getTime() + 10800000).toISOString().slice(0, 7) });
    if (!workspace.remindersEnabled) continue;
    const events = await prisma.practiceEvent.findMany({ where: { workspaceId: workspace.id, status: 'SCHEDULED', startsAt: { gt: now, lte: new Date(now.getTime() + workspace.appointmentReminderHours * 3600000) }, patient: { email: { not: null }, remindersEnabled: true } }, include: { patient: true } });
    for (const event of events) {
      const booking = await prisma.practiceBookingRequest.findUnique({ where: { eventId: event.id } });
      if (booking?.remindersEnabled === false) continue;
      await enqueueNotification(prisma, { recipient: event.patient!.email!, templateSlug: 'practice.appointment-reminder', variables: { time: timeText(event.startsAt), actionUrl: `${new URL(origin).origin}/book/${workspace.bookingSlug}` }, idempotencyKey: `practice:reminder:${event.id}:${event.version}` }); queued++;
    }
    for (const day of [...new Set(workspace.overdueReminderDays)]) {
      const lines = await prisma.practiceInvoicePayer.findMany({ where: { invoice: { workspaceId: workspace.id, status: 'ISSUED' }, payer: { email: { not: null }, remindersEnabled: true }, dueAt: { gt: new Date(now.getTime() - (day + 1) * 86400000), lte: new Date(now.getTime() - day * 86400000) } }, include: { invoice: true, payer: true } });
      for (const line of lines) {
        const balance = await payerBalance(prisma, line.id, workspace.id);
        if (balance.outstandingMinor <= 0) continue;
        await enqueueNotification(prisma, { recipient: line.payer.email!, templateSlug: 'practice.balance-reminder', variables: { invoiceNumber: line.invoice.number, amount: formatPracticeMoney(balance.outstandingMinor), ownerName: workspace.owner.name ?? 'Your practitioner' }, idempotencyKey: `practice:balance:${line.id}:${day}:${balance.outstandingMinor}` }); queued++;
      }
    }
  }
  return { queued, nextCursor: workspaces.length === 10 ? workspaces[9].id : null };
}
