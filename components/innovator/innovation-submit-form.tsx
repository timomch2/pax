'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Lightbulb, ShieldCheck, FileText, Send, Save, Loader2, ArrowRight,
  Lock, Eye, Scale,
} from 'lucide-react';
import { INNOVATION_SECTORS, REVENUE_MODELS } from '@/lib/pax-labels';
import { STAGE_LABELS } from '@/lib/pax-labels';
import { SelfAssessmentWizard } from './self-assessment-wizard';
import type { SelfAssessmentData } from './self-assessment-wizard';

const STAGES = ['IDEA', 'PROTOTYPE', 'PILOT', 'SCALING'];

type Fields = {
  title: string; tagline: string; sector: string; stage: string; location: string;
  summary: string; problem: string; solution: string; evidence: string;
  team: string; fundingGoal: string; fundingUse: string;
  // Dual-bottom-line
  revenueModel: string; impactStatement: string;
  // Tier 2 vault content
  technicalBlueprint: string; financialModelDetail: string;
  patentDocumentation: string; clinicalData: string;
};

const EMPTY: Fields = {
  title: '', tagline: '', sector: '', stage: 'IDEA', location: '',
  summary: '', problem: '', solution: '', evidence: '',
  team: '', fundingGoal: '', fundingUse: '',
  revenueModel: '', impactStatement: '',
  technicalBlueprint: '', financialModelDetail: '',
  patentDocumentation: '', clinicalData: '',
};

type Phase = 'assessment' | 'brief' | 'issued';

