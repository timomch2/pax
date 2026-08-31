'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Lightbulb, TrendingUp, Scale, Store, ShieldCheck,
  Globe, AlertTriangle, Activity, Baby, Award, Stethoscope,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
} from 'recharts';

const CARD = '#131929';
const TEAL = '#2ABFB0';
const GOLD = '#FBBF24';
const RED = '#DC2626';
const PURPLE = '#8B7FD4';
const PALETTE = [TEAL, GOLD, PURPLE, RED, '#60A5FA', '#F472B6', '#34D399', '#FB923C'];

const LEVEL_CLS: Record<string, string> = {
  CRITICAL: 'border-[#DC2626]/50 text-[#F87171] bg-[#DC2626]/10',
  ELEVATED: 'border-[#FBBF24]/50 text-[#FBBF24] bg-[#FBBF24]/10',
  WATCH: 'border-[#8B7FD4]/50 text-[#B9AEEB] bg-[#8B7FD4]/10',
  LOW: 'border-black/[0.1] text-gray-400 bg-black/[0.04]',
};

const prettify = (s: string) =>
  s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const num = (n: number) => new Intl.NumberFormat('en-US').format(n);
const ksh = (n: number) => `KSh ${new Intl.NumberFormat('en-US').format(Math.round(n))}`;

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

