'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layouts/app-shell';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Users2,
  Briefcase,
  Megaphone,
  Receipt,
  UserCircle,
  Scale,
  Store,
  Wallet,
  LogOut,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { NotificationBell } from '@/components/hub/notification-bell';
import { SurfaceSwitcher } from '@/components/hub/surface-switcher';
import useSWR from 'swr';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.read' },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar, permission: 'hub.appointment.read' },
  { href: '/dashboard/patients', label: 'Patients', icon: Users, permission: 'hub.patient.read' },
  { href: '/dashboard/members', label: 'Members', icon: Users2, permission: 'member.read' },
  { href: '/dashboard/talent-search', label: 'Talent Search', icon: Briefcase, permission: 'talent.job.read' },
  { href: '/dashboard/challenges', label: 'Challenge Briefs', icon: Megaphone, permission: 'community.read' },
  { href: '/community', label: 'PAX Exchange Community & Debate Hub', icon: Scale, permission: 'community.read' },
  { href: '/marketplace', label: 'Marketplace', icon: Store, permission: 'marketplace.listing.read' },
  { href: '/dashboard/billing', label: 'Billing', icon: Receipt, permission: 'hub.invoice.read' },
  { href: '/dashboard/hub', label: 'Practice Finance', icon: Wallet, permission: 'hub.invoice.read' },
  { href: '/dashboard/verification', label: 'Verification', icon: ShieldCheck, permission: 'verification.request' },
  { href: '/dashboard/profile', label: 'Profile', icon: UserCircle, permission: 'profile.read' },
  { href: '/dashboard/privacy', label: 'Privacy & My Data', icon: Lock, permission: 'privacy.manage' },
];

const fetchCapabilities = (url: string) => fetch(url).then(async (response) => response.ok ? response.json() : { permissions: [] });

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession() || {};
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { data: capabilityData } = useSWR('/api/auth/capabilities', fetchCapabilities);
  const permissions = new Set<string>(capabilityData?.permissions ?? []);
  const visibleNav = navItems.filter((item) => permissions.has(item.permission));
  const requestedItem = [...navItems]
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)));
  const accessResolved = capabilityData !== undefined;
  const canViewRequestedPage = !requestedItem || permissions.has(requestedItem.permission);

  const sidebar = (
    <>
      <Link href="/" className="mb-8 flex items-center gap-3">
        <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
          <Image alt="PAX Logo" src="/logo.jpg" fill className="object-cover" />
        </div>
        <div className="flex flex-col leading-tight">
          <strong className="font-sans font-semibold text-xs text-[#1A2332] tracking-[2px] uppercase">
            PRAXIS<span className="text-[#15908A]"> EXCHANGE</span>
          </strong>
          <span className="text-[9px] text-[#B26F09] tracking-[1.5px] font-bold uppercase">
            PAX
          </span>
          <span className="text-[11px] text-[#15908A] italic">
            Bridging the Gap from Idea to Impact
          </span>
        </div>
      </Link>

      <SurfaceSwitcher />
      <nav className="flex flex-1 flex-col gap-1">
        {visibleNav.map((item: any) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t pt-4">
        <div className="mb-3 px-1">
          <p className="text-sm font-medium truncate">{session?.user?.name ?? 'Loading...'}</p>
          <p className="text-xs text-muted-foreground truncate">{session?.user?.email ?? ''}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  const header = (
    <div className="flex flex-1 items-center justify-between">
      <h1 className="font-display text-lg font-semibold tracking-tight">
        {navItems.find((n: any) => n.href === pathname)?.label ?? 'Dashboard'}
      </h1>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {session?.user?.role === 'PRACTITIONER' ? 'Health Practitioner' : session?.user?.role === 'PATIENT' ? 'Patient' : 'Admin'}
        </span>
      </div>
    </div>
  );

  return (
    <AppShell sidebar={sidebar} header={header}>
      {!accessResolved ? (
        <div className="py-12 text-center text-sm text-muted-foreground" role="status">Checking access…</div>
      ) : canViewRequestedPage ? children : (
        <section className="mx-auto max-w-xl rounded-xl bg-card p-8 text-center shadow-sm" aria-labelledby="access-denied-title">
          <Lock className="mx-auto mb-4 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h2 id="access-denied-title" className="text-xl font-semibold">Access denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">Your account does not have permission to open this area.</p>
          <Button className="mt-6" onClick={() => router.push('/dashboard')}>Return to dashboard</Button>
        </section>
      )}
    </AppShell>
  );
}
