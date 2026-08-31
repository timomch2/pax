'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import type { ModuleData } from '@/lib/modules-data';
import { modulesData } from '@/lib/modules-data';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const MODULE_ROLE_PRESET: Record<string, string> = {
  'innovation-hub': 'innovator',
  'investment-platform': 'investor',
  'practitioners-hub': 'practitioner',
};

export function ModuleIntroPage({ module: mod }: { module: ModuleData }) {
  const router = useRouter();

  const rolePreset = MODULE_ROLE_PRESET[mod.slug];
  const isSafety = mod.slug === 'safety-hub';
  const registerHref = isSafety ? '/safety' : (rolePreset ? `/register?role=${rolePreset}` : '/register');

  const currentIndex = modulesData.findIndex((m) => m.slug === mod.slug);
  const prevModule = currentIndex > 0 ? modulesData[currentIndex - 1] : null;
  const nextModule = currentIndex < modulesData.length - 1 ? modulesData[currentIndex + 1] : null;

  return (
    <MarketingShell>
      {/* ─── Hero with photo ─── */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <Image
          src={mod.heroImage}
          alt={mod.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${mod.color}E8 0%, ${mod.color}B0 40%, rgba(26,35,50,0.75) 100%)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        <div className="relative z-10 max-w-[900px] mx-auto px-6 md:px-12 py-20">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-semibold tracking-[2px] uppercase text-white mb-6"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
              Module {mod.num} — {mod.tagline}
            </div>
            <h1 className="font-serif text-[clamp(2.5rem,5vw,4rem)] font-light leading-[1.1] text-white mb-6 drop-shadow-lg">
              {mod.title}
            </h1>
            <p className="text-lg text-white/85 leading-relaxed max-w-[640px] mb-8 drop-shadow">
              {mod.heroDescription}
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push(registerHref)}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#FBBF24] text-[14px] font-bold text-[#1A2332] hover:gap-3 hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(251,191,36,0.4)] transition-all cursor-pointer border-0"
              >
                {isSafety ? 'Report Now' : 'Get Started'} <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/#platform"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/30 text-[14px] font-medium text-white no-underline hover:bg-white/10 transition-all"
              >
                All Modules
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Why It Matters — value prop with accent card ─── */}
      <section className="py-20 px-6 md:px-12 bg-[#FAF8F5]">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fadeUp}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[2px] uppercase mb-5" style={{ color: mod.color }}>
                  <span className="w-6 h-px" style={{ background: mod.color }} />Why It Matters
                </div>
                <h2 className="font-serif text-[clamp(1.8rem,3.5vw,2.5rem)] font-light text-[#1A2332] leading-tight mb-6">
                  The <em style={{ color: mod.color }} className="font-light not-italic">Problem</em> We Solve
                </h2>
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  {mod.valueProposition}
                </p>
              </div>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
                <Image src={mod.heroImage} alt={`${mod.title} in action`} fill sizes="550px" className="object-cover" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${mod.color}40 0%, transparent 60%)` }} />
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                    <div className="text-[11px] font-bold tracking-[1.5px] uppercase mb-1" style={{ color: mod.color }}>
                      {mod.emoji} {mod.tagline}
                    </div>
                    <div className="text-[13px] text-gray-600">
                      {mod.features.length} features · {mod.howItWorks.length} steps to get started
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features — photo-topped cards (matching landing "What You Get") ─── */}
      <section className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <motion.div {...fadeUp} className="mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-semibold tracking-[2px] uppercase text-white mb-5"
              style={{ background: `linear-gradient(90deg, ${mod.color}, ${mod.color}C4)`, boxShadow: `0 6px 18px ${mod.color}38` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/85" />
              Features
            </div>
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold text-[#1A2332] leading-tight">
              What&apos;s <em style={{ color: mod.color }} className="font-semibold not-italic">Inside</em>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mod.features.map((feature, i) => (
              <motion.div
                key={feature.title}
                {...fadeUp}
                transition={{ delay: i * 0.06 }}
                style={{ borderColor: `${mod.color}2E`, boxShadow: `0 8px 24px ${mod.color}12` }}
                className="overflow-hidden border rounded-2xl bg-white hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${mod.color}, ${mod.color}80)` }} />
                <div className="p-6">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                    style={{ background: `${mod.color}14`, border: `1px solid ${mod.color}25` }}>
                    {feature.icon}
                  </div>
                  <div className="font-semibold text-[15px] text-[#1A2332] mb-2">{feature.title}</div>
                  <div className="text-[13px] text-gray-500 leading-relaxed">{feature.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works — visual timeline with photo ─── */}
      <section className="py-20 px-6 md:px-12 bg-gradient-to-br from-[#E3F1EF] via-[#FAF8F5] to-[#EDE7FA]">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fadeUp} className="mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-semibold tracking-[2px] uppercase text-white mb-5"
              style={{ background: `linear-gradient(90deg, ${mod.color}, ${mod.color}C4)`, boxShadow: `0 6px 18px ${mod.color}38` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/85" />
              How It Works
            </div>
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold text-[#1A2332] leading-tight">
              Getting <em style={{ color: mod.color }} className="font-semibold not-italic">Started</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Steps */}
            <div className="flex flex-col gap-0 relative">
              <div className="absolute left-[18px] top-4 bottom-4 w-px" style={{ background: `${mod.color}30` }} />
              {mod.howItWorks.map((step, i) => (
                <motion.div
                  key={step.step}
                  {...fadeUp}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-5 py-5 relative group"
                >
                  <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0 relative z-10 shadow-md"
                    style={{ background: `linear-gradient(135deg, ${mod.color}, ${mod.color}C0)` }}>
                    {step.step}
                  </div>
                  <div className="bg-white rounded-xl p-5 flex-1 border border-black/5 shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all">
                    <div className="font-semibold text-[15px] text-[#1A2332] mb-1.5">{step.title}</div>
                    <div className="text-[13px] text-gray-500 leading-relaxed">{step.description}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Photo */}
            <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="hidden lg:block sticky top-[120px]">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
                <Image src={mod.heroImage} alt={`${mod.title} process`} fill sizes="500px" className="object-cover" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${mod.color}50 0%, transparent 50%)` }} />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="text-white font-display text-xl font-semibold drop-shadow-lg">
                    {mod.howItWorks.length} simple steps
                  </div>
                  <div className="text-white/80 text-[13px] mt-1 drop-shadow">
                    From sign-up to full access
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Who It's For — role cards ─── */}
      <section className="py-20 px-6 md:px-12 bg-[#FAF8F5]">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fadeUp} className="mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-semibold tracking-[2px] uppercase text-white mb-5"
              style={{ background: `linear-gradient(90deg, ${mod.color}, ${mod.color}C4)`, boxShadow: `0 6px 18px ${mod.color}38` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/85" />
              Who It&apos;s For
            </div>
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold text-[#1A2332] leading-tight">
              Built for <em style={{ color: mod.color }} className="font-semibold not-italic">You</em>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mod.whoIsItFor.map((who, i) => (
              <motion.div
                key={who.role}
                {...fadeUp}
                transition={{ delay: i * 0.06 }}
                className="bg-white border border-black/5 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[14px] font-bold mb-4 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${mod.color}, ${mod.color}B0)` }}>
                  {who.role.charAt(0)}
                </div>
                <div className="font-semibold text-[15px] text-[#1A2332] mb-2">{who.role}</div>
                <div className="text-[13px] text-gray-500 leading-relaxed">{who.benefit}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA — teal gradient matching landing ─── */}
      <section className="relative py-24 px-6 md:px-12 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${mod.color} 0%, #1A2332 100%)` }} />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-[680px] mx-auto text-center relative z-10">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 text-3xl mb-6">
              {mod.emoji}
            </div>
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] font-light text-white leading-tight mb-6">
              {mod.ctaTitle}
            </h2>
            <p className="text-base text-white/75 leading-relaxed max-w-[520px] mx-auto mb-10">
              {mod.ctaDescription}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push(registerHref)}
                className="px-8 py-3.5 rounded-full bg-[#FBBF24] text-[15px] font-bold text-[#1A2332] hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(251,191,36,0.4)] transition-all cursor-pointer border-0"
              >
                {isSafety ? 'Report Now' : 'Get Started'}
              </button>
              <Link
                href="/#platform"
                className="px-8 py-3.5 border border-white/25 rounded-full text-[15px] font-medium text-white/90 no-underline hover:bg-white/10 transition-all"
              >
                View All Modules
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Module Navigation ─── */}
      <section className="py-8 px-6 md:px-12 bg-[#F1EEE8] border-t border-black/5">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between">
          {prevModule ? (
            <Link href={`/modules/${prevModule.slug}`} className="flex items-center gap-3 text-gray-500 hover:text-[#1A2332] transition-colors no-underline group">
              <span className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center group-hover:border-[#1F7A74] group-hover:text-[#1F7A74] transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Previous</div>
                <div className="text-sm font-medium">{prevModule.emoji} {prevModule.title}</div>
              </div>
            </Link>
          ) : <div />}
          {nextModule ? (
            <Link href={`/modules/${nextModule.slug}`} className="flex items-center gap-3 text-gray-500 hover:text-[#1A2332] transition-colors no-underline group text-right">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Next</div>
                <div className="text-sm font-medium">{nextModule.emoji} {nextModule.title}</div>
              </div>
              <span className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center group-hover:border-[#1F7A74] group-hover:text-[#1F7A74] transition-colors">
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          ) : <div />}
        </div>
      </section>
    </MarketingShell>
  );
}
