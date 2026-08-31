'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Megaphone, ArrowLeft, MapPin, Building2, Calendar as CalIcon, MessageSquare,
  Award, Target, Wrench, TrendingUp, Send, Trash2, Lock, Unlock, User as UserIcon,
} from 'lucide-react';

interface GpsEntryLite {
  id: string; title: string; gap: string; solution: string; outcome: string;
}
interface ResponseItem {
  id: string;
  message: string;
  createdAt: string;
  responder: { id: string; name: string | null; role: string | null; headline: string | null; credibilityScore: number };
  gpsEntry: GpsEntryLite | null;
}
interface BriefData {
  id: string; title: string; organization: string | null; healthArea: string | null;
  geography: string | null; problem: string; lookingFor: string; deadline: string | null;
  status: 'OPEN' | 'CLOSED'; createdAt: string; author: { id: string; name: string | null };
}
interface Payload {
  brief: BriefData;
  isAuthor: boolean;
  responseCount: number;
  viewerHasResponded: boolean;
  viewerResponse: { id: string; message: string; gpsEntryId: string | null; createdAt: string } | null;
  responses: ResponseItem[];
}
interface MyGpsEntry { id: string; title: string; }

const ROLE_LABELS: Record<string, string> = {
  PATIENT: 'Patient', PRACTITIONER: 'Health Practitioner', INNOVATOR: 'Innovator', INVESTOR: 'Investor',
};

