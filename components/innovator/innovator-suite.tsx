'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Rocket, Target, Wallet, Award, TrendingUp, TrendingDown,
  CheckCircle2, Quote, ShieldCheck, Lightbulb, Download, FileCheck, Loader2, Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatKSh, formatKShCompact, formatDate, pct } from '@/lib/format';
import {
  STAGE_LABELS, STATUS_LABELS, STATUS_BADGE,
  MILESTONE_LABELS, MILESTONE_BADGE,
  VALIDATION_PIPELINE, pipelineIndex,
} from '@/lib/pax-labels';

function certRefFromHash(ipHash: string): string {
  return `PAX-IP-${ipHash.slice(0, 12).toUpperCase()}`;
}

export function InnovatorSuite() {
  const [innovations, setInnovations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/innovator/overview');
        if (res.ok) {
          const json = await res.json();
          setInnovations(json?.innovations ?? []);
          setSummary(json?.summary ?? null);
        }
      } catch (e: any) {
        console.error('Failed to load innovator suite:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const cards = [
    { label: 'Ventures', value: `${summary?.ventureCount ?? 0}`, icon: Rocket, color: 'text-[#2ABFB0]' },
    { label: 'Funding Raised', value: formatKShCompact(summary?.fundingRaised ?? 0), sub: `of ${formatKShCompact(summary?.fundingGoal ?? 0)} goal`, icon: Target, color: 'text-[#FBBF24]' },
    { label: 'Net Cash Position', value: formatKShCompact(summary?.netCash ?? 0), icon: Wallet, color: 'text-[#8B7FD4]' },
    { label: 'Avg Credibility', value: `${summary?.avgCredibility ?? 0}/100`, icon: Award, color: 'text-[#2ABFB0]' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Business Growth Suite</h2>
          <p className="text-sm text-muted-foreground">
            Project finance, milestones, cash flow and credibility for your ventures.
          </p>
        </div>
        <Button asChild className="bg-[#2ABFB0] hover:bg-[#2D9B94] text-[#06231f] font-semibold">
          <Link href="/innovator/submit"><Lightbulb className="h-4 w-4 mr-1" /> Submit Innovation</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}><CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <p className="mt-1 font-display text-2xl font-bold">{c.value}</p>
            {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
          </CardContent></Card>
        ))}
      </div>

      {innovations.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          You have no ventures yet. Once your innovation is registered it will appear here.
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {innovations.map((inv) => <VentureCard key={inv.id} inv={inv} />)}
        </div>
      )}
    </div>
  );
}

