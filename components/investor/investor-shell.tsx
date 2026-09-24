'use client';

import { HubShell } from '@/components/hub/hub-shell';
import { Compass, Briefcase, Scale, Store, Target } from 'lucide-react';

const navItems = [
  { href: '/investor', label: 'Opportunities', icon: Compass },
  { href: '/investor/mandate', label: 'My Mandate', icon: Target },
  { href: '/investor/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/community', label: 'Knowledge Exchange', icon: Scale },
  { href: '/marketplace', label: 'Product Marketplace', icon: Store },
];

export function InvestorShell({ children }: { children: React.ReactNode }) {
  return (
    <HubShell navItems={navItems} roleLabel="Investment Platform">
      {children}
    </HubShell>
  );
}
