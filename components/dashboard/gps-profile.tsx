'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Target, Plus, Pencil, Trash2, Save, Sparkles, MapPin, Building2,
  Search, Wrench, TrendingUp, Lightbulb, BadgeCheck, Handshake,
} from 'lucide-react';
import { EndorsementsList } from '@/components/dashboard/endorsements-list';
import { RequestEndorsementDialog } from '@/components/dashboard/request-endorsement-dialog';
import { EvidenceSection, type Evidence } from '@/components/dashboard/evidence-section';
import { toast } from 'sonner';
import {
  ENTRY_TYPE_OPTIONS, ENTRY_TYPE_LABELS, entryCompleteness,
  type GpsEntryType, type GpsEndorserType,
} from '@/lib/gps';

interface Endorsement { id: string; endorserType: GpsEndorserType; comment: string | null; createdAt: string; endorser?: { id: string; name: string | null } | null }
interface GpsEntry {
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
}

const EMPTY = {
  title: '', organization: '', entryType: 'FORMAL_ROLE' as GpsEntryType, healthArea: '',
  geography: '', periodStart: '', periodEnd: '', gap: '', rootCause: '', solution: '',
  outcome: '', lessonsLearned: '',
};

const HEALTH_AREAS = [
  'Maternal & Child Health', 'Infectious Disease', 'Mental Health', 'Nutrition',
  'WASH', 'Non-Communicable Disease', 'Health Systems', 'Community Health',
  'Sexual & Reproductive Health', 'Health Financing', 'Other',
];