export function ChallengeDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [respondOpen, setRespondOpen] = useState(false);
  const [myEntries, setMyEntries] = useState<MyGpsEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/challenges/${id}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Failed to load brief', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openRespond = async () => {
    setRespondOpen(true);
    try {
      const res = await fetch('/api/gps-entries');
      if (res.ok) {
        const entries = await res.json();
        setMyEntries((entries ?? []).map((e: any) => ({ id: e.id, title: e.title })));
      }
    } catch (e) {
      console.error('Failed to load GPS entries', e);
    }
  };

  const submitResponse = async () => {
    if (!message.trim()) { toast.error('Please add a short message.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/challenges/${id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, gpsEntryId: selectedEntry || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Failed to respond');
      toast.success('Your response has been sent.');
      setRespondOpen(false); setMessage(''); setSelectedEntry('');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/challenges/${id}/responses`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to withdraw');
      toast.success('Response withdrawn.');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    if (!data) return;
    const next = data.brief.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    setBusy(true);
    try {
      const res = await fetch(`/api/challenges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(next === 'CLOSED' ? 'Brief closed.' : 'Brief reopened.');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const deleteBrief = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Brief deleted.');
      router.push('/dashboard/challenges');
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong.');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/challenges" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#1A2332]">
          <ArrowLeft className="h-4 w-4" /> Back to Challenge Briefs
        </Link>
        <div className="rounded-xl border border-dashed border-black/[0.1] bg-black/[0.02] p-10 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">This brief could not be found</p>
          <p className="mt-1 text-sm text-muted-foreground">It may have been removed by its author.</p>
        </div>
      </div>
    );
  }

  const { brief, isAuthor, responses, viewerHasResponded, viewerResponse } = data;
  const canRespond = !isAuthor && brief.status === 'OPEN' && !viewerHasResponded;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/challenges" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#1A2332]">
        <ArrowLeft className="h-4 w-4" /> Back to Challenge Briefs
      </Link>

      {/* Brief */}
      <Card className="border-black/[0.08]">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold">{brief.title}</h2>
                <Badge variant={brief.status === 'OPEN' ? 'default' : 'secondary'}
                  className={brief.status === 'OPEN'
                    ? 'bg-[#2ABFB0]/15 text-[#2ABFB0] hover:bg-[#2ABFB0]/15'
                    : 'bg-black/[0.06] text-muted-foreground'}>
                  {brief.status === 'OPEN' ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {brief.organization && (
                  <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {brief.organization}</span>
                )}
                {brief.geography && (
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {brief.geography}</span>
                )}
                {brief.deadline && (
                  <span className="flex items-center gap-1"><CalIcon className="h-4 w-4" /> Deadline: {brief.deadline}</span>
                )}
              </div>
            </div>
            {brief.healthArea && (
              <Badge variant="outline" className="border-[#8B7FD4]/40 text-[#b3a9ef]">{brief.healthArea}</Badge>
            )}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2ABFB0]">The Problem</p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-[#1A2332]">{brief.problem}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F59E0B]">What they&apos;re looking for</p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-[#1A2332]">{brief.lookingFor}</p>
            </div>
          </div>

          {!isAuthor && (
            <p className="mt-5 text-xs text-muted-foreground">Posted by {brief.author?.name ?? 'a member'}</p>
          )}

          {/* Author controls */}
          {isAuthor && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-black/[0.08] pt-5">
              <Button variant="outline" size="sm" onClick={toggleStatus} disabled={busy} className="gap-1.5">
                {brief.status === 'OPEN' ? <><Lock className="h-3.5 w-3.5" /> Close brief</> : <><Unlock className="h-3.5 w-3.5" /> Reopen brief</>}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={busy}
                    className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this brief?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the brief and all {responses.length} response(s). This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteBrief} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Respond CTA */}
          {canRespond && (
            <div className="mt-6 border-t border-black/[0.08] pt-5">
              <Dialog open={respondOpen} onOpenChange={(o) => (o ? openRespond() : setRespondOpen(false))}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-[#2ABFB0] text-[#04121a] hover:bg-[#2ABFB0]/90">
                    <Send className="h-4 w-4" /> Respond to this brief
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-display">Respond to &ldquo;{brief.title}&rdquo;</DialogTitle>
                    <DialogDescription>
                      Attach one of your GPS entries as proof of relevant impact, and add a short message.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-1">
                    <div className="space-y-1.5">
                      <Label>Attach a GPS entry (optional)</Label>
                      <Select value={selectedEntry || '__none__'}
                        onValueChange={(v) => setSelectedEntry(v === '__none__' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Select an entry" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Don&apos;t attach one</SelectItem>
                          {myEntries.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {myEntries.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          You have no GPS entries yet. You can still respond with a message, or add entries from your Profile.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="r-msg">Your message <span className="text-red-400">*</span></Label>
                      <Textarea id="r-msg" rows={4} value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Explain briefly how your experience fits this challenge." />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setRespondOpen(false)}>Cancel</Button>
                    <Button onClick={submitResponse} disabled={submitting}
                      className="bg-[#2ABFB0] text-[#04121a] hover:bg-[#2ABFB0]/90">
                      {submitting ? 'Sending\u2026' : 'Send response'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {!isAuthor && brief.status === 'CLOSED' && !viewerHasResponded && (
            <p className="mt-6 border-t border-black/[0.08] pt-5 text-sm text-muted-foreground">
              This brief is closed and no longer accepting responses.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Viewer's own submitted response */}
      {!isAuthor && viewerHasResponded && viewerResponse && (
        <Card className="border-[#2ABFB0]/25 bg-[#2ABFB0]/[0.04]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2ABFB0]">Your response</p>
                <p className="mt-1.5 whitespace-pre-line text-sm text-[#1A2332]">{viewerResponse.message}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={withdraw} disabled={busy}
                className="gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                <Trash2 className="h-3.5 w-3.5" /> Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Responses (author only) */}
      {isAuthor && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
            <MessageSquare className="h-5 w-5 text-[#2ABFB0]" />
            Responses <span className="text-muted-foreground">({responses.length})</span>
          </h3>
          {responses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/[0.1] bg-black/[0.02] p-8 text-center">
              <p className="text-sm text-muted-foreground">No responses yet. They&apos;ll appear here as members reply.</p>
            </div>
          ) : (
            responses.map((r) => (
              <Card key={r.id} className="border-black/[0.08]">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/dashboard/members/${r.responder.id}`}
                        className="flex items-center gap-2 font-medium hover:text-[#2ABFB0]">
                        <UserIcon className="h-4 w-4" /> {r.responder.name ?? 'Member'}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {r.responder.role && (
                          <Badge variant="outline" className="border-black/[0.1]">{ROLE_LABELS[r.responder.role] ?? r.responder.role}</Badge>
                        )}
                        <span className="flex items-center gap-1">
                          <Award className="h-3.5 w-3.5 text-[#F59E0B]" /> Credibility {r.responder.credibilityScore}
                        </span>
                      </div>
                      {r.responder.headline && (
                        <p className="mt-1 text-xs text-muted-foreground">{r.responder.headline}</p>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm text-[#1A2332]">{r.message}</p>

                  {r.gpsEntry && (
                    <div className="mt-4 rounded-lg border border-black/[0.08] bg-black/[0.02] p-4">
                      <p className="text-xs font-semibold text-[#2ABFB0]">Attached GPS entry</p>
                      <p className="mt-1 font-medium">{r.gpsEntry.title}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#DC2626]"><Target className="h-3.5 w-3.5" /> Gap</p>
                          <p className="mt-1 line-clamp-4 text-xs text-muted-foreground">{r.gpsEntry.gap}</p>
                        </div>
                        <div>
                          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#F59E0B]"><Wrench className="h-3.5 w-3.5" /> Solution</p>
                          <p className="mt-1 line-clamp-4 text-xs text-muted-foreground">{r.gpsEntry.solution}</p>
                        </div>
                        <div>
                          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#2ABFB0]"><TrendingUp className="h-3.5 w-3.5" /> Outcome</p>
                          <p className="mt-1 line-clamp-4 text-xs text-muted-foreground">{r.gpsEntry.outcome}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
