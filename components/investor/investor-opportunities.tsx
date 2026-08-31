'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BadgeCheck, MapPin, Users, Milestone as MilestoneIcon, ArrowRight, Target } from 'lucide-react';
import { formatKShCompact, pct } from '@/lib/format';
import { STAGE_LABELS, STATUS_LABELS, STATUS_BADGE } from '@/lib/pax-labels';
import { matchBand } from '@/lib/match-scoring';

export function InvestorOpportunities() {
  const [data, setData] = useState<any[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState('all');
  const [stage, setStage] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('default');
  const [hasMandate, setHasMandate] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (sector !== 'all') params.set('sector', sector);
        if (stage !== 'all') params.set('stage', stage);
        if (status !== 'all') params.set('status', status);
        if (sort === 'match') params.set('sort', 'match');
        const res = await fetch(`/api/investor/opportunities?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setData(json?.innovations ?? []);
          if (json?.sectors) setSectors(json.sectors);
          setHasMandate(json?.hasMandate ?? false);
        }
      } catch (e: any) {
        console.error('Failed to load opportunities:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sector, stage, status, sort]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Opportunity Discovery</h2>
        <p className="text-sm text-muted-foreground">
          Verified, community-validated health innovations open for investment.
        </p>
      </div>

      {!loading && !hasMandate && (
        <Card className="border-[#2ABFB0]/30 bg-[#2ABFB0]/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Target className="mt-0.5 h-5 w-5 shrink-0 text-[#2ABFB0]" />
              <div>
                <p className="text-sm font-semibold">Set your investment mandate</p>
                <p className="text-xs text-muted-foreground">
                  Tell us your geographies, sectors, stages and ticket size and we’ll score every deal for fit — and alert you to strong matches.
                </p>
              </div>
            </div>
            <Link
              href="/investor/mandate"
              className="shrink-0 rounded-md bg-[#2ABFB0] px-4 py-2 text-center text-sm font-semibold text-[#0B0F1A] transition-colors hover:bg-[#2ABFB0]/90"
            >
              Set mandate
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={sector} onValueChange={setSector}>
          <SelectTrigger><SelectValue placeholder="Sector" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(STAGE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="COMMUNITY_VALIDATED">Community Validated</SelectItem>
            <SelectItem value="INVESTOR_READY">Investor Ready</SelectItem>
            <SelectItem value="FUNDED">Funded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Sort: Credibility</SelectItem>
            <SelectItem value="match" disabled={!hasMandate}>Sort: Best matches</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : data.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No opportunities match your filters.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((inv) => (
            <Link key={inv.id} href={`/investor/opportunities/${inv.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-[#2ABFB0]/50">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[inv.status] ?? ''}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                    {inv.verified && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#2ABFB0]">
                        <BadgeCheck className="h-4 w-4" /> Verified
                      </span>
                    )}
                  </div>

                  {typeof inv.matchScore === 'number' && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${matchBand(inv.matchScore).className}`}>
                        {inv.matchScore}% · {matchBand(inv.matchScore).label} match
                      </span>
                    </div>
                  )}

                  <h3 className="mt-3 font-display text-lg font-bold leading-tight">{inv.title}</h3>
                  <p className="text-xs text-[#FBBF24] font-medium">{inv.sector} · {STAGE_LABELS[inv.stage] ?? inv.stage}</p>
                  {typeof inv.matchScore === 'number' && inv.matchReasons?.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{inv.matchReasons[0]}</p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{inv.tagline || inv.summary}</p>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Raised {formatKShCompact(inv.fundingRaised)}</span>
                      <span className="text-muted-foreground">Goal {formatKShCompact(inv.fundingGoal)}</span>
                    </div>
                    <Progress value={pct(inv.fundingRaised, inv.fundingGoal)} className="h-2" />
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    {inv.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{inv.location}</span>}
                    <span className="flex items-center gap-1"><MilestoneIcon className="h-3.5 w-3.5" />{inv._count?.milestones ?? 0} milestones</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{inv._count?.endorsements ?? 0}</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Credibility {inv.credibilityScore}/100</span>
                    <span className="flex items-center gap-1 text-sm font-medium text-[#2ABFB0] group-hover:gap-2 transition-all">
                      Deal Room <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
