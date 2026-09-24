'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Scale, MessagesSquare, FileText, Lightbulb, Users, BarChart3, Trophy,
  ArrowRight, AlertCircle, Flame, Sparkles, MapPin, Clock,
} from 'lucide-react';
import { DEBATE_STATUS_META, debateType } from '@/lib/debate';

interface DebateItem {
  id: string;
  type: string;
  status: string;
  title: string;
  healthDomain: string | null;
  geographyFocus: string | null;
  featured: boolean;
  closesAt: string | null;
  createdAt: string;
  initiator: { name: string | null; role: string };
  responseCount: number;
  expertCount: number;
  stanceCount: number;
  feasibilityAvg: number | null;
}

interface ConsensusBrief {
  id: string;
  title: string;
  type: string;
  healthDomain: string | null;
  geographyFocus: string | null;
  feasibilityConsensus: number | null;
  consensusPublishedAt: string;
  initiator: { name: string | null };
  _count: { contributions: number; stances: number };
}

interface FeaturedInnovation {
  id: string;
  title: string;
  tagline: string | null;
  sector: string | null;
  stage: string;
  verified: boolean;
  owner: { name: string | null };
}

interface NeedsVoice {
  id: string;
  title: string;
  type: string;
  healthDomain: string | null;
  geographyFocus: string | null;
  contributionCount: number;
  initiator: { name: string | null };
}

interface FeedData {
  debates: DebateItem[];
  consensusBriefs: ConsensusBrief[];
  featuredInnovations: FeaturedInnovation[];
  needsVoices: NeedsVoice[];
  stats: { totalMembers: number; totalDebates: number; totalContributions: number; publishedCount: number };
}

