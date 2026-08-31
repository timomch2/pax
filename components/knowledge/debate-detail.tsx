'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, ThumbsUp, Award, FileText, MapPin, ExternalLink, ShieldAlert,
  Flag, Check, Trash2, Quote, Download, Sparkles, UserCheck, Search, Loader2, Tag, Lock,
} from 'lucide-react';
import {
  DIMENSIONS, STANCE_META, STANCE_ORDER, debateType, DEBATE_STATUS_META,
  canExpertOpinion, type StanceType, type DebateStatus,
} from '@/lib/debate';
import { TypeBadge, StatusBadge, DimensionChip, ScoreRing, feasibilityColor } from '@/components/knowledge/bits';
import { CredentialBadge } from '@/components/community/credential-badge';

interface Contribution {
  id: string;
  kind: string;
  body: string;
  dimension: string | null;
  feasibilityScore: number | null;
  implementationSetting: string | null;
  evidenceUrl: string | null;
  isDevilsAdvocate: boolean;
  isExpert: boolean;
  aiGenerated: boolean;
  moderationStatus: string;
  moderationReason: string | null;
  createdAt: string;
  author: { id: string; name: string | null; role: string; tier?: string | null };
  upvoteCount: number;
  upvotedByMe: boolean;
}

interface DetailData {
  debate: any;
  contributions: Contribution[];
  distribution: Record<string, number>;
  stanceTotal: number;
  myStance: StanceType | null;
  feasibilityAvg: number | null;
  isInitiator: boolean;
  isAdmin: boolean;
}

const STAGES = [
  { key: 'anchor', label: 'Anchoring', hint: 'The motion, evidence & ground truth' },
  { key: 'field', label: 'Field Data', hint: 'Community reactions & reviews' },
  { key: 'synthesis', label: 'Synthesis', hint: 'Consensus brief (on close)' },
];

function stageForStatus(status: string): number {
  if (['IN_SYNTHESIS', 'PUBLISHED'].includes(status)) return 2;
  if (['CLOSED'].includes(status)) return 2;
  return 1;
}

