'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Search, MapPin, ArrowRight, Users2, FileText } from 'lucide-react';

interface Member {
  id: string;
  name: string | null;
  role: string | null;
  headline: string | null;
  location: string | null;
  organization: string | null;
  healthAreas: string[];
  credibilityScore: number;
  entryCount: number;
}

const ROLE_LABELS: Record<string, string> = {
  PATIENT: 'Patient',
  PRACTITIONER: 'Health Practitioner',
  INNOVATOR: 'Innovator',
  INVESTOR: 'Investor',
  ADMIN: 'Admin',
};

export function MembersDirectory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/members');
        if (res.ok) setMembers((await res.json()) ?? []);
      } catch (e) {
        console.error('Failed to load members', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const hay = [
        m.name,
        m.headline,
        m.location,
        m.organization,
        ...(m.healthAreas ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [members, query]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Users2 className="h-6 w-6 text-[#2ABFB0]" /> Members
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Discover practitioners and innovators by the impact they&apos;ve documented. Every profile
          is built on real GPS entries &mdash; gaps identified, solutions designed and measurable
          outcomes &mdash; verified by peer endorsements.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, health area or location"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-52 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/[0.1] bg-black/[0.02] p-10 text-center">
          <Users2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No members found</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {query ? 'Try a different search term.' : 'As members document their impact, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link key={m.id} href={`/dashboard/members/${m.id}`} className="group">
              <Card className="h-full border-black/[0.08] transition-colors hover:border-[#2D9B94]/40">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{m.name ?? 'PAX Member'}</h3>
                      {m.role && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {ROLE_LABELS[m.role] ?? m.role}
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-lg bg-[#F59E0B]/10 px-2 py-1">
                      <Award className="h-3.5 w-3.5 text-[#FBBF24]" />
                      <span className="text-sm font-bold text-[#FBBF24]">{m.credibilityScore}</span>
                    </div>
                  </div>

                  {m.headline && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{m.headline}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {m.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {m.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {m.entryCount} GPS {m.entryCount === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>

                  {m.healthAreas?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {m.healthAreas.slice(0, 3).map((h) => (
                        <Badge key={h} className="bg-[#2D9B94]/15 text-[10px] text-[#2ABFB0] hover:bg-[#2D9B94]/15">
                          {h}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-4">
                    <div className="mb-3">
                      <Progress value={Math.min(m.credibilityScore, 100)} className="h-1.5" />
                    </div>
                    <span className="flex items-center gap-1 text-sm font-medium text-[#2ABFB0] group-hover:gap-2 transition-all">
                      View profile <ArrowRight className="h-4 w-4" />
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
