'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, AlertTriangle, Baby, HeartPulse, Users, ShieldCheck,
  Stethoscope, Globe, Lock, Pill,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';

const CARD = '#131929';
const TEAL = '#2ABFB0';
const GOLD = '#FBBF24';
const RED = '#DC2626';
const PURPLE = '#8B7FD4';
const PALETTE = [TEAL, GOLD, PURPLE, RED, '#60A5FA', '#F472B6', '#34D399', '#FB923C'];

const num = (n: number) => new Intl.NumberFormat('en-US').format(n);
const prettify = (s: string) =>
  s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function Kpi({ icon: Icon, label, value, accent, sub }: any) {
  return (
    <Card className="border-black/[0.06]" style={{ backgroundColor: CARD }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <p className="mt-2 font-display text-2xl font-bold text-[#1A2332]">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-black/[0.08] bg-[#FAF8F5] px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-[#1A2332]">{prettify(String(label))}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {prettify(String(p.name))}: <span className="font-semibold">{num(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function Panel({ title, subtitle, suppressed, children }: any) {
  return (
    <Card className="border-black/[0.06]" style={{ backgroundColor: CARD }}>
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-[#1A2332]">{title}</p>
        {subtitle && <p className="mb-3 mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
        <div className={subtitle ? '' : 'mt-4'}>{children}</div>
        {suppressed > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#FBBF24]/80">
            <Lock className="h-3 w-3" />
            {num(suppressed)} record{suppressed === 1 ? '' : 's'} withheld — groups under 5 are suppressed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function BarPanel({ title, subtitle, rows, suppressed, color = TEAL }: any) {
  return (
    <Panel title={title} subtitle={subtitle} suppressed={suppressed}>
      {rows?.length ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#8B93A7', fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={140} tick={{ fill: '#8B93A7', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
            <Bar dataKey="count" name="Records" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Empty label="Nothing above the disclosure threshold yet." />
      )}
    </Panel>
  );
}

export function AdminEpidemiology() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/epidemiology?months=${months}`);
        if (!res.ok) throw new Error('Unable to load epidemiological aggregates.');
        const json = await res.json();
        if (!cancelled) { setData(json); setError(null); }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [months]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[320px]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="border-[#DC2626]/30" style={{ backgroundColor: CARD }}>
          <CardContent className="flex items-center gap-3 p-6">
            <AlertTriangle className="h-5 w-5 text-[#F87171]" />
            <p className="text-sm text-gray-700">{error || 'No epidemiological data available.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const t = data.totals ?? {};
  const enc = data.encounter ?? {};
  const saf = data.safety ?? {};

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1A2332]">Epidemiology</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Population-level signals derived from practitioner activity and safety reporting.
            Aggregated and de-identified — no patient identifiers are read by this analysis.
          </p>
        </div>
        <div className="flex gap-2">
          {[6, 12, 24].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                months === m
                  ? 'border-[#2ABFB0] bg-[#2ABFB0]/10 text-[#1A2332]'
                  : 'border-black/[0.08] text-muted-foreground hover:text-gray-700'
              }`}
            >
              {m} months
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#2ABFB0]/25 bg-[#E8F3F1] p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2ABFB0]" />
        <p className="text-[12px] leading-relaxed text-gray-400">
          <span className="font-semibold text-[#2ABFB0]">Privacy safeguards active.</span>{' '}
          Names, phone numbers, emails, national IDs and clinical notes are never queried. Any group
          with fewer than {data.governance?.minCell ?? 5} records is withheld from every chart on this page.
          This view is restricted to administrators and is governed by the platform Terms of Reference.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Stethoscope} label="Clinical Encounters" value={num(t.encounters ?? 0)} accent={TEAL}
          sub={`${num(t.invoices ?? 0)} billed · ${num(t.appointments ?? 0)} appointments`} />
        <Kpi icon={Users} label="Contributing Practices" value={num(t.hubPractitioners ?? 0)} accent={PURPLE}
          sub={`${num(t.hubPatients ?? 0)} patient records in scope`} />
        <Kpi icon={Activity} label="Safety Reports" value={num(t.adrReports ?? 0)} accent={GOLD}
          sub={`${num(t.feedbackReports ?? 0)} product feedback entries`} />
        <Kpi icon={AlertTriangle} label="Severe Reaction Rate" value={`${t.severeRate ?? 0}%`} accent={RED}
          sub={`${num(t.severeCount ?? 0)} severe or life-threatening`} />
        <Kpi icon={Baby} label="Paediatric Exposure" value={num(t.under5 ?? 0)} accent={GOLD}
          sub="Reports in children 0 to 59 months" />
        <Kpi icon={HeartPulse} label="Pregnancy Exposure" value={num(t.pregnancyExposure ?? 0)} accent={PURPLE}
          sub="Reports where pregnancy was recorded" />
        <Kpi icon={Globe} label="Reporting Locations" value={num(saf.geography?.length ?? 0)} accent={TEAL}
          sub="Distinct areas above threshold" />
        <Kpi icon={Pill} label="Products Under Watch" value={num(data.products?.lowestRated?.length ?? 0)} accent={RED}
          sub="Lowest-rated with enough reviews" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Encounter Burden Over Time" subtitle="Billed services and appointments per month">
          {enc.trend?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={enc.trend}>
                <defs>
                  <linearGradient id="encGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="month" tick={{ fill: '#8B93A7', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8B93A7', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" name="Encounters" stroke={TEAL} fill="url(#encGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty label="No encounter activity in this window." />}
        </Panel>

        <Panel title="Safety Reporting Over Time" subtitle="Adverse drug reaction reports per month">
          {saf.trend?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={saf.trend}>
                <defs>
                  <linearGradient id="adrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={RED} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="month" tick={{ fill: '#8B93A7', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8B93A7', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" name="Reports" stroke={RED} fill="url(#adrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty label="No safety reports in this window." />}
        </Panel>

        <Panel title="Age Distribution" subtitle="Safety reports by age band" suppressed={saf.ageSuppressed}>
          {saf.ageDistribution?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={saf.ageDistribution} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="label" tick={{ fill: '#8B93A7', fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#8B93A7', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="count" name="Reports" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty label="Nothing above the disclosure threshold yet." />}
        </Panel>

        <Panel title="Severity Profile" subtitle="How serious reported reactions are" suppressed={saf.severitySuppressed}>
          {saf.severityDistribution?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={saf.severityDistribution} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={(e: any) => prettify(e.label)}>
                  {saf.severityDistribution.map((_: any, i: number) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty label="Nothing above the disclosure threshold yet." />}
        </Panel>

        <BarPanel title="Most Reported Symptoms" subtitle="Individual reaction terms across all reports"
          rows={saf.topSymptoms} suppressed={saf.topSymptomsSuppressed} color={PURPLE} />

        <BarPanel title="Most Reported Medicines" subtitle="Products named in safety reports"
          rows={saf.topDrugs} suppressed={saf.topDrugsSuppressed} color={RED} />

        <BarPanel title="Service Mix" subtitle="What practitioners are actually treating and billing for"
          rows={enc.serviceMix} suppressed={enc.serviceMixSuppressed} color={TEAL} />

        <BarPanel title="Geographic Spread of Reports" subtitle="Where safety reports originate"
          rows={saf.geography} suppressed={saf.geographySuppressed} color={GOLD} />
      </div>

      <Panel
        title="Products Under Watch"
        subtitle="Lowest average rating among products with at least 5 reviews"
        suppressed={data.products?.suppressed}
      >
        {data.products?.lowestRated?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Reviews</th>
                  <th className="py-2">Average rating</th>
                </tr>
              </thead>
              <tbody>
                {data.products.lowestRated.map((p: any) => (
                  <tr key={p.label} className="border-b border-black/[0.06] last:border-0">
                    <td className="py-2.5 pr-4 text-gray-700">{p.label}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{num(p.count)}</td>
                    <td className="py-2.5">
                      <span className={p.avgRating < 3 ? 'text-[#F87171]' : 'text-gray-700'}>
                        {p.avgRating.toFixed(1)} / 5
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty label="No product has reached 5 reviews in this window." />}
      </Panel>
    </div>
  );
}
