'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle, Activity, ShieldAlert, MapPin, TrendingUp, Package,
  Loader2, Flag, CalendarClock, Users,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, Cell, Legend,
} from 'recharts';

const SEX_COLORS: Record<string, string> = { Male: '#2ABFB0', Female: '#8B7FD4', Other: '#FBBF24' };

const BG = '#0B0F1A';
const CARD = '#131929';
const TEAL = '#2ABFB0';
const GOLD = '#FBBF24';
const RED = '#DC2626';
const PURPLE = '#8B7FD4';

const SEVERITY_META: Record<string, { label: string; color: string }> = {
  MILD: { label: 'Mild', color: TEAL },
  MODERATE: { label: 'Moderate', color: GOLD },
  SEVERE: { label: 'Severe', color: RED },
  LIFE_THREATENING: { label: 'Life-threatening', color: '#F87171' },
};

const LEVEL_META: Record<string, { label: string; cls: string; dot: string }> = {
  CRITICAL: { label: 'Critical', cls: 'border-[#DC2626]/50 text-[#F87171] bg-[#DC2626]/10', dot: RED },
  ELEVATED: { label: 'Elevated', cls: 'border-[#FBBF24]/50 text-[#FBBF24] bg-[#FBBF24]/10', dot: GOLD },
  WATCH: { label: 'Watch', cls: 'border-[#8B7FD4]/50 text-[#B9AEEB] bg-[#8B7FD4]/10', dot: PURPLE },
  LOW: { label: 'Low', cls: 'border-white/15 text-gray-400 bg-white/5', dot: '#6B7280' },
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });

function Kpi({ icon: Icon, label, value, accent, sub }: any) {
  return (
    <Card className="border-white/5" style={{ backgroundColor: CARD }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0B0F1A] px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-white">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>{p.name}: <span className="font-semibold">{p.value}</span></p>
      ))}
    </div>
  );
}

