'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Star, Send, CheckCircle2, Package, ShieldCheck, FileText, Mail } from 'lucide-react';
import { resolveFeedbackTier } from '@/lib/feedback-weight';
import { COUNTRIES, regionsFor, regionLabel } from '@/lib/geo';

const EMPTY = {
  productName: '', productSize: '', isOnPlatform: false,
  rating: 0, comment: '', evidenceUrl: '', province: '', country: 'Kenya',
  reporterEmail: '', consent: false,
};

export default function ProductFeedbackForm() {
  const { data: session } = useSession() || {};
  const isExpert = session?.user?.role === 'PRACTITIONER';

  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [hover, setHover] = useState(0);

  const hasComment = !!form.comment.trim();
  const hasEvidence = isExpert && !!form.evidenceUrl.trim();
  const tier = resolveFeedbackTier({ isExpert, hasComment, hasEvidence });
  const regions = regionsFor(form.country) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.rating === 0) { setError('Please select a star rating'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/safety/product-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Submission failed');
      }
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
        <h3 className="text-xl font-medium text-[#1A2332] mb-2">Feedback Submitted</h3>
        <p className="text-gray-600 text-sm mb-6">Your review helps others make informed health decisions. Thank you!</p>
        <button onClick={() => { setSuccess(false); setForm(EMPTY); setHover(0); }} className="text-[#15908A] text-sm hover:underline">
          Submit another review
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-[#1F7A74]/15 bg-[#1F7A74]/5 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-4 w-4 text-[#15908A]" />
          <h3 className="text-sm font-medium text-[#15908A]">Product & Technology Feedback</h3>
        </div>
        <p className="text-xs text-gray-500">Rate and review health products or technologies — whether they&apos;re listed on PAX or not. Reviews are weighted: a comment counts more than a bare star, and verified experts — especially with evidence — carry the most weight.</p>
      </div>

      {/* Product Info */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-medium tracking-[1.5px] uppercase text-gray-500 mb-3">Product / Technology Details</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Product / Technology Name *</label>
            <input type="text" required value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} placeholder="e.g. Mama Kit, Digital Thermometer X200" className="w-full rounded-lg bg-black/5 border border-black/10 px-4 py-2.5 text-sm text-[#1A2332] placeholder-gray-600 focus:border-[#1F7A74] focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Size / Specification</label>
            <input type="text" value={form.productSize} onChange={e => setForm(p => ({ ...p, productSize: e.target.value }))} placeholder="e.g. 500ml, Large, Version 2.0" className="w-full rounded-lg bg-black/5 border border-black/10 px-4 py-2.5 text-sm text-[#1A2332] placeholder-gray-600 focus:border-[#1F7A74] focus:outline-none" />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.isOnPlatform} onChange={e => setForm(p => ({ ...p, isOnPlatform: e.target.checked }))} className="rounded border-black/20" />
          <span className="text-sm text-gray-600">This product is listed on the PAX Marketplace</span>
        </label>
      </fieldset>

      {/* Star Rating */}
      <fieldset>
        <legend className="text-xs font-medium tracking-[1.5px] uppercase text-gray-500 mb-3">Your Rating *</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} type="button"
              onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}
              onClick={() => setForm(p => ({ ...p, rating: star }))}
              className="p-1 transition-transform hover:scale-110">
              <Star className={`h-8 w-8 transition-colors ${
                star <= (hover || form.rating)
                  ? 'text-[#B26F09] fill-[#B26F09]'
                  : 'text-gray-700'
              }`} />
            </button>
          ))}
          {form.rating > 0 && (
            <span className="ml-3 text-sm text-gray-600 self-center">
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][form.rating]}
            </span>
          )}
        </div>
      </fieldset>

      {/* Comment */}
      <div>
        <label className="block text-sm text-gray-700 mb-1.5">Your Review <span className="text-gray-600">(adds weight to your rating)</span></label>
        <textarea rows={4} value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} placeholder="Share your experience — quality, effectiveness, value for money, any concerns..." className="w-full rounded-lg bg-black/5 border border-black/10 px-4 py-2.5 text-sm text-[#1A2332] placeholder-gray-600 focus:border-[#1F7A74] focus:outline-none resize-none" />
      </div>

      {/* Expert Evidence — only for verified practitioners */}
      {isExpert && (
        <div className="rounded-xl border border-[#1F7A74]/20 bg-[#1F7A74]/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#15908A]" />
            <label className="text-sm font-medium text-[#15908A]">Supporting Evidence <span className="text-gray-500 font-normal">(experts only)</span></label>
          </div>
          <p className="text-xs text-gray-500">Add a link or reference to clinical evidence, a study, or documentation. Evidence-backed expert reviews carry the highest weight (5×).</p>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input type="text" value={form.evidenceUrl} onChange={e => setForm(p => ({ ...p, evidenceUrl: e.target.value }))} placeholder="https://... or citation / reference" className="w-full rounded-lg bg-black/5 border border-black/10 pl-10 pr-4 py-2.5 text-sm text-[#1A2332] placeholder-gray-600 focus:border-[#1F7A74] focus:outline-none" />
          </div>
          <p className="text-[11px] text-gray-600">Evidence requires a written review above to take effect.</p>
        </div>
      )}

      {/* Live tier / weight indicator */}
      {form.rating > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-black/8 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpert && <ShieldCheck className="h-4 w-4 text-[#15908A]" />}
            <span className="text-xs text-gray-600">Review type: <span className="text-[#1A2332] font-medium">{tier.label}</span></span>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#B26F09]/12 border border-[#B26F09]/25 px-3 py-1 text-xs font-semibold text-[#B26F09]">
            {tier.weight}× weight
          </span>
        </div>
      )}

      {/* Location */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-medium tracking-[1.5px] uppercase text-gray-500 mb-3">Location</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Country</label>
            <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value, province: '' }))} className="w-full rounded-lg bg-black/5 border border-black/10 px-4 py-2.5 text-sm text-[#1A2332] focus:border-[#1F7A74] focus:outline-none">
              {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#FFFFFF]">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">{regionLabel(form.country)}</label>
            {regions.length > 0 ? (
              <select value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))} className="w-full rounded-lg bg-black/5 border border-black/10 px-4 py-2.5 text-sm text-[#1A2332] focus:border-[#1F7A74] focus:outline-none">
                <option value="" className="bg-[#FFFFFF]">Select {regionLabel(form.country).toLowerCase()}...</option>
                {regions.map(r => <option key={r} value={r} className="bg-[#FFFFFF]">{r}</option>)}
              </select>
            ) : (
              <input type="text" value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))} placeholder="Type your region" className="w-full rounded-lg bg-black/5 border border-black/10 px-4 py-2.5 text-sm text-[#1A2332] placeholder-gray-600 focus:border-[#1F7A74] focus:outline-none" />
            )}
          </div>
        </div>
      </fieldset>

      {/* Contact */}
      <div>
        <label className="block text-sm text-gray-700 mb-1.5">Your Email <span className="text-gray-500">(optional)</span></label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input type="email" value={form.reporterEmail} onChange={e => setForm(p => ({ ...p, reporterEmail: e.target.value }))} placeholder="you@example.com" className="w-full rounded-lg bg-black/5 border border-black/10 pl-10 pr-4 py-2.5 text-sm text-[#1A2332] placeholder-gray-600 focus:border-[#1F7A74] focus:outline-none" />
        </div>
        <p className="mt-1.5 text-[11px] text-gray-600">We&apos;ll only use this to confirm your feedback was received, or to follow up if we need more detail. It is never published with your review.</p>
      </div>

      {!isExpert && (
        <p className="text-[11px] text-gray-600">Are you a verified practitioner? <a href="/login" className="text-[#15908A] hover:underline">Sign in</a> so your expert review carries extra weight.</p>
      )}

      {/* Consent */}
      <div className="rounded-xl border border-[#1F7A74]/20 bg-[#1F7A74]/5 p-5 space-y-3">
        <p className="text-xs text-gray-700 leading-relaxed">
          The information you provide shall be used solely for the purpose of improving health services and post-market surveillance, in line with the <strong className="text-[#1A2332]">Data Protection Act, 2019</strong>. No harm is anticipated from the use of this information. Your identity and personal details will remain confidential.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.consent} onChange={e => setForm(p => ({ ...p, consent: e.target.checked }))} className="mt-0.5 rounded border-black/20 accent-[#1F7A74]" />
          <span className="text-sm text-gray-700">I understand and give my consent to submit this feedback.</span>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting || form.rating === 0 || !form.consent}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1F7A74] to-[#15908A] text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-40">
        <Send className="h-4 w-4" />
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
}
