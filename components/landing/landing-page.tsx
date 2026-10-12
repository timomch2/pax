'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserMenu } from '@/components/layouts/user-menu';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { PaxLogo } from '@/components/brand/pax-logo';
import { SiteFooter } from '@/components/marketing/site-footer';
import { ModuleNavStrip } from '@/components/marketing/module-nav-strip';
import {
  Microscope, Lightbulb, Scale, Stethoscope, Store, TrendingUp, Target, ShieldCheck,
  Pill, Radio, Siren, Globe2, Lock, HeartPulse, ChevronLeft, ChevronRight, ArrowRight,
  Menu, X,
} from 'lucide-react';

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

/** Coloured band label used above every section heading. */
function Eyebrow({ color, children, center = false }: { color: string; children: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? 'flex justify-center mb-5' : 'mb-5'}>
      <span
        className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-semibold tracking-[2px] uppercase text-white"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}C4)`, boxShadow: `0 6px 18px ${color}38` }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white/85" />
        {children}
      </span>
    </div>
  );
}

const MODULE_SLIDES = [
  { title: 'Innovation Hub', line: 'Showcase your innovation, track its milestones, and get matched to the investors who fund your stage.', img: '/img/mod-innovation.jpg?v=3', color: '#B26F09', slug: 'innovation-hub' },
  { title: 'Talent Marketplace', line: 'Find verified public health professionals — or be found for the work that fits your skills.', img: '/img/mod-talent.jpg?v=3', color: '#6A5CBF', slug: 'talent-marketplace' },
  { title: 'Product Marketplace', line: 'Source and supply health products and technologies through a transparent, peer-reviewed marketplace.', img: '/img/mod-marketplace.jpg?v=3', color: '#C81E1E', slug: 'product-marketplace' },
  { title: 'Investment Platform', line: 'Deterministic matching scores innovations against your mandate, so capital reaches the ideas that actually fit it.', img: '/img/mod-investment.jpg?v=3', color: '#15908A', slug: 'investment-platform' },
  { title: 'Medical Practitioner', line: 'Run your entire practice — invoicing, patients, reminders and finances — free, in one place.', img: '/img/mod-practice.jpg?v=3', color: '#3F5FB0', slug: 'practitioners-hub' },
  { title: 'Knowledge Exchange', line: 'Structured, evidence-backed debate that turns professional argument into publishable consensus briefs.', img: '/img/mod-community.jpg?v=3', color: '#6A5CBF', slug: 'community-debate-hub' },
  { title: 'Pharmacovigilance', line: 'Anyone can report a drug side effect or review a health product — no account, no barrier.', img: '/img/mod-safety.jpg?v=3', color: '#C81E1E', slug: null },
];