export function SurveillanceDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/safety/signals');
        if (res.ok) setData(await res.json());
        else setError(true);
      } catch (e) {
        console.error('Failed to load surveillance signals:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-muted-foreground">
        <ShieldAlert className="mb-2 h-6 w-6 text-[#DC2626]" />
        Could not load surveillance signals. Please try again.
      </div>
    );
  }

  const t = data.totals;
  const drugSignals: any[] = data.drugSignals ?? [];
  const severityDist: any[] = (data.severityDist ?? []).map((s: any) => ({ ...s, ...SEVERITY_META[s.severity] }));
  const trend: any[] = data.trend ?? [];
  const geo: any[] = data.geo ?? [];
  const demographics = data.demographics ?? { ageSex: [], sexDist: [], unknownAge: 0, pregnancyReports: 0, topBand: { band: '—', total: 0 } };
  const ageSex: any[] = demographics.ageSex ?? [];
  const sexDist: any[] = demographics.sexDist ?? [];
  const products: any[] = data.products ?? [];
  const hasReports = t.reports > 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={AlertTriangle} label="Adverse reports" value={t.reports} accent={RED} sub={`${t.recent30} in last 30 days`} />
        <Kpi icon={ShieldAlert} label="Severe events" value={t.severe} accent="#F87171" sub="Severe + life-threatening" />
        <Kpi icon={Activity} label="Critical signals" value={t.criticalSignals} accent={GOLD} sub={`${t.drugsTracked} drugs tracked`} />
        <Kpi icon={Package} label="Flagged products" value={t.flaggedProducts} accent={PURPLE} sub={`${t.productsTracked} products, ${t.feedback} reviews`} />
      </div>

      {!hasReports ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-muted-foreground">
          <Activity className="mb-2 h-6 w-6 text-[#2ABFB0]" />
          No adverse drug reports on record yet. Signals will appear here as reports come in.
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Trend */}
            <Card className="border-white/5" style={{ backgroundColor: CARD }}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#2ABFB0]" />
                  <h3 className="font-display text-sm font-semibold text-white">Reports over time</h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gReports" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={TEAL} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gSevere" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={RED} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={RED} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="reports" name="All reports" stroke={TEAL} strokeWidth={2} fill="url(#gReports)" />
                      <Area type="monotone" dataKey="severe" name="Severe" stroke={RED} strokeWidth={2} fill="url(#gSevere)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Severity distribution */}
            <Card className="border-white/5" style={{ backgroundColor: CARD }}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[#DC2626]" />
                  <h3 className="font-display text-sm font-semibold text-white">Severity distribution</h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={severityDist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="count" name="Reports" radius={[4, 4, 0, 0]}>
                        {severityDist.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ranked drug signals */}
          <Card className="border-white/5" style={{ backgroundColor: CARD }}>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#FBBF24]" />
                <h3 className="font-display text-sm font-semibold text-white">Drug safety signals</h3>
                <span className="text-xs text-muted-foreground">ranked by signal score</span>
              </div>
              <div className="space-y-2">
                {drugSignals.map((d) => {
                  const meta = LEVEL_META[d.level];
                  return (
                    <div key={d.drug} className="rounded-lg border border-white/5 bg-[#0B0F1A]/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.dot }} />
                            <p className="font-medium text-white">{d.drug}</p>
                            <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                          </div>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span>{d.total} report{d.total === 1 ? '' : 's'}</span>
                            {d.severe > 0 && <span className="text-[#F87171]">{d.severe} severe</span>}
                            {d.recent > 0 && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{d.recent} in 30d</span>}
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{d.provinces} region{d.provinces === 1 ? '' : 's'}</span>
                            <span>Last: {fmtDate(d.lastReport)}</span>
                          </p>
                          {/* severity mini-bar */}
                          <div className="mt-2 flex h-1.5 w-full max-w-[420px] overflow-hidden rounded-full bg-white/5">
                            {['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'].map((s) => {
                              const n = d.severity[s] || 0;
                              if (!n) return null;
                              return <div key={s} style={{ width: `${(n / d.total) * 100}%`, backgroundColor: SEVERITY_META[s].color }} />;
                            })}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display text-lg font-bold" style={{ color: meta.dot }}>{d.score}</p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">score</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Demographics: age × sex */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Age band × sex stacked bars */}
            <Card className="border-white/5 lg:col-span-2" style={{ backgroundColor: CARD }}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#2ABFB0]" />
                  <h3 className="font-display text-sm font-semibold text-white">Reports by age group &amp; sex</h3>
                  {demographics.topBand?.total > 0 && (
                    <span className="text-xs text-muted-foreground">most affected: <span className="text-white">{demographics.topBand.band}</span></span>
                  )}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageSex} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="band" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
                      <Bar dataKey="Female" stackId="sex" name="Female" fill={SEX_COLORS.Female} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Male" stackId="sex" name="Male" fill={SEX_COLORS.Male} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Other" stackId="sex" name="Other" fill={SEX_COLORS.Other} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {demographics.unknownAge > 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">{demographics.unknownAge} report{demographics.unknownAge === 1 ? '' : 's'} with unspecified age not shown.</p>
                )}
              </CardContent>
            </Card>

            {/* Sex distribution + headline stats */}
            <Card className="border-white/5" style={{ backgroundColor: CARD }}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#8B7FD4]" />
                  <h3 className="font-display text-sm font-semibold text-white">Sex distribution</h3>
                </div>
                <div className="space-y-3">
                  {sexDist.map((s) => {
                    const pct = t.reports > 0 ? Math.round((s.count / t.reports) * 100) : 0;
                    return (
                      <div key={s.sex}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-gray-300">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEX_COLORS[s.sex] }} />
                            {s.sex}
                          </span>
                          <span className="text-muted-foreground">{s.count} · {pct}%{s.severe > 0 ? ` · ${s.severe} severe` : ''}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: SEX_COLORS[s.sex] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {demographics.pregnancyReports > 0 && (
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-pink-500/20 bg-pink-500/5 px-3 py-2">
                    <span className="text-[11px] text-pink-200">Reports involving pregnancy</span>
                    <span className="font-display text-sm font-bold text-pink-200">{demographics.pregnancyReports}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Geo + product watchlist */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-white/5" style={{ backgroundColor: CARD }}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#8B7FD4]" />
                  <h3 className="font-display text-sm font-semibold text-white">Geographic spread</h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={geo} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="region" width={90} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="count" name="Reports" radius={[0, 4, 4, 0]} fill={PURPLE} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/5" style={{ backgroundColor: CARD }}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#2ABFB0]" />
                  <h3 className="font-display text-sm font-semibold text-white">Product watchlist</h3>
                </div>
                {products.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No product feedback yet.</p>
                ) : (
                  <div className="space-y-2">
                    {products.slice(0, 8).map((p) => (
                      <div key={p.product} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#0B0F1A]/60 p-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {p.flagged && <Flag className="h-3.5 w-3.5 text-[#F87171]" />}
                            <p className="truncate text-sm font-medium text-white">{p.product}</p>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {p.count} review{p.count === 1 ? '' : 's'}{p.expert > 0 ? ` · ${p.expert} expert` : ''}{p.low > 0 ? ` · ${p.low} low` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display text-base font-bold" style={{ color: p.flagged ? '#F87171' : p.weightedAvg >= 4 ? TEAL : GOLD }}>
                            {p.weightedAvg.toFixed(1)}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">wtd ★</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
