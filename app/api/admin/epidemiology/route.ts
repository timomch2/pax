export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN-ONLY EPIDEMIOLOGY ENGINE
//
// Derives population-level signals from practitioner activity and safety data.
// Governance rules baked into this route (see /terms-of-reference):
//   • No patient identifiers ever leave this file — no names, phones, emails,
//     national IDs, dates of birth or free-text clinical notes are selected.
//   • Small-cell suppression: any group with fewer than MIN_CELL records is
//     withheld so that no individual can be inferred.
//   • Output is counts, rates and distributions only.
// ─────────────────────────────────────────────────────────────────────────────

const MIN_CELL = 5;

type Bucket = { label: string; count: number };

function suppress(rows: Bucket[]) {
  const kept = rows.filter((r) => r.count >= MIN_CELL).sort((a, b) => b.count - a.count);
  const hidden = rows.filter((r) => r.count < MIN_CELL);
  return {
    rows: kept,
    suppressed: hidden.reduce((s, r) => s + r.count, 0),
    suppressedGroups: hidden.length,
  };
}

function tally(values: (string | null | undefined)[], fallback = 'Not stated'): Bucket[] {
  const m = new Map<string, number>();
  for (const v of values) {
    const k = (v ?? '').toString().trim() || fallback;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([label, count]) => ({ label, count }));
}

/** WHO-style age bands, starting with 0 to 59 months. */
function ageBand(age: number): string {
  if (age < 5) return '0 to 59 months';
  if (age < 15) return '5 to 14 years';
  if (age < 25) return '15 to 24 years';
  if (age < 45) return '25 to 44 years';
  if (age < 65) return '45 to 64 years';
  return '65 years and over';
}

const AGE_ORDER = ['0 to 59 months', '5 to 14 years', '15 to 24 years', '25 to 44 years', '45 to 64 years', '65 years and over'];

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthSeries(dates: Date[], months: number) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }
  const m = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const d of dates) {
    const k = monthKey(new Date(d));
    if (m.has(k)) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return keys.map((k) => ({ month: k, count: m.get(k) ?? 0 }));
}

