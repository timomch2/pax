'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  BadgeCheck, ArrowLeft, MapPin, CheckCircle2, Clock, AlertTriangle,
  Circle, TrendingUp, TrendingDown, Quote, Lock, Unlock, ShieldCheck,
  Target, Handshake, ScrollText, ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatKSh, formatKShCompact, formatDate, pct } from '@/lib/format';
import {
  STAGE_LABELS, STATUS_LABELS, STATUS_BADGE,
  MILESTONE_LABELS, MILESTONE_BADGE,
  DILIGENCE_LABELS, DILIGENCE_BADGE, INVESTMENT_LABELS, INVESTMENT_BADGE,
  IP_PROTECTION_LEVELS,
} from '@/lib/pax-labels';
import { matchBand } from '@/lib/match-scoring';
import { NdaClickwrap } from './nda-clickwrap';
import { useSession } from 'next-auth/react';

const diligenceIcon: Record<string, any> = {
  VERIFIED: CheckCircle2,
  SUBMITTED: Clock,
  FLAGGED: AlertTriangle,
  PENDING: Circle,
};

export function DealRoom({ id }: { id: string }) {
  const { data: session } = useSession() || {};
  const [inv, setInv] = useState<any>(null);
  const [myInvestment, setMyInvestment] = useState<any>(null);
  const [vaultAccess, setVaultAccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ndaOpen, setNdaOpen] = useState(false);
  const [match, setMatch] = useState<{ score: number; reasons: string[]; gaps: string[] } | null>(null);
  const [hasMandate, setHasMandate] = useState(false);
  const [fieldValidation, setFieldValidation] = useState<any[]>([]);
  const [vaultDocuments, setVaultDocuments] = useState<{ id: string; title: string; description: string | null; assetId: string }[]>([]);
  const [introOpen, setIntroOpen] = useState(false);
  const [introMessage, setIntroMessage] = useState('');
  const [introSubmitting, setIntroSubmitting] = useState(false);
  const [introSent, setIntroSent] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/investor/opportunities/${id}`);
      if (res.ok) {
        const json = await res.json();
        setInv(json?.innovation ?? null);
        setMyInvestment(json?.myInvestment ?? null);
        setVaultAccess(json?.vaultAccess ?? null);
        setMatch(json?.match ?? null);
        setHasMandate(json?.hasMandate ?? false);
        setFieldValidation(json?.fieldValidation ?? []);
        setVaultDocuments(json?.vaultDocuments ?? []);
      }
    } catch (e: any) {
      console.error('Failed to load deal room:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const requestIntroduction = async () => {
    setIntroSubmitting(true);
    try {
      const res = await fetch('/api/investor/introduction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ innovationId: id, message: introMessage || undefined }),
      });
      if (res.ok) {
        setIntroSent(true);
        setIntroOpen(false);
        toast.success('Introduction requested. The innovator has your details and will be in touch directly.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? 'Failed to request introduction.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIntroSubmitting(false);
    }
  };

  const submitInterest = async (status: 'INTERESTED' | 'COMMITTED') => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/investor/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          innovationId: id,
          status,
          amount: amount ? Number(amount) : undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setMyInvestment(json?.investment ?? null);
        toast.success(status === 'COMMITTED' ? 'Commitment recorded. The innovator has been notified.' : 'Interest registered.');
        setDialogOpen(false);
      } else {
        const err = await res.json();
        toast.error(err?.error ?? 'Failed to record interest.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="space-y-4">
        <Link href="/investor" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to opportunities
        </Link>
        <Card><CardContent className="p-10 text-center text-muted-foreground">Opportunity not found.</CardContent></Card>
      </div>
    );
  }

  const releasedTotal = (inv.milestones ?? []).reduce((s: number, m: any) => s + (m.releasedAmount ?? 0), 0);
  const milestoneTarget = (inv.milestones ?? []).reduce((s: number, m: any) => s + (m.targetAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link href="/investor" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to opportunities
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[inv.status] ?? ''}`}>
                  {STATUS_LABELS[inv.status] ?? inv.status}
                </span>
                {inv.verified && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#2ABFB0]">
                    <BadgeCheck className="h-4 w-4" /> Verified
                  </span>
                )}
              </div>
              <h1 className="mt-2 font-display text-2xl font-bold">{inv.title}</h1>
              <p className="text-sm text-[#FBBF24] font-medium">{inv.sector} · {STAGE_LABELS[inv.stage] ?? inv.stage}</p>
              {inv.location && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {inv.location}
                </p>
              )}
            </div>
            <div className="text-right">
              {myInvestment && (
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${INVESTMENT_BADGE[myInvestment.status] ?? ''}`}>
                  Your status: {INVESTMENT_LABELS[myInvestment.status] ?? myInvestment.status}
                </span>
              )}
              <div className="mt-3 flex flex-col items-end gap-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">Express Interest</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Engage with {inv.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Register your interest or commit an indicative amount. The innovator will be notified and can open the Deal Room with you.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Indicative amount (KSh) — optional</Label>
                        <Input id="amount" type="number" min="0" placeholder="e.g. 2000000" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-2">
                      <Button variant="outline" onClick={() => submitInterest('INTERESTED')} loading={submitting}>
                        Register Interest
                      </Button>
                      <Button onClick={() => submitInterest('COMMITTED')} loading={submitting}>
                        Commit Funding
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={introOpen} onOpenChange={setIntroOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={introSent}>
                      <Handshake className="h-4 w-4" /> {introSent ? 'Introduction requested' : 'Request Direct Introduction'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request a direct introduction</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        PAX will share your name, organisation and email with the innovator so you can
                        connect and negotiate <span className="font-medium text-foreground">directly, off-platform</span>.
                        PAX is a passive intermediary — we never hold funds, process transfers or take a success fee.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="introMessage">Message to the innovator — optional</Label>
                        <Textarea
                          id="introMessage" rows={4}
                          placeholder="Introduce yourself and what you'd like to discuss..."
                          value={introMessage}
                          onChange={(e) => setIntroMessage(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={requestIntroduction} loading={introSubmitting} className="gap-2">
                        <Handshake className="h-4 w-4" /> Send introduction request
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Funding bar */}
          <div className="mt-6 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-[#2ABFB0]">{formatKSh(inv.fundingRaised)} raised</span>
              <span className="text-muted-foreground">Goal {formatKSh(inv.fundingGoal)}</span>
            </div>
            <Progress value={pct(inv.fundingRaised, inv.fundingGoal)} className="h-2.5" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Credibility" value={`${inv.credibilityScore}/100`} />
            <Stat label="Validation" value={`${inv.validationScore}/100`} />
            <Stat label="Milestones" value={`${inv.milestones?.length ?? 0}`} />
            <Stat label="Endorsements" value={`${inv.endorsements?.length ?? 0}`} />
          </div>

          {/* Neural Matchmaking fit */}
          {match ? (
            <div className="mt-5 rounded-lg border border-black/[0.08] bg-black/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#2ABFB0]" />
                  <span className="text-sm font-semibold">Mandate fit</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${matchBand(match.score).className}`}>
                  {match.score}% · {matchBand(match.score).label} match
                </span>
              </div>
              {match.reasons?.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {match.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2ABFB0]" /> {r}
                    </li>
                  ))}
                </ul>
              )}
              {match.gaps?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {match.gaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FBBF24]" /> {g}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : !hasMandate ? (
            <div className="mt-5 flex flex-col gap-2 rounded-lg border border-[#2ABFB0]/30 bg-[#2ABFB0]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#2ABFB0]" />
                <p className="text-xs text-muted-foreground">
                  Set your investment mandate to see how well this opportunity fits your thesis.
                </p>
              </div>
              <Link href="/investor/mandate" className="shrink-0 text-xs font-semibold text-[#2ABFB0] hover:underline">
                Set mandate →
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vault">Confidential Vault</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="milestones">Milestone Funding</TabsTrigger>
          <TabsTrigger value="diligence">Due Diligence</TabsTrigger>
          <TabsTrigger value="validation" className="gap-1">
            Field Validation
            {fieldValidation.length > 0 && (
              <span className="ml-1 rounded-full bg-[#2ABFB0]/20 px-1.5 text-[10px] font-semibold text-[#2ABFB0]">{fieldValidation.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="team">Team & Endorsements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Section title="Summary"><p className="text-sm leading-relaxed text-muted-foreground">{inv.summary}</p></Section>
          {inv.problem && <Section title="The Problem"><p className="text-sm leading-relaxed text-muted-foreground">{inv.problem}</p></Section>}
          {inv.solution && <Section title="The Solution"><p className="text-sm leading-relaxed text-muted-foreground">{inv.solution}</p></Section>}
          {inv.impactStatement && <Section title="Greater Good Impact"><p className="text-sm leading-relaxed text-muted-foreground">{inv.impactStatement}</p></Section>}
          {inv.ipProtectionLevel && (
            <Section title="IP Protection">
              <p className="text-sm text-muted-foreground">{IP_PROTECTION_LEVELS.find((l) => l.key === inv.ipProtectionLevel)?.label || inv.ipProtectionLevel}</p>
            </Section>
          )}
        </TabsContent>

        {/* Vault tab */}
        <TabsContent value="vault" className="mt-4 space-y-4">
          <VaultSection inv={inv} vaultAccess={vaultAccess} vaultDocuments={vaultDocuments} ndaOpen={ndaOpen} setNdaOpen={setNdaOpen} session={session} />
        </TabsContent>

        <TabsContent value="financials" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Funding Goal" value={formatKShCompact(inv.fundingGoal)} card />
            <Stat label="Raised to Date" value={formatKShCompact(inv.fundingRaised)} card />
            <Stat label="Released via Milestones" value={formatKShCompact(releasedTotal)} card />
          </div>
          <Section title="Cash Flow History">
            {(inv.cashFlows ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No cash-flow records shared yet.</p>
            ) : (
              <div className="space-y-2">
                {inv.cashFlows.map((c: any) => (
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
                    <span className={`text-sm font-semibold ${c.type === 'INFLOW' ? 'text-[#2ABFB0]' : 'text-[#DC2626]'}`}>
                      {c.type === 'INFLOW' ? '+' : '-'}{formatKSh(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 space-y-3">
          {(inv.milestones ?? []).length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No milestones defined.</CardContent></Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Funds are released against verified milestones: <span className="text-[#2ABFB0] font-medium">{formatKSh(releasedTotal)}</span> released of {formatKSh(milestoneTarget)} planned.
              </p>
              {inv.milestones.map((m: any) => (
                <Card key={m.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{m.title}</p>
                        {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${MILESTONE_BADGE[m.status] ?? ''}`}>
                        {MILESTONE_LABELS[m.status] ?? m.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatKSh(m.releasedAmount)} released</span>
                        <span>Target {formatKSh(m.targetAmount)}</span>
                      </div>
                      <Progress value={m.progress ?? pct(m.releasedAmount, m.targetAmount)} className="h-2" />
                      {m.dueDate && <p className="text-xs text-muted-foreground">Due {formatDate(m.dueDate)}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="diligence" className="mt-4 space-y-2">
          {(inv.diligenceItems ?? []).length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No due-diligence checklist yet.</CardContent></Card>
          ) : (
            inv.diligenceItems.map((d: any) => {
              const Icon = diligenceIcon[d.status] ?? Circle;
              return (
                <Card key={d.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${d.status === 'VERIFIED' ? 'text-[#2ABFB0]' : d.status === 'FLAGGED' ? 'text-[#DC2626]' : d.status === 'SUBMITTED' ? 'text-[#FBBF24]' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-sm">{d.name}</p>
                        {d.category && <p className="text-xs text-muted-foreground">{d.category}</p>}
                        {d.notes && <p className="text-xs text-muted-foreground mt-1">{d.notes}</p>}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${DILIGENCE_BADGE[d.status] ?? ''}`}>
                      {DILIGENCE_LABELS[d.status] ?? d.status}
                    </span>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="validation" className="mt-4 space-y-4">
          <Card className="border-[#8B7FD4]/30 bg-[#8B7FD4]/5">
            <CardContent className="flex items-start gap-3 p-5">
              <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-[#8B7FD4]" />
              <div>
                <h3 className="font-display text-sm font-semibold">De-risked due diligence</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Independent validation of this innovation from the PAX Exchange Community &amp; Debate Hub —
                  structured expert consensus from verified health stakeholders, not marketing claims.
                </p>
              </div>
            </CardContent>
          </Card>

          {fieldValidation.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No published community consensus is linked to this innovation yet. Validation appears here
                once a related debate in the PAX Exchange Community &amp; Debate Hub reaches published consensus.
              </CardContent>
            </Card>
          ) : (
            fieldValidation.map((f: any) => (
              <Card key={f.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-display text-base font-semibold leading-tight">{f.title}</h4>
                      {f.consensusPublishedAt && (
                        <p className="mt-0.5 text-xs text-muted-foreground">Consensus published {formatDate(f.consensusPublishedAt)}</p>
                      )}
                    </div>
                    {typeof f.feasibilityConsensus === 'number' && (
                      <span className="shrink-0 rounded-full bg-[#2ABFB0]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#2ABFB0]">
                        Feasibility {f.feasibilityConsensus.toFixed(1)}/5
                      </span>
                    )}
                  </div>
                  {f.consensusAbstract && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.consensusAbstract}</p>
                  )}
                  <Link
                    href={`/knowledge/${f.id}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#8B7FD4] hover:underline"
                  >
                    Read the full consensus report <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4 space-y-4">
          <Section title="Lead Innovator">
            <p className="font-medium">{inv.owner?.name ?? 'Innovator'}</p>
            {inv.owner?.organization && <p className="text-sm text-[#FBBF24]">{inv.owner.organization}</p>}
            {inv.owner?.bio && <p className="mt-1 text-sm text-muted-foreground">{inv.owner.bio}</p>}
            {inv.owner?.paxId && <p className="mt-1 text-xs text-muted-foreground">PAX ID: {inv.owner.paxId}</p>}
          </Section>
          <Section title="Endorsements">
            {(inv.endorsements ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No endorsements yet.</p>
            ) : (
              <div className="space-y-3">
                {inv.endorsements.map((e: any) => (
                  <div key={e.id} className="flex gap-3">
                    <Quote className="h-4 w-4 mt-1 text-[#8B7FD4] shrink-0" />
                    <div>
                      {e.comment && <p className="text-sm text-muted-foreground italic">“{e.comment}”</p>}
                      <p className="text-xs text-foreground mt-0.5 font-medium">
                        {e.endorser?.name ?? 'Endorser'}{e.endorser?.organization ? ` · ${e.endorser.organization}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, card }: { label: string; value: string; card?: boolean }) {
  if (card) {
    return (
      <Card><CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-xl font-bold">{value}</p>
      </CardContent></Card>
    );
  }
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card><CardContent className="p-5">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-[#2ABFB0] mb-2">{title}</h3>
      {children}
    </CardContent></Card>
  );
}

/* ── Confidential Vault Section (Tier 2 Assets) ────────────────── */

const TIER2_FIELDS: { key: string; label: string }[] = [
  { key: 'technicalBlueprint', label: 'Technical Blueprint / Prototype Specs' },
  { key: 'financialModelDetail', label: 'Detailed Financial Model' },
  { key: 'patentDocumentation', label: 'Patent / IP Documentation' },
  { key: 'clinicalData', label: 'Full Clinical Trial / Validation Report' },
];

function VaultSection({
  inv,
  vaultAccess,
  vaultDocuments,
  ndaOpen,
  setNdaOpen,
  session,
}: {
  inv: any;
  vaultAccess: string | null;
  vaultDocuments: { id: string; title: string; description: string | null; assetId: string }[];
  ndaOpen: boolean;
  setNdaOpen: (v: boolean) => void;
  session: any;
}) {
  const isApproved = vaultAccess === 'APPROVED';
  const hasSigned = vaultAccess === 'NDA_SIGNED';
  const isDenied = vaultAccess === 'DENIED';
  const isRevoked = vaultAccess === 'REVOKED';
  const isPending = hasSigned; // after NDA signing, waiting for innovator approval

  return (
    <>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-[#2ABFB0]">Tier 2 — Confidential Vault</h3>
            {vaultAccess && (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                vaultAccess === 'APPROVED' ? 'bg-[#2D9B94]/20 text-[#2ABFB0]'
                : vaultAccess === 'NDA_SIGNED' ? 'bg-[#8B7FD4]/20 text-[#b6acef]'
                : vaultAccess === 'DENIED' ? 'bg-[#DC2626]/15 text-[#f87171]'
                : vaultAccess === 'REVOKED' ? 'bg-black/[0.06] text-gray-400'
                : 'bg-[#F59E0B]/15 text-[#FBBF24]'
              }`}>
                {vaultAccess === 'APPROVED' ? 'Access Granted' : vaultAccess === 'NDA_SIGNED' ? 'Awaiting Approval' : vaultAccess === 'DENIED' ? 'Denied' : vaultAccess === 'REVOKED' ? 'Revoked' : vaultAccess}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {isApproved
              ? 'You have signed the NDA and been approved. Full confidential documents are available below.'
              : isPending
              ? 'You have signed the NDA. The innovator is reviewing your request for access.'
              : isDenied
              ? 'Your vault access request was denied by the innovator.'
              : isRevoked
              ? 'Your vault access has been revoked by the innovator.'
              : 'These confidential documents are protected under NDA. Sign the Digital NDA to request access.'}
          </p>

          {/* Asset list */}
          <div className="space-y-2">
            {TIER2_FIELDS.map((f) => {
              const value = inv[f.key];
              const hasContent = value && value !== '__LOCKED__';
              const locked = !isApproved;

              return (
                <div key={f.key} className="flex items-center justify-between rounded-lg border border-black/[0.08] px-4 py-3">
                  <div className="flex items-center gap-3">
                    {locked ? (
                      <Lock className="h-4 w-4 text-[#F59E0B]" />
                    ) : hasContent ? (
                      <Unlock className="h-4 w-4 text-[#2ABFB0]" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{f.label}</span>
                  </div>
                  <span className={`text-xs font-medium ${
                    locked ? 'text-[#F59E0B]' : hasContent ? 'text-[#2ABFB0]' : 'text-muted-foreground'
                  }`}>
                    {locked ? 'Locked' : hasContent ? 'Available' : 'Not Provided'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action button */}
          {!vaultAccess && (
            <Button className="w-full gap-2" onClick={() => setNdaOpen(true)}>
              <ShieldCheck className="h-4 w-4" /> Request Vault Access (Sign NDA)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Unlocked documents (only when approved) */}
      {isApproved && (
        <div className="space-y-3">
          {vaultDocuments.map((document) => (
            <Card key={document.id}>
              <CardContent className="p-5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-primary"><Unlock className="h-4 w-4" />{document.title}</h4>
                {document.description && <p className="mt-2 text-sm text-muted-foreground">{document.description}</p>}
                <Button asChild className="mt-3" size="sm" variant="outline"><a href={`/api/uploads/${document.assetId}/download`}>Open secured document</a></Button>
              </CardContent>
            </Card>
          ))}
          {TIER2_FIELDS.map((f) => {
            const value = inv[f.key];
            if (!value || value === '__LOCKED__') return null;
            return (
              <Card key={f.key}>
                <CardContent className="p-5">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[#2ABFB0] mb-2">
                    <Unlock className="h-4 w-4" /> {f.label}
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* NDA Dialog */}
      <NdaClickwrap
        open={ndaOpen}
        onOpenChange={setNdaOpen}
        innovationId={inv.id}
        innovationTitle={inv.title}
        innovationRef={inv.paxRef || undefined}
        investorName={session?.user?.name || 'Investor'}
        investorEmail={session?.user?.email || ''}
        investorOrg={(session?.user as any)?.organization || undefined}
        onSigned={() => {
          setNdaOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
