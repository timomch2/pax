'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ShieldCheck, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2,
  FileCheck, Scale, Heart, PenLine,
} from 'lucide-react';
import { IP_PROTECTION_LEVELS } from '@/lib/pax-labels';

/* ---------- types ---------- */
export type SelfAssessmentData = {
  // Section 1: Ownership
  leadAuthority: 'PASS' | 'ACTION_NEEDED' | '';
  institutionalIpRights: 'PASS' | 'ACTION_NEEDED' | 'NA' | '';
  coInventorAuth: 'PASS' | 'ACTION_NEEDED' | 'NA' | '';
  funderEncumbrances: 'PASS' | 'ACTION_NEEDED' | 'NA' | '';
  // Section 2: IP & Novelty
  priorDisclosure: boolean;
  priorDisclosureDate: string;
  ipProtectionLevel: string;
  patentRegNumber: string;
  patentJurisdiction: string;
  openSourceLicense: string;
  thirdPartyDeps: boolean;
  thirdPartyDepsNote: string;
  // Section 3: Staged Disclosure
  tier1Safe: boolean;
  tier2Prepared: boolean;
  // Section 4: Dual-Bottom-Line
  commercialReady: boolean;
  greaterGoodReady: boolean;
  // Section 5: Declaration
  declarationAccepted: boolean;
};

const EMPTY_ASSESSMENT: SelfAssessmentData = {
  leadAuthority: '', institutionalIpRights: '', coInventorAuth: '', funderEncumbrances: '',
  priorDisclosure: false, priorDisclosureDate: '', ipProtectionLevel: '',
  patentRegNumber: '', patentJurisdiction: '', openSourceLicense: '',
  thirdPartyDeps: false, thirdPartyDepsNote: '',
  tier1Safe: false, tier2Prepared: false,
  commercialReady: false, greaterGoodReady: false,
  declarationAccepted: false,
};

const STEPS = [
  { icon: ShieldCheck, title: 'Ownership & Authority' },
  { icon: FileCheck, title: 'IP & Novelty Safeguards' },
  { icon: Scale, title: 'Staged Disclosure' },
  { icon: Heart, title: 'Dual-Bottom-Line' },
  { icon: PenLine, title: 'Declaration' },
];

type Props = {
  initial?: Partial<SelfAssessmentData>;
  onComplete: (data: SelfAssessmentData) => void;
  onCancel: () => void;
};

