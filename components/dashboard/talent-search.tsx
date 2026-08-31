'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Award, Search, MapPin, ArrowRight, Briefcase, Filter, X,
  Building2, BadgeCheck, Target, Wrench, TrendingUp,
} from 'lucide-react';
import { ENTRY_TYPE_LABELS, type GpsEntryType } from '@/lib/gps';

interface MatchingEntry {
  id: string;
  title: string;
  entryType: GpsEntryType;
  healthArea: string | null;
  geography: string | null;
  gap: string;
  solution: string;
  outcome: string;
  endorsementCount: number;
}
interface SearchResult {
  id: string;
  name: string | null;
  role: string | null;
  headline: string | null;
  location: string | null;
  organization: string | null;
  credibilityScore: number;
  totalEntries: number;
  matchingEntries: MatchingEntry[];
}

const ROLE_LABELS: Record<string, string> = {
  PATIENT: 'Patient',
  PRACTITIONER: 'Health Practitioner',
  INNOVATOR: 'Innovator',
  INVESTOR: 'Investor',
};
const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }));

export function TalentSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [healthArea, setHealthArea] = useState('');
  const [location, setLocation] = useState('');
  const [role, setRole] = useState('');
  const [minScore, setMinScore] = useState('');
  const [availableHealthAreas, setAvailableHealthAreas] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set('q', keyword.trim());
      if (healthArea) params.set('healthArea', healthArea);
      if (location) params.set('location', location);
      if (role) params.set('role', role);
      if (minScore) params.set('minScore', minScore);

      const res = await fetch(`/api/talent-search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
        if (data.filters) {
          setAvailableHealthAreas(data.filters.healthAreas ?? []);
          setAvailableLocations(data.filters.locations ?? []);
        }
      }
    } catch (e) {
      console.error('Talent search failed', e);
    } finally {
      setLoading(false);
    }
  }, [keyword, healthArea, location, role, minScore]);

  // Initial load + debounced search on filter change
  useEffect(() => {
    const t = setTimeout(fetchResults, 400);
    return () => clearTimeout(t);
  }, [fetchResults]);

  const hasFilters = keyword || healthArea || location || role || minScore;

  const clearFilters = () => {
    setKeyword('');
    setHealthArea('');
    setLocation('');
    setRole('');
    setMinScore('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Briefcase className="h-6 w-6 text-[#2ABFB0]" /> Talent Search
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Find practitioners and innovators by the problems they&apos;ve solved &mdash; not just
          where they&apos;ve worked. Every result is backed by documented GPS entries and peer
          endorsements.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-black/[0.08]">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-[#2ABFB0]" />
            <span className="text-sm font-medium">Search & Filter</span>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto gap-1 text-xs">
                <X className="h-3 w-3" /> Clear all
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label className="text-xs">Keyword</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. malaria, ANC uptake, snakebite"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Health Area</Label>
              <Select value={healthArea} onValueChange={(v) => setHealthArea(v === '__all__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All areas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All areas</SelectItem>
                  {availableHealthAreas.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v === '__all__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All roles</SelectItem>
                  {ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min. Score</Label>
              <Input
                value={minScore}
                onChange={(e) => setMinScore(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 30"
                type="text"
                inputMode="numeric"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/[0.1] bg-black/[0.02] p-10 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No matching talent found</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {hasFilters ? 'Try broadening your search or adjusting the filters.' : 'Members will appear here as they document their impact.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? 'member' : 'members'} found
          </p>
          {results.map((m) => {
            const isExpanded = expandedMember === m.id;
            return (
              <Card key={m.id} className="border-black/[0.08] transition-colors hover:border-[#2D9B94]/30">
                <CardContent className="p-5">
                  {/* Member header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{m.name ?? 'PAX Member'}</h3>
                        {m.role && (
                          <Badge variant="outline" className="text-xs">
                            {ROLE_LABELS[m.role] ?? m.role}
                          </Badge>
                        )}
                      </div>
                      {m.headline && (
                        <p className="mt-1 text-sm text-muted-foreground">{m.headline}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {m.organization && (
                          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {m.organization}</span>
                        )}
                        {m.location && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.location}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" /> {m.totalEntries} GPS {m.totalEntries === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 rounded-lg bg-[#F59E0B]/10 px-2.5 py-1.5">
                        <Award className="h-4 w-4 text-[#FBBF24]" />
                        <span className="text-sm font-bold text-[#FBBF24]">{m.credibilityScore}</span>
                      </div>
                      <Link href={`/dashboard/members/${m.id}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          View profile <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Matching entries preview */}
                  {m.matchingEntries.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => setExpandedMember(isExpanded ? null : m.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#2ABFB0] hover:underline"
                      >
                        <Target className="h-3.5 w-3.5" />
                        {isExpanded ? 'Hide' : 'Show'} {m.matchingEntries.length} matching {m.matchingEntries.length === 1 ? 'entry' : 'entries'}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          {m.matchingEntries.map((e) => (
                            <div key={e.id} className="rounded-lg border border-black/[0.08] bg-black/[0.02] p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-semibold">{e.title}</h4>
                                <Badge variant="outline" className="text-[10px]">
                                  {ENTRY_TYPE_LABELS[e.entryType]}
                                </Badge>
                                {e.endorsementCount > 0 && (
                                  <Badge className="gap-1 bg-[#2D9B94]/15 text-[10px] text-[#2ABFB0] hover:bg-[#2D9B94]/15">
                                    <BadgeCheck className="h-3 w-3" /> {e.endorsementCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                {e.healthArea && <span>{e.healthArea}</span>}
                                {e.geography && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {e.geography}</span>}
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                <MiniField icon={<Search className="h-3 w-3 text-[#F59E0B]" />} label="Gap" value={e.gap} />
                                <MiniField icon={<Wrench className="h-3 w-3 text-[#8B7FD4]" />} label="Solution" value={e.solution} />
                                <MiniField icon={<TrendingUp className="h-3 w-3 text-[#2ABFB0]" />} label="Outcome" value={e.outcome} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-black/[0.02] p-2">
      <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">{icon} {label}</p>
      <p className="mt-0.5 text-xs leading-relaxed line-clamp-3">{value}</p>
    </div>
  );
}
