export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { SAFETY_SEVERITY_POINTS, safetySignalLevel } from '@/lib/safety-signals';

const SEVERITY_ORDER = ['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'];

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

// GET — post-market surveillance signals: aggregates raw reports into ranked signals,
// severity distribution, monthly trend, geographic spread and a product watchlist.
export async function GET(req: Request) {
  const auth = await requirePermission('safety.signal.read', {}, req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // Window for the trend chart: start of the month, 5 months back (6 buckets incl. current).
    const trendStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const [reports, feedback] = await Promise.all([
      prisma.adverseDrugReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5000,
        select: {
          id: true, drugName: true, severity: true, sideEffects: true,
          province: true, country: true, createdAt: true,
          patientAge: true, patientGender: true, isPregnant: true,
        },
      }),
      prisma.productFeedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5000,
        select: {
          id: true, productName: true, rating: true, expertWeight: true,
          isExpertReview: true, province: true, country: true, createdAt: true,
        },
      }),
    ]);

    // ---- Drug safety signals ----
    type DrugAgg = {
      drug: string;
      total: number;
      recent: number;
      severity: Record<string, number>;
      provinces: Set<string>;
      lastReport: Date;
      score: number;
    };
    const drugMap = new Map<string, DrugAgg>();
    for (const r of reports) {
      const key = r.drugName.trim();
      if (!key) continue;
      let a = drugMap.get(key.toLowerCase());
      if (!a) {
        a = { drug: key, total: 0, recent: 0, severity: {}, provinces: new Set(), lastReport: r.createdAt, score: 0 };
        drugMap.set(key.toLowerCase(), a);
      }
      a.total += 1;
      if (r.createdAt >= thirtyDaysAgo) a.recent += 1;
      a.severity[r.severity] = (a.severity[r.severity] || 0) + 1;
      if (r.province) a.provinces.add(r.province);
      if (r.createdAt > a.lastReport) a.lastReport = r.createdAt;
    }
    const drugSignals = Array.from(drugMap.values())
      .map((a) => {
        // Signal score follows the shared, deterministic pharmacovigilance policy.
        const severityScore = SEVERITY_ORDER.reduce(
          (sum, s) => sum + (a.severity[s] || 0) * SAFETY_SEVERITY_POINTS[s as keyof typeof SAFETY_SEVERITY_POINTS], 0);
        const score = severityScore;
        const severe = (a.severity['SEVERE'] || 0) + (a.severity['LIFE_THREATENING'] || 0);
        const level = safetySignalLevel(score);
        return {
          drug: a.drug,
          total: a.total,
          recent: a.recent,
          severe,
          severity: a.severity,
          provinces: a.provinces.size,
          lastReport: a.lastReport,
          score,
          level,
        };
      })
      .sort((x, y) => y.score - x.score)
      .slice(0, 25);

    // ---- Severity distribution ----
    const severityDist = SEVERITY_ORDER.map((s) => ({
      severity: s,
      count: reports.filter((r) => r.severity === s).length,
    }));

    // ---- Monthly trend (6 buckets) ----
    const buckets: string[] = [];
    for (let i = 0; i < 6; i++) {
      buckets.push(monthKey(new Date(Date.UTC(trendStart.getUTCFullYear(), trendStart.getUTCMonth() + i, 1))));
    }
    const trendMap = new Map<string, { reports: number; severe: number }>();
    buckets.forEach((b) => trendMap.set(b, { reports: 0, severe: 0 }));
    for (const r of reports) {
      const k = monthKey(r.createdAt);
      const t = trendMap.get(k);
      if (t) {
        t.reports += 1;
        if (r.severity === 'SEVERE' || r.severity === 'LIFE_THREATENING') t.severe += 1;
      }
    }
    const trend = buckets.map((b) => ({ month: monthLabel(b), reports: trendMap.get(b)!.reports, severe: trendMap.get(b)!.severe }));

    // ---- Geographic spread ----
    const geoMap = new Map<string, number>();
    for (const r of reports) {
      const key = r.province || r.country || 'Unspecified';
      geoMap.set(key, (geoMap.get(key) || 0) + 1);
    }
    const geo = Array.from(geoMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ---- Demographics: age bands × sex (epidemiological breakdown) ----
    const SEVERE_SET = new Set(['SEVERE', 'LIFE_THREATENING']);
    const AGE_BANDS = ['0-59m', '5-14', '15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    function ageBand(age: number): string {
      if (isNaN(age) || age < 0) return 'Unknown';
      if (age < 5) return '0-59m';
      if (age < 15) return '5-14';
      if (age < 25) return '15-24';
      if (age < 35) return '25-34';
      if (age < 45) return '35-44';
      if (age < 55) return '45-54';
      if (age < 65) return '55-64';
      return '65+';
    }
    function normSex(g: string | null | undefined): 'Male' | 'Female' | 'Other' {
      const v = (g || '').trim().toLowerCase();
      if (v === 'male' || v === 'm') return 'Male';
      if (v === 'female' || v === 'f') return 'Female';
      return 'Other';
    }
    // age band -> {Male, Female, Other, total, severe}
    const ageMap = new Map<string, { band: string; Male: number; Female: number; Other: number; total: number; severe: number }>();
    AGE_BANDS.forEach((b) => ageMap.set(b, { band: b, Male: 0, Female: 0, Other: 0, total: 0, severe: 0 }));
    const sexCount: Record<string, number> = { Male: 0, Female: 0, Other: 0 };
    const sexSevere: Record<string, number> = { Male: 0, Female: 0, Other: 0 };
    let unknownAge = 0;
    let pregnancyReports = 0;
    for (const r of reports) {
      const band = ageBand(r.patientAge as number);
      const sex = normSex(r.patientGender);
      const isSevere = SEVERE_SET.has(r.severity);
      sexCount[sex] += 1;
      if (isSevere) sexSevere[sex] += 1;
      if (r.isPregnant) pregnancyReports += 1;
      if (band === 'Unknown') { unknownAge += 1; continue; }
      const a = ageMap.get(band)!;
      a[sex] += 1;
      a.total += 1;
      if (isSevere) a.severe += 1;
    }
    const demographics = {
      ageSex: AGE_BANDS.map((b) => ageMap.get(b)!),
      sexDist: (['Male', 'Female', 'Other'] as const).map((s) => ({
        sex: s,
        count: sexCount[s],
        severe: sexSevere[s],
      })),
      unknownAge,
      pregnancyReports,
      // Most-affected age band by report volume (for a quick headline stat).
      topBand: AGE_BANDS
        .map((b) => ({ band: b, total: ageMap.get(b)!.total }))
        .sort((x, y) => y.total - x.total)[0] || { band: '—', total: 0 },
    };

    // ---- Product watchlist (weighted rating; flag low-rated / high-volume) ----
    type ProdAgg = { product: string; count: number; weightSum: number; weightedSum: number; low: number; expert: number; lastAt: Date };
    const prodMap = new Map<string, ProdAgg>();
    for (const f of feedback) {
      const key = f.productName.trim();
      if (!key) continue;
      let a = prodMap.get(key.toLowerCase());
      if (!a) {
        a = { product: key, count: 0, weightSum: 0, weightedSum: 0, low: 0, expert: 0, lastAt: f.createdAt };
        prodMap.set(key.toLowerCase(), a);
      }
      a.count += 1;
      a.weightSum += f.expertWeight;
      a.weightedSum += f.rating * f.expertWeight;
      if (f.rating <= 2) a.low += 1;
      if (f.isExpertReview) a.expert += 1;
      if (f.createdAt > a.lastAt) a.lastAt = f.createdAt;
    }
    const products = Array.from(prodMap.values())
      .map((a) => {
        const weightedAvg = a.weightSum > 0 ? Math.round((a.weightedSum / a.weightSum) * 10) / 10 : 0;
        const flagged = weightedAvg > 0 && weightedAvg <= 2.5;
        return { product: a.product, count: a.count, weightedAvg, low: a.low, expert: a.expert, flagged, lastAt: a.lastAt };
      })
      .sort((x, y) => (Number(y.flagged) - Number(x.flagged)) || (x.weightedAvg - y.weightedAvg) || (y.count - x.count))
      .slice(0, 25);

    // ---- KPI totals ----
    const severeTotal = reports.filter((r) => r.severity === 'SEVERE' || r.severity === 'LIFE_THREATENING').length;
    const recentTotal = reports.filter((r) => r.createdAt >= thirtyDaysAgo).length;
    const criticalSignals = drugSignals.filter((d) => d.level === 'CRITICAL').length;

    return NextResponse.json({
      totals: {
        reports: reports.length,
        feedback: feedback.length,
        severe: severeTotal,
        recent30: recentTotal,
        drugsTracked: drugMap.size,
        productsTracked: prodMap.size,
        criticalSignals,
        flaggedProducts: products.filter((p) => p.flagged).length,
      },
      drugSignals,
      severityDist,
      trend,
      geo,
      demographics,
      products,
    });
  } catch (error: any) {
    console.error('Surveillance signals error:', error);
    return NextResponse.json({ error: 'Failed to load surveillance signals' }, { status: 500 });
  }
}
