'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Lock, Sparkles, ChevronDown } from 'lucide-react';
import {
  DEBATE_TYPES, HEALTH_DOMAINS, GEOGRAPHY_OPTIONS, ANCHOR_TYPES, DEFAULT_PROMPTS, canInitiate,
} from '@/lib/debate';

export function StartDebateForm({ tier }: { tier: string | null }) {
  const router = useRouter();
  const allowed = canInitiate(tier);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({
    type: '',
    title: '',
    motion: '',
    healthDomain: '',
    geographyFocus: '',
    anchorType: '',
    anchorReference: '',
    standardRecommendation: '',
    problemStatement: '',
    background: '',
    promptGroundTruth: DEFAULT_PROMPTS.groundTruth,
    promptAdaptation: DEFAULT_PROMPTS.adaptation,
    promptFeasibility: DEFAULT_PROMPTS.feasibility,
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBBF24]/10">
          <Lock className="h-7 w-7 text-[#FBBF24]" />
        </div>
        <h2 className="font-display text-2xl font-semibold">Starting a debate is a Tier 2 feature</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Every member can read, react and add field reviews. Initiating a structured
          debate is open to Professional (Tier 2) members and above, so each debate
          starts from a verified practitioner or organisation.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/community">Browse community</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/billing">Upgrade membership</Link>
          </Button>
        </div>
      </div>
    );
  }

  const submit = async () => {
    if (!form.type) return toast.error('Choose a debate type.');
    if (!form.title.trim()) return toast.error('Add a title.');
    if (!form.motion.trim()) return toast.error('Add the central motion / question.');
    if (!form.problemStatement.trim()) return toast.error('Describe the real-world problem.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/debates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not create the debate.');
        return;
      }
      toast.success('Debate opened.');
      router.push(`/knowledge/${data.id}`);
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = DEBATE_TYPES.find((t) => t.value === form.type);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Start a Debate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Frame a question, anchor it to a policy, study or innovation, and invite the
          community to test it against real field conditions.
        </p>
        <p className="mt-2 rounded-lg border border-[#8B7FD4]/20 bg-[#8B7FD4]/[0.05] px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-[#8B7FD4]">Professional members</span> can initiate debates within their area of practice.
          <span className="font-medium text-[#FBBF24]"> Expert members</span> have full initiation rights across all debate categories and can lead anchor threads and co-author Consensus Reports.
        </p>
      </div>

      {/* Type picker */}
      <div className="space-y-2">
        <Label>Debate type</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {DEBATE_TYPES.map((t) => {
            const active = form.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => set('type', t.value)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  active ? t.accent : 'border-black/[0.08] bg-white hover:border-black/[0.12]'
                }`}
              >
                <div className="text-sm font-semibold" style={{ color: t.hex }}>{t.label}</div>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{t.tagline}</p>
              </button>
            );
          })}
        </div>
        {selectedType && (
          <p className="rounded-lg border border-black/[0.08] bg-black/[0.04] p-3 text-[12px] text-muted-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[#2ABFB0]" />
            {selectedType.coreQuestion}
          </p>
        )}
      </div>

      <Card className="border-black/[0.08] bg-white">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Is task-shifting for hypertension viable in rural clinics?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motion">Central motion / question</Label>
            <Textarea
              id="motion"
              value={form.motion}
              onChange={(e) => set('motion', e.target.value)}
              rows={2}
              placeholder="The single question the community is debating."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Health domain</Label>
              <Select value={form.healthDomain} onValueChange={(v) => set('healthDomain', v)}>
                <SelectTrigger><SelectValue placeholder="Select a domain" /></SelectTrigger>
                <SelectContent>
                  {HEALTH_DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Geography focus</Label>
              <Select value={form.geographyFocus} onValueChange={(v) => set('geographyFocus', v)}>
                <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
                <SelectContent>
                  {GEOGRAPHY_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="problem">The real-world problem (ground truth)</Label>
            <Textarea
              id="problem"
              value={form.problemStatement}
              onChange={(e) => set('problemStatement', e.target.value)}
              rows={3}
              placeholder="The gap between what the guideline / study / pitch assumes and what actually happens on the ground."
            />
          </div>

          {/* Anchor (optional) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Anchor type <span className="text-muted-foreground">(optional)</span></Label>
              <Select value={form.anchorType} onValueChange={(v) => set('anchorType', v)}>
                <SelectTrigger><SelectValue placeholder="What is this anchored to?" /></SelectTrigger>
                <SelectContent>
                  {ANCHOR_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="anchorRef">Reference / link <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="anchorRef"
                value={form.anchorReference}
                onChange={(e) => set('anchorReference', e.target.value)}
                placeholder="Citation or URL"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stdRec">Standard recommendation <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="stdRec"
              value={form.standardRecommendation}
              onChange={(e) => set('standardRecommendation', e.target.value)}
              rows={2}
              placeholder="Quote the official objective or recommendation being tested."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">Background note <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="background"
              value={form.background}
              onChange={(e) => set('background', e.target.value)}
              rows={2}
              placeholder="Short framing context for participants."
            />
          </div>

          {/* Advanced: editable prompts */}
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="flex items-center gap-1 text-xs font-medium text-[#2ABFB0]"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Customise the participation prompts
          </button>
          {showAdvanced && (
            <div className="space-y-4 rounded-lg border border-black/[0.08] bg-black/[0.02] p-4">
              <div className="space-y-2">
                <Label htmlFor="pg">Ground-truth prompt</Label>
                <Textarea id="pg" rows={2} value={form.promptGroundTruth} onChange={(e) => set('promptGroundTruth', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pa">Adaptation prompt</Label>
                <Textarea id="pa" rows={2} value={form.promptAdaptation} onChange={(e) => set('promptAdaptation', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf">Feasibility prompt</Label>
                <Textarea id="pf" rows={2} value={form.promptFeasibility} onChange={(e) => set('promptFeasibility', e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button asChild variant="outline">
              <Link href="/knowledge">Cancel</Link>
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? 'Opening…' : 'Open Debate'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
