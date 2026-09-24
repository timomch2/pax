import { SERVICE_CATALOG } from '@/lib/service-navigation';
import Link from 'next/link';
import { PaxLogo } from '@/components/brand/pax-logo';

type Item = { label: string; href: string };

export const MODULE_LINKS: Item[] = SERVICE_CATALOG.map(service => ({ label: service.label, href: service.overviewPath }));

const EXPLORE: Item[] = [
  { label: 'GPS — shared evidence', href: '/modules/gps-profiles' },
  { label: 'About PAX', href: '/about' },
  { label: 'Why PAX', href: '/#why' },
  { label: 'What is PAX', href: '/#what-is-pax' },
  { label: "Who It's For", href: '/#who' },
  { label: 'How It Works', href: '/#how' },
  { label: 'Membership', href: '/membership' },
];

const TRUST: Item[] = [
  { label: 'Report a Side Effect', href: '/safety' },
  { label: 'Review a Product', href: '/safety' },
  { label: 'Legal & Disclaimer', href: '/legal' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Terms of Reference', href: '/terms-of-reference' },
];

const ACCOUNT: Item[] = [
  { label: 'Sign In', href: '/login' },
  { label: 'Join PAX — Free', href: '/register' },
  { label: 'Contact Us', href: '/contact' },
];

function Column({ title, items, accent }: { title: string; items: Item[]; accent: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-5 h-px" style={{ background: accent }} />
        <h3 className="text-[11px] font-bold tracking-[2px] uppercase" style={{ color: accent }}>{title}</h3>
      </div>
      <ul className="list-none space-y-2.5 p-0 m-0">
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="text-[13px] text-gray-600 no-underline hover:text-[#1F7A74] transition-colors">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full site map ("table of contents") footer, shared by every public page. */
export function SiteFooter() {
  return (
    <>
      <footer className="bg-[#F1EEE8] border-t border-black/5 pt-14 pb-10 px-6 md:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-8 pb-12 border-b border-black/8">
            <div className="md:col-span-1">
              <Link href="/" className="no-underline inline-block"><PaxLogo size="sm" /></Link>
              <p className="text-[12.5px] text-gray-600 leading-relaxed mt-5">
                A global public-health innovation ecosystem — connecting practitioners, innovators,
                institutions and investors on one trusted platform.
              </p>
            </div>
            <Column title="Explore" items={EXPLORE} accent="#1F7A74" />
            <Column title="Services" items={MODULE_LINKS} accent="#B26F09" />
            <Column title="Safety & Trust" items={TRUST} accent="#C81E1E" />
            <Column title="Get Started" items={ACCOUNT} accent="#6A5CBF" />
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-[12px] text-gray-600">© 2026 Praxis Exchange (PAX). All rights reserved.</div>
            <a href="mailto:praxis@thepraxisexchange.com" className="text-[13px] font-medium text-[#1F7A74] no-underline hover:underline">
              <span suppressHydrationWarning>praxis@thepraxisexchange.com</span>
            </a>
          </div>
        </div>
      </footer>

      <div className="bg-[#F1EEE8] border-t border-black/5 px-6 py-4">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-[10px] text-gray-600 leading-relaxed text-center">
            <span className="text-gray-500 font-semibold">Regulatory Notice:</span>{' '}
            PAX (Praxis Exchange) operates as a technology platform and passive intermediary. It is not a healthcare
            provider, pharmacy, clinical authority, broker-dealer, or financial institution. Information presented is
            for professional reference only and does not constitute medical advice, clinical endorsement, or investment
            advice. All transactions occur directly between parties.{' '}
            <Link href="/legal" className="text-[#1F7A74] hover:underline">Full disclaimer →</Link>
          </p>
        </div>
      </div>
    </>
  );
}
