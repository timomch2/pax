'use client';

import { useState } from 'react';
import { AlertTriangle, Send, CheckCircle2, Minus, Plus, CheckSquare, Square } from 'lucide-react';
import { COUNTRIES, regionsFor, regionLabel } from '@/lib/geo';

const SEVERITY_OPTIONS = [
  { value: 'MILD', label: 'Mild', desc: 'Minor discomfort, no treatment needed', color: '#22C55E' },
  { value: 'MODERATE', label: 'Moderate', desc: 'Required treatment or medication change', color: '#B26F09' },
  { value: 'SEVERE', label: 'Severe', desc: 'Hospitalisation or significant harm', color: '#C81E1E' },
  { value: 'LIFE_THREATENING', label: 'Life-threatening', desc: 'Risk of death or permanent disability', color: '#991B1B' },
];

const SIDE_EFFECT_TYPES = [
  'Nausea / Vomiting', 'Headache', 'Dizziness', 'Skin Rash / Itching',
  'Diarrhoea', 'Fatigue / Drowsiness', 'Breathing Difficulty', 'Swelling',
  'Fever', 'Muscle / Joint Pain', 'Vision Changes', 'Heart Palpitations',
  'Liver / Kidney Issues', 'Allergic Reaction', 'Other',
];

const INPUT = 'w-full rounded-lg bg-black/5 border border-black/10 px-4 py-2.5 text-sm text-[#1A2332] placeholder-gray-500 focus:border-[#1F7A74] focus:outline-none';

const EMPTY = {
  drugName: '', doseTaken: '', sideEffects: [] as string[], severity: 'MODERATE',
  patientAge: '', patientGender: '', patientWeight: '',
  isPregnant: null as boolean | null, otherMedication: '',
  onsetDaysAgo: '', durationDays: '', treatmentGiven: null as boolean | null, treatmentDetails: '',
  province: '', country: 'Kenya',
  description: '', reporterEmail: '', consent: false,
};

