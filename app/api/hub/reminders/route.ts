export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireHubPractitioner, prisma } from '@/lib/hub';
import { logAudit } from '@/lib/audit';
import { buildReminderMessage, outstandingOf, daysOverdue } from '@/lib/hub-finance';

const CHANNELS = ['IN_APP', 'SMS', 'WHATSAPP', 'EMAIL'];

// POST — log a payment reminder sent to a debtor (payer line).
export async function POST(req: NextRequest) {
  const auth = await requireHubPractitioner('hub.reminder.manage');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const invoicePayerId = body.invoicePayerId;
  if (!invoicePayerId) return NextResponse.json({ error: 'Missing payer line.' }, { status: 400 });

  const line = await prisma.invoicePayer.findUnique({
    where: { id: invoicePayerId },
    include: { invoice: true },
  });
  if (!line || line.invoice.practitionerId !== auth.userId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const channel = CHANNELS.includes(body.channel) ? body.channel : 'IN_APP';
  const message =
    (body.message ?? '').trim() ||
    buildReminderMessage({
      payerName: line.payerName,
      patientName: line.invoice.patientName,
      practitionerName: auth.name,
      invoiceNumber: line.invoice.invoiceNumber,
      outstanding: outstandingOf(line),
      daysOverdue: daysOverdue(line.dueDate),
      serviceDesc: line.invoice.serviceDesc,
    });

  const reminder = await prisma.paymentReminder.create({
    data: {
      invoicePayerId,
      sentById: auth.userId,
      channel,
      message,
      isAutomated: body.isAutomated === true,
    },
  });

  await logAudit({ userId: auth.userId, action: 'REMINDER_SEND', entityType: 'PaymentReminder', entityId: reminder.id, request: req, context: { invoicePayerId } });
  return NextResponse.json({ reminder });
}
