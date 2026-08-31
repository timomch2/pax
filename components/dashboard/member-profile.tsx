'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Award, MapPin, Building2, ArrowLeft, Search, Wrench, TrendingUp,
  Target, Lightbulb, Handshake, BadgeCheck, Linkedin,
} from 'lucide-react';
import { ENTRY_TYPE_LABELS, type GpsEntryType, type GpsEndorserType } from '@/lib/gps';
import { CredentialBadge } from '@/components/community/credential-badge';
import { EndorsementsList } from '@/components/dashboard/endorsements-list';
import { EndorseDialog } from '@/components/dashboard/endorse-dialog';
import { EvidenceSection, type Evidence } from '@/components/dashboard/evidence-section';

interface Endorsement {
  id: string;
  endorserType: GpsEndorserType;
  comment: string | null;
  createdAt?: string;
  endorser?: { id: string; name: string | null } | null;
}
interface Entry {
  id: string;
  title: string;
  organization: string | null;
  entryType: GpsEntryType;
  healthArea: string | null;
  geography: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  gap: string;
  rootCause: string | null;
  solution: string;
  outcome: string;
  lessonsLearned: string | null;
  endorsements: Endorsement[];
  evidence: Evidence[];
  viewerHasEndorsed: boolean;
}
interface Member {
  id: string;
  name: string | null;
  role: string | null;
  headline: string | null;
  location: string | null;
  organization: string | null;
  healthAreas: string[];
  linkedinUrl: string | null;
  credibilityScore: number;
  tier?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  PATIENT: 'Patient',
  PRACTITIONER: 'Health Practitioner',
  INNOVATOR: 'Innovator',
  INVESTOR: 'Investor',
  ADMIN: 'Admin',
};

