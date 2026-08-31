import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { Link2, BarChart3, ShieldCheck, Globe2, ArrowRight, Quote } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About PAX | Praxis Exchange',
  description:
    'PAX (Praxis Exchange) is a global public-health innovation ecosystem — connecting innovators, practitioners and investors worldwide to bridge the gap from idea to impact.',
};

const STATS = [
  { n: '7', l: 'Connected modules', c: '#1F7A74' },
  { n: '5', l: 'Member types served', c: '#B26F09' },
  { n: '0', l: 'Cost to join', c: '#6A5CBF' },
  { n: '24/7', l: 'Open safety reporting', c: '#C81E1E' },
];

const VALUES = [
  { Icon: Link2, title: 'Connection over silos', img: '/img/mod-community.jpg?v=3', color: '#1F7A74', desc: 'We link knowledge, talent, products and capital that would otherwise stay fragmented across countries and sectors.' },
  { Icon: BarChart3, title: 'Evidence over noise', img: '/img/mod-gps.jpg?v=3', color: '#B26F09', desc: 'Impact is demonstrated through structured evidence, peer review and transparent credibility — not job titles.' },
  { Icon: ShieldCheck, title: 'Trust by design', img: '/img/mod-safety.jpg?v=3', color: '#C81E1E', desc: 'Verified identities, community validation and clear standards make PAX a place professionals can rely on.' },
  { Icon: Globe2, title: 'Global by design', img: '/img/mod-marketplace.jpg?v=3', color: '#6A5CBF', desc: 'Founded in Kenya and built for real-world, low-resource settings — open to innovators, practitioners and investors anywhere in the world.' },
];

