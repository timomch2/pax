import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { MarketingShell, PageHero } from '@/components/marketing/marketing-shell';
import { Check } from 'lucide-react';
import { waLink, WA_MESSAGES, WHATSAPP_DISPLAY } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Membership | Praxis Exchange',
  description: 'Join the Praxis Exchange. Create your account and start contributing to the global public health innovation ecosystem.',
};

const TIERS = [
  {
    name: 'Basic',
    tier: 'For Everyone',
    color: '#1F7A74',
    highlight: false,
    price: 'Free Forever',
    unlock: 'Unlocked with phone verification',
    tagline: 'Get on the platform and explore everything PAX has to offer.',
    features: ['Browse knowledge & research', 'View innovations', 'Join community discussions', 'Health alerts & notifications', 'Basic profile'],
  },
  {
    name: 'Pro',
    tier: 'For Active Members',
    color: '#B26F09',
    highlight: true,
    price: 'Free for 3 months',
    unlock: 'Unlocked with LinkedIn verification',
    tagline: 'Contribute, connect, and take part in the marketplace.',
    features: ['Everything in Basic', 'Post innovations', 'Apply for opportunities', 'Direct messaging', 'Product marketplace', 'Investment platform access'],
  },
  {
    name: 'Expert',
    tier: 'For Trusted Voices',
    color: '#6A5CBF',
    highlight: false,
    price: 'By peer vouching',
    unlock: 'Unlocked when peers vouch for you',
    tagline: 'Earn standing in the community and lead its highest-trust work.',
    features: ['Everything in Pro', 'Priority visibility', 'Expert badge', 'CPD / CME credits', 'Advanced analytics', 'Featured listings', 'Peer-review participation'],
  },
];

const JOURNEY = [
  { step: '1', title: 'Create your profile', desc: 'One profile, as many roles as you need. Sign up with email or Google and verify your phone.', color: '#1F7A74' },
  { step: '2', title: 'Verify with LinkedIn', desc: 'Confirm who you are to unlock posting, messaging, the marketplace and the investment platform.', color: '#B26F09' },
  { step: '3', title: 'Earn peer vouches', desc: 'As the community backs you, you rise to Expert — badges, credits and the highest-trust features.', color: '#6A5CBF' },
];

