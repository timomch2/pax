export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const {
      drugName, doseTaken, sideEffects, severity,
      patientAge, patientGender, patientWeight,
      isPregnant, otherMedication, province, country,
      onsetDaysAgo, durationDays, treatmentGiven, treatmentDetails,
      description, reporterEmail,
    } = body;

    const toInt = (v: unknown) => {
      if (v === null || v === undefined || v === '') return null;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    };

    if (!drugName || !doseTaken || !sideEffects || !patientAge || !patientGender) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const report = await prisma.adverseDrugReport.create({
      data: {
        reporterId: session?.user?.id ?? null,
        drugName,
        doseTaken,
        sideEffects,
        severity: severity || 'MODERATE',
        patientAge: parseInt(patientAge, 10),
        patientGender,
        patientWeight: patientWeight ? parseFloat(patientWeight) : null,
        isPregnant: isPregnant === true || isPregnant === 'true',
        otherMedication: otherMedication || null,
        onsetDaysAgo: toInt(onsetDaysAgo),
        durationDays: toInt(durationDays),
        treatmentGiven: typeof treatmentGiven === 'boolean' ? treatmentGiven : null,
        treatmentDetails: treatmentDetails || null,
        province: province || null,
        country: country || 'Kenya',
        description: description || null,
      },
    });

    // Acknowledge the reporter with an on-record receipt, if we can reach them by email.
    const ackEmail = (typeof reporterEmail === 'string' && reporterEmail.trim())
      || session?.user?.email
      || null;
    let acknowledgedByEmail = false;
    if (ackEmail) {
      try {
        const appUrl = process.env.NEXTAUTH_URL || '';
        const host = appUrl ? new URL(appUrl).hostname : 'thepraxisexchange.abacusai.app';
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#1f2937;">
            <h2 style="color:#0f766e; border-bottom:2px solid #2D9B94; padding-bottom:10px;">Your safety report has been received</h2>
            <p>Thank you for reporting an adverse reaction for <strong>${drugName}</strong>.</p>
            <p><strong>Your report has been received and forwarded for action.</strong> Our pharmacovigilance team reviews every submission and, where a signal emerges, shares aggregated findings with the relevant drug regulators and manufacturers.</p>
            <p style="background:#f0fdfa;border-left:4px solid #2D9B94;padding:12px 15px;border-radius:4px;font-size:14px;">Reference: ${report.id}</p>
            <p style="color:#6b7280;font-size:12px;">Individual reports are kept confidential. This is an automated acknowledgement — please do not reply. If you are experiencing a medical emergency, contact your nearest health facility immediately.</p>
            <p style="color:#6b7280;font-size:12px;">PAX — Praxis Exchange · Pharmacovigilance &amp; Safety</p>
          </div>`;
        const resp = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deployment_token: process.env.ABACUSAI_API_KEY,
            app_id: process.env.WEB_APP_ID,
            notification_id: process.env.NOTIF_ID_SAFETY_REPORT_ACKNOWLEDGEMENT,
            subject: 'Your safety report has been received — PAX',
            body: htmlBody,
            is_html: true,
            recipient_email: ackEmail,
            sender_email: 'praxis@thepraxisexchange.com',
            sender_alias: 'PAX Safety',
          }),
        });
        const result = await resp.json().catch(() => ({}));
        acknowledgedByEmail = !!result?.success;
      } catch (e) {
        console.error('Safety ack email failed (non-blocking):', e);
      }
    }

    return NextResponse.json({ success: true, id: report.id, acknowledgedByEmail }, { status: 201 });
  } catch (err) {
    console.error('Drug report error:', err);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (role !== 'ADMIN' && role !== 'POLICYMAKER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 20;

    const [reports, total] = await Promise.all([
      prisma.adverseDrugReport.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { reporter: { select: { name: true, role: true } } },
      }),
      prisma.adverseDrugReport.count(),
    ]);

    return NextResponse.json({ reports, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Drug report fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
