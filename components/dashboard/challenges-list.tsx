'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import {
  Megaphone, Search, MapPin, ArrowRight, Plus, MessageSquare, Building2, Calendar as CalIcon, Filter, X,
} from 'lucide-react';
import { HEALTH_AREAS } from '@/lib/gps';

interface Brief {
  id: string;
  title: string;
  organization: string | null;
  healthArea: string | null;
  geography: string | null;
  problem: string;
  lookingFor: string;
  deadline: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  author: { id: string; name: string | null };
  responseCount: number;
  isAuthor: boolean;
}

type Scope = 'OPEN' | 'CLOSED' | 'MINE';

const emptyForm = {
  title: '', organization: '', healthArea: '', geography: '', problem: '', lookingFor: '', deadline: '',
};

export function ChallengesList() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('OPEN');
  const [healthArea, setHealthArea] = useState('');
  const [keyword, setKeyword] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchBriefs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (scope === 'MINE') params.set('mine', '1');
      else params.set('status', scope);
      if (healthArea) params.set('healthArea', healthArea);
      if (keyword.trim()) params.set('q', keyword.trim());
      const res = await fetch(`/api/challenges?${params.toString()}`);
      if (res.ok) setBriefs(await res.json());
      else setBriefs([]);
    } catch (e) {
      console.error('Failed to load briefs', e);
      setBriefs([]);
    } finally {
      setLoading(false);
    }
  }, [scope, healthArea, keyword]);

  useEffect(() => {
    const t = setTimeout(fetchBriefs, 350);
    return () => clearTimeout(t);
  }, [fetchBriefs]);

  const submitBrief = async () => {
    if (!form.title.trim() || !form.problem.trim() || !form.lookingFor.trim()) {
      toast.error('Please fill in the title, the problem, and what you are looking for.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to post brief');
      toast.success('Your Challenge Brief is now live.');
      setDialogOpen(false);
      setForm(emptyForm);
      setScope('MINE');
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasFilters = healthArea || keyword;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Megaphone className="h-6 w-6 text-[#2ABFB0]" /> Challenge Briefs
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Post a real problem your organisation is facing &mdash; innovators and practitioners
            respond with the impact they&apos;ve already documented. Turn open challenges into
            evidence-backed collaborations.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#2ABFB0] text-[#04121a] hover:bg-[#2ABFB0]/90">
              <Plus className="h-4 w-4" /> Post a Brief
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Post a Challenge Brief</DialogTitle>
              <DialogDescription>
                Describe the problem clearly. The more specific the gap, the stronger the responses.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="c-title">Title <span className="text-red-400">*</span></Label>
                <Input id="c-title" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Reduce newborn deaths in rural clinics" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="c-org">Organisation</Label>
                  <Input id="c-org" value={form.organization}
                    onChange={(e) => setForm({ ...form, organization: e.target.value })}
                    placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Health Area</Label>
                  <Select value={form.healthArea || '__none__'}
                    onValueChange={(v) => setForm({ ...form, healthArea: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not specified</SelectItem>
                      {HEALTH_AREAS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-geo">Geography</Label>
                  <Input id="c-geo" value={form.geography}
                    onChange={(e) => setForm({ ...form, geography: e.target.value })}
                    placeholder="e.g. Western Kenya" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-deadline">Deadline</Label>
                  <Input id="c-deadline" value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    placeholder="e.g. 30 Sep 2026" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-problem">The problem <span className="text-red-400">*</span></Label>
                <Textarea id="c-problem" value={form.problem} rows={4}
                  onChange={(e) => setForm({ ...form, problem: e.target.value })}
                  placeholder="What is the gap or challenge you need solved? Be specific about the context and who is affected." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-looking">What you&apos;re looking for <span className="text-red-400">*</span></Label>
                <Textarea id="c-looking" value={form.lookingFor} rows={3}
                  onChange={(e) => setForm({ ...form, lookingFor: e.target.value })}
                  placeholder="The kind of person, solution, or proven experience you want to hear from." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={submitBrief} disabled={submitting}
                className="bg-[#2ABFB0] text-[#04121a] hover:bg-[#2ABFB0]/90">
                {submitting ? 'Posting\u2026' : 'Post Brief'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scope tabs + filters */}
      <Card className="border-black/[0.08]">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(['OPEN', 'CLOSED', 'MINE'] as Scope[]).map((s) => (
              <Button key={s} size="sm" variant={scope === s ? 'default' : 'outline'}
                onClick={() => setScope(s)}
                className={scope === s ? 'bg-[#2ABFB0] text-[#04121a] hover:bg-[#2ABFB0]/90' : ''}>
                {s === 'OPEN' ? 'Open' : s === 'CLOSED' ? 'Closed' : 'My Briefs'}
              </Button>
            ))}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setHealthArea(''); setKeyword(''); }}
                className="ml-auto gap-1 text-xs">
                <X className="h-3 w-3" /> Clear filters
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Keyword</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. cold chain, maternal, diagnostics" className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Health Area</Label>
              <Select value={healthArea || '__all__'}
                onValueChange={(v) => setHealthArea(v === '__all__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All areas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All areas</SelectItem>
                  {HEALTH_AREAS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : briefs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/[0.1] bg-black/[0.02] p-10 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">
            {scope === 'MINE' ? "You haven't posted any briefs yet" : 'No briefs here yet'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {scope === 'MINE'
              ? 'Post a challenge to invite evidence-backed responses from the network.'
              : hasFilters
                ? 'Try broadening your search or adjusting the filters.'
                : 'Be the first to post a real problem for the community to solve.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {briefs.length} {briefs.length === 1 ? 'brief' : 'briefs'}
          </p>
          {briefs.map((b) => (
            <Link key={b.id} href={`/dashboard/challenges/${b.id}`} className="block">
              <Card className="border-black/[0.08] transition-colors hover:border-[#2D9B94]/40">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold">{b.title}</h3>
                        <Badge variant={b.status === 'OPEN' ? 'default' : 'secondary'}
                          className={b.status === 'OPEN'
                            ? 'bg-[#2ABFB0]/15 text-[#2ABFB0] hover:bg-[#2ABFB0]/15'
                            : 'bg-black/[0.06] text-muted-foreground'}>
                          {b.status === 'OPEN' ? 'Open' : 'Closed'}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {b.organization && (
                          <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {b.organization}</span>
                        )}
                        {b.geography && (
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {b.geography}</span>
                        )}
                        {b.deadline && (
                          <span className="flex items-center gap-1"><CalIcon className="h-3.5 w-3.5" /> {b.deadline}</span>
                        )}
                      </div>
                    </div>
                    {b.healthArea && (
                      <Badge variant="outline" className="border-[#8B7FD4]/40 text-[#b3a9ef]">{b.healthArea}</Badge>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{b.problem}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {b.isAuthor
                        ? `${b.responseCount} ${b.responseCount === 1 ? 'response' : 'responses'}`
                        : `Posted by ${b.author?.name ?? 'a member'}`}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-medium text-[#2ABFB0]">
                      View <ArrowRight className="h-4 w-4" />
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
