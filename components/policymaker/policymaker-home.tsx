'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Landmark, ShieldAlert, MessagesSquare, Star, ArrowRight,
  Activity, BookOpen, AlertTriangle,
} from 'lucide-react';
import { tierLabel } from '@/lib/access';

const SEVERITY_COLOR: Record<string, string> = {
  MILD: 'bg-[#2D9B94]/20 text-[#2ABFB0]',
  MODERATE: 'bg-[#F59E0B]/20 text-[#FBBF24]',
  SEVERE: 'bg-[#DC2626]/20 text-[#F87171]',
  LIFE_THREATENING: 'bg-[#DC2626]/30 text-[#F87171]',
};

export function PolicymakerHome() {
  const [loading, setLoading] = useState(true);
  const [adr, setAdr] = useState<{ reports: any[]; total: number }>({ reports: [], total: 0 });
  const [feedback, setFeedback] = useState<{ total: number }>({ total: 0 });
  const [openCalls, setOpenCalls] = useState<number>(0);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, fRes, cRes, pRes] = await Promise.all([
          fetch('/api/safety/drug-report?page=1'),
          fetch('/api/safety/product-feedback?page=1'),
          fetch('/api/challenges?status=OPEN'),
          fetch('/api/profile'),
        ]);
        if (aRes.ok) setAdr(await aRes.json());
        if (fRes.ok) setFeedback(await fRes.json());
        if (cRes.ok) { const c = await cRes.json(); setOpenCalls(Array.isArray(c) ? c.length : 0); }
        if (pRes.ok) setProfile(await pRes.json());
      } catch (e: any) {
        console.error('Failed to load policy overview:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const orgName = profile?.organization || profile?.name || 'Policy Watch';

  const stats = [
    { label: 'Adverse Drug Reports', value: adr.total, icon: AlertTriangle, href: '/policymaker/safety' },
    { label: 'Product Feedback Signals', value: feedback.total, icon: Star, href: '/policymaker/safety' },
    { label: 'Open Calls & Debates', value: openCalls, icon: MessagesSquare, href: '/policymaker/debates' },
  ];

  const links = [
    { href: '/safety', label: 'Safety & Feedback Hub', desc: 'The full pharmacovigilance reporting hub.', icon: ShieldAlert },
    { href: '/policymaker/debates', label: 'Open Calls & Debates', desc: 'Innovation briefs and open challenges.', icon: MessagesSquare },
    { href: '/about', label: 'About the Ecosystem', desc: 'How PAX connects the health innovation network.', icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-black/[0.08] bg-gradient-to-br from-[#E8F3F1] to-[#F1EEE8]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#8B7FD4]/15 text-[#8B7FD4]">
              <Landmark className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#1A2332]">{orgName}</h2>
              <p className="text-sm text-muted-foreground">
                {profile?.headline || 'Policymaker / Government'}
                {profile?.location ? ` \u00b7 ${profile.location}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {profile?.paxId && (
                  <Badge variant="outline" className="border-black/[0.1] text-xs">{profile.paxId}</Badge>
                )}
                {profile?.tier && (
                  <Badge className="bg-[#F59E0B]/15 text-[#FBBF24] hover:bg-[#F59E0B]/15">{tierLabel(profile.tier)}</Badge>
                )}
              </div>
            </div>
          </div>
          <Button asChild variant="outline" className="border-[#8B7FD4]/40 text-[#8B7FD4] hover:bg-[#8B7FD4]/10">
            <Link href="/policymaker/safety">
              <Activity className="mr-2 h-4 w-4" /> View Safety Signals
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="h-full border-black/[0.08] transition-colors hover:border-[#8B7FD4]/40">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#8B7FD4]/15 text-[#8B7FD4]">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[#1A2332]">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent safety signals */}
      <Card className="border-black/[0.08]">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-[#1A2332]">Recent Safety Signals</h3>
            <Button asChild variant="ghost" size="sm" className="text-[#8B7FD4]">
              <Link href="/policymaker/safety">View all</Link>
            </Button>
          </div>
          {adr.reports.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/[0.08] p-8 text-center">
              <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No adverse drug reports on record yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {adr.reports.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-black/[0.06] bg-black/[0.02] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1A2332]">{r.drugName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.sideEffects} · {r.province || r.country}
                    </p>
                  </div>
                  <Badge className={`${SEVERITY_COLOR[r.severity] || 'bg-black/[0.06] text-[#1A2332]'} hover:opacity-100`}>
                    {String(r.severity).replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        {links.map((a) => (
          <Link key={a.href} href={a.href}>
            <Card className="group h-full border-black/[0.08] transition-colors hover:border-[#8B7FD4]/40">
              <CardContent className="p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B7FD4]/15 text-[#8B7FD4]">
                  <a.icon className="h-5 w-5" />
                </div>
                <p className="flex items-center gap-1 font-medium text-[#1A2332]">
                  {a.label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
