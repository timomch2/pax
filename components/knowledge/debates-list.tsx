'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, PlusCircle, MessagesSquare, Scale } from 'lucide-react';
import { DEBATE_TYPES, canInitiate } from '@/lib/debate';
import { DebateCard, type DebateListItem } from '@/components/knowledge/debate-card';

type StatusFilter = 'open' | 'all' | 'PUBLISHED';

export function DebatesList({ tier }: { tier: string | null }) {
  const [debates, setDebates] = useState<DebateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>('');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [q, setQ] = useState('');

  const fetchDebates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (status === 'open') params.set('status', 'open');
      else if (status === 'PUBLISHED') params.set('status', 'PUBLISHED');
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/debates?${params.toString()}`);
      const data = res.ok ? await res.json() : { debates: [] };
      setDebates(data.debates ?? []);
    } catch (e) {
      console.error('Failed to load debates', e);
      setDebates([]);
    } finally {
      setLoading(false);
    }
  }, [type, status, q]);

  useEffect(() => {
    const t = setTimeout(fetchDebates, 300);
    return () => clearTimeout(t);
  }, [fetchDebates]);

  const featured = debates.filter((d) => d.featured);
  const rest = debates.filter((d) => !d.featured);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-2xl border border-black/[0.08] bg-gradient-to-br from-[#E8F3F1] to-[#F1EEE8] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#2ABFB0]/30 bg-[#2ABFB0]/10 px-3 py-1 text-[11px] font-medium text-[#2ABFB0]">
              <Scale className="h-3.5 w-3.5" /> Qualitative Evidence Engine
            </div>
            <h2 className="font-display text-2xl font-semibold">The Debate Hub</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Structured, moderated debates that turn frontline experience into citable
              evidence — stress-testing policies, studies and innovations against the
              reality of frontline health settings.
            </p>
          </div>
          {canInitiate(tier) && (
            <Button asChild className="hidden shrink-0 gap-2 sm:inline-flex">
              <Link href="/knowledge/start">
                <PlusCircle className="h-4 w-4" /> Start a Debate
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Type chips */}
      <div className="grid gap-3 sm:grid-cols-3">
        {DEBATE_TYPES.map((t) => {
          const active = type === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setType(active ? '' : t.value)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active ? t.accent : 'border-black/[0.08] bg-white hover:border-black/[0.12]'
              }`}
            >
              <div className="text-sm font-semibold" style={{ color: t.hex }}>
                {t.label}
              </div>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{t.tagline}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search debates…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-black/[0.08] bg-white p-1">
          {([['open', 'Open'], ['PUBLISHED', 'Published'], ['all', 'All']] as [StatusFilter, string][]).map(
            ([v, label]) => (
              <button
                key={v}
                onClick={() => setStatus(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === v ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : debates.length === 0 ? (
        <Card className="border-black/[0.08] bg-white">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <MessagesSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No debates match your filters yet.</p>
            {canInitiate(tier) && (
              <Button asChild size="sm" className="gap-2">
                <Link href="/knowledge/start">
                  <PlusCircle className="h-4 w-4" /> Start the first one
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {featured.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#FBBF24]">Featured</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {featured.map((d) => (
                  <DebateCard key={d.id} d={d} />
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((d) => (
              <DebateCard key={d.id} d={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