function Panel({ title, subtitle, children }: any) {
  return (
    <Card className="border-black/[0.06]" style={{ backgroundColor: CARD }}>
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-[#1A2332]">{title}</p>
        {subtitle && <p className="mb-4 mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
        <div className={subtitle ? '' : 'mt-4'}>{children}</div>
      </CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

export function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'platform' | 'ghs'>('platform');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/analytics');
        if (!res.ok) throw new Error('Failed to load analytics');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-56" />
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
            <p className="text-sm text-gray-700">{error || 'No analytics data available.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const t = data.totals ?? {};
  const g = data.ghs ?? {};

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#1A2332]">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform performance and Global Health Security intelligence across the PAX ecosystem.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-black/[0.06]">
        {([
          { id: 'platform', label: 'Platform Analytics', icon: TrendingUp },
          { id: 'ghs', label: 'Global Health Security', icon: Globe },
        ] as const).map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors ${
              tab === x.id
                ? 'border-[#2ABFB0] text-[#1A2332]'
                : 'border-transparent text-muted-foreground hover:text-gray-700'
            }`}
          >
            <x.icon className="h-4 w-4" />
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'platform' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Users} label="Total Users" value={num(t.users ?? 0)} accent={TEAL}
              sub={`${num(t.hubMembers ?? 0)} in Practitioners Hub`} />
            <Kpi icon={Lightbulb} label="Innovations" value={num(t.innovations ?? 0)} accent={GOLD}
              sub={`${num(t.gpsEntries ?? 0)} GPS entries`} />
            <Kpi icon={TrendingUp} label="Investment Signalled" value={ksh(data.investmentTotal ?? 0)} accent={PURPLE}
              sub={`${num(t.investments ?? 0)} indications`} />
            <Kpi icon={Scale} label="Debates" value={num(t.debates ?? 0)} accent={RED}
              sub={`${num(t.contributions ?? 0)} contributions`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Store} label="Marketplace Listings" value={num(t.listings ?? 0)} accent={TEAL}
              sub={`${num(t.vendors ?? 0)} vendors`} />
            <Kpi icon={Stethoscope} label="Hub Invoiced" value={ksh(t.invoicedTotal ?? 0)} accent={PURPLE}
              sub={`${ksh(t.collectedTotal ?? 0)} collected`} />
            <Kpi icon={Award} label="Avg Credibility" value={num(t.avgCredibility ?? 0)} accent={RED}
              sub="Across all members" />
          </div>

          <Panel title="Ecosystem Growth" subtitle="Cumulative totals over the last six months">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.growth}>
                <defs>
                  <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TEAL} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PURPLE} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="users" name="Users" stroke={TEAL} fill="url(#gU)" strokeWidth={2} />
                <Area type="monotone" dataKey="innovations" name="Innovations" stroke={GOLD} fill="url(#gI)" strokeWidth={2} />
                <Area type="monotone" dataKey="reports" name="Safety Reports" stroke={PURPLE} fill="url(#gR)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Users by Role">
              {data.roleDist?.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={data.roleDist} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {data.roleDist.map((_: any, i: number) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => prettify(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty label="No role data yet" />}
            </Panel>

            <Panel title="Membership Tiers">
              {data.tierDist?.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={data.tierDist} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {data.tierDist.map((_: any, i: number) => (
                        <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => prettify(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty label="No tier data yet" />}
            </Panel>

            <Panel title="Innovation Pipeline">
              {data.statusDist?.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.statusDist} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#6B7280', fontSize: 10 }}
                      axisLine={false} tickLine={false} tickFormatter={prettify} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Innovations" radius={[0, 4, 4, 0]}>
                      {data.statusDist.map((_: any, i: number) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty label="No innovations yet" />}
            </Panel>
          </div>
        </div>
      )}

      {tab === 'ghs' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#8B7FD4]/20 bg-[#8B7FD4]/5 p-4">
            <p className="text-xs leading-relaxed text-gray-400">
              <span className="font-semibold text-[#B9AEEB]">Global Health Security (GHS)</span> —
              aggregate intelligence derived from community surveillance, verification coverage and
              geographic reach. All figures are aggregated; no individual reports are shown.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={ShieldCheck} label="Trust Index" value={`${g.trustIndex ?? 0}%`} accent={TEAL}
              sub={`${num(g.verifiedCount ?? 0)} verified members`} />
            <Kpi icon={Globe} label="Countries Reached" value={num(g.countriesReached ?? 0)} accent={GOLD}
              sub="Where members are based" />
            <Kpi icon={Activity} label="Safety Reports" value={num(g.totalReports ?? 0)} accent={PURPLE}
              sub={`${num(g.totalFeedback ?? 0)} product reviews`} />
            <Kpi icon={AlertTriangle} label="Critical Signals" value={num(g.criticalSignals ?? 0)} accent={RED}
              sub="Drugs above threshold" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Signal Strength by Drug" subtitle="Weighted by report volume and severity">
              {g.signals?.length ? (
                <div className="space-y-2">
                  {g.signals.map((s: any) => (
                    <div key={s.drug} className="flex items-center justify-between rounded-lg border border-black/[0.06] bg-black/[0.02] px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#1A2332]">{s.drug}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {num(s.reports)} report{s.reports === 1 ? '' : 's'}
                          {s.severe > 0 && ` · ${num(s.severe)} severe`}
                        </p>
                      </div>
                      <Badge variant="outline" className={`ml-3 shrink-0 text-[10px] ${LEVEL_CLS[s.level]}`}>
                        {prettify(s.level)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : <Empty label="No surveillance signals yet" />}
            </Panel>

            <Panel title="Severity Distribution" subtitle="Across all adverse drug reports">
              {g.severityDist?.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={g.severityDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false}
                      tickLine={false} tickFormatter={prettify} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Reports" radius={[4, 4, 0, 0]}>
                      {g.severityDist.map((s: any, i: number) => (
                        <Cell key={i} fill={
                          s.name === 'LIFE_THREATENING' ? '#F87171'
                            : s.name === 'SEVERE' ? RED
                            : s.name === 'MODERATE' ? GOLD : TEAL
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty label="No reports yet" />}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Member Geography" subtitle="Top countries by membership">
              {g.geoDist?.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={g.geoDist} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#6B7280', fontSize: 10 }}
                      axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Members" fill={TEAL} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty label="No geographic data yet" />}
            </Panel>

            <Panel title="Surveillance Coverage" subtitle="Where safety reports originate">
              {g.reportGeo?.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={g.reportGeo} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#6B7280', fontSize: 10 }}
                      axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Reports" fill={PURPLE} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty label="No report geography yet" />}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Verification Coverage" subtitle="Trust ladder across the membership">
              {g.verificationDist?.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={g.verificationDist} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {g.verificationDist.map((v: any, i: number) => (
                        <Cell key={i} fill={
                          v.name === 'EXPERT_VERIFIED' ? TEAL
                            : v.name === 'IDENTITY_VERIFIED' ? GOLD
                            : v.name === 'EMAIL_VERIFIED' ? PURPLE : '#374151'
                        } />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => prettify(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty label="No verification data yet" />}
            </Panel>

            <Panel title="Paediatric Exposure" subtitle="Reports involving children 0 to 59 months">
              <div className="flex h-[240px] flex-col items-center justify-center">
                <Baby className="mb-3 h-8 w-8 text-[#FBBF24]" />
                <p className="font-display text-4xl font-bold text-[#1A2332]">{num(g.under5 ?? 0)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  of {num(g.totalReports ?? 0)} total reports
                </p>
                {(g.totalReports ?? 0) > 0 && (
                  <p className="mt-3 text-sm text-[#FBBF24]">
                    {Math.round(((g.under5 ?? 0) / g.totalReports) * 100)}% of all reports
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