export default function MembershipPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Membership"
        title={<>Join PAX</>}
        subtitle="One profile, three levels of access. Everyone starts free — you climb by verifying who you are and earning the community's trust."
      />

      {/* Your PAX journey — links joining to the profile template */}
      <section className="px-6 md:px-12 pb-4">
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {JOURNEY.map((j) => (
            <div key={j.step} className="rounded-2xl border border-black/5 bg-[#FFFFFF] p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold text-[#FAF8F5]" style={{ background: j.color }}>{j.step}</span>
                <h3 className="text-[15px] font-medium text-[#1A2332]">{j.title}</h3>
              </div>
              <p className="text-[13px] text-gray-500 leading-relaxed">{j.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="px-6 md:px-12 pb-16">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border bg-[#FFFFFF] p-7 flex flex-col ${t.highlight ? 'border-[#B26F09]/50 shadow-[0_8px_40px_rgba(245,158,11,0.12)]' : 'border-black/5'}`}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#B26F09] text-[10px] font-bold uppercase tracking-wider text-[#FAF8F5]">Most Popular</div>
              )}
              <div className="text-[11px] font-medium tracking-[2px] uppercase mb-2" style={{ color: t.color }}>{t.tier}</div>
              <div className="font-serif text-2xl font-light text-[#1A2332] mb-1">{t.name}</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-serif text-3xl font-light text-[#1A2332]">{t.price}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium mb-4 w-fit" style={{ color: t.color, borderColor: `${t.color}40`, background: `${t.color}12` }}>{t.unlock}</div>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-6">{t.tagline}</p>
              <ul className="space-y-3 mb-8 flex-1 list-none">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: t.color }} />
                    <span className="text-[13px] text-gray-700 leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block text-center px-6 py-3 rounded-lg text-[14px] font-semibold no-underline transition-all"
                style={{ background: t.highlight ? t.color : 'transparent', color: t.highlight ? '#FFFFFF' : t.color, border: t.highlight ? 'none' : `1px solid ${t.color}55` }}
              >
                Join PAX
              </Link>
            </div>
          ))}
        </div>
        <p className="max-w-[700px] mx-auto text-center text-[12px] text-gray-600 mt-8 leading-relaxed">
          Basic is free forever. Pro features are free for your first 3 months, and Expert is earned through peer vouching — not bought. Optional paid plans may be introduced in the future.
          Institutional and partner enquiries are welcome — <Link href="/contact" className="text-[#15908A] no-underline hover:underline">contact us</Link>.
        </p>
      </section>

      {/* Future Payment Methods */}
      <section className="px-6 md:px-12 pb-20">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[2px] uppercase mb-4 text-gray-500">
              <span className="w-6 h-px bg-gray-600" />Future Premium Services
            </div>
            <h2 className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] font-light text-[#1A2332] leading-tight mb-3">
              When premium features <em className="text-[#1F7A74] font-light">launch</em>
            </h2>
            <p className="text-[14px] text-gray-500 max-w-[600px] mx-auto leading-relaxed">
              In the future, optional premium services may be available.
              When that happens, we will support the payment channels below. <strong className="text-gray-600">None of these are required to register or use the platform today.</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 opacity-60">
            {[
              { name: 'M-Pesa', desc: 'Mobile money via Safaricom STK push.', icon: '📱' },
              { name: 'USSD', desc: 'Any mobile network, any phone.', icon: '📞' },
              { name: 'Visa / Mastercard', desc: 'Debit and credit cards.', icon: '💳' },
              { name: 'PayPal', desc: 'International digital wallet.', icon: '🌐' },
            ].map((m) => (
              <div key={m.name} className="relative rounded-2xl border border-black/5 bg-[#FFFFFF] p-6 flex flex-col items-center text-center">
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Coming Soon</div>
                <div className="text-3xl mb-3">{m.icon}</div>
                <div className="font-semibold text-sm text-[#1A2332] mb-1">{m.name}</div>
                <div className="text-[12px] text-gray-500 leading-relaxed">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join via WhatsApp */}
      <section className="px-6 md:px-12 pb-24">
        <div className="max-w-[1000px] mx-auto rounded-3xl border border-[#25D366]/20 bg-gradient-to-br from-[#FFFFFF] to-[#FFFFFF] p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[2px] uppercase mb-4 text-[#25D366]">
              <span className="w-6 h-px bg-[#25D366]" />Prefer WhatsApp?
            </div>
            <h2 className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] font-light text-[#1A2332] leading-tight mb-4">
              Join in seconds — right from <em className="text-[#25D366] font-light">WhatsApp</em>
            </h2>
            <p className="text-[14px] text-gray-600 leading-relaxed mb-6">
              Scan the code with your phone camera — no need to save any number. It opens a chat with the PAX team
              where you can register, ask questions, and get onboarded step by step.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={waLink(WA_MESSAGES.join)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#25D366] text-[14px] font-semibold text-[#FAF8F5] no-underline hover:brightness-105 transition-all"
              >
                Chat on WhatsApp
              </a>
              <span className="inline-flex items-center px-4 py-3 rounded-lg border border-black/10 text-[13px] text-gray-600">
                {WHATSAPP_DISPLAY}
              </span>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="rounded-2xl bg-white p-4 shadow-xl">
              <Image src="/whatsapp-qr.png" alt="Scan to chat with PAX on WhatsApp" width={220} height={220} className="w-[200px] h-[200px]" />
              <div className="text-center text-[11px] font-medium text-[#1A2332] mt-2">Scan to join PAX</div>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