export function CommunityHub() {
  const [data, setData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community/feed')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Failed to load community feed.</p>;
  }

  const { debates, consensusBriefs, featuredInnovations, needsVoices, stats } = data;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl border border-black/[0.08] bg-gradient-to-br from-[#E8F3F1] to-[#F1EEE8] p-6 md:p-8">
        <div className="flex items-start gap-3">
          <Scale className="mt-1 h-7 w-7 shrink-0 text-[#8B7FD4]" />
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              Knowledge Exchange
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The daily pulse of PAX — where health professionals worldwide validate innovations,
              share field intelligence, and build the evidence base that drives policy, investment,
              and better health outcomes.
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Users className="h-4 w-4 text-[#2ABFB0]" />} label="Members" value={stats.totalMembers} />
          <StatCard icon={<MessagesSquare className="h-4 w-4 text-[#8B7FD4]" />} label="Debates" value={stats.totalDebates} />
          <StatCard icon={<BarChart3 className="h-4 w-4 text-[#FBBF24]" />} label="Contributions" value={stats.totalContributions} />
          <StatCard icon={<FileText className="h-4 w-4 text-[#2ABFB0]" />} label="Consensus Published" value={stats.publishedCount} />
        </div>
      </div>

      {/* Call for Field Validation */}
      {needsVoices.length > 0 && (
        <section>
          <SectionHeader
            icon={<AlertCircle className="h-5 w-5 text-[#F59E0B]" />}
            title="Your Setting Needs Your Voice"
            subtitle="These debates need more field perspectives — especially from practitioners who know the local realities."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {needsVoices.map((d) => {
              const dt = debateType(d.type);
              return (
                <Link key={d.id} href={`/knowledge/${d.id}`}>
                  <Card className="group border-[#F59E0B]/20 bg-[#F59E0B]/[0.03] transition hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/[0.06]">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Badge variant="outline" className={`mb-2 text-[10px] ${dt.accent}`}>
                            {dt.shortLabel}
                          </Badge>
                          <h4 className="line-clamp-2 text-sm font-semibold leading-snug">{d.title}</h4>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            {d.healthDomain && <span>{d.healthDomain}</span>}
                            {d.geographyFocus && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {d.geographyFocus}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className="shrink-0 bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/15">
                          {d.contributionCount} voice{d.contributionCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Active Debates */}
      <section>
        <SectionHeader
          icon={<Flame className="h-5 w-5 text-[#2ABFB0]" />}
          title="Active Debates"
          subtitle="Live debates open for your Quick Reactions, field reviews, and expert opinions."
          action={{ href: '/knowledge', label: 'View All Debates' }}
        />
        {debates.length === 0 ? (
          <EmptyNote>No active debates right now. Be the first to start one.</EmptyNote>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {debates.map((d) => {
              const dt = debateType(d.type);
              const st = DEBATE_STATUS_META[d.status as keyof typeof DEBATE_STATUS_META];
              return (
                <Link key={d.id} href={`/knowledge/${d.id}`}>
                  <Card className="group h-full border-black/[0.08] transition hover:border-black/[0.12] hover:bg-black/[0.02]">
                    <CardContent className="flex h-full flex-col p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${dt.accent}`}>
                          {dt.shortLabel}
                        </Badge>
                        {st && (
                          <Badge variant="outline" className={`text-[10px] ${st.accent}`}>
                            {st.label}
                          </Badge>
                        )}
                        {d.featured && (
                          <Sparkles className="h-3.5 w-3.5 text-[#FBBF24]" />
                        )}
                      </div>
                      <h4 className="mt-2 line-clamp-2 flex-1 text-sm font-semibold leading-snug">{d.title}</h4>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{d.responseCount} contribution{d.responseCount !== 1 ? 's' : ''}</span>
                        <span>{d.stanceCount} reaction{d.stanceCount !== 1 ? 's' : ''}</span>
                        {d.expertCount > 0 && <span className="text-[#8B7FD4]">{d.expertCount} expert</span>}
                        {d.closesAt && (
                          <span className="flex items-center gap-1 text-[#F59E0B]">
                            <Clock className="h-3 w-3" /> Closing soon
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Consensus Briefs */}
      <section>
        <SectionHeader
          icon={<FileText className="h-5 w-5 text-[#2ABFB0]" />}
          title="Published Consensus Briefs"
          subtitle="Field-validated intelligence — synthesised from community debate and endorsed evidence."
          action={{ href: '/knowledge/reports', label: 'All Reports' }}
        />
        {consensusBriefs.length === 0 ? (
          <EmptyNote>No consensus briefs published yet. Active debates produce these once synthesised.</EmptyNote>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {consensusBriefs.map((b) => {
              const dt = debateType(b.type);
              return (
                <Link key={b.id} href={`/knowledge/${b.id}`}>
                  <Card className="group border-black/[0.08] transition hover:border-[#2ABFB0]/30 hover:bg-black/[0.02]">
                    <CardContent className="p-4">
                      <Badge variant="outline" className={`mb-2 text-[10px] ${dt.accent}`}>
                        {dt.shortLabel}
                      </Badge>
                      <h4 className="line-clamp-2 text-sm font-semibold">{b.title}</h4>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {b.healthDomain && <span>{b.healthDomain}</span>}
                        <span>{b._count.contributions} contributions</span>
                        <span>{b._count.stances} reactions</span>
                        {b.feasibilityConsensus !== null && (
                          <span className="text-[#2ABFB0]">Feasibility: {b.feasibilityConsensus.toFixed(1)}/5</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Innovations */}
      {featuredInnovations.length > 0 && (
        <section>
          <SectionHeader
            icon={<Lightbulb className="h-5 w-5 text-[#FBBF24]" />}
            title="Spotlight: Validated Innovations"
            subtitle="Community-vetted innovations making their way from idea to impact."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {featuredInnovations.map((inn) => (
              <Link key={inn.id} href={`/innovator?view=${inn.id}`}>
                <Card className="group border-black/[0.08] transition hover:border-[#FBBF24]/30 hover:bg-black/[0.02]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      {inn.verified && (
                        <Badge className="bg-[#FBBF24]/15 text-[#FBBF24] hover:bg-[#FBBF24]/15">
                          Verified
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">{inn.stage}</Badge>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold">{inn.title}</h4>
                    {inn.tagline && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{inn.tagline}</p>
                    )}
                    <div className="mt-2 flex items-center gap-x-3 text-[11px] text-muted-foreground">
                      {inn.sector && <span>{inn.sector}</span>}
                      {inn.owner?.name && <span>by {inn.owner.name}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick-access bar */}
      <div className="flex flex-wrap gap-3">
        <Link href="/knowledge">
          <Button variant="outline" className="gap-2">
            <MessagesSquare className="h-4 w-4" /> Browse All Debates
          </Button>
        </Link>
        <Link href="/knowledge/start">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" /> Start a Debate
          </Button>
        </Link>
        <Link href="/community/leaderboard">
          <Button variant="outline" className="gap-2">
            <Trophy className="h-4 w-4" /> Leaderboard
          </Button>
        </Link>
        <Link href="/knowledge/reports">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" /> Consensus Reports
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-center">
      <div className="mx-auto mb-1 flex items-center justify-center gap-1.5">{icon}</div>
      <p className="text-lg font-bold">{value.toLocaleString('en-KE')}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          {icon} {title}
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action && (
        <Link href={action.href}>
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            {action.label} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-black/[0.1] bg-black/[0.02] p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
