'use client';

import { HubShell } from '@/components/hub/hub-shell';
import {
  LayoutDashboard, Users, Lightbulb, TrendingUp, Megaphone,
  Lock, ShieldAlert, ShieldCheck, BarChart3, Settings, Scale, Flag, Store, Activity,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/innovations', label: 'Innovations', icon: Lightbulb },
  { href: '/admin/investments', label: 'Investments', icon: TrendingUp },
  { href: '/admin/challenges', label: 'Challenges', icon: Megaphone },
  { href: '/community', label: 'Knowledge Exchange', icon: Scale },
  { href: '/admin/moderation', label: 'Moderation', icon: Flag },
  { href: '/admin/marketplace', label: 'Marketplace', icon: Store },
  { href: '/admin/vault', label: 'Vault & NDA', icon: Lock },
  { href: '/admin/safety', label: 'Safety', icon: ShieldAlert },
  { href: '/admin/verification', label: 'Verification Queue', icon: ShieldCheck },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/epidemiology', label: 'Epidemiology', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/facilities', label: 'Health facilities', icon: Activity },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <HubShell navItems={navItems} roleLabel="Admin Console">
      {children}
    </HubShell>
  );
}
