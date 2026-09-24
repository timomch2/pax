'use client';

import { HubShell } from '@/components/hub/hub-shell';
import { Landmark, ShieldAlert, MessagesSquare, UserCircle, Scale, Store } from 'lucide-react';

const navItems = [
  { href: '/policymaker', label: 'Overview', icon: Landmark },
  { href: '/policymaker/safety', label: 'Safety Signals', icon: ShieldAlert },
  { href: '/policymaker/debates', label: 'Open Calls & Debates', icon: MessagesSquare },
  { href: '/policymaker/profile', label: 'Profile', icon: UserCircle },
  { href: '/community', label: 'Knowledge Exchange', icon: Scale },
  { href: '/marketplace', label: 'Product Marketplace', icon: Store },
];

export function PolicymakerShell({ children }: { children: React.ReactNode }) {
  return (
    <HubShell navItems={navItems} roleLabel="Policy Watch">
      {children}
    </HubShell>
  );
}
