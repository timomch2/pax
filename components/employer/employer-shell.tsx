'use client';

import { HubShell } from '@/components/hub/hub-shell';
import { Building2, Megaphone, Users, UserCircle, Scale, Store } from 'lucide-react';

const navItems = [
  { href: '/employer', label: 'Overview', icon: Building2 },
  { href: '/employer/roles', label: 'Post & Manage Roles', icon: Megaphone },
  { href: '/employer/talent', label: 'Browse Talent', icon: Users },
  { href: '/employer/profile', label: 'Organisation Profile', icon: UserCircle },
  { href: '/community', label: 'PAX Exchange Community & Debate Hub', icon: Scale },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
];

export function EmployerShell({ children }: { children: React.ReactNode }) {
  return (
    <HubShell navItems={navItems} roleLabel="Employer Hub">
      {children}
    </HubShell>
  );
}
