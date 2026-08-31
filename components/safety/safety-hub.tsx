'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, ArrowRight, AlertTriangle, MessageSquare, ShieldCheck, Lock, Users,
  BarChart3, Bell, ChevronDown, Clock, FileCheck, Globe2, Siren, Stethoscope, Pill,
} from 'lucide-react';
import DrugReportForm from './drug-report-form';
import ProductFeedbackForm from './product-feedback-form';
import { PaxLogo } from '@/components/brand/pax-logo';

const TABS = [
  {
    id: 'drug',
    label: 'Report a Drug Side Effect',
    short: 'Drug Report',
    blurb: 'Something you or a patient took caused an unexpected reaction. Tell us what happened.',
    icon: AlertTriangle,
    color: '#C81E1E',
  },
  {
    id: 'product',
    label: 'Review a Product or Technology',
    short: 'Product Review',
    blurb: 'A device, diagnostic, app or supply that worked well — or badly. Put it on the record.',
    icon: MessageSquare,
    color: '#1F7A74',
  },
] as const;

type TabId = typeof TABS[number]['id'];

const WHY = [
  {
    Icon: Globe2,
    color: '#1F7A74',
    title: 'Most side effects are never reported',
    body: 'The World Health Organization estimates that fewer than one in ten adverse drug reactions ever reaches a regulator. In much of Africa and South Asia the reporting rate is lower still — not because the reactions do not happen, but because the route to report them is long, formal and unfamiliar. A signal that nobody records is a signal that nobody can act on.',
  },
  {
    Icon: Users,
    color: '#B26F09',
    title: 'You do not need to be a clinician',
    body: 'Patients, carers, pharmacists, nurses, community health workers and doctors can all report here. You do not need an account, a licence number or a referral. If you are a verified PAX practitioner your report is tagged as an expert observation and carries extra weight in the analysis — but everyone\u2019s report counts.',
  },
  {
    Icon: BarChart3,
    color: '#6A5CBF',
    title: 'Individual reports become patterns',
    body: 'One report of a rash is an anecdote. Forty reports of the same rash, on the same molecule, from the same three counties, is a safety signal. PAX groups reports by drug, batch, geography and severity so that patterns surface early — and then puts those patterns in front of the people who regulate, prescribe and supply.',
  },
  {
    Icon: Bell,
    color: '#C81E1E',
    title: 'Feedback closes the loop',
    body: 'Product and technology reviews sit alongside the drug reports. A glucometer that drifts out of calibration, a rapid test with a high false-negative rate, a cold-chain box that fails in the heat — these are safety issues too, and they rarely appear in any formal register. Here they do.',
  },
];

const JOURNEY = [
  { Icon: FileCheck, title: 'You submit', body: 'Takes two to four minutes. Only the drug or product name and what happened are required — everything else helps but is optional.', color: '#C81E1E' },
  { Icon: Lock, title: 'It is de-identified', body: 'Your name is never required. If you leave an email it is used only to acknowledge the report, and is never published or shared with a manufacturer.', color: '#B26F09' },
  { Icon: BarChart3, title: 'It is analysed', body: 'The report joins the surveillance database and is scored for severity, then clustered with similar reports by molecule, batch, region and patient group.', color: '#6A5CBF' },
  { Icon: Siren, title: 'Signals are escalated', body: 'When a cluster crosses a threshold it is flagged in the quarterly surveillance summary that goes to practitioners, institutions and regulators.', color: '#1F7A74' },
];

