export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';

// GET — aggregates for the analytics charts.
// Two layers: (1) PLATFORM analytics — growth, users, innovations, investment,
// marketplace, community. (2) GHS analytics — Global Health Security signals
// derived from the surveillance + geographic + verification data.
export async function GET() {
  const auth = await requireAdmin('admin.analytics.read');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const [
      users, innovations, investments,
      usersByRole, usersByTier, innByStatus,
      usersByVerification, usersByCountry,
      adrs, feedback,
      debates, contributions, gpsEntries,
      listings, vendors,
      invoices, hubMembers,
    ] = await Promise.all([
      prisma.user.findMany({ select: { createdAt: true, credibilityScore: true } }),
      prisma.innovation.findMany({ select: { createdAt: true, status: true, stage: true } }),
      prisma.investment.findMany({ select: { amount: true, status: true } }),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.groupBy({ by: ['tier'], _count: { _all: true } }),
      prisma.innovation.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.user.groupBy({ by: ['verificationLevel'], _count: { _all: true } }),
      prisma.user.groupBy({ by: ['country'], _count: { _all: true } }),
      prisma.adverseDrugReport.findMany({
        select: { drugName: true, severity: true, country: true, province: true, createdAt: true, patientAge: true },
      }),
      prisma.productFeedback.findMany({ select: { rating: true, country: true, createdAt: true, expertWeight: true } }),
      prisma.debate.count(),
      prisma.debateContribution.count(),
      prisma.gpsEntry.count(),
      prisma.marketplaceListing.count(),
      prisma.marketplaceVendor.count(),
      prisma.invoice.findMany({ select: { totalAmount: true, status: true } }),
      prisma.user.count({ where: { hubMember: true } }),
    ]);

    // ─── Growth series (6 months, cumulative) ───
    const now = new Date();
    const growth = [];
    for (let i = 5; i >= 0; i--) {
      const label = new Date(now.getFullYear(), now.getMonth() - i, 1)
        .toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const cutoff = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      growth.push({
        month: label,
        users: users.filter((u) => u.createdAt < cutoff).length,
        innovations: innovations.filter((x) => x.createdAt < cutoff).length,
        reports: adrs.filter((r) => r.createdAt < cutoff).length,
      });
    }

    const roleDist = usersByRole.map((r) => ({ name: r.role, value: r._count._all }));
    const tierDist = usersByTier.map((t) => ({ name: t.tier, value: t._count._all }));
    const statusDist = innByStatus.map((s) => ({ name: s.status, value: s._count._all }));
    const investmentTotal = investments.reduce((sum, i) => sum + i.amount, 0);

    // ─── GHS: geographic reach ───
    const geoDist = usersByCountry
      .filter((c) => c.country)
      .map((c) => ({ name: c.country as string, value: c._count._all }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // ─── GHS: verification coverage (trust index) ───
    const verificationDist = usersByVerification.map((v) => ({ name: v.verificationLevel, value: v._count._all }));
    const verifiedCount = usersByVerification
      .filter((v) => v.verificationLevel !== 'NONE')
      .reduce((s, v) => s + v._count._all, 0);
    const trustIndex = users.length ? Math.round((verifiedCount / users.length) * 100) : 0;

    // ─── GHS: surveillance signal strength by drug ───
    const SEV_WEIGHT: Record<string, number> = {
      MILD: 1, MODERATE: 2, SEVERE: 4, LIFE_THREATENING: 6,
    };
    const drugMap = new Map<string, { count: number; score: number; severe: number }>();
    for (const r of adrs) {
      const key = r.drugName.trim();
      const cur = drugMap.get(key) ?? { count: 0, score: 0, severe: 0 };
      cur.count += 1;
      cur.score += SEV_WEIGHT[r.severity] ?? 1;
      if (r.severity === 'SEVERE' || r.severity === 'LIFE_THREATENING') cur.severe += 1;
      drugMap.set(key, cur);
    }
    const signals = Array.from(drugMap.entries())
      .map(([drug, v]) => ({
        drug,
        reports: v.count,
        score: v.score,
        severe: v.severe,
        level: v.score >= 12 ? 'CRITICAL' : v.score >= 6 ? 'ELEVATED' : v.score >= 3 ? 'WATCH' : 'LOW',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const criticalSignals = signals.filter((s) => s.level === 'CRITICAL').length;

    // ─── GHS: severity spread ───
    const sevMap = new Map<string, number>();
    for (const r of adrs) sevMap.set(r.severity, (sevMap.get(r.severity) ?? 0) + 1);
    const severityDist = Array.from(sevMap.entries()).map(([name, value]) => ({ name, value }));

    // ─── GHS: surveillance geography (where reports come from) ───
    const provMap = new Map<string, number>();
    for (const r of adrs) {
      const key = r.province || r.country || 'Unspecified';
      provMap.set(key, (provMap.get(key) ?? 0) + 1);
    }
    const reportGeo = Array.from(provMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // ─── GHS: paediatric exposure (0 to 59 months) ───
    const under5 = adrs.filter((r) => r.patientAge <= 4).length;

    // ─── Community health ───
    const avgCredibility = users.length
      ? Math.round(users.reduce((s, u) => s + u.credibilityScore, 0) / users.length)
      : 0;

    // ─── PAX-owned finance (Marketplace transactions remain off-platform) ───
    const invoicedTotal = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const collectedTotal = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((s, i) => s + i.totalAmount, 0);

    return NextResponse.json({
      // Platform
      growth, roleDist, tierDist, statusDist, investmentTotal,
      totals: {
        users: users.length,
        innovations: innovations.length,
        investments: investments.length,
        debates, contributions, gpsEntries,
        listings, vendors, hubMembers,
        invoicedTotal, collectedTotal,
        avgCredibility,
      },
      // GHS
      ghs: {
        trustIndex,
        verifiedCount,
        verificationDist,
        geoDist,
        signals,
        criticalSignals,
        severityDist,
        reportGeo,
        totalReports: adrs.length,
        totalFeedback: feedback.length,
        under5,
        countriesReached: geoDist.length,
      },
    });
  } catch (error: any) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