export function GpsProfile({ onScoreChange }: { onScoreChange?: (score: number) => void }) {
  const [entries, setEntries] = useState<GpsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [requestFor, setRequestFor] = useState<GpsEntry | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/gps-entries');
      if (res.ok) setEntries((await res.json()) ?? []);
    } catch (e) {
      console.error('Failed to load GPS entries', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const openNew = () => { setEditingId(null); setForm({ ...EMPTY }); setOpen(true); };
  const openEdit = (e: GpsEntry) => {
    setEditingId(e.id);
    setForm({
      title: e.title, organization: e.organization ?? '', entryType: e.entryType,
      healthArea: e.healthArea ?? '', geography: e.geography ?? '',
      periodStart: e.periodStart ?? '', periodEnd: e.periodEnd ?? '',
      gap: e.gap, rootCause: e.rootCause ?? '', solution: e.solution,
      outcome: e.outcome, lessonsLearned: e.lessonsLearned ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.gap.trim() || !form.solution.trim() || !form.outcome.trim()) {
      toast.error('Title, Gap, Solution and Outcome are required.');
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/gps-entries/${editingId}` : '/api/gps-entries';
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Failed to save'); return; }
      toast.success(editingId ? 'GPS entry updated' : 'GPS entry added');
      if (typeof data?.credibilityScore === 'number') onScoreChange?.(data.credibilityScore);
      setOpen(false);
      await load();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this GPS entry? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/gps-entries/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Failed to delete'); return; }
      toast.success('GPS entry deleted');
      if (typeof data?.credibilityScore === 'number') onScoreChange?.(data.credibilityScore);
      await load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <Card className="border-black/[0.08]">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <Target className="h-5 w-5 text-[#2ABFB0]" /> Your GPS Profile
            </h3>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Document what you&apos;ve solved, not just where you&apos;ve worked. Each entry captures a
              Gap you identified, the Solution you designed, and the Measurable Outcome — the evidence
              that makes your impact visible to employers, investors, researchers, students, industry, policymakers, and the communities you serve.
            </p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Add GPS Entry
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/[0.1] bg-black/[0.02] p-8 text-center">
              <Target className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No GPS entries yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Start with one significant role or initiative. What gap did you find, what did you do
                about it, and what changed as a result?
              </p>
              <Button onClick={openNew} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Add GPS Entry
              </Button>
            </div>
          ) : (
            entries.map((e) => {
              const pct = entryCompleteness(e);
              return (
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
                        {(e.periodStart || e.periodEnd) && <span>{e.periodStart}{e.periodStart && e.periodEnd ? ' – ' : ''}{e.periodEnd}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => setRequestFor(e)} className="gap-1.5">
                        <Handshake className="h-3.5 w-3.5 text-[#2ABFB0]" /> Request endorsement
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(e)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(e.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-red-400" /></Button>
                    </div>
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

                  <div className="mt-4 flex items-center gap-3">
                    <Progress value={pct} className="h-1.5" />
                    <span className="shrink-0 text-xs text-muted-foreground">{pct}% complete</span>
                  </div>

                  <EvidenceSection entryId={e.id} evidence={e.evidence ?? []} onChange={load} />

                  <EndorsementsList endorsements={e.endorsements} />
                </div>
              );
            })
          )}
        </div>
      </CardContent>

      {requestFor && (
        <RequestEndorsementDialog
          entryId={requestFor.id}
          entryTitle={requestFor.title}
          open={!!requestFor}
          onOpenChange={(v) => { if (!v) setRequestFor(null); }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#2ABFB0]" /> {editingId ? 'Edit GPS Entry' : 'Add GPS Entry'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Title / Role <span className="text-red-400">*</span></Label>
                <Input value={form.title} onChange={(ev) => set('title', ev.target.value)} placeholder="e.g. Community Health Coordinator" />
              </div>
              <div className="space-y-2">
                <Label>Organisation / Context</Label>
                <Input value={form.organization} onChange={(ev) => set('organization', ev.target.value)} placeholder="e.g. Kisumu County Health Dept" />
              </div>
              <div className="space-y-2">
                <Label>Entry Type</Label>
                <Select value={form.entryType} onValueChange={(v) => set('entryType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Health Area</Label>
                <Select value={form.healthArea} onValueChange={(v) => set('healthArea', v)}>
                  <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {HEALTH_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Geography</Label>
                <Input value={form.geography} onChange={(ev) => set('geography', ev.target.value)} placeholder="e.g. Rural Kisumu, Kenya" />
              </div>
              <div className="space-y-2">
                <Label>From</Label>
                <Input value={form.periodStart} onChange={(ev) => set('periodStart', ev.target.value)} placeholder="e.g. 2019" />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input value={form.periodEnd} onChange={(ev) => set('periodEnd', ev.target.value)} placeholder="e.g. 2022 or Present" />
              </div>
            </div>

            <GpsField label="Gap Identified" required hint="What gap did you identify in this role?" value={form.gap} onChange={(v) => set('gap', v)} placeholder="e.g. ANC uptake in rural Kisumu was 34% — far below the 80% national target." />
            <GpsField label="Root Cause" hint="What was the underlying cause of this gap?" value={form.rootCause} onChange={(v) => set('rootCause', v)} placeholder="e.g. Distance to facilities combined with cultural mistrust among young mothers." />
            <GpsField label="Solution Designed" required hint="What solution did you design or implement?" value={form.solution} onChange={(v) => set('solution', v)} placeholder="e.g. Trained 12 community birth attendants as health ambassadors with a monthly mobile outreach schedule." />
            <GpsField label="Measurable Outcome" required hint="What changed as a result — with evidence? Include numbers." value={form.outcome} onChange={(v) => set('outcome', v)} placeholder="e.g. ANC uptake rose from 34% to 67% within 8 months, verified by County Health Management Team data." />
            <GpsField label="Lessons Learned" hint="What would you do differently?" value={form.lessonsLearned} onChange={(v) => set('lessonsLearned', v)} placeholder="e.g. Involve male community leaders earlier to address cultural barriers." />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} className="gap-2"><Save className="h-4 w-4" /> {editingId ? 'Save Changes' : 'Add Entry'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
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

function GpsField({ label, hint, value, onChange, placeholder, required }: {
  label: string; hint: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">{label} {required && <span className="text-red-400">*</span>}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} />
    </div>
  );
}
