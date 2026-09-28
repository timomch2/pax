'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scale, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const MANIFESTO_PRINCIPLES = [
  {
    title: 'Patient-Centred Impact',
    text: 'I commit to prioritising investments that demonstrate measurable positive health outcomes for communities, with special attention to underserved and low-resource populations worldwide.',
  },
  {
    title: 'Ethical Conduct & Transparency',
    text: 'I will conduct all investment activities with honesty, integrity, and full transparency. I will disclose any conflicts of interest and ensure fair dealing with all parties — innovators, co-investors, and communities.',
  },
  {
    title: 'Regulatory Respect',
    text: 'I acknowledge that health innovations require proper regulatory approval before deployment. I will not pressure innovators to bypass or shortcut regulatory processes in pursuit of faster returns.',
  },
  {
    title: 'Intellectual Property Protection',
    text: 'I will respect the intellectual property rights of innovators and researchers. I will not misappropriate ideas, replicate innovations without consent, or use privileged information obtained through PAX for competing ventures.',
  },
  {
    title: 'No Exploitative Terms',
    text: 'I will offer investment terms that are fair and equitable. I will not exploit the financial vulnerability of early-stage innovators to extract disproportionate equity, control, or unfavourable conditions.',
  },
  {
    title: 'Long-Term Partnership',
    text: 'I recognise that health innovation requires patience. I commit to supporting innovations through the full development cycle and will not withdraw support prematurely in ways that could harm communities depending on the innovation.',
  },
  {
    title: 'Do No Harm',
    text: 'I will not knowingly invest in innovations or activities that could cause harm to patients, communities, or the environment. Where risks are identified, I will work constructively with innovators to mitigate them.',
  },
  {
    title: 'Accountability',
    text: 'I accept accountability for my investment decisions and their downstream effects. I will cooperate with PAX\'s community standards and accept the platform\'s governance decisions in good faith.',
  },
];

export function EthicalManifesto({ onAccepted, deferSave = false }: { onAccepted: () => void; deferSave?: boolean }) {
  const [checkedAll, setCheckedAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const accept = async () => {
    if (deferSave) { onAccepted(); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/investor/manifesto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Ethical Manifesto accepted — welcome to the PAX Investor community.');
      onAccepted();
    } catch {
      toast.error('Could not record acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <Scale className="w-10 h-10 text-[#F59E0B] mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-[#1A2332]">PAX Ethical Investment Manifesto</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto">
          Before accessing the Deal Room and investor features, please read and accept the following
          ethical commitments. These principles protect our innovators, practitioners, and the
          communities they serve.
        </p>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-xl p-6">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {MANIFESTO_PRINCIPLES.map((p, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] text-xs font-bold">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1A2332]">{p.title}</h3>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-6 pt-4 border-t border-[#E4E7EC]">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checkedAll}
              onChange={(e) => setCheckedAll(e.target.checked)}
              className="mt-1 rounded border-gray-600 bg-[#FAF8F5] text-[#F59E0B] focus:ring-[#F59E0B]"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              I have read, understood, and agree to abide by all eight principles of the PAX Ethical
              Investment Manifesto. I understand that violation of these principles may result in
              suspension of my investor privileges on the platform.
            </span>
          </label>

          <Button
            onClick={accept}
            disabled={!checkedAll || submitting}
            className="w-full mt-4 bg-[#F59E0B] text-[#0B0F1A] hover:bg-[#F59E0B]/90 font-semibold"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Recording...
              </>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Accept Manifesto & Continue
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