const FAQ = [
  {
    q: 'Do I have to give my name?',
    a: 'No. Every field that could identify you is optional. You can submit a completely anonymous report. We ask for an email only so that we can acknowledge receipt and come back to you if a regulator needs a clarifying detail — and you can leave it blank.',
  },
  {
    q: 'What if I am not sure the drug caused it?',
    a: 'Report it anyway. Causality is not your job to establish — that is exactly what the analysis is for. Pharmacovigilance works on suspicion, not proof. A report that turns out to be unrelated costs nothing; a reaction that is never reported can cost a life.',
  },
  {
    q: 'Can I report about a drug bought outside a pharmacy?',
    a: 'Yes, and please do. Informally supplied, donated, imported and substandard medicines are exactly where surveillance is weakest. Tell us where it came from in the description field if you know.',
  },
  {
    q: 'Is this the same as reporting to my national regulator?',
    a: 'No — it is complementary, not a replacement. If your country has a pharmacovigilance authority you should still report to them, and we will always encourage that. PAX exists to catch the reports that would otherwise never be made at all, and to make the aggregate picture visible across borders.',
  },
  {
    q: 'What happens in an emergency?',
    a: 'This form is not monitored in real time and is not a substitute for care. If you or someone else is having a severe reaction — difficulty breathing, swelling of the face or throat, collapse, chest pain — go to the nearest health facility or call emergency services immediately. Report here afterwards.',
  },
  {
    q: 'Who sees my report?',
    a: 'De-identified reports are visible to the PAX safety team and, in aggregated form, to verified practitioners, institutions and policymakers through the surveillance dashboard and the quarterly summary. Raw reports with contact details are never published.',
  },
];

