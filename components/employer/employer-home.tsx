'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Megaphone, Users, UserCircle, Briefcase, MessageSquare, ArrowRight } from 'lucide-react';
import { tierLabel } from '@/lib/access';

interface Profile {
  name: string;
  organization: string | null;
  headline: string | null;
  location: string | null;
  paxId: string | null;
}

interface Brief {
  id: string;
  title: string;
  status: string;
  _count: { applications: number };
  createdAt: string;
}

export function EmployerHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [tier, setTier] = useState<string>('TIER1_BASIC');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, bRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/jobs?mine=1'),
        ]);
        if (pRes.ok) {
          const p = await pRes.json();
          setProfile(p);
          if (p?.tier) setTier(p.tier);
        }
        if (bRes.ok) setBriefs((await bRes.json()).jobs || []);
      } catch {
        console.error('Failed to load employer overview');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openCount = briefs.filter((b) => b.status === 'PUBLISHED').length;
  const totalResponses = briefs.reduce((s, b) => s + (b._count?.applications || 0), 0);

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

  const orgName = profile?.organization || profile?.name || 'Your Organisation';

  const stats = [
    { label: 'Open Roles', value: openCount, icon: Megaphone },
    { label: 'Total Roles Posted', value: briefs.length, icon: Briefcase },
    { label: 'Responses Received', value: totalResponses, icon: MessageSquare },
  ];

  const actions = [
    { href: '/employer/roles', label: 'Post a Role', desc: 'Publish an opening, brief or open call.', icon: Megaphone },
    { href: '/employer/talent', label: 'Browse Talent', desc: 'Find members by problems they have solved.', icon: Users },
    { href: '/employer/profile', label: 'Organisation Profile', desc: 'Update your public profile and details.', icon: UserCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Org header */}
      <Card className="border-black/[0.08] bg-gradient-to-br from-[#E8F3F1] to-[#F1EEE8]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#2D9B94]/15 text-[#2ABFB0]">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#1A2332]">{orgName}</h2>
              <p className="text-sm text-muted-foreground">
                {profile?.headline || 'Employer / Organisation'}
                {profile?.location ? ` \u00b7 ${profile.location}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {profile?.paxId && (
                  <Badge variant="outline" className="border-black/[0.1] text-xs">{profile.paxId}</Badge>
                )}
                <Badge className="bg-[#F59E0B]/15 text-[#FBBF24] hover:bg-[#F59E0B]/15">{tierLabel(tier as any)}</Badge>
              </div>
            </div>
          </div>
          <Button asChild className="bg-[#2D9B94] hover:bg-[#2ABFB0]">
            <Link href="/employer/roles">
              <Megaphone className="mr-2 h-4 w-4" /> Post a Role
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-black/[0.08]">
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
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href}>
            <Card className="group h-full border-black/[0.08] transition-colors hover:border-[#2ABFB0]/40">
              <CardContent className="p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#2D9B94]/15 text-[#2ABFB0]">
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

      {/* Recent roles */}
      <Card className="border-black/[0.08]">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-[#1A2332]">Your Recent Roles</h3>
            <Button asChild variant="ghost" size="sm" className="text-[#2ABFB0]">
              <Link href="/employer/roles">Manage all</Link>
            </Button>
          </div>
          {briefs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/[0.08] p-8 text-center">
              <Megaphone className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You haven&apos;t posted any roles yet. Post your first role to reach verified talent.
              </p>
              <Button asChild className="mt-4 bg-[#2D9B94] hover:bg-[#2ABFB0]">
                <Link href="/employer/roles">Post a Role</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {briefs.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-black/[0.06] bg-black/[0.02] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1A2332]">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b._count?.applications || 0} application{b._count?.applications === 1 ? '' : 's'}</p>
                  </div>
                  <Badge variant={b.status === 'PUBLISHED' ? 'default' : 'secondary'} className={b.status === 'PUBLISHED' ? 'bg-primary/20 text-primary hover:bg-primary/20' : ''}>
                    {b.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
