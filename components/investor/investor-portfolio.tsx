'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Briefcase, TrendingUp, Layers, ArrowRight } from 'lucide-react';
import { formatKSh, formatKShCompact, pct } from '@/lib/format';
import {
  STATUS_LABELS, STATUS_BADGE,
  INVESTMENT_LABELS, INVESTMENT_BADGE,
} from '@/lib/pax-labels';

export function InvestorPortfolio() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/investor/portfolio');
        if (res.ok) {
          const json = await res.json();
          setInvestments(json?.investments ?? []);
          setSummary(json?.summary ?? null);
        }
      } catch (e: any) {
        console.error('Failed to load portfolio:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Committed', value: formatKShCompact(summary?.totalCommitted ?? 0), icon: TrendingUp, color: 'text-[#2ABFB0]' },
    { label: 'Active Positions', value: `${summary?.activeCount ?? 0}`, icon: Layers, color: 'text-[#FBBF24]' },
    { label: 'Interested', value: `${summary?.interestedCount ?? 0}`, icon: Briefcase, color: 'text-[#8B7FD4]' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Portfolio Monitoring</h2>
        <p className="text-sm text-muted-foreground">Track your commitments and the progress of ventures you back.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}><CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{c.value}</p>
            </div>
            <c.icon className={`h-6 w-6 ${c.color}`} />
          </CardContent></Card>
        ))}
      </div>

      {investments.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          You have no positions yet. Explore <Link href="/investor" className="text-[#2ABFB0] hover:underline">opportunities</Link> to get started.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {investments.map((iv) => {
            const inv = iv.innovation;
            const released = (inv?.milestones ?? []).reduce((s: number, m: any) => s + (m.releasedAmount ?? 0), 0);
            const target = (inv?.milestones ?? []).reduce((s: number, m: any) => s + (m.targetAmount ?? 0), 0);
            return (
              <Link key={iv.id} href={`/investor/opportunities/${inv.id}`} className="group block">
                <Card className="transition-colors group-hover:border-[#2ABFB0]/50">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-lg font-bold">{inv?.title}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[inv?.status] ?? ''}`}>
                            {STATUS_LABELS[inv?.status] ?? inv?.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#FBBF24]">{inv?.sector} · {inv?.owner?.organization ?? inv?.owner?.name}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${INVESTMENT_BADGE[iv.status] ?? ''}`}>
                          {INVESTMENT_LABELS[iv.status] ?? iv.status}
                        </span>
                        {iv.amount > 0 && <p className="mt-1 font-display text-lg font-bold">{formatKSh(iv.amount)}</p>}
                      </div>
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Milestone funding released {formatKShCompact(released)}</span>
                        <span>of {formatKShCompact(target)}</span>
                      </div>
                      <Progress value={pct(released, target)} className="h-2" />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <span className="flex items-center gap-1 text-sm font-medium text-[#2ABFB0] group-hover:gap-2 transition-all">
                        View Deal Room <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