function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div
            key={f.q}
            className="rounded-2xl bg-white border transition-all"
            style={{ borderColor: isOpen ? '#1F7A7455' : 'rgba(0,0,0,0.07)', boxShadow: isOpen ? '0 10px 30px rgba(31,122,116,0.12)' : 'none' }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
            >
              <span className="font-semibold text-[15px] text-[#1A2332]">{f.q}</span>
              <ChevronDown
                className="w-5 h-5 flex-shrink-0 transition-transform duration-300"
                style={{ color: '#1F7A74', transform: isOpen ? 'rotate(180deg)' : 'none' }}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-6 text-[14px] text-gray-600 leading-relaxed">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function SafetyHub() {
  const [tab, setTab] = useState<TabId>('drug');
  const formRef = useRef<HTMLDivElement>(null);

  const jump = (id: TabId) => {
    setTab(id);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* ─── Photographic hero ─── */}
      <section className="relative min-h-[74vh] flex items-center overflow-hidden">
        <Image
          src="/img/safety-hero.jpg?v=3"
          alt="Pharmacist explaining medication to a patient in a community pharmacy"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_center]"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(100deg, rgba(9,32,30,0.97) 0%, rgba(12,44,41,0.93) 34%, rgba(14,52,49,0.68) 56%, rgba(14,52,49,0.18) 80%, rgba(14,52,49,0.02) 100%)' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FAF8F5]/90 to-transparent" />

        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 md:px-12 py-20">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-[640px]">
            <div className="flex items-center justify-between gap-4 mb-8">
              <Link href="/" className="no-underline">
                <PaxLogo size="sm" tone="dark" />
              </Link>
              <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-[13px] transition-colors no-underline">
                <ArrowLeft className="h-4 w-4" /> Back to Home
              </Link>
            </div>

            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-bold tracking-[2px] uppercase text-white mb-6"
              style={{ background: 'linear-gradient(90deg,#C81E1E,#E23A3A)', boxShadow: '0 8px 22px rgba(200,30,30,0.35)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/85 animate-pulse" />
              Pharmacovigilance &amp; Safety
            </span>

            <h1 className="font-display text-[clamp(2.2rem,4.8vw,3.8rem)] font-semibold text-white leading-[1.07] mb-6">
              If a medicine harmed you,<br />
              <span className="text-[#5FD6C6]">somebody needs to know.</span>
            </h1>

            <p className="text-[15px] md:text-[17px] text-white/95 leading-relaxed mb-9 max-w-[560px]">
              The Safety &amp; Feedback Hub is open to everyone — patient, carer, nurse, pharmacist or
              doctor. No account. No login. No fee. Report an adverse drug reaction, or tell us how a
              health product actually performed in the field. Two minutes of your time becomes evidence
              that protects the next person.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <button
                onClick={() => jump('drug')}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#FBBF24] text-[14px] font-bold text-[#12403C] shadow-[0_10px_30px_rgba(251,191,36,0.35)] hover:-translate-y-0.5 transition-all"
              >
                <AlertTriangle className="w-4 h-4" /> Report a Side Effect
              </button>
              <button
                onClick={() => jump('product')}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/45 text-[14px] font-medium text-white hover:bg-white hover:text-[#12403C] transition-all"
              >
                <MessageSquare className="w-4 h-4" /> Review a Product
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
              {[
                { Icon: Lock, label: 'Anonymous by default' },
                { Icon: Clock, label: 'Around two minutes' },
                { Icon: Stethoscope, label: 'Reviewed by clinicians' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 text-white/85">
                  <s.Icon className="w-4 h-4 text-[#5FD6C6]" strokeWidth={1.9} />
                  <span className="text-[12.5px] tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Emergency notice ─── */}
      <section className="px-6 md:px-12 -mt-8 relative z-20">
        <div className="max-w-[1100px] mx-auto">
          <div className="rounded-2xl bg-white border border-[#C81E1E]/25 shadow-[0_14px_40px_rgba(200,30,30,0.12)] px-6 py-5 flex items-start gap-4">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#C81E1E]/12 text-[#C81E1E]">
              <Siren className="w-5 h-5" strokeWidth={2} />
            </span>
            <p className="text-[13.5px] text-gray-700 leading-relaxed">
              <strong className="text-[#C81E1E]">This is not an emergency service.</strong>{' '}
              Reports here are reviewed periodically, not in real time. If you or someone with you is having a
              severe reaction — difficulty breathing, swelling of the face or throat, collapse, chest pain or
              severe bleeding — go to the nearest health facility or call emergency services now. Come back and
              file the report afterwards; it will still count.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Why it matters ─── */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-12 max-w-[720px]">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-semibold tracking-[2px] uppercase text-white mb-5"
              style={{ background: 'linear-gradient(90deg,#1F7A74,#1F7A74C4)', boxShadow: '0 6px 18px rgba(31,122,116,0.22)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/85" />Why it matters
            </span>
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.7rem)] font-semibold text-[#1A2332] leading-tight mb-4">
              Safety data is only as good as the reports behind it.
            </h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">
              Post-market surveillance is the stage of a medicine&apos;s life where the real world finally tests
              what the trials could not. Rare reactions, interactions in people taking four other things,
              batch-to-batch variation, counterfeits — none of it shows up until a medicine is in ordinary
              hands. That evidence has to come from the people holding it.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {WHY.map((w, i) => (
              <motion.div
                key={w.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl bg-white border p-7 hover:-translate-y-1 transition-transform duration-300"
                style={{ borderColor: `${w.color}2E`, boxShadow: `0 10px 28px ${w.color}14` }}
              >
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${w.color}18`, color: w.color }}>
                  <w.Icon className="w-5 h-5" strokeWidth={1.9} />
                </span>
                <h3 className="font-semibold text-[16px] text-[#1A2332] mb-3">{w.title}</h3>
                <p className="text-[13.5px] text-gray-600 leading-relaxed">{w.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What happens to your report ─── */}
      <section className="py-20 px-6 md:px-12 bg-white border-y border-black/5">
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-12 max-w-[680px]">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-semibold tracking-[2px] uppercase text-white mb-5"
              style={{ background: 'linear-gradient(90deg,#B26F09,#B26F09C4)', boxShadow: '0 6px 18px rgba(178,111,9,0.22)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/85" />What happens next
            </span>
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.7rem)] font-semibold text-[#1A2332] leading-tight mb-4">
              Where your report goes.
            </h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">
              People hesitate to report because they do not know what happens afterwards. Here is the whole
              chain, end to end.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {JOURNEY.map((j, i) => (
              <motion.div
                key={j.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative rounded-2xl p-6 border"
                style={{ borderColor: `${j.color}2E`, background: `linear-gradient(160deg, ${j.color}12 0%, #FFFFFF 60%)` }}
              >
                <span className="absolute top-5 right-5 text-[30px] font-bold leading-none" style={{ color: `${j.color}24` }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${j.color}1C`, color: j.color }}>
                  <j.Icon className="w-5 h-5" strokeWidth={1.9} />
                </span>
                <h3 className="font-semibold text-[15px] text-[#1A2332] mb-2">{j.title}</h3>
                <p className="text-[13px] text-gray-600 leading-relaxed">{j.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The forms ─── */}
      <section ref={formRef} className="py-20 px-6 md:px-12 scroll-mt-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="mb-9 text-center max-w-[620px] mx-auto">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-semibold tracking-[2px] uppercase text-white mb-5"
              style={{ background: 'linear-gradient(90deg,#C81E1E,#C81E1EC4)', boxShadow: '0 6px 18px rgba(200,30,30,0.22)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/85" />Make a report
            </span>
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold text-[#1A2332] leading-tight mb-3">
              Choose what you want to tell us.
            </h2>
            <p className="text-[14.5px] text-gray-600 leading-relaxed">
              Only two fields are required. Everything else sharpens the signal — fill in what you know and
              leave the rest blank.
            </p>
          </div>

          {/* Big card tab switcher */}
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="relative text-left rounded-2xl p-6 border transition-all duration-300"
                  style={{
                    borderColor: active ? t.color : 'rgba(0,0,0,0.08)',
                    background: active ? `linear-gradient(150deg, ${t.color}16 0%, #FFFFFF 65%)` : '#FFFFFF',
                    boxShadow: active ? `0 14px 36px ${t.color}22` : '0 2px 10px rgba(0,0,0,0.04)',
                    transform: active ? 'translateY(-3px)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: active ? t.color : `${t.color}16`, color: active ? '#FFFFFF' : t.color }}
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.9} />
                    </span>
                    <span className="font-semibold text-[15px] text-[#1A2332] leading-tight">{t.label}</span>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{t.blurb}</p>
                  {active && (
                    <motion.span
                      layoutId="tab-underline"
                      className="absolute left-6 right-6 bottom-0 h-[3px] rounded-full"
                      style={{ background: t.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
            >
              {tab === 'drug' ? <DrugReportForm /> : <ProductFeedbackForm />}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 px-6 md:px-12 bg-gradient-to-b from-white to-[#F1EEE8] border-t border-black/5">
        <div className="max-w-[860px] mx-auto">
          <div className="mb-10">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-semibold tracking-[2px] uppercase text-white mb-5"
              style={{ background: 'linear-gradient(90deg,#6A5CBF,#6A5CBFC4)', boxShadow: '0 6px 18px rgba(106,92,191,0.22)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/85" />Common questions
            </span>
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold text-[#1A2332] leading-tight">
              Before you report.
            </h2>
          </div>
          <Accordion items={FAQ} />
        </div>
      </section>

      {/* ─── Closing band ─── */}
      <section className="py-20 px-6 md:px-12 relative overflow-hidden" style={{ background: 'linear-gradient(125deg,#15908A 0%,#1F7A74 40%,#3F5FB0 100%)' }}>
        <div className="max-w-[820px] mx-auto text-center relative z-10">
          <span className="inline-flex w-14 h-14 rounded-2xl items-center justify-center bg-white/15 border border-white/25 mb-6">
            <ShieldCheck className="w-6 h-6 text-white" strokeWidth={1.9} />
          </span>
          <h2 className="font-display text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold text-white leading-tight mb-4">
            Every report makes the next prescription safer.
          </h2>
          <p className="text-[15px] text-white/95 leading-relaxed mb-9 max-w-[600px] mx-auto">
            You do not need permission, credentials or an account to contribute to this. If something went
            wrong with a medicine or a health product, that is knowledge the system does not currently have —
            and it only reaches it if you put it there.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => jump('drug')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[14px] font-bold text-[#12403C] hover:gap-3 transition-all"
            >
              <Pill className="w-4 h-4" /> Report a Side Effect
            </button>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/45 text-[14px] font-medium text-white no-underline hover:bg-white hover:text-[#12403C] transition-all"
            >
              Join PAX as a Practitioner <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