const STORY = [
  { year: 'The gap', title: 'Lived, not theorised', body: 'PAX was founded by public-health practitioners who watched effective, locally designed solutions stall for want of a platform to prove, share and fund them. The gap was not talent. It was connection.', color: '#C81E1E' },
  { year: 'The idea', title: 'Not another directory', body: 'Rather than a social feed or a listings site, the founders set out to build the connective infrastructure the sector was missing — where evidence, people, products and capital sit in one place and feed each other.', color: '#B26F09' },
  { year: 'The build', title: 'Seven modules, one ecosystem', body: 'GPS profiles feed the Innovation Hub. Debates inform investors. Marketplace reviews build credibility. Safety reports protect everyone. Each part makes the others worth more.', color: '#1F7A74' },
  { year: 'Today', title: 'Open, free, and growing', body: 'Every core feature is free from the moment you create a profile. African roots, worldwide membership — the best public-health innovation should rise on merit, wherever it comes from.', color: '#6A5CBF' },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      {/* Photographic hero */}
      <section className="relative min-h-[62vh] flex items-center overflow-hidden">
        <Image src="/img/hero.jpg?v=3" alt="Public health professionals collaborating" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(10,45,42,0.94) 0%, rgba(20,97,92,0.86) 45%, rgba(31,122,116,0.35) 100%)' }} />
        <div className="relative z-10 max-w-[1200px] mx-auto w-full px-6 md:px-12 py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FBBF24] px-4 py-1.5 text-[10px] font-bold tracking-[2.4px] uppercase text-[#3B2A00] mb-6">
            About PAX
          </span>
          <h1 className="font-display text-[clamp(2.2rem,5vw,3.8rem)] font-semibold leading-[1.1] text-white max-w-[860px] mb-6">
            Bridging the gap from <span className="text-[#FFD98A]">idea</span> to <span className="text-[#5FD6C6]">impact</span>
          </h1>
          <p className="text-[15px] md:text-[17px] text-white/90 leading-relaxed max-w-[720px] mb-8">
            PAX — the Praxis Exchange — is a global public-health innovation ecosystem. Founded in Kenya and open
            worldwide, we bring innovators, practitioners, institutions and investors onto one trusted platform so good
            ideas find the evidence, talent, products and capital they need to scale.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[14px] font-bold text-[#14615C] no-underline hover:gap-3 transition-all shadow-lg">
              Join PAX — Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/#what-is-pax" className="inline-flex items-center px-7 py-3.5 rounded-full border border-white/50 text-[14px] font-medium text-white no-underline hover:bg-white/10 transition-all">
              See the platform
            </Link>
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section className="px-6 md:px-12 -mt-10 relative z-20">
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-black/8 shadow-[0_18px_50px_rgba(20,97,92,0.14)]">
          {STATS.map((s) => (
            <div key={s.l} className="bg-white px-6 py-7 text-center">
              <div className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-bold leading-none mb-2" style={{ color: s.c }}>{s.n}</div>
              <div className="text-[11.5px] tracking-[1.2px] uppercase text-gray-500 font-medium">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission + Problem, side by side with imagery */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-[1150px] mx-auto grid lg:grid-cols-2 gap-6">
          <div className="relative overflow-hidden rounded-3xl bg-white border border-black/5 shadow-[0_14px_40px_rgba(31,122,116,0.10)]">
            <div className="relative h-52">
              <Image src="/img/mod-innovation.jpg?v=3" alt="Health innovator presenting a solution" fill sizes="600px" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(31,122,116,0.95), rgba(31,122,116,0.15))' }} />
              <h2 className="absolute left-7 bottom-5 font-display text-2xl font-semibold text-white">Our mission</h2>
            </div>
            <p className="p-7 text-[15px] text-gray-700 leading-relaxed">
              Public health is rich in talent and ideas but poorly connected — in every region we have looked at.
              Brilliant frontline solutions never scale because they cannot find evidence, collaborators, or funding.
              PAX exists to close that gap — turning lived, field-tested practice into shareable knowledge,
              discoverable talent, validated products and investable innovations.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-white border border-black/5 shadow-[0_14px_40px_rgba(178,111,9,0.10)]">
            <div className="relative h-52">
              <Image src="/img/aud-practitioner.jpg?v=3" alt="Practitioner reviewing patient records" fill sizes="600px" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(178,111,9,0.95), rgba(178,111,9,0.15))' }} />
              <h2 className="absolute left-7 bottom-5 font-display text-2xl font-semibold text-white">The problem we solve</h2>
            </div>
            <p className="p-7 text-[15px] text-gray-700 leading-relaxed">
              Innovators struggle to be seen. Practitioners lack tools to run and grow their practice. Institutions
              cannot find the proven talent they need. Investors cannot find pre-validated, de-risked opportunities.
              And patients — especially in low-connectivity settings — remain hard to reach. PAX addresses all of
              these on one platform.
            </p>
          </div>
        </div>
      </section>

      {/* Values — photo cards */}
      <section className="px-6 md:px-12 py-20 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12 max-w-[620px]">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-[2.4px] uppercase text-white mb-4" style={{ background: 'linear-gradient(90deg,#1F7A74,#15908A)' }}>
              Our Values
            </span>
            <h2 className="font-display text-[clamp(1.9rem,3.8vw,2.8rem)] font-semibold text-[#1A2332] leading-tight">
              What we <span className="text-[#1F7A74]">stand for</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map((v) => (
              <div key={v.title} className="group overflow-hidden rounded-2xl border bg-white hover:-translate-y-1.5 transition-all duration-300" style={{ borderColor: `${v.color}2E`, boxShadow: `0 10px 30px ${v.color}18` }}>
                <div className="relative h-36 overflow-hidden">
                  <Image src={v.img} alt={v.title} fill sizes="320px" className="object-cover group-hover:scale-[1.07] transition-transform duration-700" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${v.color}F0 0%, ${v.color}55 60%, rgba(0,0,0,0.08) 100%)` }} />
                  <span className="absolute left-4 bottom-4 w-10 h-10 rounded-xl bg-white/95 flex items-center justify-center" style={{ color: v.color }}>
                    <v.Icon className="w-5 h-5" strokeWidth={1.9} />
                  </span>
                </div>
                <div className="p-5">
                  <div className="font-display font-semibold text-[15px] text-[#1A2332] mb-2">{v.title}</div>
                  <div className="text-[13px] text-gray-600 leading-relaxed">{v.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story timeline */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-[1150px] mx-auto grid lg:grid-cols-[0.85fr_1.15fr] gap-12 items-start">
          <div className="lg:sticky lg:top-[110px]">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-[2.4px] uppercase text-white mb-4" style={{ background: 'linear-gradient(90deg,#6A5CBF,#3F5FB0)' }}>
              Our Story
            </span>
            <h2 className="font-display text-[clamp(1.9rem,3.8vw,2.8rem)] font-semibold text-[#1A2332] leading-tight mb-5">
              How PAX <span className="text-[#6A5CBF]">came to be</span>
            </h2>
            <div className="relative overflow-hidden rounded-3xl h-64 mb-6">
              <Image src="/img/mod-talent.jpg?v=3" alt="Public health professionals in discussion" fill sizes="460px" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(20,97,92,0.75), transparent 60%)' }} />
            </div>
            <div className="rounded-2xl border border-[#1F7A74]/20 bg-[#E8F3F1] p-6">
              <Quote className="w-6 h-6 text-[#1F7A74] mb-3" />
              <p className="text-[14.5px] text-[#1A2332] leading-relaxed italic mb-3">
                In keeping with the founders&apos; wishes, individual identities remain confidential at this stage.
                What matters is the mission.
              </p>
              <div className="text-[11px] font-bold tracking-[1.8px] uppercase text-[#1F7A74]">Founder, Praxis Exchange</div>
            </div>
          </div>

          <div className="relative pl-8">
            <div className="absolute left-[11px] top-2 bottom-2 w-px" style={{ background: 'linear-gradient(to bottom,#C81E1E,#B26F09,#1F7A74,#6A5CBF)' }} />
            <div className="space-y-7">
              {STORY.map((s) => (
                <div key={s.title} className="relative">
                  <span className="absolute -left-8 top-1.5 w-[23px] h-[23px] rounded-full border-4 border-[#FAF8F5]" style={{ background: s.color }} />
                  <div className="rounded-2xl bg-white border border-black/5 p-6 shadow-[0_8px_26px_rgba(0,0,0,0.05)]">
                    <div className="text-[10px] font-bold tracking-[2.2px] uppercase mb-2" style={{ color: s.color }}>{s.year}</div>
                    <div className="font-display font-semibold text-[17px] text-[#1A2332] mb-2">{s.title}</div>
                    <p className="text-[14px] text-gray-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 md:px-12 pb-24">
        <div className="max-w-[1150px] mx-auto rounded-3xl px-8 md:px-14 py-14 text-center" style={{ background: 'linear-gradient(125deg,#15908A,#1F7A74,#3F5FB0,#6A5CBF)' }}>
          <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold text-white leading-tight mb-4">
            Every good idea deserves a route to impact
          </h2>
          <p className="text-[15px] text-white/90 leading-relaxed max-w-[600px] mx-auto mb-8">
            Create a free profile, document what you know, and let the right people find you.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="px-8 py-3.5 rounded-full bg-white text-[14px] font-bold text-[#1F7A74] no-underline shadow-lg hover:-translate-y-0.5 transition-all">
              Join PAX — It&apos;s Free
            </Link>
            <Link href="/contact" className="px-8 py-3.5 rounded-full border border-white/55 text-[14px] font-medium text-white no-underline hover:bg-white/10 transition-all">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
