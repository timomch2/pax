'use client';

import { useEffect, useRef, useState } from 'react';

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey || !turnstileRef.current) return;
    (window as any).paxTurnstileCallback = (token: string) => setTurnstileToken(token);
    const render = () => (window as any).turnstile?.render(turnstileRef.current, { sitekey, callback: (window as any).paxTurnstileCallback });
    if ((window as any).turnstile) render();
    else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    }
    return () => { delete (window as any).paxTurnstileCallback; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstileToken: turnstileToken || null }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to send');
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '', website: '' });
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Something went wrong. Please try again.');
    }
  };

  const inputCls =
    'w-full rounded-lg bg-white border border-black/10 px-4 py-3 text-sm text-[#1A2332] placeholder:text-gray-500 focus:border-[#1F7A74] focus:outline-none focus:ring-1 focus:ring-[#1F7A74] transition-colors';

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-[#1F7A74]/30 bg-[#1F7A74]/10 p-8 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="font-semibold text-lg text-[#1A2332] mb-2">Message sent</h3>
        <p className="text-sm text-gray-600">Thank you for reaching out. The PAX team will get back to you shortly.</p>
        <button onClick={() => setStatus('idle')} className="mt-6 px-5 py-2.5 rounded-lg border border-black/15 text-sm text-gray-700 hover:border-[#1F7A74] hover:text-[#1F7A74] transition-all">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-black/5 bg-[#FFFFFF] p-6 md:p-8 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
          <input className={inputCls} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
          <input type="email" className={inputCls} value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" required />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Subject</label>
        <input className={inputCls} value={form.subject} onChange={(e) => update('subject', e.target.value)} placeholder="How can we help?" required />
      </div>
      <div className="absolute -left-[10000px]" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update('website', event.target.value)} /></div>
      <div ref={turnstileRef} />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Message</label>
        <textarea className={`${inputCls} min-h-[140px] resize-y`} value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="Tell us a little more..." required />
      </div>
      {status === 'error' && <p className="text-sm text-[#C81E1E]">{error}</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full px-6 py-3.5 bg-[#1F7A74] rounded-lg text-[15px] font-semibold text-white hover:bg-[#186963] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