/** Yes / No pill pair — replaces ambiguous checkboxes. */
function YesNo({ value, onChange, name }: { value: boolean | null; onChange: (v: boolean) => void; name: string }) {
  return (
    <div className="flex gap-2" role="group" aria-label={name}>
      {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.l} type="button" onClick={() => onChange(o.v)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium border transition-all ${
              active
                ? 'bg-[#1F7A74] border-[#1F7A74] text-white shadow-sm'
                : 'bg-white border-black/12 text-gray-600 hover:border-[#1F7A74]/50'
            }`}
          >
            {active ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

/** Number field with working -/+ steppers (native spinner arrows are hidden). */
function Stepper({ value, onChange, min = 0, max = 365, placeholder, suffix }: {
  value: string; onChange: (v: string) => void; min?: number; max?: number; placeholder?: string; suffix?: string;
}) {
  const bump = (d: number) => {
    const n = parseInt(value || '0', 10);
    const next = Math.min(max, Math.max(min, (isNaN(n) ? 0 : n) + d));
    onChange(String(next));
  };
  return (
    <div className="flex items-stretch rounded-lg border border-black/10 bg-black/5 overflow-hidden focus-within:border-[#1F7A74]">
      <button type="button" aria-label="Decrease" onClick={() => bump(-1)}
        className="px-3 text-gray-600 hover:bg-[#1F7A74] hover:text-white transition-colors">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="text" inputMode="numeric" pattern="[0-9]*" value={value} placeholder={placeholder}
        onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); if (v === '' || parseInt(v, 10) <= max) onChange(v); }}
        className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-center text-[#1A2332] placeholder-gray-500 focus:outline-none"
      />
      {suffix && <span className="flex items-center pr-2 text-[11px] text-gray-500">{suffix}</span>}
      <button type="button" aria-label="Increase" onClick={() => bump(1)}
        className="px-3 text-gray-600 hover:bg-[#1F7A74] hover:text-white transition-colors">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function DrugReportForm() {
  const [form, setForm] = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ackByEmail, setAckByEmail] = useState(false);
  const [error, setError] = useState('');

  const age = parseInt(form.patientAge, 10);
  const showWeight = !isNaN(age) && age < 12;
  const showPregnant = form.patientGender === 'Female' && !isNaN(age) && age >= 10;
  const regions = regionsFor(form.country);

  const toggleSideEffect = (s: string) => {
    setForm(prev => ({
      ...prev,
      sideEffects: prev.sideEffects.includes(s)
        ? prev.sideEffects.filter(x => x !== s)
        : [...prev.sideEffects, s],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/safety/drug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sideEffects: form.sideEffects.join(', '),
          patientWeight: showWeight ? form.patientWeight : null,
          isPregnant: showPregnant ? form.isPregnant === true : false,
          onsetDaysAgo: form.onsetDaysAgo === '' ? null : form.onsetDaysAgo,
          durationDays: form.durationDays === '' ? null : form.durationDays,
          treatmentGiven: form.treatmentGiven,
          treatmentDetails: form.treatmentGiven === true ? (form.treatmentDetails.trim() || null) : null,
          reporterEmail: form.reporterEmail.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Submission failed');
      }
      const data = await res.json().catch(() => ({}));
      setAckByEmail(!!data.acknowledgedByEmail);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-[#1A2332] mb-2">Report Received</h3>
        <p className="text-gray-600 text-sm mb-2">Your report has been received and forwarded for action. Thank you — your submission helps protect communities everywhere.</p>
        <p className="text-gray-500 text-xs mb-6">
          {ackByEmail
            ? 'A confirmation has been sent to your email.'
            : 'Our surveillance team reviews every report. Individual reports are kept confidential.'}
        </p>
        <button onClick={() => { setSuccess(false); setAckByEmail(false); setForm({ ...EMPTY }); }} className="text-[#15908A] text-sm hover:underline">
          Submit another report
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h3 className="text-sm font-medium text-red-700">Report an Adverse Drug Reaction</h3>
        </div>
        <p className="text-xs text-gray-500">All fields marked * are required. You do not need to be logged in to submit.</p>
      </div>

      {/* Drug Info */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-medium tracking-[1.5px] uppercase text-gray-500 mb-3">Drug / Medication Details</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Drug / Medication Name *</label>
            <input type="text" required value={form.drugName} onChange={e => setForm(p => ({ ...p, drugName: e.target.value }))} placeholder="e.g. Paracetamol, Artemether" className={INPUT} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Dose Taken *</label>
            <input type="text" required value={form.doseTaken} onChange={e => setForm(p => ({ ...p, doseTaken: e.target.value }))} placeholder="e.g. 500mg twice daily" className={INPUT} />
          </div>
        </div>
      </fieldset>

      {/* Side Effects */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium tracking-[1.5px] uppercase text-gray-500 mb-1">Type of Side Effects Experienced *</legend>
        <p className="text-xs text-gray-600 mb-2">
          <strong className="text-[#1A2332]">Tick everything that applies</strong> — you can select as many as you experienced.
          {form.sideEffects.length > 0 && <span className="ml-1 text-[#1F7A74] font-semibold">{form.sideEffects.length} selected</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {SIDE_EFFECT_TYPES.map(s => {
            const on = form.sideEffects.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleSideEffect(s)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all ${
                  on ? 'bg-red-500/15 border-red-500/40 text-red-700'
                     : 'bg-white border-black/10 text-gray-600 hover:text-gray-800 hover:border-black/25'
                }`}>
                {on ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5 opacity-50" />}
                {s}
              </button>
            );
          })}
        </div>
        {form.sideEffects.length === 0 && <p className="text-xs text-gray-600">Select at least one side effect to continue.</p>}
      </fieldset>

      {/* Severity */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium tracking-[1.5px] uppercase text-gray-500 mb-3">Severity</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SEVERITY_OPTIONS.map(s => (
            <button key={s.value} type="button" onClick={() => setForm(p => ({ ...p, severity: s.value }))}
              className={`rounded-xl border p-3 text-left transition-all ${
                form.severity === s.value
                  ? 'bg-black/5 border-black/15 shadow-lg'
                  : 'bg-transparent border-black/5 hover:border-black/10'
              }`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-medium text-[#1A2332]">{s.label}</span>
              </div>
              <span className="text-[10px] text-gray-500 leading-snug block">{s.desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Patient Info */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-medium tracking-[1.5px] uppercase text-gray-500 mb-3">Patient Information</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Age (years) *</label>
            <Stepper value={form.patientAge} onChange={v => setForm(p => ({ ...p, patientAge: v }))} min={0} max={120} placeholder="Age" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Gender *</label>
            <select required value={form.patientGender} onChange={e => setForm(p => ({ ...p, patientGender: e.target.value }))} className={INPUT}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {showWeight && (
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Weight (kg) *</label>
              <input type="text" inputMode="decimal" required value={form.patientWeight}
                onChange={e => setForm(p => ({ ...p, patientWeight: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder="Weight in kg" className={INPUT} />
            </div>
          )}
        </div>

        {showPregnant && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-pink-500/5 border border-pink-500/20">
            <span className="text-sm text-[#1A2332] font-medium flex-1">Is the patient pregnant? <span className="text-gray-500 font-normal">(tick whichever applies)</span></span>
            <YesNo name="Pregnant" value={form.isPregnant} onChange={v => setForm(p => ({ ...p, isPregnant: v }))} />
          </div>
        )}
      </fieldset>

      {/* Other medication */}
      <div>
        <label className="block text-sm text-gray-700 mb-1.5">Other Medication Currently in Use</label>
        <input type="text" value={form.otherMedication} onChange={e => setForm(p => ({ ...p, otherMedication: e.target.value }))} placeholder="e.g. Metformin 500mg, ARVs" className={INPUT} />
      </div>

      {/* Reaction timeline table */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium tracking-[1.5px] uppercase text-gray-500 mb-1">Additional Details — Reaction Timeline</legend>
        <p className="text-xs text-gray-600 mb-2">These three answers are what our surveillance team tracks most closely. Please answer them if you can.</p>
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] items-center gap-3 px-5 py-4 border-b border-black/8">
            <div>
              <div className="text-sm font-medium text-[#1A2332]">1. When did it start?</div>
              <div className="text-[11.5px] text-gray-500">How many days after taking the medicine did the reaction begin?</div>
            </div>
            <Stepper value={form.onsetDaysAgo} onChange={v => setForm(p => ({ ...p, onsetDaysAgo: v }))} min={0} max={365} placeholder="0" suffix="days" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] items-center gap-3 px-5 py-4 border-b border-black/8">
            <div>
              <div className="text-sm font-medium text-[#1A2332]">2. How long did it last?</div>
              <div className="text-[11.5px] text-gray-500">Enter 0 if it is still ongoing.</div>
            </div>
            <Stepper value={form.durationDays} onChange={v => setForm(p => ({ ...p, durationDays: v }))} min={0} max={365} placeholder="0" suffix="days" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] items-center gap-3 px-5 py-4">
            <div>
              <div className="text-sm font-medium text-[#1A2332]">3. Was any treatment given?</div>
              <div className="text-[11.5px] text-gray-500">For the reaction itself — not the original medicine.</div>
            </div>
            <YesNo name="Treatment given" value={form.treatmentGiven} onChange={v => setForm(p => ({ ...p, treatmentGiven: v }))} />
          </div>
          {form.treatmentGiven === true && (
            <div className="px-5 pb-5 pt-1">
              <label className="block text-[12.5px] text-gray-700 mb-1.5">What treatment was given?</label>
              <input type="text" value={form.treatmentDetails} onChange={e => setForm(p => ({ ...p, treatmentDetails: e.target.value }))} placeholder="e.g. antihistamine, admitted overnight, drug stopped" className={INPUT} />
            </div>
          )}
        </div>
      </fieldset>

      {/* Location */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-medium tracking-[1.5px] uppercase text-gray-500 mb-3">Location</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Country *</label>
            <select required value={form.country}
              onChange={e => setForm(p => ({ ...p, country: e.target.value, province: '' }))}
              className={INPUT}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">{regionLabel(form.country)}</label>
            {regions ? (
              <select value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))} className={INPUT}>
                <option value="">Select {regionLabel(form.country).toLowerCase()}</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <input type="text" value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))} placeholder="Type your county / state / province" className={INPUT} />
            )}
          </div>
        </div>
      </fieldset>

      {/* Free-text */}
      <div>
        <label className="block text-sm text-gray-700 mb-1.5">Anything else we should know?</label>
        <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the reaction in your own words — what happened, what you did, how the patient is now." className={`${INPUT} resize-none`} />
      </div>

      {/* Optional contact for acknowledgement */}
      <div>
        <label className="block text-sm text-gray-700 mb-1.5">Your Email <span className="text-gray-500">(optional)</span></label>
        <input type="email" value={form.reporterEmail} onChange={e => setForm(p => ({ ...p, reporterEmail: e.target.value }))} placeholder="you@example.com — to receive a confirmation" className={INPUT} />
        <p className="mt-1 text-[11px] text-gray-600">We&apos;ll only use this to confirm your report was received. Your report is kept confidential.</p>
      </div>

      {/* Consent */}
      <div className="rounded-xl border border-[#1F7A74]/20 bg-[#1F7A74]/5 p-5 space-y-3">
        <p className="text-xs text-gray-700 leading-relaxed">
          The information you provide shall be used solely for the purpose of improving health services and post-market surveillance, in line with the <strong className="text-[#1A2332]">Data Protection Act, 2019</strong>. No harm is anticipated from the use of this information. Your identity and personal details will remain confidential.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.consent} onChange={e => setForm(p => ({ ...p, consent: e.target.checked }))} className="mt-0.5 rounded border-black/20 accent-[#1F7A74]" />
          <span className="text-sm text-gray-700">I understand and give my consent to submit this report.</span>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting || form.sideEffects.length === 0 || !form.consent}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C81E1E] to-[#B91C1C] text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-40">
        <Send className="h-4 w-4" />
        {submitting ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  );
}