function VentureCard({ inv }: { inv: any }) {
  const inflow = (inv.cashFlows ?? []).filter((c: any) => c.type === 'INFLOW').reduce((s: number, c: any) => s + c.amount, 0);
  const outflow = (inv.cashFlows ?? []).filter((c: any) => c.type === 'OUTFLOW').reduce((s: number, c: any) => s + c.amount, 0);
  const diligenceVerified = (inv.diligenceItems ?? []).filter((d: any) => d.status === 'VERIFIED').length;

  // Running balance for cash flow.
  let balance = 0;
  const flows = (inv.cashFlows ?? []).map((c: any) => {
    balance += c.type === 'INFLOW' ? c.amount : -c.amount;
    return { ...c, balance };
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-xl font-bold">{inv.title}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[inv.status] ?? ''}`}>
                {STATUS_LABELS[inv.status] ?? inv.status}
              </span>
            </div>
            <p className="text-xs text-[#FBBF24]">{inv.sector} · {STAGE_LABELS[inv.stage] ?? inv.stage}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Funding</p>
            <p className="font-display text-lg font-bold text-[#2ABFB0]">{formatKShCompact(inv.fundingRaised)}</p>
            <p className="text-xs text-muted-foreground">of {formatKShCompact(inv.fundingGoal)}</p>
          </div>
        </div>

        <div className="mt-4">
          <Progress value={pct(inv.fundingRaised, inv.fundingGoal)} className="h-2" />
        </div>

        {inv.status === 'DRAFT' ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-black/[0.1] p-4">
            <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">
              This brief is a draft. Finish and submit it to enter the validation pipeline and receive an IP timestamp certificate.
            </p>
            <Button asChild size="sm" className="bg-[#2ABFB0] hover:bg-[#2D9B94] text-[#06231f] font-semibold">
              <Link href="/innovator/submit">Finish &amp; submit</Link>
            </Button>
          </div>
        ) : (
          <PipelineStepper status={inv.status} />
        )}

        {inv.ipHash && <IpCertificate inv={inv} />}

        <Tabs defaultValue="milestones" className="mt-5">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="credibility">Credibility</TabsTrigger>
            <TabsTrigger value="investors">Investors</TabsTrigger>
          </TabsList>

          <TabsContent value="milestones" className="mt-4 space-y-3">
            {(inv.milestones ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No milestones yet.</p>
            ) : inv.milestones.map((m: any) => (
              <div key={m.id} className="border-b border-black/[0.06] pb-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${MILESTONE_BADGE[m.status] ?? ''}`}>
                    {MILESTONE_LABELS[m.status] ?? m.status}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatKSh(m.releasedAmount)} released</span>
                    <span>Target {formatKSh(m.targetAmount)} {m.dueDate ? `· due ${formatDate(m.dueDate)}` : ''}</span>
                  </div>
                  <Progress value={m.progress ?? pct(m.releasedAmount, m.targetAmount)} className="h-1.5" />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="cashflow" className="mt-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MiniStat label="Inflow" value={formatKShCompact(inflow)} icon={TrendingUp} color="text-[#2ABFB0]" />
              <MiniStat label="Outflow" value={formatKShCompact(outflow)} icon={TrendingDown} color="text-[#DC2626]" />
              <MiniStat label="Balance" value={formatKShCompact(inflow - outflow)} icon={Wallet} color="text-[#FBBF24]" />
            </div>
            {flows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cash-flow entries.</p>
            ) : (
              <div className="space-y-2">
                {flows.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-black/[0.06] pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      {c.type === 'INFLOW'
                        ? <TrendingUp className="h-4 w-4 text-[#2ABFB0]" />
                        : <TrendingDown className="h-4 w-4 text-[#DC2626]" />}
                      <div>
                        <p className="text-sm font-medium">{c.category}</p>
                        <p className="text-xs text-muted-foreground">{c.description || formatDate(c.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${c.type === 'INFLOW' ? 'text-[#2ABFB0]' : 'text-[#DC2626]'}`}>
                        {c.type === 'INFLOW' ? '+' : '-'}{formatKSh(c.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">Bal {formatKShCompact(c.balance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="credibility" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Credibility Score</p>
                <Progress value={inv.credibilityScore} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{inv.credibilityScore}/100</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Validation Score</p>
                <Progress value={inv.validationScore} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{inv.validationScore}/100</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-[#2ABFB0]" />
              <span className="text-muted-foreground">{diligenceVerified} of {(inv.diligenceItems ?? []).length} due-diligence items verified</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8B7FD4] mb-2">Endorsements</p>
              {(inv.endorsements ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No endorsements yet.</p>
              ) : (
                <div className="space-y-2">
                  {inv.endorsements.map((e: any) => (
                    <div key={e.id} className="flex gap-2">
                      <Quote className="h-4 w-4 mt-0.5 text-[#8B7FD4] shrink-0" />
                      <div>
                        {e.comment && <p className="text-sm text-muted-foreground italic">“{e.comment}”</p>}
                        <p className="text-xs font-medium">{e.endorser?.name}{e.endorser?.organization ? ` · ${e.endorser.organization}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="investors" className="mt-4">
            {(inv.investments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No investor interest yet.</p>
            ) : (
              <div className="space-y-2">
                {inv.investments.map((iv: any) => (
                  <div key={iv.id} className="flex items-center justify-between border-b border-black/[0.06] pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#2ABFB0]" />
                      <div>
                        <p className="text-sm font-medium">{iv.investor?.name}</p>
                        <p className="text-xs text-muted-foreground">{iv.investor?.organization ?? ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{iv.amount > 0 ? formatKSh(iv.amount) : '—'}</p>
                      <p className="text-xs text-muted-foreground">{iv.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="rounded-lg border border-black/[0.06] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-1 font-display text-base font-bold">{value}</p>
    </div>
  );
}

function PipelineStepper({ status }: { status: string }) {
  const current = pipelineIndex(status);
  return (
    <div className="mt-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Validation Pipeline</p>
      <div className="flex items-center">
        {VALIDATION_PIPELINE.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] ${
                  done ? 'border-[#2ABFB0] bg-[#2ABFB0] text-[#06231f]'
                  : active ? 'border-[#FBBF24] bg-[#FBBF24]/15 text-[#FBBF24]'
                  : 'border-black/[0.1] text-gray-400'}`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Circle className="h-3 w-3 fill-current" /> : i + 1}
                </div>
                <span className={`text-[10px] leading-tight text-center max-w-[68px] ${
                  active ? 'text-[#FBBF24] font-medium' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {i < VALIDATION_PIPELINE.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-5 ${i < current ? 'bg-[#2ABFB0]' : 'bg-black/[0.06]'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IpCertificate({ inv }: { inv: any }) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/innovator/innovations/${inv.id}/certificate`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json?.requestId) {
        toast.error(json?.error || 'Could not start certificate generation.');
        return;
      }
      const requestId = json.requestId;
      let pdfBase64: string | null = null;
      for (let i = 0; i < 45; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const sres = await fetch(`/api/innovator/innovations/${inv.id}/certificate/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        });
        const sjson = await sres.json();
        if (sjson?.status === 'SUCCESS' && sjson?.pdfBase64) { pdfBase64 = sjson.pdfBase64; break; }
        if (sjson?.status === 'FAILED') { toast.error('Certificate generation failed. Please try again.'); return; }
      }
      if (!pdfBase64) { toast.error('Certificate is taking longer than expected. Please try again.'); return; }
      const blob = new Blob([Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0))], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${certRefFromHash(inv.ipHash)}-certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Certificate downloaded.');
    } catch (e: any) {
      toast.error('Network error while generating certificate.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-5 rounded-lg border border-[#2ABFB0]/25 bg-[#2ABFB0]/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2ABFB0]/15">
            <FileCheck className="h-5 w-5 text-[#2ABFB0]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A2332]">IP Timestamp Certificate</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono text-[#FBBF24]">{certRefFromHash(inv.ipHash)}</span>
              {inv.ipTimestampedAt ? ` · issued ${formatDate(inv.ipTimestampedAt)}` : ''}
            </p>
            <p className="mt-1 font-mono text-[10px] text-[#1A2332]/35 break-all">{String(inv.ipHash).slice(0, 32)}…</p>
          </div>
        </div>
        <Button size="sm" variant="outline" disabled={downloading} onClick={download}
          className="border-[#2ABFB0]/40 text-[#2ABFB0] hover:bg-[#2ABFB0]/10">
          {downloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          {downloading ? 'Preparing…' : 'Download'}
        </Button>
      </div>
    </div>
  );
}