export function InnovationSubmitForm({ setupSubmit }: { setupSubmit?: (body: unknown) => Promise<void> } = {}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('assessment');
  const [assessment, setAssessment] = useState<SelfAssessmentData | null>(null);
  const [f, setF] = useState<Fields>(EMPTY);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [issued, setIssued] = useState<{ ref: string; title: string } | null>(null);

  const set = (k: keyof Fields, v: string) => setF((p) => ({ ...p, [k]: v }));

  const missingCore = !f.title.trim() || !f.sector.trim() || !f.summary.trim();
  const missingSubmit = missingCore || !f.problem.trim() || !f.solution.trim();

  const save = async (submit: boolean) => {
    if (submit ? missingSubmit : missingCore) {
      toast.error(submit
        ? 'Title, sector, summary, problem and solution are all required to submit.'
        : 'Title, sector and a short summary are required to save a draft.');
      return;
    }
    submit ? setSubmitting(true) : setSavingDraft(true);
    try {
      const body = {
        ...f,
        fundingGoal: f.fundingGoal || 0,
        submit,
        selfAssessmentData: assessment ? JSON.stringify(assessment) : undefined,
        selfAssessmentCompleted: !!assessment?.declarationAccepted,
        ipProtectionLevel: assessment?.ipProtectionLevel || undefined,
        patentRegNumber: assessment?.patentRegNumber || undefined,
        patentJurisdiction: assessment?.patentJurisdiction || undefined,
        openSourceLicense: assessment?.openSourceLicense || undefined,
        priorDisclosure: assessment?.priorDisclosure ?? false,
        priorDisclosureDate: assessment?.priorDisclosureDate || undefined,
        thirdPartyDeps: assessment?.thirdPartyDeps ?? false,
        thirdPartyDepsNote: assessment?.thirdPartyDepsNote || undefined,
      };
      if (setupSubmit) { await setupSubmit(body); return; }
      const res = await fetch('/api/innovator/innovations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || 'Something went wrong.');
        return;
      }
      if (submit) {
        setConfirmOpen(false);
        setIssued({
          ref: json?.innovation?.ipHash
            ? `PAX-IP-${String(json.innovation.ipHash).slice(0, 12).toUpperCase()}`
            : '',
          title: json?.innovation?.title || f.title,
        });
        setPhase('issued');
      } else {
        toast.success('Draft saved. You can finish and submit it any time.');
        router.push('/innovator');
        router.refresh();
      }
    } catch (e: any) {
      toast.error('Network error. Please try again.');
    } finally {
      setSavingDraft(false);
      setSubmitting(false);
    }
  };

  /* -------- Phase: Self-Assessment -------- */
  if (phase === 'assessment') {
    return (
      <SelfAssessmentWizard
        onComplete={(data) => { setAssessment(data); setPhase('brief'); }}
        onCancel={() => router.push('/innovator')}
      />
    );
  }

  /* -------- Phase: Issued confirmation -------- */
  if (phase === 'issued' && issued) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <Card className="border-[#2ABFB0]/30 bg-white">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#2ABFB0]/15 flex items-center justify-center mb-5">
              <ShieldCheck className="w-8 h-8 text-[#2ABFB0]" />
            </div>
            <h2 className="font-display text-2xl text-[#1A2332] mb-2">Submitted &amp; timestamped</h2>
            <p className="text-gray-500 mb-6">
              &ldquo;{issued.title}&rdquo; has entered the validation pipeline. An IP timestamp
              certificate has been issued, establishing a verifiable record of your authorship.
            </p>
            {issued.ref && (
              <div className="inline-block rounded-lg border border-black/[0.08] bg-black/[0.04] px-5 py-3 mb-6">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Certificate Reference</div>
                <div className="font-mono text-[#FBBF24] text-sm">{issued.ref}</div>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => router.push('/innovator')} className="bg-[#2ABFB0] hover:bg-[#2D9B94] text-[#06231f]">
                View in Growth Suite <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" onClick={() => { setPhase('assessment'); setAssessment(null); setF(EMPTY); setIssued(null); }}
                className="border-black/[0.1] text-gray-700">
                Submit another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* -------- Phase: Innovation Brief form -------- */
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[#2ABFB0] text-sm font-medium mb-2">
          <Lightbulb className="w-4 h-4" /> Innovation Hub
        </div>
        <h1 className="font-display text-3xl text-[#1A2332]">2-Pager Innovation Brief</h1>
        <p className="text-gray-500 mt-2 max-w-2xl">
          A structured, investor-ready snapshot of your idea. Tier 1 fields are visible on the public
          marketplace feed. Tier 2 vault content is encrypted and only shared after an investor signs
          a digital NDA and you approve access.
        </p>
        {assessment && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#2ABFB0]/10 px-3 py-1 text-xs text-[#2ABFB0]">
            <ShieldCheck className="h-3.5 w-3.5" /> Self-assessment completed
          </div>
        )}
      </div>

      <Card className="bg-white border-black/[0.08]">
        <CardContent className="p-6 space-y-6">

          {/* ===== TIER 1: PUBLIC ===== */}
          <div className="flex items-center gap-2 rounded-md bg-[#2ABFB0]/8 px-3 py-2">
            <Eye className="h-4 w-4 text-[#2ABFB0]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#2ABFB0]">Tier 1 — Public Marketplace Abstract</span>
          </div>

          <Section icon={<FileText className="w-4 h-4" />} title="The essentials">
            <Field label="Title" required>
              <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. MamaObi — last-mile maternal care" />
            </Field>
            <Field label="Tagline">
              <Input value={f.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="One line that captures the essence" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Sector" required>
                <Select value={f.sector} onValueChange={(v) => set('sector', v)}>
                  <SelectTrigger><SelectValue placeholder="Choose a sector" /></SelectTrigger>
                  <SelectContent>
                    {INNOVATION_SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Stage">
                <Select value={f.stage} onValueChange={(v) => set('stage', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Location">
              <Input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Nairobi, Kenya" />
            </Field>
            <Field label="Summary" required hint="A short overview — what it is, in a few sentences. (Public)">
              <Textarea rows={3} value={f.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Give reviewers the gist at a glance." />
            </Field>
          </Section>

          <Section icon={<Lightbulb className="w-4 h-4" />} title="The 2-Pager (Tier 1)" hint="Problem and solution are required to submit for validation.">
            <Field label="Problem" hint="What gap or pain are you solving, and for whom? (Public)">
              <Textarea rows={4} value={f.problem} onChange={(e) => set('problem', e.target.value)} placeholder="Describe the problem and its scale." />
            </Field>
            <Field label="Solution" hint="How does your innovation address it? (Public)">
              <Textarea rows={4} value={f.solution} onChange={(e) => set('solution', e.target.value)} placeholder="Describe your approach and what makes it work." />
            </Field>
            <Field label="Evidence" hint="Traction, pilots, data or results so far. (Public, non-enabling)">
              <Textarea rows={3} value={f.evidence} onChange={(e) => set('evidence', e.target.value)} placeholder="Any proof points that build confidence." />
            </Field>
            <Field label="Team" hint="Who is building this, and why you? (Public)">
              <Textarea rows={3} value={f.team} onChange={(e) => set('team', e.target.value)} placeholder="Founders, key people and relevant experience." />
            </Field>
          </Section>

          <Section icon={<Scale className="w-4 h-4" />} title="Dual-Bottom-Line (Tier 1)">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Revenue Model">
                <Select value={f.revenueModel} onValueChange={(v) => set('revenueModel', v)}>
                  <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                  <SelectContent>
                    {REVENUE_MODELS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Funding goal (KSh)">
                <Input type="number" min={0} value={f.fundingGoal} onChange={(e) => set('fundingGoal', e.target.value)} placeholder="e.g. 5000000" />
              </Field>
            </div>
            <Field label="Use of funds" hint="How would investment be deployed? (Public)">
              <Textarea rows={3} value={f.fundingUse} onChange={(e) => set('fundingUse', e.target.value)} placeholder="e.g. clinical validation, hiring, expansion." />
            </Field>
            <Field label="Greater Good Impact" hint="Measurable health/social benefit and ethical commitment. (Public)">
              <Textarea rows={3} value={f.impactStatement} onChange={(e) => set('impactStatement', e.target.value)}
                placeholder="Describe the public health, social or economic impact of your innovation." />
            </Field>
          </Section>

          {/* ===== TIER 2: VAULT ===== */}
          <div className="flex items-center gap-2 rounded-md bg-[#8B7FD4]/10 px-3 py-2 mt-2">
            <Lock className="h-4 w-4 text-[#8B7FD4]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#8B7FD4]">Tier 2 — Encrypted Vault (NDA-Protected)</span>
          </div>
          <p className="text-xs text-gray-400 -mt-3">
            This content will only be visible to investors or partners who sign a platform-enforced digital NDA and receive your approval.
          </p>

          <Section icon={<Lock className="w-4 h-4" />} title="Confidential vault content">
            <Field label="Technical Blueprint" hint="Detailed technical specs, schematics, source code architecture.">
              <Textarea rows={4} value={f.technicalBlueprint} onChange={(e) => set('technicalBlueprint', e.target.value)}
                placeholder="Describe the technical details you want to protect (architecture, algorithms, formulas, manufacturing process)." />
            </Field>
            <Field label="Clinical / Validation Data" hint="Full clinical trial data, field validation metrics, raw datasets.">
              <Textarea rows={3} value={f.clinicalData} onChange={(e) => set('clinicalData', e.target.value)}
                placeholder="Detailed validation results, trial outcomes, field data." />
            </Field>
            <Field label="Financial Model" hint="Detailed projections, cost structures, pricing strategy, cap table.">
              <Textarea rows={3} value={f.financialModelDetail} onChange={(e) => set('financialModelDetail', e.target.value)}
                placeholder="Detailed financial projections, unit economics, capitalisation table." />
            </Field>
            <Field label="Patent Documentation" hint="Unfiled drafts, provisional claims, trade secret descriptions.">
              <Textarea rows={3} value={f.patentDocumentation} onChange={(e) => set('patentDocumentation', e.target.value)}
                placeholder="Patent claims, IP documentation, or trade secret details." />
            </Field>
          </Section>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-black/[0.08]">
            <Button variant="outline" disabled={savingDraft || submitting} onClick={() => save(false)} className="w-full sm:w-auto border-black/[0.1] text-gray-700">
              {savingDraft ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save as draft
            </Button>
            <Button disabled={savingDraft || submitting} onClick={() => setConfirmOpen(true)} className="w-full sm:w-auto bg-[#2ABFB0] hover:bg-[#2D9B94] text-[#06231f] font-semibold">
              <Send className="w-4 h-4 mr-1" /> Submit for validation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-white border-black/[0.08]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1A2332]">
              <ShieldCheck className="w-5 h-5 text-[#2ABFB0]" /> Submit &amp; timestamp
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              Submitting enters your brief into the validation pipeline and issues an
              <span className="text-[#FBBF24]"> IP timestamp certificate</span> &mdash; a cryptographic
              record of authorship dated to this moment.
            </p>
            <p className="text-gray-400">
              Once submitted, the brief becomes read-only to protect that record. Tier 2 vault content
              will be encrypted and accessible only to NDA-verified investors whom you approve.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="border-black/[0.1] text-gray-700">Cancel</Button>
            <Button disabled={submitting} onClick={() => save(true)} className="bg-[#2ABFB0] hover:bg-[#2D9B94] text-[#06231f] font-semibold">
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
              Confirm &amp; submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-[#1A2332] font-medium">
          <span className="text-[#2ABFB0]">{icon}</span> {title}
        </div>
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-gray-700 text-sm">
        {label}{required && <span className="text-[#FBBF24] ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-[#1A2332]/35">{hint}</p>}
    </div>
  );
}
