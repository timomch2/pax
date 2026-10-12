'use client';

import { useSession } from 'next-auth/react';
import { UserMenu } from '@/components/layouts/user-menu';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { PaxLogo } from '@/components/brand/pax-logo';
import { SiteFooter } from '@/components/marketing/site-footer';
import { ModuleNavStrip } from '@/components/marketing/module-nav-strip';

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/find-a-doctor', label: 'Find a practitioner' },
  { href: '/#what-is-pax', label: 'What is PAX' },
  { href: '/#platform', label: 'Platform' },
  { href: '/safety', label: 'Pharmacovigilance' },
  { href: '/membership', label: 'Membership' },
  { href: '/contact', label: 'Contact' },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A2332]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-black/5">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-[86px] flex items-center justify-between">
          <Link href="/" className="no-underline">
            <PaxLogo size="sm" />
          </Link>
          <ul className="hidden md:flex items-center gap-8 list-none">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[13px] text-gray-600 no-underline tracking-wide hover:text-[#1F7A74] transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden md:flex items-center gap-3">
            {session?.user?.id ? <UserMenu /> : <>
            <button
              onClick={() => router.push('/login')}
              className="px-5 py-2.5 border border-black/15 rounded-lg text-[13px] font-medium text-gray-700 bg-transparent hover:border-[#1F7A74] hover:text-[#1F7A74] transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-5 py-2.5 bg-[#1F7A74] border border-[#1F7A74] rounded-lg text-[13px] font-semibold text-white hover:bg-[#186963] hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(45,155,148,0.4)] transition-all cursor-pointer"
            >
              Join PAX
            </button>

            </>}
          </div>
          <button className="md:hidden text-[#1A2332]" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {session?.user?.id && <div className="flex justify-end px-4 pb-2 md:hidden"><UserMenu /></div>}
        {open && (
          <div className="md:hidden border-t border-black/5 bg-[#FAF8F5] px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm text-gray-700 no-underline hover:text-[#1F7A74]">
                {l.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => router.push('/login')} className="flex-1 px-4 py-2.5 border border-black/15 rounded-lg text-[13px] font-medium text-gray-700">Sign In</button>
              <button onClick={() => router.push('/register')} className="flex-1 px-4 py-2.5 bg-[#1F7A74] rounded-lg text-[13px] font-semibold text-white">Join PAX</button>
            </div>
          </div>
        )}
        <div className="hidden md:block">
          <ModuleNavStrip />
        </div>
      </nav>

      <main className="pt-[120px]">{children}</main>

      <SiteFooter />
    </div>
  );
}

/** Shared page hero header for marketing pages */
export function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <section className="pt-20 pb-14 px-6 md:px-12 relative overflow-hidden border-b border-black/5">
      <div className="absolute inset-0 bg-gradient-to-br from-[#E3F1EF] via-[#FAF8F5] to-[#EDE7FA]" />
      <div className="absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full bg-[#1F7A74]/20 blur-[110px]" />
      <div className="absolute -top-20 right-0 w-[420px] h-[420px] rounded-full bg-[#6A5CBF]/20 blur-[110px]" />
      <div className="max-w-[900px] mx-auto relative z-10">
        <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[#B26F09] tracking-[2px] uppercase mb-4">
          <span className="w-6 h-px bg-[#B26F09]" />{eyebrow}
        </div>
        <h1 className="font-serif text-[clamp(2.2rem,4.5vw,3.4rem)] font-light leading-[1.12] text-[#1A2332] mb-5">{title}</h1>
        {subtitle && <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-[680px]">{subtitle}</p>}
      </div>
    </section>
  );
}