export function DebateDetail({ id, tier }: { id: string; tier: string | null }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  // contribution form
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<'SHORT_REVIEW' | 'EXPERT_OPINION'>('SHORT_REVIEW');
  const [dimension, setDimension] = useState<string>('');
  const [feasibility, setFeasibility] = useState<number>(0);
  const [setting, setSetting] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/debates/${id}`);
      if (res.ok) setData(await res.json());
      else setData(null);
    } catch (e) {
      console.error('load debate failed', e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Verify a returning Paystack payment (callback appends reference / trxref)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const isReturn = params.get('brief_purchase');
    const reference = params.get('reference') || params.get('trxref');
    if (!isReturn || !reference) return;
    (async () => {
      try {
        const res = await fetch(`/api/debates/${id}/brief/purchase/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        const d = await res.json();
        if (res.ok && d.status === 'PAID') toast.success('Payment confirmed — your full brief is unlocked.');
        else if (res.ok) toast.error('Payment not completed. Please try again.');
        else toast.error(d.error || 'Could not verify payment.');
      } catch { toast.error('Could not verify payment.'); }
      finally {
        // strip the query params and refresh access state
        const url = new URL(window.location.href);
        url.searchParams.delete('brief_purchase');
        url.searchParams.delete('reference');
        url.searchParams.delete('trxref');
        window.history.replaceState({}, '', url.toString());
        load();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const communityScore = useMemo(() => {
    if (!data) return 0;
    const dist = data.distribution;
    const pos = (dist.AGREE ?? 0) + (dist.RELEVANT_MY_SETTING ?? 0) + 0.5 * (dist.PARTLY_AGREE ?? 0);
    const neg = (dist.DISAGREE ?? 0) + (dist.NOT_FEASIBLE_MY_SETTING ?? 0);
    const total = pos + neg;
    const sentiment = total > 0 ? pos / total : 0.5;
    const feas = data.feasibilityAvg != null ? data.feasibilityAvg / 5 : sentiment;
    return Math.round((sentiment * 0.6 + feas * 0.4) * 100);
  }, [data]);

  const setStance = async (reaction: StanceType) => {
    try {
      const res = await fetch(`/api/debates/${id}/stance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });
      if (res.ok) { toast.success('Reaction recorded.'); load(); }
      else toast.error('Could not record reaction.');
    } catch { toast.error('Something went wrong.'); }
  };

  const toggleUpvote = async (cid: string) => {
    try {
      const res = await fetch(`/api/debates/contributions/${cid}/upvote`, { method: 'POST' });
      if (res.ok) load();
    } catch { /* noop */ }
  };

  const moderate = async (cid: string, action: 'approve' | 'remove') => {
    try {
      const res = await fetch(`/api/debates/contributions/${cid}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) { toast.success(action === 'remove' ? 'Contribution removed.' : 'Contribution approved.'); load(); }
      else toast.error('Action failed.');
    } catch { toast.error('Something went wrong.'); }
  };

  const submit = async () => {
    if (body.trim().length < 10) return toast.error('Please write at least a sentence or two.');
    setPosting(true);
    try {
      const res = await fetch(`/api/debates/${id}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          kind,
          dimension: dimension || undefined,
          feasibilityScore: feasibility || undefined,
          implementationSetting: setting || undefined,
          evidenceUrl: evidenceUrl || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? 'Could not post.'); return; }
      setBody(''); setDimension(''); setFeasibility(0); setSetting(''); setEvidenceUrl('');
      toast.success('Contribution posted.');
      load();
    } catch { toast.error('Something went wrong.'); }
    finally { setPosting(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">This debate could not be found.</p>
        <Button asChild variant="outline" className="mt-4"><Link href="/knowledge">Back to debates</Link></Button>
      </div>
    );
  }

  const d = data.debate;
  const t = debateType(d.type);
  const activeStage = stageForStatus(d.status);
  const closed = ['CLOSED', 'IN_SYNTHESIS', 'PUBLISHED'].includes(d.status);
  const expertAllowed = canExpertOpinion(tier);

  const shortReviews = data.contributions.filter((c) => c.kind === 'SHORT_REVIEW' && !c.isDevilsAdvocate);
  const expertOpinions = data.contributions.filter((c) => c.kind === 'EXPERT_OPINION' && !c.isDevilsAdvocate);
  const devilContribs = data.contributions.filter((c) => c.isDevilsAdvocate);

  return (
    <div className="space-y-6">
      <Link href="/knowledge" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All debates
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-black/[0.08] bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={d.type} />
          <StatusBadge status={d.status} />
          {d.healthDomain && <span className="text-[11px] text-muted-foreground">{d.healthDomain}</span>}
          {d.geographyFocus && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> {d.geographyFocus}
            </span>
          )}
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold">{d.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">{d.motion}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Opened by {d.initiator?.name ?? 'a member'}
        </p>
      </div>

      {/* Workflow stages */}
      <div className="grid gap-3 sm:grid-cols-3">
        {STAGES.map((s, i) => {
          const state = i < activeStage ? 'done' : i === activeStage ? 'active' : 'todo';
          return (
            <div
              key={s.key}
              className={`rounded-xl border p-4 ${
                state === 'active'
                  ? 'border-[#2ABFB0]/40 bg-[#2ABFB0]/5'
                  : state === 'done'
                  ? 'border-black/[0.08] bg-black/[0.03]'
                  : 'border-black/[0.06] bg-transparent opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                    state === 'active' ? 'bg-[#2ABFB0] text-black' : state === 'done' ? 'bg-white/20 text-[#1A2332]' : 'bg-black/[0.06] text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              <p className="mt-1 pl-8 text-[11px] text-muted-foreground">{s.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="space-y-6">
          {/* Anchor / problem */}
          <Card className="border-black/[0.08] bg-white">
            <CardContent className="space-y-4 p-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">The problem (ground truth)</h3>
                <p className="mt-1.5 text-sm leading-relaxed">{d.problemStatement}</p>
              </div>
              {d.standardRecommendation && (
                <div className="rounded-lg border-l-2 border-[#8B7FD4]/50 bg-black/[0.02] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8B7FD4]">
                    <Quote className="h-3.5 w-3.5" /> Standard recommendation
                  </div>
                  <p className="mt-1 text-sm text-foreground/90">{d.standardRecommendation}</p>
                </div>
              )}
              {d.background && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Background</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{d.background}</p>
                </div>
              )}
              {d.anchorReference && (
                <a
                  href={/^https?:\/\//.test(d.anchorReference) ? d.anchorReference : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#2ABFB0] hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> {d.anchorReference}
                  {/^https?:\/\//.test(d.anchorReference) && <ExternalLink className="h-3 w-3" />}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Devil's advocate */}
          {devilContribs.length > 0 && (
            <div className="space-y-3">
              {devilContribs.map((c) => (
                <ContributionItem key={c.id} c={c} onUpvote={toggleUpvote} onModerate={moderate} isAdmin={data.isAdmin} />
              ))}
            </div>
          )}

          {/* Expert opinions */}
          {expertOpinions.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Award className="h-4 w-4 text-[#8B7FD4]" /> Expert Opinions
                <span className="text-xs font-normal text-muted-foreground">({expertOpinions.length})</span>
              </h3>
              {expertOpinions.map((c) => (
                <ContributionItem key={c.id} c={c} onUpvote={toggleUpvote} onModerate={moderate} isAdmin={data.isAdmin} />
              ))}
            </div>
          )}

          {/* Short reviews */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              Field Reviews <span className="text-xs font-normal text-muted-foreground">({shortReviews.length})</span>
            </h3>
            {shortReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No field reviews yet — be the first to add real-world context.</p>
            ) : (
              shortReviews.map((c) => (
                <ContributionItem key={c.id} c={c} onUpvote={toggleUpvote} onModerate={moderate} isAdmin={data.isAdmin} />
              ))
            )}
          </div>

          {/* Post form */}
          {!closed ? (
            <Card className="border-black/[0.08] bg-white">
              <CardContent className="space-y-4 p-6">
                <h3 className="text-sm font-semibold">Add your contribution</h3>
                <div className="flex gap-1 rounded-lg border border-black/[0.08] bg-black/[0.02] p-1">
                  <button
                    onClick={() => setKind('SHORT_REVIEW')}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${kind === 'SHORT_REVIEW' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
                  >
                    Field Review
                  </button>
                  <button
                    onClick={() => expertAllowed && setKind('EXPERT_OPINION')}
                    disabled={!expertAllowed}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${kind === 'EXPERT_OPINION' ? 'bg-[#8B7FD4]/20 text-[#8B7FD4]' : 'text-muted-foreground'} ${!expertAllowed ? 'cursor-not-allowed opacity-50' : ''}`}
                    title={expertAllowed ? '' : 'Expert Opinions require Tier 3'}
                  >
                    Expert Opinion {!expertAllowed && '(Tier 3)'}
                  </button>
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Share what actually happens in your setting — constraints, workarounds, outcomes."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Evaluation dimension</Label>
                    <Select value={dimension} onValueChange={setDimension}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        {DIMENSIONS.map((dim) => <SelectItem key={dim} value={dim}>{dim}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Feasibility (1–5)</Label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFeasibility(feasibility === n ? 0 : n)}
                          className={`h-8 w-8 rounded-md border text-xs font-semibold transition-colors ${
                            feasibility >= n && feasibility > 0
                              ? 'border-transparent text-black'
                              : 'border-black/[0.08] text-muted-foreground hover:border-black/[0.12]'
                          }`}
                          style={feasibility >= n && feasibility > 0 ? { background: feasibilityColor(feasibility) } : {}}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Your setting</Label>
                    <Input value={setting} onChange={(e) => setSetting(e.target.value)} placeholder="e.g. Level 4 county hospital, Kenya" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Evidence link</Label>
                    <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Optional URL" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={submit} disabled={posting}>{posting ? 'Posting…' : 'Post contribution'}</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-black/[0.08] bg-white">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                This debate is closed to new contributions.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-black/[0.08] bg-white">
            <CardContent className="flex flex-col items-center gap-2 p-6">
              <ScoreRing value={communityScore} />
              {data.feasibilityAvg != null && (
                <p className="text-[11px] text-muted-foreground">
                  Avg feasibility{' '}
                  <span className="font-semibold" style={{ color: feasibilityColor(data.feasibilityAvg) }}>
                    {data.feasibilityAvg.toFixed(1)}/5
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick reaction */}
          <Card className="border-black/[0.08] bg-white">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick reaction {data.stanceTotal > 0 && `(${data.stanceTotal})`}
              </h3>
              <div className="space-y-1.5">
                {STANCE_ORDER.map((s) => {
                  const meta = STANCE_META[s];
                  const count = data.distribution[s] ?? 0;
                  const pct = data.stanceTotal > 0 ? (count / data.stanceTotal) * 100 : 0;
                  const mine = data.myStance === s;
                  const tone = meta.tone === 'pos' ? '#2ABFB0' : meta.tone === 'neg' ? '#DC2626' : '#FBBF24';
                  return (
                    <button
                      key={s}
                      onClick={() => setStance(s)}
                      className={`relative w-full overflow-hidden rounded-md border px-3 py-1.5 text-left text-xs transition-colors ${
                        mine ? 'border-black/[0.15]' : 'border-black/[0.08] hover:border-black/[0.12]'
                      }`}
                    >
                      <span
                        className="absolute inset-y-0 left-0 opacity-20"
                        style={{ width: `${pct}%`, background: tone }}
                      />
                      <span className="relative flex items-center justify-between">
                        <span className={mine ? 'font-semibold' : ''}>{meta.label}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {(data.isInitiator || data.isAdmin) && (
            <Card className="border-black/[0.08] bg-white">
              <CardContent className="space-y-3 p-5">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ShieldAlert className="h-3.5 w-3.5" /> Manage debate
                </h3>
                <StatusControl id={id} current={d.status} isAdmin={data.isAdmin} onDone={load} />
                <Separator className="bg-black/[0.06]" />
                <LinkListingControl id={id} currentTitle={d.related?.listing?.title ?? null} onDone={load} />
              </CardContent>
            </Card>
          )}

          {/* Devil's Advocate assignment (admin) */}
          {data.isAdmin && (
            <DevilsAdvocateAssign debateId={id} currentDA={d.devilsAdvocate} onDone={load} />
          )}

          {/* Thematic analysis (admin) */}
          {data.isAdmin && data.contributions.length >= 2 && (
            <ThemeExtractor debateId={id} />
          )}

          {/* Synthesis / Consensus Brief panel (admin) */}
          {data.isAdmin && (
            <SynthesisPanel debateId={id} brief={d.consensusBrief} abstract={d.consensusAbstract} publishedAt={d.consensusPublishedAt} onDone={load} />
          )}

          {/* Related on PAX ecosystem */}
          {d.related && <RelatedOnPaxCard related={d.related} />}

          {/* Download published brief (all users) */}
          {d.consensusPublishedAt && d.consensusBrief && !data.isAdmin && (
            <BriefDownloadCard debateId={id} title={d.title} abstract={d.consensusAbstract} />
          )}
        </div>
      </div>
    </div>
  );
}

function ContributionItem({
  c, onUpvote, onModerate, isAdmin,
}: {
  c: Contribution;
  onUpvote: (id: string) => void;
  onModerate: (id: string, action: 'approve' | 'remove') => void;
  isAdmin: boolean;
}) {
  const removed = c.moderationStatus === 'REMOVED';
  return (
    <div
      className={`rounded-xl border p-4 ${
        c.isDevilsAdvocate
          ? 'border-[#F59E0B]/40 bg-[#F59E0B]/[0.06]'
          : removed
          ? 'border-[#DC2626]/40 bg-[#DC2626]/[0.06]'
          : 'border-black/[0.08] bg-white'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {c.isDevilsAdvocate && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#F59E0B]">
            😈 Devil&apos;s Advocate
          </span>
        )}
        {c.kind === 'EXPERT_OPINION' && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#8B7FD4]/40 bg-[#8B7FD4]/15 px-2 py-0.5 text-[11px] font-semibold text-[#8B7FD4]">
            <Award className="h-3 w-3" /> Expert
          </span>
        )}
        <span className="text-sm font-medium">{c.author?.name ?? 'Member'}</span>
        {c.author?.tier && c.author.tier !== 'TIER1_BASIC' && (
          <CredentialBadge tier={c.author.tier} size="xs" variant="short" />
        )}
        {c.dimension && <DimensionChip dimension={c.dimension} />}
        {c.moderationStatus === 'FLAGGED' && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#FBBF24]/40 bg-[#FBBF24]/10 px-2 py-0.5 text-[11px] text-[#FBBF24]">
            <Flag className="h-3 w-3" /> Flagged for review
          </span>
        )}
        {removed && (
          <span className="rounded-full border border-[#DC2626]/40 bg-[#DC2626]/10 px-2 py-0.5 text-[11px] text-[#DC2626]">
            Removed
          </span>
        )}
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{c.body}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {c.feasibilityScore != null && (
          <span>
            Feasibility{' '}
            <span className="font-semibold" style={{ color: feasibilityColor(c.feasibilityScore) }}>
              {c.feasibilityScore}/5
            </span>
          </span>
        )}
        {c.implementationSetting && (
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.implementationSetting}</span>
        )}
        {c.evidenceUrl && (
          <a href={c.evidenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2ABFB0] hover:underline">
            <ExternalLink className="h-3 w-3" /> evidence
          </a>
        )}
        <button
          onClick={() => onUpvote(c.id)}
          className={`ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors ${
            c.upvotedByMe ? 'border-[#2ABFB0]/40 text-[#2ABFB0]' : 'border-black/[0.08] hover:border-black/[0.12]'
          }`}
        >
          <ThumbsUp className="h-3 w-3" /> {c.upvoteCount}
        </button>
      </div>

      {isAdmin && (c.moderationStatus === 'FLAGGED' || removed) && (
        <div className="mt-3 rounded-lg border border-black/[0.08] bg-black/[0.02] p-3">
          {c.moderationReason && (
            <p className="mb-2 text-[11px] text-[#FBBF24]">AI note: {c.moderationReason}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onModerate(c.id, 'approve')}>
              <Check className="h-3 w-3" /> Approve
            </Button>
            {!removed && (
              <Button size="sm" variant="outline" className="h-7 gap-1 border-[#DC2626]/40 text-xs text-[#DC2626]" onClick={() => onModerate(c.id, 'remove')}>
                <Trash2 className="h-3 w-3" /> Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusControl({
  id, current, isAdmin, onDone,
}: {
  id: string;
  current: string;
  isAdmin: boolean;
  onDone: () => void;
}) {
  const [status, setStatus] = useState(current);
  const [saving, setSaving] = useState(false);
  const options: DebateStatus[] = isAdmin
    ? ['OPEN', 'CLOSING_SOON', 'CLOSED', 'IN_SYNTHESIS', 'PUBLISHED']
    : ['OPEN', 'CLOSING_SOON', 'CLOSED'];

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/debates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { toast.success('Debate updated.'); onDone(); }
      else toast.error('Update failed.');
    } catch { toast.error('Something went wrong.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((s) => (
            <SelectItem key={s} value={s}>{DEBATE_STATUS_META[s].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" className="w-full" onClick={save} disabled={saving || status === current}>
        {saving ? 'Saving…' : 'Update status'}
      </Button>
    </div>
  );
}

/* ── Devil's Advocate Assignment (admin sidebar) ── */
function DevilsAdvocateAssign({ debateId, currentDA, onDone }: {
  debateId: string;
  currentDA: { id: string; name: string | null } | null;
  onDone: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/devil?q=${encodeURIComponent(q)}`);
      if (res.ok) { const d = await res.json(); setResults(d.users || []); }
    } catch {}
    finally { setSearching(false); }
  };

  const assign = async (userId: string | null) => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/devil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) { toast.success(userId ? 'Devil\'s Advocate assigned.' : 'Devil\'s Advocate removed.'); setQuery(''); setResults([]); onDone(); }
      else toast.error('Assignment failed.');
    } catch { toast.error('Something went wrong.'); }
    finally { setAssigning(false); }
  };

  return (
    <Card className="border-black/[0.08] bg-white">
      <CardContent className="space-y-3 p-5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#F59E0B]">
          😈 Devil&apos;s Advocate
        </h3>
        {currentDA ? (
          <div className="flex items-center justify-between">
            <span className="text-sm">{currentDA.name || 'Assigned'}</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => assign(null)} disabled={assigning}>
              Remove
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">None assigned yet.</p>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={query} onChange={(e) => search(e.target.value)} placeholder="Search members…" className="pl-8 h-8 text-xs" />
        </div>
        {searching && <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />}
        {results.length > 0 && (
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {results.map((u) => (
              <button key={u.id} onClick={() => assign(u.id)} disabled={assigning}
                className="flex w-full items-center justify-between rounded-md border border-black/[0.08] px-3 py-1.5 text-left text-xs hover:bg-black/[0.04]">
                <span>{u.name || u.email}</span>
                <UserCheck className="h-3.5 w-3.5 text-[#2ABFB0]" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Theme Extractor (admin sidebar) ── */
function ThemeExtractor({ debateId }: { debateId: string }) {
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const extract = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/themes`, { method: 'POST' });
      if (res.ok) { const d = await res.json(); setThemes(d.themes || []); }
      else toast.error('Theme extraction failed.');
    } catch { toast.error('Something went wrong.'); }
    finally { setLoading(false); }
  };

  return (
    <Card className="border-black/[0.08] bg-white">
      <CardContent className="space-y-3 p-5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Tag className="h-3.5 w-3.5" /> Recurring themes
        </h3>
        {themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {themes.map((t) => (
              <span key={t} className="rounded-full border border-[#2ABFB0]/30 bg-[#2ABFB0]/10 px-2.5 py-0.5 text-[11px] text-[#2ABFB0]">
                {t}
              </span>
            ))}
          </div>
        )}
        <Button size="sm" variant="outline" className="h-7 w-full gap-1.5 text-xs" onClick={extract} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Analysing…' : themes.length > 0 ? 'Re-analyse' : 'Extract themes'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── Synthesis Panel (admin sidebar) — generate, edit, publish consensus brief ── */
function SynthesisPanel({ debateId, brief, abstract, publishedAt, onDone }: {
  debateId: string;
  brief: string | null;
  abstract: string | null;
  publishedAt: string | null;
  onDone: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [editBrief, setEditBrief] = useState(brief || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editAbstract, setEditAbstract] = useState(abstract || '');
  const [editingAbstract, setEditingAbstract] = useState(false);
  const [savingAbstract, setSavingAbstract] = useState(false);

  useEffect(() => { setEditBrief(brief || ''); }, [brief]);
  useEffect(() => { setEditAbstract(abstract || ''); }, [abstract]);

  const saveAbstract = async () => {
    setSavingAbstract(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/brief`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abstract: editAbstract }),
      });
      if (res.ok) { toast.success('Abstract saved.'); setEditingAbstract(false); onDone(); }
      else toast.error('Save failed.');
    } catch { toast.error('Something went wrong.'); }
    finally { setSavingAbstract(false); }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/brief`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) { toast.success('Brief generated — review below.'); onDone(); }
      else toast.error(d.error || 'Generation failed.');
    } catch { toast.error('Something went wrong.'); }
    finally { setGenerating(false); }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/brief`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: editBrief }),
      });
      if (res.ok) { toast.success('Draft saved.'); setEditing(false); onDone(); }
      else toast.error('Save failed.');
    } catch { toast.error('Something went wrong.'); }
    finally { setSaving(false); }
  };

  const togglePublish = async () => {
    setSaving(true);
    try {
      const action = publishedAt ? 'unpublish' : 'publish';
      const res = await fetch(`/api/debates/${debateId}/brief`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) { toast.success(action === 'publish' ? 'Brief published!' : 'Brief unpublished.'); onDone(); }
      else toast.error('Action failed.');
    } catch { toast.error('Something went wrong.'); }
    finally { setSaving(false); }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const startRes = await fetch(`/api/debates/${debateId}/brief`);
      const startData = await startRes.json();
      if (!startRes.ok || !startData.requestId) { toast.error('Could not start PDF.'); return; }
      let attempts = 0;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const statusRes = await fetch(`/api/debates/${debateId}/brief/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: startData.requestId }),
        });
        const statusData = await statusRes.json();
        if (statusData.status === 'SUCCESS' && statusData.pdfBase64) {
          const byteChars = atob(statusData.pdfBase64);
          const byteNums = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
          const blob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'PAX_Consensus_Brief.pdf'; a.click();
          URL.revokeObjectURL(url);
          toast.success('PDF downloaded.'); return;
        }
        if (statusData.status === 'FAILED') { toast.error('PDF failed.'); return; }
        attempts++;
      }
      toast.error('PDF timed out.');
    } catch { toast.error('Something went wrong.'); }
    finally { setDownloading(false); }
  };

  return (
    <Card className="border-black/[0.08] bg-white">
      <CardContent className="space-y-3 p-5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#8B7FD4]">
          <Sparkles className="h-3.5 w-3.5" /> Consensus Brief
        </h3>

        {!brief ? (
          <>
            <p className="text-xs text-muted-foreground">No brief drafted yet. Generate one from the contributions.</p>
            <Button size="sm" className="w-full gap-1.5 text-xs bg-[#8B7FD4] hover:bg-[#8B7FD4]/80" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generating ? 'Generating…' : 'Generate Brief (AI)'}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs">
              {publishedAt ? (
                <span className="rounded-full bg-[#2ABFB0]/15 px-2 py-0.5 text-[#2ABFB0] font-semibold">Published</span>
              ) : (
                <span className="rounded-full bg-[#FBBF24]/15 px-2 py-0.5 text-[#FBBF24] font-semibold">Draft</span>
              )}
            </div>

            {/* Free abstract (public teaser) editor */}
            <div className="rounded-lg border border-[#FBBF24]/20 bg-[#FBBF24]/[0.04] p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#FBBF24]">Free abstract (public teaser)</span>
                {!editingAbstract && (
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => setEditingAbstract(true)}>
                    {abstract ? 'Edit' : 'Add'}
                  </Button>
                )}
              </div>
              {editingAbstract ? (
                <>
                  <Textarea value={editAbstract} onChange={(e) => setEditAbstract(e.target.value)} rows={4}
                    placeholder="A short teaser shown free to everyone. Interested readers unlock the full brief for $0.99."
                    className="text-xs leading-relaxed" />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingAbstract(false); setEditAbstract(abstract || ''); }}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs" onClick={saveAbstract} disabled={savingAbstract}>{savingAbstract ? 'Saving...' : 'Save abstract'}</Button>
                  </div>
                </>
              ) : (
                <p className="text-xs leading-relaxed text-foreground/70 whitespace-pre-wrap">
                  {abstract || 'No abstract yet. Add a short free teaser so readers can preview before unlocking the full brief.'}
                </p>
              )}
            </div>

            {editing ? (
              <>
                <Textarea value={editBrief} onChange={(e) => setEditBrief(e.target.value)} rows={10} className="text-xs leading-relaxed" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditing(false); setEditBrief(brief || ''); }}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs" onClick={saveDraft} disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</Button>
                </div>
              </>
            ) : (
              <>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-black/[0.08] bg-black/[0.02] p-3 text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {brief.slice(0, 600)}{brief.length > 600 ? '…' : ''}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setEditing(true)}>Edit</Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={generate} disabled={generating}>
                    {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Regenerate
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={downloadPdf} disabled={downloading}>
                    {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} PDF
                  </Button>
                  <Button size="sm"
                    className={`h-7 gap-1 text-xs ${publishedAt ? 'bg-[#DC2626] hover:bg-[#DC2626]/80' : 'bg-[#2ABFB0] hover:bg-[#2ABFB0]/80 text-black'}`}
                    onClick={togglePublish} disabled={saving}>
                    {publishedAt ? 'Unpublish' : 'Approve & publish'}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Brief download card (non-admin, published debates) ── */
function LinkListingControl({ id, currentTitle, onDone }: { id: string; currentTitle: string | null; onDone: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; title: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const search = async () => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/marketplace/listings?search=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults((data.listings || []).slice(0, 6).map((l: any) => ({ id: l.id, title: l.title })));
    } catch { toast.error('Search failed.'); }
    finally { setSearching(false); }
  };

  const link = async (listingId: string | null) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/debates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relatedListingId: listingId }),
      });
      if (!res.ok) { toast.error('Could not update link.'); return; }
      toast.success(listingId ? 'Linked to marketplace listing.' : 'Link removed.');
      setQ(''); setResults([]); onDone();
    } catch { toast.error('Something went wrong.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Link a marketplace listing</p>
      {currentTitle && (
        <div className="flex items-center justify-between rounded-md border border-[#2ABFB0]/30 bg-[#2ABFB0]/[0.06] px-2.5 py-1.5">
          <span className="truncate text-xs">{currentTitle}</span>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => link(null)} disabled={saving}>Remove</Button>
        </div>
      )}
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} placeholder="Search listings…" className="h-8 text-xs" />
        <Button size="sm" variant="outline" className="h-8" onClick={search} disabled={searching}>{searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}</Button>
      </div>
      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r) => (
            <button key={r.id} onClick={() => link(r.id)} disabled={saving} className="flex w-full items-center justify-between rounded-md border border-black/[0.08] bg-black/[0.03] px-2.5 py-1.5 text-left text-xs transition-colors hover:border-[#2ABFB0]/40 hover:bg-black/[0.05]">
              <span className="truncate">{r.title}</span>
              <span className="shrink-0 text-[#2ABFB0]">Link</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RelatedOnPaxCard({ related }: { related: { innovation?: any; listing?: any } }) {
  const inv = related.innovation;
  const listing = related.listing;
  return (
    <Card className="border-[#2ABFB0]/30 bg-[#2ABFB0]/[0.06]">
      <CardContent className="p-5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#2ABFB0]">
          <ExternalLink className="h-4 w-4" /> Related on PAX
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">This debate is connected to live activity in the PAX ecosystem.</p>
        <div className="mt-3 space-y-2">
          {inv && (
            <div className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-black/[0.03] px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{inv.title}</p>
                <p className="text-xs text-muted-foreground">Innovation · {inv.sector}{inv.verified ? ' · Verified' : ''}</p>
              </div>
            </div>
          )}
          {listing && (
            <Link href={`/marketplace/${listing.id}`} className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-black/[0.03] px-3 py-2.5 transition-colors hover:border-[#2ABFB0]/40 hover:bg-black/[0.05]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{listing.title}</p>
                <p className="text-xs text-muted-foreground">Marketplace listing</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface BriefAccessInfo {
  canDownload: boolean;
  purchased: boolean;
  pilotFree: boolean;
  reason: string;
  hasBrief: boolean;
  isPublished: boolean;
  priceCents: number;
  priceLabel: string;
  currency: string;
  paymentConfigured: boolean;
}

function BriefDownloadCard({ debateId, title, abstract }: { debateId: string; title: string; abstract: string | null }) {
  const [downloading, setDownloading] = useState(false);
  const [access, setAccess] = useState<BriefAccessInfo | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const loadAccess = useCallback(async () => {
    try {
      const res = await fetch(`/api/debates/${debateId}/brief/access`);
      if (res.ok) setAccess(await res.json());
    } catch (e) { console.error('brief access failed', e); }
  }, [debateId]);

  useEffect(() => { loadAccess(); }, [loadAccess]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const startRes = await fetch(`/api/debates/${debateId}/brief`);
      const startData = await startRes.json();
      if (startRes.status === 402) { toast.error('Unlock the full brief to download.'); loadAccess(); return; }
      if (!startRes.ok || !startData.requestId) { toast.error(startData.error || 'Could not start PDF.'); return; }
      let attempts = 0;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const statusRes = await fetch(`/api/debates/${debateId}/brief/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: startData.requestId }),
        });
        const statusData = await statusRes.json();
        if (statusData.status === 'SUCCESS' && statusData.pdfBase64) {
          const byteChars = atob(statusData.pdfBase64);
          const byteNums = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
          const blob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `PAX_Brief_${title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.pdf`; a.click();
          URL.revokeObjectURL(url);
          toast.success('Brief downloaded.'); return;
        }
        if (statusData.status === 'FAILED') { toast.error('PDF failed.'); return; }
        attempts++;
      }
      toast.error('PDF timed out.');
    } catch { toast.error('Something went wrong.'); }
    finally { setDownloading(false); }
  };

  const unlock = async () => {
    setPurchasing(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/brief/purchase`, { method: 'POST' });
      const d = await res.json();
      if (res.status === 503 || d.code === 'PAYMENT_NOT_CONFIGURED') {
        toast.info('Secure payments are coming soon. Please check back shortly.');
        return;
      }
      if (d.alreadyPurchased) { toast.success('You already own this brief.'); loadAccess(); return; }
      if (res.ok && d.authorizationUrl) { window.location.href = d.authorizationUrl; return; }
      toast.error(d.error || 'Could not start checkout.');
    } catch { toast.error('Something went wrong.'); }
    finally { setPurchasing(false); }
  };

  const priceLabel = access?.priceLabel || '$0.99';
  const canDownload = access?.canDownload ?? false;

  return (
    <Card className="border-[#8B7FD4]/30 bg-[#8B7FD4]/[0.06]">
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#8B7FD4]">
            <FileText className="h-4 w-4" /> Consensus Brief
          </h3>
          {abstract ? (
            <p className="mt-2 whitespace-pre-wrap font-serif text-sm leading-relaxed text-foreground/85">{abstract}</p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">The synthesised intelligence report for this debate.</p>
          )}
        </div>

        {canDownload ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {access?.pilotFree ? 'Free during the pilot phase.' : access?.purchased ? 'You own this brief.' : 'Full brief unlocked.'}
            </p>
            <Button size="sm" className="gap-1.5 bg-[#8B7FD4] hover:bg-[#8B7FD4]/80" onClick={downloadPdf} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? 'Generating...' : 'Download full PDF'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-[#FBBF24]/25 bg-[#FBBF24]/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-xs text-foreground/80">
              <Lock className="h-3.5 w-3.5 text-[#FBBF24]" />
              Unlock the full detailed brief to read the complete analysis and download the PDF.
            </p>
            <Button size="sm" className="shrink-0 gap-1.5 bg-[#FBBF24] text-black hover:bg-[#FBBF24]/85" onClick={unlock} disabled={purchasing}>
              {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {purchasing ? 'Starting...' : `Unlock full brief — ${priceLabel}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