export function MemberProfile({ id }: { id: string }) {
  const [member, setMember] = useState<Member | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [score, setScore] = useState(0);
  const [endorseFor, setEndorseFor] = useState<Entry | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/members/${id}`);
        if (res.status === 404) { setNotFound(true); return; }
        if (res.ok) {
          const data = await res.json();
          setMember(data.member);
          setEntries(data.entries ?? []);
          setIsOwner(!!data.isOwner);
          setScore(data.member?.credibilityScore ?? 0);
        }
      } catch (e) {
        console.error('Failed to load member profile', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // After a successful endorsement: update the owner score shown and mark this
  // entry as endorsed by the viewer so the button disables immediately.
  const handleEndorsed = (newScore: number, entryId: string, endorsement?: Endorsement) => {
    if (typeof newScore === 'number') setScore(newScore);
    setEntries((prev) => prev.map((e) => (
      e.id === entryId
        ? {
            ...e,
            viewerHasEndorsed: true,
            endorsements: endorsement ? [...e.endorsements, endorsement] : e.endorsements,
          }
        : e
    )));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="rounded-xl border border-dashed border-black/[0.1] bg-black/[0.02] p-10 text-center">
        <p className="font-medium">Member not found</p>
        <Link href="/dashboard/members" className="mt-3 inline-flex items-center gap-1 text-sm text-[#2ABFB0]">
          <ArrowLeft className="h-4 w-4" /> Back to members
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/members" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Link>

      {/* Header card */}
      <Card className="border-black/[0.08]">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold">{member.name ?? 'PAX Member'}</h2>
                {member.role && (
                  <Badge variant="outline" className="text-xs">{ROLE_LABELS[member.role] ?? member.role}</Badge>
                )}
                <CredentialBadge tier={member.tier} />
              </div>
              {member.headline && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{member.headline}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {member.organization && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {member.organization}</span>}
                {member.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {member.location}</span>}
                {member.linkedinUrl && (
                  <a href={member.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#2ABFB0] hover:underline">
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                )}
              </div>
              {member.healthAreas?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {member.healthAreas.map((h) => (
                    <Badge key={h} className="bg-[#2D9B94]/15 text-[10px] text-[#2ABFB0] hover:bg-[#2D9B94]/15">{h}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full max-w-[180px] rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/[0.06] p-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-[#FBBF24]" />
                <span className="text-xs font-medium text-muted-foreground">Credibility Score</span>
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-[#FBBF24]">{score}</p>
              <Progress value={Math.min(score, 100)} className="mt-2 h-1.5" />
              <p className="mt-2 text-[10px] leading-tight text-muted-foreground">
                Built from documented impact and peer endorsements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS entries */}
      <div>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold">
          <Target className="h-5 w-5 text-[#2ABFB0]" /> Documented Impact
        </h3>
        <div className="mt-4 space-y-4">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/[0.1] bg-black/[0.02] p-8 text-center text-sm text-muted-foreground">
              This member hasn&apos;t documented any GPS entries yet.
            </div>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="rounded-xl border border-black/[0.08] bg-black/[0.02] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{e.title}</h4>
                      <Badge variant="outline" className="text-xs">{ENTRY_TYPE_LABELS[e.entryType]}</Badge>
                      {e.endorsements.length > 0 && (
                        <Badge className="gap-1 bg-[#2D9B94]/15 text-[#2ABFB0] hover:bg-[#2D9B94]/15">
                          <BadgeCheck className="h-3 w-3" /> {e.endorsements.length} endorsed
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {e.organization && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {e.organization}</span>}
                      {e.geography && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.geography}</span>}
                      {e.healthArea && <span>{e.healthArea}</span>}
                      {(e.periodStart || e.periodEnd) && <span>{e.periodStart}{e.periodStart && e.periodEnd ? ' \u2013 ' : ''}{e.periodEnd}</span>}
                    </div>
                  </div>
                  {!isOwner && (
                    <Button
                      size="sm"
                      variant={e.viewerHasEndorsed ? 'outline' : 'default'}
                      disabled={e.viewerHasEndorsed}
                      onClick={() => setEndorseFor(e)}
                      className="shrink-0 gap-1.5"
                    >
                      {e.viewerHasEndorsed ? <><BadgeCheck className="h-4 w-4" /> Endorsed</> : <><Handshake className="h-4 w-4" /> Endorse</>}
                    </Button>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field icon={<Search className="h-3.5 w-3.5 text-[#F59E0B]" />} label="Gap" value={e.gap} />
                  <Field icon={<Wrench className="h-3.5 w-3.5 text-[#8B7FD4]" />} label="Solution" value={e.solution} />
                  <Field icon={<TrendingUp className="h-3.5 w-3.5 text-[#2ABFB0]" />} label="Measurable Outcome" value={e.outcome} />
                  {e.rootCause && <Field icon={<Target className="h-3.5 w-3.5 text-muted-foreground" />} label="Root Cause" value={e.rootCause} />}
                </div>
                {e.lessonsLearned && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-black/[0.03] p-3 text-xs text-muted-foreground">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FBBF24]" />
                    <span><span className="font-medium text-foreground">Lessons: </span>{e.lessonsLearned}</span>
                  </div>
                )}

                <EvidenceSection entryId={e.id} evidence={e.evidence ?? []} readOnly />

                <EndorsementsList endorsements={e.endorsements} />
              </div>
            ))
          )}
        </div>
      </div>

      {endorseFor && (
        <EndorseDialog
          entryId={endorseFor.id}
          entryTitle={endorseFor.title}
          memberName={member.name ?? 'this member'}
          open={!!endorseFor}
          onOpenChange={(v) => { if (!v) setEndorseFor(null); }}
          onEndorsed={(newScore, endorsement) => handleEndorsed(newScore, endorseFor.id, endorsement)}
        />
      )}
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/[0.06] bg-black/[0.02] p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon} {label}</p>
      <p className="mt-1 text-sm leading-relaxed">{value}</p>
    </div>
  );
}
