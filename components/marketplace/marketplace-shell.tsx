'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layouts/app-shell';
import { Store, ShoppingBag, ClipboardList, UserCircle, Scale, Package } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { NotificationBell } from '@/components/hub/notification-bell';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

const navItems = [
  { href: '/marketplace', label: 'Browse Marketplace', icon: Store },
  { href: '/marketplace/vendor', label: 'Vendor Dashboard', icon: ShoppingBag },
  { href: '/marketplace/profile', label: 'My Profile', icon: UserCircle },
  { href: '/marketplace/buyer', label: 'Buyer Profile', icon: ClipboardList },
  { href: '/community', label: 'PAX Exchange Community & Debate Hub', icon: Scale },
];

export function MarketplaceShell({ children }: { children: React.ReactNode }) {
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
            PRAXIS<span className="text-[#2ABFB0]"> EXCHANGE</span>
          </strong>
          <span className="text-[9px] text-[#FBBF24] tracking-[1.5px] font-bold uppercase">Marketplace</span>
        </div>
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/marketplace' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? 'bg-[#2ABFB0]/10 text-[#2ABFB0] font-semibold' : 'text-gray-400 hover:bg-black/[0.04] hover:text-[#1A2332]'
              }`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-[#E4E7EC]">
        <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-[#1A2332]" onClick={() => signOut({ callbackUrl: '/' })}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <AppShell sidebar={sidebar}
      header={
        <div className="flex items-center justify-between w-full">
          <h2 className="text-[#1A2332] font-semibold">Product Marketplace</h2>
          <div className="flex items-center gap-3">
            <NotificationBell />

          </div>
        </div>
      }>
      {children}
    </AppShell>
  );
}
