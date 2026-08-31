'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, Lightbulb, TrendingUp, Megaphone, Lock, ShieldAlert,
  Stethoscope, Loader2, ArrowRight,
} from 'lucide-react';
import { formatKShCompact } from '@/lib/format';
import { ROLE_LABEL, TIER_LABEL, INNOVATION_STATUS_LABEL } from '@/lib/admin-labels';

interface Overview {
  totalUsers: number;
  roleCounts: Record<string, number>;
  tierCounts: Record<string, number>;
  hubMembers: number;
  totalInnovations: number;
  statusCounts: Record<string, number>;
  totalInvestments: number;
  investmentTotal: number;
  totalChallenges: number;
  openChallenges: number;
  totalVault: number;
  pendingVault: number;
  totalDrugReports: number;
  totalFeedback: number;
  recentUsers: { id: string; name: string; email: string; role: string; tier: string; createdAt: string }[];
  recentInnovations: { id: string; title: string; status: string; sector: string; fundingGoal: number; createdAt: string; owner: { name: string } }[];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!data) {
    return <p className="text-muted-foreground">Could not load the overview.</p>;
  }

  const kpis = [
    { label: 'Total Users', value: data.totalUsers, icon: Users, href: '/admin/users', accent: 'text-[#2ABFB0]' },
    { label: 'Innovations', value: data.totalInnovations, icon: Lightbulb, href: '/admin/innovations', accent: 'text-[#FBBF24]' },
    { label: 'Investments', value: `${data.totalInvestments} · ${formatKShCompact(data.investmentTotal)}`, icon: TrendingUp, href: '/admin/investments', accent: 'text-[#8B7FD4]' },
    { label: 'Challenge Briefs', value: `${data.totalChallenges} (${data.openChallenges} open)`, icon: Megaphone, href: '/admin/challenges', accent: 'text-[#2ABFB0]' },
    { label: 'Vault Requests', value: `${data.totalVault} (${data.pendingVault} pending)`, icon: Lock, href: '/admin/vault', accent: 'text-[#FBBF24]' },
    { label: 'Safety Reports', value: data.totalDrugReports + data.totalFeedback, icon: ShieldAlert, href: '/admin/safety', accent: 'text-[#DC2626]' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1A2332]">Platform Overview</h2>
        <p className="text-sm text-muted-foreground">A live snapshot of everything happening across Praxis Exchange.</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className="group flex items-center justify-between border-black/[0.06] bg-white p-5 transition-colors hover:border-black/[0.1]">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-2xl font-bold text-[#1A2332]">{k.value}</p>
              </div>
              <k.icon className={`h-8 w-8 ${k.accent}`} />
            </Card>
          </Link>
        ))}
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-black/[0.06] bg-white p-5">
          <h3 className="mb-3 font-semibold text-[#1A2332]">Users by Type</h3>
          <div className="space-y-2">
            {Object.entries(data.roleCounts).sort((a, b) => b[1] - a[1]).map(([role, n]) => (
              <div key={role} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{ROLE_LABEL[role] ?? role}</span>
                <span className="font-medium text-[#1A2332]">{n}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-black/[0.06] bg-white p-5">
          <h3 className="mb-3 font-semibold text-[#1A2332]">Membership Tiers</h3>
          <div className="space-y-2">
            {['TIER1_BASIC', 'TIER2_PROFESSIONAL', 'TIER3_EXPERT'].map((t) => (
              <div key={t} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{TIER_LABEL[t]}</span>
                <span className="font-medium text-[#1A2332]">{data.tierCounts[t] ?? 0}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-black/[0.08] pt-2 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Stethoscope className="h-3.5 w-3.5" /> Hub Members</span>
              <span className="font-medium text-[#2ABFB0]">{data.hubMembers}</span>
            </div>
          </div>
        </Card>
        <Card className="border-black/[0.06] bg-white p-5">
          <h3 className="mb-3 font-semibold text-[#1A2332]">Innovation Pipeline</h3>
          <div className="space-y-2">
            {Object.entries(INNOVATION_STATUS_LABEL).map(([s, label]) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-[#1A2332]">{data.statusCounts[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-black/[0.06] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-[#1A2332]">Newest Members</h3>
            <Link href="/admin/users" className="flex items-center gap-1 text-xs text-[#2ABFB0] hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="space-y-3">
            {data.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#1A2332]">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="border-black/[0.08] text-[10px]">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                  <span className="text-[10px] text-muted-foreground">{fmtDate(u.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-black/[0.06] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-[#1A2332]">Latest Innovations</h3>
            <Link href="/admin/innovations" className="flex items-center gap-1 text-xs text-[#2ABFB0] hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="space-y-3">
            {data.recentInnovations.length === 0 && <p className="text-sm text-muted-foreground">No innovations yet.</p>}
            {data.recentInnovations.map((i) => (
              <div key={i.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#1A2332]">{i.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.sector} · {i.owner?.name}</p>
                </div>
                <Badge variant="outline" className="border-black/[0.08] text-[10px]">{INNOVATION_STATUS_LABEL[i.status] ?? i.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