function ModuleCarousel() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((d: number) => setIndex((i) => (i + d + MODULE_SLIDES.length) % MODULE_SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % MODULE_SLIDES.length), 5200);
    return () => clearInterval(t);
  }, [paused]);

  const slide = MODULE_SLIDES[index];

  return (
    <div
      className="relative rounded-[28px] overflow-hidden shadow-[0_28px_80px_rgba(26,35,50,0.22)] ring-1 ring-black/5 h-[460px] md:h-[540px] bg-[#0E2A28]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <Image src={slide.img} alt={slide.title} fill priority={index === 0} sizes="(max-width: 1024px) 100vw, 1100px" className="object-cover" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(6,28,26,0.97) 0%, rgba(6,28,26,0.88) 32%, rgba(6,28,26,0.45) 62%, rgba(6,28,26,0.10) 100%)' }} />

      <div className="absolute inset-x-0 bottom-0 p-7 md:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45 }}
            className="max-w-[680px]"
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-bold tracking-[2px] uppercase text-white mb-4"
              style={{ background: slide.color }}
            >
              {String(index + 1).padStart(2, '0')} / {MODULE_SLIDES.length}
            </span>
            <h3 className="font-display text-[clamp(1.7rem,3.4vw,2.6rem)] font-semibold text-white leading-tight mb-3">{slide.title}</h3>
            <p className="text-[15px] md:text-[17px] text-white/95 leading-relaxed mb-6">{slide.line}</p>
            {slide.slug ? (
              <button
                onClick={() => router.push(`/modules/${slide.slug}`)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[13px] font-semibold text-[#12403C] hover:gap-3 transition-all"
              >
                Explore this module <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/safety"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[13px] font-semibold text-[#12403C] no-underline hover:gap-3 transition-all"
              >
                Open the Safety Hub <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        aria-label="Previous module"
        onClick={() => go(-1)}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-[#12403C] transition-all"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        aria-label="Next module"
        onClick={() => go(1)}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-[#12403C] transition-all"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="absolute top-6 right-6 flex items-center gap-1.5">
        {MODULE_SLIDES.map((m, i) => (
          <button
            key={m.title}
            aria-label={`Go to ${m.title}`}
            onClick={() => setIndex(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === index ? 28 : 10, background: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}
          />
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A2332]">
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-[86px] flex items-center justify-between">
          <Link href="/" className="no-underline">
            <PaxLogo size="sm" />
          </Link>
          <ul className="hidden md:flex items-center gap-8 list-none">
            <li><Link href="/about" className="text-[13px] text-gray-600 no-underline tracking-wide hover:text-[#1F7A74] transition-colors">About</Link></li>
            <li><Link href="/find-a-doctor" className="text-[13px] text-primary no-underline tracking-wide">Find a practitioner</Link></li>
            <li><a href="#why" className="text-[13px] text-gray-600 no-underline tracking-wide hover:text-[#1F7A74] transition-colors">Why PAX</a></li>
            <li><a href="#what-is-pax" className="text-[13px] text-gray-600 no-underline tracking-wide hover:text-[#1F7A74] transition-colors">What is PAX</a></li>
            <li><a href="#who" className="text-[13px] text-gray-600 no-underline tracking-wide hover:text-[#1F7A74] transition-colors">Who It&apos;s For</a></li>
            <li><Link href="/safety" className="text-[13px] text-gray-600 no-underline tracking-wide hover:text-[#1F7A74] transition-colors">Safety Hub</Link></li>
            <li><Link href="/contact" className="text-[13px] text-gray-600 no-underline tracking-wide hover:text-[#1F7A74] transition-colors">Contact</Link></li>
          </ul>
          <div className="hidden md:flex items-center gap-3">
            {session?.user?.id ? (
              <UserMenu />
            ) : (
              <>
                <a
                  href="/login"
                  className="px-5 py-2.5 border border-black/15 rounded-lg text-[13px] font-medium text-gray-700 bg-transparent no-underline hover:border-[#1F7A74] hover:text-[#1F7A74] transition-all cursor-pointer"
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  className="px-5 py-2.5 bg-[#1F7A74] border border-[#1F7A74] rounded-lg text-[13px] font-semibold text-white no-underline hover:bg-[#186963] hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(45,155,148,0.4)] transition-all cursor-pointer"
                >
                  Join PAX — Free
                </a>
              </>
            )}
          </div>
          <button
            type="button"
            className="md:hidden rounded-lg p-2 text-[#1A2332] hover:bg-black/5"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {session?.user?.id && <div className="flex justify-end px-4 pb-2 md:hidden"><UserMenu /></div>}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-black/5 bg-[#FAF8F5] px-6 py-5 shadow-lg">
            <div className="flex flex-col gap-4">
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-700">About</Link>
              <Link href="/find-a-doctor" onClick={() => setMobileMenuOpen(false)} className="text-sm text-primary">Find a practitioner</Link>
              <a href="#why" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-700">Why PAX</a>
              <a href="#what-is-pax" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-700">What is PAX</a>
              <a href="#who" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-700">Who It&apos;s For</a>
              <Link href="/safety" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-700">Safety Hub</Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-700">Contact</Link>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {session?.user?.id ? (
                  <button type="button" onClick={() => router.push('/dashboard')} className="col-span-2 rounded-lg bg-[#1F7A74] px-4 py-3 text-sm font-semibold text-white">Dashboard</button>
                ) : (
                  <>
                    <button type="button" onClick={() => router.push('/login')} className="rounded-lg border border-black/15 px-4 py-3 text-sm font-medium">Sign In</button>
                    <button type="button" onClick={() => router.push('/register')} className="rounded-lg bg-[#1F7A74] px-4 py-3 text-sm font-semibold text-white">Join PAX — Free</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="hidden md:block">
          <ModuleNavStrip />
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-[88vh] pt-[120px] flex items-center overflow-hidden">
        <Image
          src="/img/hero.jpg?v=3"
          alt="Health practitioner in a modern hospital corridor"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center]"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(7,34,32,0.97) 0%, rgba(9,44,42,0.94) 32%, rgba(11,52,49,0.72) 52%, rgba(11,52,49,0.30) 74%, rgba(11,52,49,0.05) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FAF8F5]/90 to-transparent" />

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 py-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-[660px]">
            <div className="inline-flex items-center gap-2 bg-white/12 backdrop-blur-md border border-white/25 rounded-full px-3.5 py-1.5 mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse" />
              <span className="text-[11px] font-semibold text-white tracking-[1.5px] uppercase">Now in Beta</span>
            </div>
            <h1 className="font-display text-[clamp(2.4rem,5.2vw,4.2rem)] font-semibold leading-[1.06] text-white mb-6">
              Where Public Health<br />
              <span className="text-[#5FD6C6]">Innovation</span> Meets<br />
              <span className="text-[#FBBF24]">Impact</span>
            </h1>
            <p className="text-base md:text-lg text-white/95 leading-relaxed max-w-[540px] mb-10">
              PAX connects innovators, practitioners, and investors across the global public health
              ecosystem — turning ideas into scalable, life-saving solutions.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-14">
              <Link href="/find-a-doctor" className="inline-flex items-center rounded-full border border-white/45 px-6 py-3.5 text-[15px] font-semibold text-white no-underline transition-colors hover:bg-white/10">Find a practitioner &amp; book</Link>
              <a
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#FBBF24] rounded-full text-[15px] font-bold text-[#12403C] no-underline shadow-[0_10px_30px_rgba(251,191,36,0.35)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(251,191,36,0.45)] transition-all cursor-pointer"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/login"
                className="px-8 py-3.5 border border-white/45 rounded-full text-[15px] font-medium text-white no-underline hover:bg-white hover:text-[#12403C] transition-all cursor-pointer"
              >
                Sign In
              </a>
            </div>
            <div className="flex items-center gap-8 md:gap-14">
              {[
                { n: '8', l: 'Health Sectors' },
                { n: '7', l: 'Services' },
                { n: '∞', l: 'Potential' },
              ].map((st) => (
                <div key={st.l} className="flex flex-col">
                  <span className="text-3xl md:text-4xl font-bold text-white">{st.n}</span>
                  <span className="text-[11px] text-white/75 tracking-wider uppercase mt-1">{st.l}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── What is PAX (interactive module carousel) ─── */}
      <section className="py-24 px-6 md:px-12 bg-gradient-to-b from-[#FAF8F5] via-white to-[#E9F3F1]" id="what-is-pax">
        <div className="max-w-[1200px] mx-auto">
          <motion.div {...fadeUp} className="mb-12 max-w-[760px]">
            <Eyebrow color="#1F7A74">What is PAX</Eyebrow>
            <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1A2332] leading-tight mb-5">
              One ecosystem. <span className="text-[#1F7A74]">Seven services.</span>
            </h2>
            <p className="text-[15px] md:text-base text-gray-600 leading-relaxed">
              PAX — the Praxis Exchange — is a single platform where everyone in public health finds
              each other: the researcher with the idea, the practitioner with the evidence, the investor
              with the capital, and the policymaker who has to decide. Here is what is inside.
            </p>
          </motion.div>

          <motion.div {...fadeUp}>
            <ModuleCarousel />
          </motion.div>

          <motion.div {...fadeUp} className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-gray-500">
            <span className="tracking-[1.5px] uppercase font-semibold text-[#1F7A74]">Modules</span>
            {MODULE_SLIDES.map((m) => (
              <Link
                key={m.title}
                href={m.slug ? `/modules/${m.slug}` : '/safety'}
                className="px-3 py-1 rounded-full bg-white border border-black/5 shadow-sm no-underline text-gray-600 hover:text-white transition-all"
                style={{ borderColor: `${m.color}33` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = m.color; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; }}
              >
                {m.title}
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── The Problem ─── */}
      <section className="py-24 px-6 md:px-12 bg-gradient-to-b from-white via-white to-[#FDF3E4] relative" id="why">
        <div className="max-w-[1200px] mx-auto">
          <motion.div {...fadeUp} className="mb-16 max-w-[720px]">
            <Eyebrow color="#C81E1E">The Problem</Eyebrow>
            <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1A2332] leading-tight mb-6">
              Brilliant Ideas <em className="text-[#C81E1E] font-semibold not-italic">Die in Isolation</em>
            </h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">
              Public health innovators work in silos. A researcher in Nairobi doesn&apos;t know that a
              practitioner in Manila has the exact field evidence their solution needs. A fund manager in
              London can&apos;t find the maternal health venture in Accra that matches their mandate.
              Talent goes unseen. Evidence stays unpublished. Lives that could be saved — aren&apos;t.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { num: '80%', label: 'of health innovations never reach the people who need them', color: '#C81E1E' },
              { num: '6+', label: 'months average delay connecting innovators to funding across borders', color: '#B26F09' },
              { num: '90%', label: 'of frontline practitioners have evidence that never gets documented', color: '#6A5CBF' },
              { num: '0', label: 'platforms purpose-built for the full public health innovation lifecycle', color: '#1F7A74' },
            ].map((stat, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }} className="text-center py-8 px-4">
                <div className="text-4xl md:text-5xl font-semibold mb-3 tracking-tight" style={{ color: stat.color }}>{stat.num}</div>
                <div className="text-[13px] text-gray-600 leading-relaxed">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="mt-16 bg-[#FFFFFF] border border-black/5 rounded-2xl p-8 md:p-10 max-w-[720px] mx-auto">
            <p className="text-center text-[17px] md:text-lg text-gray-700 leading-relaxed font-serif italic">
              &ldquo;PAX exists to solve this. We built a single platform where every actor in the
              public health ecosystem — from the lab to the clinic to the boardroom — can find each other,
              validate ideas through peer debate, and move innovations from concept to communities.&rdquo;
            </p>
            <div className="mt-6 flex items-center justify-center gap-2.5">
              <span className="w-8 h-px bg-[#1F7A74]/40" />
              <div className="text-[11px] text-gray-500 tracking-[2px] uppercase font-medium">Founder, Praxis Exchange</div>
              <span className="w-8 h-px bg-[#1F7A74]/40" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── What You Get (Benefits showcase) ─── */}
      <section className="py-24 px-6 md:px-12 bg-gradient-to-br from-[#E4F1EF] via-[#FAF8F5] to-[#EFE9FB]">
        <div className="max-w-[1200px] mx-auto">
          <motion.div {...fadeUp} className="mb-16">
            <Eyebrow color="#1F7A74">What You Get — Free</Eyebrow>
            <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1A2332] leading-tight">
              Real Tools. <em className="text-[#1F7A74] font-semibold not-italic">Not Promises.</em>
            </h2>
            <p className="text-[15px] text-gray-500 leading-relaxed max-w-[560px] mt-4">
              Every feature below is available from the moment you create your free profile.
              No credit card. No trial period. Just start.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                Icon: Microscope, title: 'GPS Profiles', href: '/modules/gps-profiles', img: '/img/mod-gps.jpg?v=3',
                objective: 'Enable practitioners to document and share evidence-based public health solutions using the Gap → Problem → Solution methodology.',
                benefits: ['Document your Gap → Problem → Solution insights', 'Get peer endorsements that build your Praxis Score', 'Visible to investors, employers, and collaborators'],
                color: '#1F7A74',
              },
              {
                Icon: Lightbulb, title: 'Innovation Showcase', href: '/modules/innovation-hub', img: '/img/mod-innovation.jpg?v=3',
                objective: 'Provide innovators a platform to present their solutions, track milestones, and connect with aligned investors.',
                benefits: ['List your innovation with milestones & evidence', 'Matched to investors whose mandates fit your stage', 'Track interest, expressions, and introductions'],
                color: '#B26F09',
              },
              {
                Icon: Scale, title: 'Community Debates', href: '/modules/community-debate-hub', img: '/img/mod-community.jpg?v=3',
                objective: 'Facilitate structured, evidence-backed discourse that produces actionable consensus briefs for policy influence.',
                benefits: ['Structured debates that produce consensus briefs', 'Your contributions earn credibility points', 'Influence policy with evidence-backed positions'],
                color: '#6A5CBF',
              },
              {
                Icon: Stethoscope, title: 'Practice Management', href: '/modules/practitioners-hub', img: '/img/mod-practice.jpg?v=3',
                objective: 'Give health practitioners a complete digital toolkit for billing, patient records, and financial management.',
                benefits: ['Raise invoices with split-payer billing', 'Automated payment reminders', 'Patient records, calendar, and financial dashboard'],
                color: '#C81E1E',
              },
              {
                Icon: Store, title: 'Health Marketplace', href: '/modules/product-marketplace', img: '/img/mod-marketplace.jpg?v=3',
                objective: 'Create a transparent, peer-reviewed marketplace for sourcing and supplying health products and technologies worldwide.',
                benefits: ['Source and list health products & digital tools', 'Verified vendor programme with peer reviews', 'Transaction ledger for full transparency'],
                color: '#1F7A74',
              },
              {
                Icon: TrendingUp, title: 'Investment Matching', href: '/modules/investment-platform', img: '/img/mod-investment.jpg?v=3',
                objective: 'Connect investors with innovations that match their mandate, geography, and stage criteria.',
                benefits: ['Set your investment mandate and geography', 'Matching scores every innovation against your criteria', 'Request introductions — no middleman fees'],
                color: '#B26F09',
              },
              {
                Icon: Target, title: 'Talent Search & Hiring', href: '/modules/talent-marketplace', img: '/img/mod-talent.jpg?v=3',
                objective: 'Help organisations find and recruit verified public health professionals by skill, experience, and credibility.',
                benefits: ['Post challenge briefs to the PAX community', 'Search verified professionals by skill and country', 'Find the right person through their Praxis Score'],
                color: '#6A5CBF',
              },
              {
                Icon: Lock, title: 'IP & NDA Vault', href: '/modules/innovation-hub', img: '/img/mod-vault.jpg?v=3',
                objective: 'Protect sensitive pre-patent innovations with secure digital vaults and controlled access approvals.',
                benefits: ['Protect your innovations before sharing them', 'Digital vault access requests with admin approval', 'Safe space for sensitive pre-patent work'],
                color: '#C81E1E',
              },
              {
                Icon: Pill, title: 'Safety & Surveillance', href: '/safety', img: '/img/mod-safety.jpg?v=3',
                objective: 'Power community-driven pharmacovigilance through accessible adverse-event reporting and quarterly intelligence.',
                benefits: ['Report drug side effects — no login required', 'Community-powered pharmacovigilance data', 'Quarterly intelligence reports for decision-makers'],
                color: '#1F7A74',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ delay: i * 0.05 }}
                style={{ borderColor: `${item.color}2E`, boxShadow: `0 10px 30px ${item.color}18` }}
                className="relative overflow-hidden border rounded-2xl bg-white hover:-translate-y-1.5 transition-all duration-300 group flex flex-col"
              >
                <Link href={item.href} aria-label={`Open ${item.title}`} className="absolute inset-0 z-20" />
                <div className="relative h-40 overflow-hidden">
                  <Image src={item.img} alt={item.title} fill sizes="400px" className="object-cover group-hover:scale-[1.07] transition-transform duration-700" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${item.color}F0 0%, ${item.color}59 55%, rgba(0,0,0,0.10) 100%)` }} />
                  <div className="absolute left-5 bottom-4 right-5 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/95 flex-shrink-0" style={{ color: item.color }}>
                      <item.Icon className="w-5 h-5" strokeWidth={1.9} />
                    </span>
                    <span className="font-display font-semibold text-[16px] text-white leading-tight drop-shadow">{item.title}</span>
                  </div>
                </div>
                <ul className="px-6 pt-6 pb-4 space-y-2.5 flex-1 list-none m-0">
                  {item.benefits.map((b, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-[13px] text-gray-600 leading-relaxed">
                      <span className="mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="px-6 pb-5 flex items-center gap-1.5 text-[12px] font-semibold group-hover:gap-2.5 transition-all" style={{ color: item.color }}>
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Seven Services (compact) ─── */}
      <section className="py-24 px-6 md:px-12 bg-[#FFFFFF]" id="platform">
        <div className="max-w-[1200px] mx-auto">
          <motion.div {...fadeUp} className="mb-16">
            <Eyebrow color="#B26F09">The Platform</Eyebrow>
            <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1A2332] leading-tight">
              Seven <em className="text-[#1F7A74] font-semibold not-italic">Services</em> of Impact
            </h2>
            <p className="text-[15px] text-gray-500 leading-relaxed max-w-[560px] mt-4">
              Seven services share one PAX identity. GPS evidence supports Innovation Hub and Talent Marketplace.
              Knowledge Exchange informs innovation and investment, while clinical and safety records retain their own access rules.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { img: '/img/mod-safety.jpg?v=3', num: '01', title: 'Pharmacovigilance', slug: null, desc: 'Report drug side effects and product concerns, with restricted review by authorized administrators and policymakers.', color: '#1F7A74' },
              { img: '/img/mod-innovation.jpg?v=3', num: '02', title: 'Innovation Hub', slug: 'innovation-hub', desc: 'Showcase groundbreaking public health innovations at every development stage.', color: '#B26F09' },
              { img: '/img/mod-talent.jpg?v=3', num: '03', title: 'Talent Marketplace', slug: 'talent-marketplace', desc: 'Connect skilled professionals with organisations that need their expertise.', color: '#6A5CBF' },
              { img: '/img/mod-marketplace.jpg?v=3', num: '04', title: 'Product Marketplace', slug: 'product-marketplace', desc: 'Source and supply health products, tools, and technologies across the continent.', color: '#C81E1E' },
              { img: '/img/mod-investment.jpg?v=3', num: '05', title: 'Investment Platform', slug: 'investment-platform', desc: 'Evidence-based matching connects investors with innovations ready for funding and scale.', color: '#1F7A74' },
              { img: '/img/mod-practice.jpg?v=3', num: '06', title: 'Medical Practitioner', slug: 'practitioners-hub', desc: 'Manage your practice — billing, patients, reminders, and financial insights in one place.', color: '#B26F09' },
              { img: '/img/mod-community.jpg?v=3', num: '07', title: 'Knowledge Exchange', slug: 'community-debate-hub', desc: 'Structured debates, peer endorsement, and consensus briefs — the qualitative evidence engine.', color: '#6A5CBF' },
            ].map((dim, i) => (
              <motion.a
                key={dim.title}
                {...fadeUp}
                transition={{ delay: i * 0.08 }}
                href={dim.slug ? `/modules/${dim.slug}` : '/safety'}
                style={{ borderColor: `${dim.color}33`, boxShadow: `0 6px 22px ${dim.color}18` }}
                className="relative overflow-hidden border rounded-2xl bg-white group hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
              >
                <div className="relative h-36 overflow-hidden">
                  <Image src={dim.img} alt={dim.title} fill sizes="320px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${dim.color}E6 0%, ${dim.color}40 55%, transparent 100%)` }} />
                  <span className="absolute top-3 right-3 text-[11px] font-bold text-white tracking-[1.5px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(10,26,24,0.72)' }}>{dim.num}</span>
                </div>
                <div className="p-6">
                  <div className="font-semibold text-sm text-[#1A2332] mb-2">{dim.title}</div>
                  <div className="text-[13px] text-gray-600 leading-relaxed">{dim.desc}</div>
                  <div className="mt-4 h-0.5 w-8 rounded-full opacity-40 group-hover:opacity-100 group-hover:w-16 transition-all" style={{ background: dim.color }} />
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who It's For (expanded benefits) ─── */}
      <section className="py-24 px-6 md:px-12 bg-gradient-to-br from-[#FDF3E4] via-[#FAF8F5] to-[#E4F1EF]" id="who">
        <div className="max-w-[1200px] mx-auto">
          <motion.div {...fadeUp} className="mb-16">
            <Eyebrow color="#1F7A74">Who It&apos;s For</Eyebrow>
            <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1A2332] leading-tight">
              One Platform. <em className="text-[#B26F09] font-semibold not-italic">Five Perspectives.</em>
            </h2>
            <p className="text-[15px] text-gray-500 leading-relaxed max-w-[560px] mt-4">
              You can hold multiple roles on PAX — because real people in real health systems wear many hats.
              Pick what fits you, switch anytime.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                img: '/img/aud-innovator.jpg?v=3', title: 'Innovators & Researchers',
                tagline: 'Get your solution seen, funded, and adopted.',
                perks: ['Showcase innovations with milestone tracking', 'Matched to aligned investors automatically', 'Protect IP with the secure NDA Vault', 'Build a credibility score through peer debate'],
                color: '#1F7A74',
              },
              {
                img: '/img/aud-practitioner.jpg?v=3', title: 'Health Practitioners',
                tagline: 'Run your practice. Share your evidence. Grow your career.',
                perks: ['Free practice management — invoicing, patients, reminders', 'Document frontline insights with GPS profiles', 'Get endorsed by peers and climb the leaderboard', 'Access talent opportunities and challenge briefs'],
                color: '#6A5CBF',
              },
              {
                img: '/img/aud-investor.jpg?v=3', title: 'Investors & Funders',
                tagline: 'Find the innovation that matches your impact thesis.',
                perks: ['Set your mandate — geography, sector, stage, ticket size', 'Match scoring ranks every innovation against your criteria', 'Request direct introductions — no broker fees', 'Access due diligence data and consensus briefs'],
                color: '#B26F09',
              },
              {
                img: '/img/aud-employer.jpg?v=3', title: 'Employers & Organisations',
                tagline: 'Find the right people for the right problems.',
                perks: ['Search verified professionals by skill and country', 'Post challenge briefs to crowdsource solutions', 'View credibility scores and peer endorsements', 'Browse the marketplace for health products and tools'],
                color: '#1F7A74',
              },
              {
                img: '/img/aud-policymaker.jpg?v=3', title: 'Policymakers & Government',
                tagline: 'Evidence-based insights for evidence-based policy.',
                perks: ['Access post-market surveillance dashboards', 'Read consensus briefs from structured debates', 'Monitor drug safety signals and product reviews', 'Discover innovations ready for national scale-up'],
                color: '#C81E1E',
              },
            ].map((aud, i) => (
              <motion.div
                key={aud.title}
                {...fadeUp}
                transition={{ delay: i * 0.08 }}
                style={{ borderColor: `${aud.color}33`, boxShadow: `0 8px 28px ${aud.color}1A` }}
                className="relative overflow-hidden border rounded-2xl bg-white hover:-translate-y-1.5 transition-all duration-300 group flex flex-col"
              >
                <div className="relative h-44 overflow-hidden">
                  <Image src={aud.img} alt={aud.title} fill sizes="400px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${aud.color}D9 0%, ${aud.color}33 60%, transparent 100%)` }} />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="font-display font-semibold text-[18px] text-white leading-tight">{aud.title}</div>
                  </div>
                </div>
                <div className="p-7 pt-6 flex flex-col flex-1">
                <div className="text-[13px] font-medium mb-5" style={{ color: aud.color }}>{aud.tagline}</div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {aud.perks.map((p, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-[13px] text-gray-600 leading-relaxed">
                      <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                        <path d="M13.5 4.5l-7 7L3 8" stroke={aud.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
                <a
                  onClick={() => router.push('/register')}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-wider uppercase cursor-pointer transition-colors"
                  style={{ color: aud.color }}
                >
                  Get Started Free →
                </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-24 px-6 md:px-12 bg-white relative" id="how">
        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[0.95fr_1.05fr] gap-12 lg:gap-16 items-center">
          <motion.div {...fadeUp} className="relative">
            <div className="relative rounded-[26px] overflow-hidden aspect-[4/5] shadow-[0_28px_70px_rgba(26,35,50,0.20)]">
              <Image src="/img/mod-talent.jpg?v=3" alt="Health professionals meeting on the PAX platform" fill sizes="(max-width: 1024px) 100vw, 520px" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,40,37,0.82) 0%, rgba(8,40,37,0.18) 48%, transparent 100%)' }} />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <div className="text-white/80 text-[11px] tracking-[2px] uppercase font-semibold mb-1">Free forever</div>
                <div className="font-display text-white text-[22px] font-semibold leading-snug">Three minutes to your profile.</div>
              </div>
            </div>
            <div className="hidden lg:block absolute -bottom-7 -right-7 rounded-2xl px-6 py-5 text-white shadow-[0_18px_40px_rgba(31,122,116,0.35)]" style={{ background: 'linear-gradient(135deg,#1F7A74,#15908A)' }}>
              <div className="text-3xl font-bold leading-none">0</div>
              <div className="text-[11px] tracking-[1.6px] uppercase mt-1 text-white/85">Cost to join</div>
            </div>
          </motion.div>

          <div>
            <motion.div {...fadeUp} className="mb-10">
              <Eyebrow color="#B26F09">How It Works</Eyebrow>
              <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1A2332] leading-tight">
                Four Steps to <em className="text-[#1F7A74] font-semibold not-italic">Being Found</em>
              </h2>
            </motion.div>
            <div className="relative pl-2">
              <span className="absolute left-[29px] top-4 bottom-6 w-px bg-gradient-to-b from-[#1F7A74]/50 via-[#B26F09]/40 to-[#C81E1E]/30" />
              {[
                { num: '01', title: 'Sign Up Free', desc: 'Create your account and pick your role — innovator, practitioner, investor, employer or policymaker. Pick as many as apply.', color: '#1F7A74' },
                { num: '02', title: 'Build Your Profile', desc: 'Add your expertise, country and focus areas. Document GPS insights, showcase innovations, set your investment mandate.', color: '#B26F09' },
                { num: '03', title: 'Discover & Connect', desc: 'Browse matched opportunities, join debates, search talent, get introduced to investors, source marketplace products.', color: '#6A5CBF' },
                { num: '04', title: 'Grow Your Impact', desc: 'Every contribution earns credibility. Rise on the leaderboard, attract collaborators, scale what works.', color: '#C81E1E' },
              ].map((step, i) => (
                <motion.div key={step.num} {...fadeUp} transition={{ delay: i * 0.08 }} className="relative flex gap-5 pb-8 last:pb-0">
                  <div className="relative z-10 w-14 h-14 flex-shrink-0 rounded-2xl flex items-center justify-center text-[15px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}B3)`, boxShadow: `0 8px 20px ${step.color}40` }}>
                    {step.num}
                  </div>
                  <div className="pt-1.5">
                    <div className="font-semibold text-[16px] text-[#1A2332] mb-1.5">{step.title}</div>
                    <div className="text-[13.5px] text-gray-600 leading-relaxed max-w-[440px]">{step.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Safety & Surveillance ─── */}
      <section className="py-24 px-6 md:px-12 bg-gradient-to-br from-[#E4F1EF] via-[#FAF8F5] to-[#FBE9E9]">
        <div className="max-w-[1200px] mx-auto">
          <motion.div {...fadeUp} className="relative rounded-[28px] overflow-hidden mb-8 min-h-[380px] flex items-center shadow-[0_26px_70px_rgba(200,30,30,0.18)]">
            <Image src="/img/safety-hero.jpg?v=3" alt="Pharmacist advising a patient in a community pharmacy" fill sizes="(max-width: 1024px) 100vw, 1200px" className="object-cover object-[70%_center]" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(20,12,12,0.94) 0%, rgba(34,14,14,0.88) 38%, rgba(34,14,14,0.45) 62%, rgba(34,14,14,0.05) 100%)' }} />
            <div className="relative z-10 p-8 md:p-14 max-w-[600px]">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-bold tracking-[2px] uppercase text-white mb-5" style={{ background: '#C81E1E' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white/85" />Open to Everyone
              </span>
              <h2 className="font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-semibold text-white leading-tight mb-4">
                Safety &amp; <span className="text-[#5FD6C6]">Feedback Hub</span>
              </h2>
              <p className="text-[15px] text-white/95 leading-relaxed mb-7">
                You don&apos;t need an account to report a drug side effect or review a health product.
                Community-powered pharmacovigilance that keeps communities safe — anonymously if you prefer.
              </p>
              <Link href="/safety" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[14px] font-bold text-[#8A1414] no-underline hover:gap-3 transition-all">
                Open the Safety Hub <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { Icon: Pill, title: 'Drug Safety Reports', desc: 'Report adverse drug reactions — drug name, dose, side effects, severity. Open to everyone, no login required.', color: '#C81E1E', href: '/safety', live: true },
              { Icon: Radio, title: 'Product & Tech Reviews', desc: 'Rate and review health products and technologies. Expert practitioners\u2019 feedback carries extra weight.', color: '#B26F09', href: '/safety', live: true },
              { Icon: Siren, title: 'Health Alerts Network', desc: 'Early-warning signals and outbreak alerts shared across practitioners, institutions, and communities.', color: '#6A5CBF', href: null, live: false },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ delay: i * 0.08 }}
                style={{ background: `linear-gradient(160deg, ${item.color}16 0%, #FFFFFF 55%)`, borderColor: `${item.color}33`, boxShadow: `0 6px 22px ${item.color}14` }}
                className="border rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1.5 transition-all duration-300"
              >
                {item.href ? (
                  <a href={item.href} className="absolute inset-0 z-10" />
                ) : (
                  <span className="absolute top-4 right-4 text-[9px] font-semibold px-2 py-1 rounded-full tracking-wider uppercase" style={{ color: item.color, background: `${item.color}18` }}>Soon</span>
                )}
                {item.live && (
                  <span className="absolute top-4 right-4 text-[9px] font-semibold px-2 py-1 rounded-full tracking-wider uppercase bg-green-500/15 text-green-700">LIVE</span>
                )}
                <div className="mb-4 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: `${item.color}1F`, color: item.color }}>
                  <item.Icon className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <div className="font-semibold text-sm text-[#1A2332] mb-2 group-hover:text-[#15908A] transition-colors">{item.title}</div>
                <div className="text-[13px] text-gray-600 leading-relaxed">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust Band ─── */}
      <section className="py-16 px-6 md:px-12 bg-white border-y border-black/5">
        <div className="max-w-[1000px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { Icon: Globe2, color: '#1F7A74', label: 'Globally Open', sub: 'African roots, worldwide membership' },
              { Icon: ShieldCheck, color: '#3F5FB0', label: 'Data Protected', sub: 'Kenya DPA 2019 & GDPR aligned' },
              { Icon: Scale, color: '#6A5CBF', label: 'Neutral Platform', sub: 'We connect — we don\'t compete with you' },
              { Icon: HeartPulse, color: '#B26F09', label: 'Professionally Gated', sub: 'A serious community for serious work' },
            ].map((t, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.08 }}>
                <div className="mb-3 w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-sm" style={{ background: `${t.color}16`, color: t.color }}>
                  <t.Icon className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <div className="text-sm font-semibold text-[#1A2332] mb-1">{t.label}</div>
                <div className="text-[12px] text-gray-500">{t.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-28 px-6 md:px-12 bg-[linear-gradient(125deg,#15908A_0%,#1F7A74_35%,#3F5FB0_70%,#6A5CBF_100%)] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #FFFFFF 1px, transparent 1px), radial-gradient(circle at 80% 50%, #FBBF24 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="max-w-[680px] mx-auto text-center relative z-10">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[11px] font-bold tracking-[2px] uppercase text-[#12403C] bg-[#FBBF24] shadow-[0_6px_18px_rgba(251,191,36,0.35)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#12403C]/70" />Your Seat Is Free
            </span>
          </div>
          <h2 className="font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-semibold text-white leading-tight mb-6">
            The Future of Public<br />Health is <em className="text-[#FBBF24] font-semibold not-italic">Collaborative</em>
          </h2>
          <p className="text-base text-white/95 leading-relaxed max-w-[520px] mx-auto mb-4">
            PAX is where the world&apos;s public health future is being built — one connection,
            one innovation, one breakthrough at a time.
          </p>
          <p className="text-sm text-white/80 mb-10">
            Create your profile in 3 minutes. Everything you need is already here.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              onClick={() => router.push('/register')}
              className="px-9 py-4 bg-white rounded-lg text-[15px] font-bold text-[#1F7A74] no-underline shadow-[0_10px_30px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.3)] transition-all cursor-pointer"
            >
              Join PAX — It&apos;s Free
            </a>
            <a
              onClick={() => router.push('/login')}
              className="px-9 py-4 border border-white/50 rounded-lg text-[15px] font-medium text-white no-underline hover:bg-white/10 hover:border-white transition-all cursor-pointer"
            >
              Sign In
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
