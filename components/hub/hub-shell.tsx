'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layouts/app-shell';
import { Button } from '@/components/ui/button';
import { LogOut, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { NotificationBell } from '@/components/hub/notification-bell';
import { SurfaceSwitcher } from '@/components/hub/surface-switcher';

export interface HubNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function HubShell({
  children,
  navItems,
  roleLabel,
}: {
  children: React.ReactNode;
  navItems: HubNavItem[];
  roleLabel: string;
}) {
  const { data: session } = useSession() || {};
  const pathname = usePathname() ?? '';

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
            {roleLabel}
          </span>
          <span className="text-[11px] text-[#15908A] italic">
            Bridging the Gap from Idea to Impact
          </span>
        </div>
      </Link>

      <SurfaceSwitcher />
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== navItems[0]?.href && pathname?.startsWith(item.href));
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

      <div className="mt-auto border-t border-black/[0.08] pt-4">
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
        {navItems.find((n) => n.href === pathname)?.label ?? roleLabel}
      </h1>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <span className="hidden text-sm text-muted-foreground sm:inline">{roleLabel}</span>
      </div>
    </div>
  );

  return (
    <AppShell sidebar={sidebar} header={header}>
      {children}
    </AppShell>
  );
}