export function SelfAssessmentWizard({ initial, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<SelfAssessmentData>({ ...EMPTY_ASSESSMENT, ...initial });

  const set = <K extends keyof SelfAssessmentData>(k: K, v: SelfAssessmentData[K]) =>
    setD((p) => ({ ...p, [k]: v }));

  const canProceed = (): boolean => {
    if (step === 0) return !!d.leadAuthority;
    if (step === 1) return !!d.ipProtectionLevel;
    if (step === 4) return d.declarationAccepted;
    return true;
  };

  const next = () => { if (step < 4) setStep(step + 1); };
  const back = () => { if (step > 0) setStep(step - 1); };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center mb-6 gap-1">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <button onClick={() => i < step && setStep(i)}
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors ${
                  done ? 'border-[#2ABFB0] bg-[#2ABFB0] text-[#06231f] cursor-pointer'
                  : active ? 'border-[#FBBF24] bg-[#FBBF24]/15 text-[#FBBF24]'
                  : 'border-black/[0.1] text-gray-400 cursor-default'}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </button>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${i < step ? 'bg-[#2ABFB0]' : 'bg-black/[0.06]'}`} />}
            </div>
          );
        })}
      </div>

      <Card className="bg-white border-black/[0.08]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-[#1A2332] font-medium mb-1">
            <StepIcon className="h-5 w-5 text-[#2ABFB0]" />
            <span className="text-[10px] uppercase tracking-widest text-[#FBBF24]">Step {step + 1} of 5</span>
          </div>
          <h2 className="font-display text-xl text-[#1A2332] mb-4">{STEPS[step].title}</h2>

          {step === 0 && <Step1 d={d} set={set} />}
          {step === 1 && <Step2 d={d} set={set} />}
          {step === 2 && <Step3 d={d} set={set} />}
          {step === 3 && <Step4 d={d} set={set} />}
          {step === 4 && <Step5 d={d} set={set} />}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/[0.08]">
            <div>
              {step === 0 ? (
                <Button variant="outline" onClick={onCancel} className="border-black/[0.1] text-gray-700">Cancel</Button>
              ) : (
                <Button variant="outline" onClick={back} className="border-black/[0.1] text-gray-700">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
            </div>
            <div>
              {step < 4 ? (
                <Button disabled={!canProceed()} onClick={next} className="bg-[#2ABFB0] hover:bg-[#2D9B94] text-[#06231f] font-semibold">
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button disabled={!d.declarationAccepted} onClick={() => onComplete(d)}
                  className="bg-[#2ABFB0] hover:bg-[#2D9B94] text-[#06231f] font-semibold">
                  <ShieldCheck className="h-4 w-4 mr-1" /> Complete Assessment
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ========== Step components ========== */

type StepProps = {
  d: SelfAssessmentData;
  set: <K extends keyof SelfAssessmentData>(k: K, v: SelfAssessmentData[K]) => void;
};

function CheckItem({ label, status, onChange, hint }: {
  label: string; status: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div className="rounded-lg border border-black/[0.08] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm text-[#1A2332]">{label}</p>
          {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
        <Select value={status} onValueChange={onChange}>
          <SelectTrigger className="w-[170px] shrink-0"><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PASS">✓ Pass</SelectItem>
            <SelectItem value="ACTION_NEEDED">⚠ Action Needed</SelectItem>
            <SelectItem value="NA">N/A</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Step1({ d, set }: StepProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">
        Verify legal authority to submit this innovation and confirm all co-creators and institutions have signed off.
      </p>
      <CheckItem label="1.1 Lead Innovator Authority" status={d.leadAuthority}
        onChange={(v) => set('leadAuthority', v as any)}
        hint="Confirm you have legal authority to submit, disclose and negotiate on behalf of this project." />
      <CheckItem label="1.2 Institutional / Employer IP Rights" status={d.institutionalIpRights}
        onChange={(v) => set('institutionalIpRights', v as any)}
        hint="If developed at a university, institute or firm, attach formal IP clearance or institutional sign-off." />
      <CheckItem label="1.3 Co-Inventor Authorisation" status={d.coInventorAuth}
        onChange={(v) => set('coInventorAuth', v as any)}
        hint="All listed co-inventors must consent to platform submission and representation terms." />
      <CheckItem label="1.4 Grant / Funder Encumbrances" status={d.funderEncumbrances}
        onChange={(v) => set('funderEncumbrances', v as any)}
        hint="Confirm that grant conditions or public funding terms do not restrict commercial licensing or joint ventures." />
    </div>
  );
}

function Step2({ d, set }: StepProps) {
  const showPriorWarning = d.priorDisclosure;
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-2">
        Assess novelty, patent status, and third-party dependencies to safeguard your intellectual property.
      </p>

      {/* 2.1 Prior Disclosure */}
      <div className="rounded-lg border border-black/[0.08] p-4 space-y-3">
        <p className="text-sm text-[#1A2332] font-medium">2.1 Prior Public Disclosure Audit</p>
        <p className="text-xs text-gray-400">
          Has this innovation been featured in a journal, thesis defence, conference, news article or web post?
        </p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="radio" name="priorDisc" checked={!d.priorDisclosure}
              onChange={() => set('priorDisclosure', false)} className="accent-[#2ABFB0]" /> No
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="radio" name="priorDisc" checked={d.priorDisclosure}
              onChange={() => set('priorDisclosure', true)} className="accent-[#2ABFB0]" /> Yes
          </label>
        </div>
        {showPriorWarning && (
          <div className="rounded-md border border-[#FBBF24]/30 bg-[#FBBF24]/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[#FBBF24] mt-0.5 shrink-0" />
              <div className="text-xs text-gray-600">
                <p className="font-semibold text-[#FBBF24] mb-1">Critical Gate</p>
                <p>Prior public disclosure may jeopardise patent eligibility. You should secure a provisional patent or formal IP filing before proceeding to Tier 1 listing.</p>
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs text-gray-500">Date of first disclosure</Label>
              <Input type="date" value={d.priorDisclosureDate}
                onChange={(e) => set('priorDisclosureDate', e.target.value)} className="mt-1 max-w-[200px]" />
            </div>
          </div>
        )}
      </div>

      {/* 2.2 Patent & Protection Status */}
      <div className="rounded-lg border border-black/[0.08] p-4 space-y-3">
        <p className="text-sm text-[#1A2332] font-medium">2.2 Patent & Protection Status</p>
        <Select value={d.ipProtectionLevel} onValueChange={(v) => set('ipProtectionLevel', v)}>
          <SelectTrigger><SelectValue placeholder="Select your IP protection level" /></SelectTrigger>
          <SelectContent>
            {IP_PROTECTION_LEVELS.map((l) => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(d.ipProtectionLevel === 'PROVISIONAL_FILED' || d.ipProtectionLevel === 'PATENT_GRANTED') && (
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            <div>
              <Label className="text-xs text-gray-500">Registration / Application #</Label>
              <Input value={d.patentRegNumber} onChange={(e) => set('patentRegNumber', e.target.value)}
                placeholder="e.g. KE/P/2026/001234" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Jurisdiction</Label>
              <Input value={d.patentJurisdiction} onChange={(e) => set('patentJurisdiction', e.target.value)}
                placeholder="e.g. Kenya (KIPI) / ARIPO" className="mt-1" />
            </div>
          </div>
        )}
        {d.ipProtectionLevel === 'OPEN_SOURCE' && (
          <div className="mt-2">
            <Label className="text-xs text-gray-500">License type</Label>
            <Input value={d.openSourceLicense} onChange={(e) => set('openSourceLicense', e.target.value)}
              placeholder="e.g. MIT, GPL-3.0, CC BY-SA 4.0" className="mt-1 max-w-[300px]" />
          </div>
        )}
      </div>

      {/* 2.3 Third-Party Dependencies */}
      <div className="rounded-lg border border-black/[0.08] p-4 space-y-3">
        <p className="text-sm text-[#1A2332] font-medium">2.3 Third-Party IP & Dependency Audit</p>
        <p className="text-xs text-gray-400">
          Does the solution rely on open-source libraries, third-party patents, or proprietary hardware?
        </p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="radio" name="thirdParty" checked={!d.thirdPartyDeps}
              onChange={() => set('thirdPartyDeps', false)} className="accent-[#2ABFB0]" /> No dependencies
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="radio" name="thirdParty" checked={d.thirdPartyDeps}
              onChange={() => set('thirdPartyDeps', true)} className="accent-[#2ABFB0]" /> Yes
          </label>
        </div>
        {d.thirdPartyDeps && (
          <div className="mt-2">
            <Label className="text-xs text-gray-500">Describe dependencies & license compatibility</Label>
            <Textarea rows={2} value={d.thirdPartyDepsNote}
              onChange={(e) => set('thirdPartyDepsNote', e.target.value)}
              placeholder="List key dependencies and confirm freedom-to-operate." className="mt-1" />
          </div>
        )}
      </div>
    </div>
  );
}

function Step3({ d, set }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-2">
        Confirm you have separated your submission into two tiers to attract investor interest without risking IP.
      </p>

      <div className="rounded-lg border border-[#2ABFB0]/25 bg-[#2ABFB0]/5 p-4">
        <p className="text-sm font-medium text-[#1A2332] mb-2">Tier 1 — Public Marketplace Abstract (Non-Enabling)</p>
        <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
          <li>Does NOT expose secret formulas, source code, detailed CAD files, or manufacturing instructions.</li>
          <li>Clearly states the problem, target market, validation metrics and high-level value proposition.</li>
          <li>Safe for open viewing by registered platform users without triggering IP forfeiture.</li>
        </ul>
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" checked={d.tier1Safe} onChange={(e) => set('tier1Safe', e.target.checked)}
            className="accent-[#2ABFB0] w-4 h-4" />
          <span className="text-sm text-gray-700">I confirm my Tier 1 content meets these criteria</span>
        </label>
      </div>

      <div className="rounded-lg border border-[#8B7FD4]/25 bg-[#8B7FD4]/5 p-4">
        <p className="text-sm font-medium text-[#1A2332] mb-2">Tier 2 — Encrypted Vault Assets (Digital NDA Required)</p>
        <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
          <li>Contains complete technical blueprints, schematics, clinical/field data and financial projections.</li>
          <li>Will be encrypted and locked inside the PAX Vault.</li>
          <li>Released only to vetted investors/partners after execution of the platform-enforced Digital NDA.</li>
        </ul>
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" checked={d.tier2Prepared} onChange={(e) => set('tier2Prepared', e.target.checked)}
            className="accent-[#8B7FD4] w-4 h-4" />
          <span className="text-sm text-gray-700">I have prepared Tier 2 vault content for this innovation</span>
        </label>
      </div>
    </div>
  );
}

function Step4({ d, set }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-2">
        The Praxis Exchange is built on a dual-bottom-line ethos: commercial sustainability and public good.
      </p>

      <div className="rounded-lg border border-black/[0.08] p-4">
        <p className="text-sm font-medium text-[#1A2332] mb-1">4.1 Commercial Sustainability</p>
        <p className="text-xs text-gray-400 mb-3">
          Clear monetisation model identified. Target market size, unit economics and capital requirements defined.
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={d.commercialReady} onChange={(e) => set('commercialReady', e.target.checked)}
            className="accent-[#2ABFB0] w-4 h-4" />
          <span className="text-sm text-gray-700">Commercial sustainability criteria addressed</span>
        </label>
      </div>

      <div className="rounded-lg border border-black/[0.08] p-4">
        <p className="text-sm font-medium text-[#1A2332] mb-1">4.2 Greater Good Impact</p>
        <p className="text-xs text-gray-400 mb-3">
          Measurable health security, social benefit, or economic impact articulated. Ethical guidelines and equitable access addressed.
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={d.greaterGoodReady} onChange={(e) => set('greaterGoodReady', e.target.checked)}
            className="accent-[#2ABFB0] w-4 h-4" />
          <span className="text-sm text-gray-700">Greater good impact criteria addressed</span>
        </label>
      </div>
    </div>
  );
}

function Step5({ d, set }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-2">
        Review your responses and sign the declaration to proceed to your innovation brief.
      </p>

      {/* Summary badges */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryBadge label="Lead Authority" ok={d.leadAuthority === 'PASS'} />
        <SummaryBadge label="IP Protection" ok={!!d.ipProtectionLevel} />
        <SummaryBadge label="Tier 1 Safe" ok={d.tier1Safe} />
        <SummaryBadge label="Tier 2 Prepared" ok={d.tier2Prepared} />
        <SummaryBadge label="Commercial Ready" ok={d.commercialReady} />
        <SummaryBadge label="Greater Good" ok={d.greaterGoodReady} />
      </div>

      <div className="rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-5">
        <p className="text-sm text-[#1A2332] italic leading-relaxed">
          &ldquo;I confirm that the information provided in this self-assessment is accurate, that I hold
          the necessary permissions to submit this innovation, and that Tier 1 details do not contain
          patent-defeating public disclosures.&rdquo;
        </p>
        <label className="flex items-center gap-3 mt-4 cursor-pointer">
          <input type="checkbox" checked={d.declarationAccepted}
            onChange={(e) => set('declarationAccepted', e.target.checked)}
            className="accent-[#FBBF24] w-5 h-5" />
          <span className="text-sm text-[#1A2332] font-medium">I agree to this declaration</span>
        </label>
      </div>
    </div>
  );
}

function SummaryBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
      ok ? 'bg-[#2ABFB0]/10 text-[#2ABFB0]' : 'bg-black/[0.04] text-gray-400'}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-current" />}
      {label}
    </div>
  );
}

export { EMPTY_ASSESSMENT };
export type { SelfAssessmentData as AssessmentData };