/** Split the comma / semicolon separated side-effect field into individual terms. */
function splitTerms(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(/[,;|]/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1));
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin('safety.signal.read');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const raw = parseInt(req.nextUrl.searchParams.get('months') ?? '12', 10);
  const months = Math.min(Math.max(Number.isFinite(raw) ? raw : 12, 3), 36);
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - months);

  try {
    const [adrs, feedback, invoices, appointments, hubPractitioners, hubPatients] = await Promise.all([
      prisma.adverseDrugReport.findMany({
        where: { createdAt: { gte: since } },
        select: {
          drugName: true, sideEffects: true, severity: true, patientAge: true,
          patientGender: true, isPregnant: true, country: true, province: true, createdAt: true,
        },
      }),
      prisma.productFeedback.findMany({
        where: { createdAt: { gte: since } },
        select: { productName: true, rating: true, country: true, createdAt: true },
      }),
      prisma.invoice.findMany({
        where: { serviceDate: { gte: since } },
        select: {
          serviceType: true, serviceDate: true, totalAmount: true,
          practitioner: { select: { country: true, city: true } },
        },
      }),
      prisma.appointment.findMany({
        where: { dateTime: { gte: since } },
        select: { type: true, status: true, dateTime: true },
      }),
      prisma.user.count({ where: { hubMember: true } }),
      prisma.hubPatient.count(),
    ]);

    // ── Encounter burden (practitioner activity) ──────────────────────────────
    const encounters = invoices.length + appointments.length;
    const serviceMix = suppress(tally(invoices.map((i) => i.serviceType), 'Unspecified service'));
    const encounterGeo = suppress(
      tally(
        invoices.map((i) => {
          const c = i.practitioner?.country?.trim();
          const city = i.practitioner?.city?.trim();
          return c ? (city ? `${city}, ${c}` : c) : null;
        }),
        'Location not stated',
      ),
    );
    const appointmentTypes = suppress(tally(appointments.map((a) => a.type)));
    const encounterTrend = monthSeries(
      [...invoices.map((i) => i.serviceDate), ...appointments.map((a) => a.dateTime)],
      months,
    );

    // ── Safety-derived epidemiology ───────────────────────────────────────────
    const ageRows = tally(adrs.map((a) => ageBand(a.patientAge)));
    const ageDist = suppress(ageRows).rows.sort(
      (a, b) => AGE_ORDER.indexOf(a.label) - AGE_ORDER.indexOf(b.label),
    );
    const ageSuppressed = suppress(ageRows).suppressed;

    const sexDist = suppress(tally(adrs.map((a) => a.patientGender)));
    const severityDist = suppress(tally(adrs.map((a) => a.severity)));
    const geoDist = suppress(
      tally(adrs.map((a) => (a.province ? `${a.province}, ${a.country}` : a.country))),
    );
    const topDrugs = suppress(tally(adrs.map((a) => a.drugName.trim())));
    const symptomTerms: string[] = [];
    for (const a of adrs) symptomTerms.push(...splitTerms(a.sideEffects));
    const topSymptoms = suppress(tally(symptomTerms));
    const adrTrend = monthSeries(adrs.map((a) => a.createdAt), months);
    const pregnancyExposure = adrs.filter((a) => a.isPregnant).length;
    const under5 = adrs.filter((a) => a.patientAge < 5).length;
    const severeCount = adrs.filter((a) => a.severity === 'SEVERE' || a.severity === 'LIFE_THREATENING').length;

    // ── Product signal ────────────────────────────────────────────────────────
    const productRows = new Map<string, { n: number; sum: number }>();
    for (const f of feedback) {
      const k = f.productName.trim() || 'Unnamed product';
      const cur = productRows.get(k) ?? { n: 0, sum: 0 };
      cur.n += 1;
      cur.sum += f.rating;
      productRows.set(k, cur);
    }
    const productSignal = [...productRows.entries()]
      .filter(([, v]) => v.n >= MIN_CELL)
      .map(([label, v]) => ({ label, count: v.n, avgRating: Math.round((v.sum / v.n) * 10) / 10 }))
      .sort((a, b) => a.avgRating - b.avgRating)
      .slice(0, 10);
    const productSuppressed = [...productRows.values()].filter((v) => v.n < MIN_CELL).reduce((s, v) => s + v.n, 0);

    return NextResponse.json({
      window: { months, since: since.toISOString() },
      governance: {
        minCell: MIN_CELL,
        note:
          'Aggregated and de-identified. No patient identifiers are read by this analysis. Groups of fewer than ' +
          MIN_CELL +
          ' records are withheld.',
      },
      totals: {
        encounters,
        invoices: invoices.length,
        appointments: appointments.length,
        hubPractitioners,
        hubPatients,
        adrReports: adrs.length,
        feedbackReports: feedback.length,
        severeCount,
        under5,
        pregnancyExposure,
        severeRate: adrs.length ? Math.round((severeCount / adrs.length) * 1000) / 10 : 0,
      },
      encounter: {
        trend: encounterTrend,
        serviceMix: serviceMix.rows.slice(0, 12),
        serviceMixSuppressed: serviceMix.suppressed,
        geography: encounterGeo.rows.slice(0, 12),
        geographySuppressed: encounterGeo.suppressed,
        appointmentTypes: appointmentTypes.rows,
        appointmentTypesSuppressed: appointmentTypes.suppressed,
      },
      safety: {
        trend: adrTrend,
        ageDistribution: ageDist,
        ageSuppressed,
        sexDistribution: sexDist.rows,
        sexSuppressed: sexDist.suppressed,
        severityDistribution: severityDist.rows,
        severitySuppressed: severityDist.suppressed,
        geography: geoDist.rows.slice(0, 12),
        geographySuppressed: geoDist.suppressed,
        topDrugs: topDrugs.rows.slice(0, 12),
        topDrugsSuppressed: topDrugs.suppressed,
        topSymptoms: topSymptoms.rows.slice(0, 12),
        topSymptomsSuppressed: topSymptoms.suppressed,
      },
      products: {
        lowestRated: productSignal,
        suppressed: productSuppressed,
      },
    });
  } catch (e: any) {
    console.error('[admin/epidemiology] failed:', e);
    return NextResponse.json({ error: 'Failed to compute epidemiology aggregates' }, { status: 500 });
  }
}
