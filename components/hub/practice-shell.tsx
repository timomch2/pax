'use client';
import { HubShell } from '@/components/hub/hub-shell';
import { Wallet, UserCircle, LayoutDashboard } from 'lucide-react';
const navItems = [
  { href: '/practice', label: 'Practice Workspace', icon: LayoutDashboard },
  { href: '/practice/finance', label: 'Practice Finance', icon: Wallet },
  { href: '/practice/profile', label: 'My Profile', icon: UserCircle },
];
export function PracticeShell({ children }: { children: React.ReactNode }) {
  return <HubShell navItems={navItems} roleLabel="Practitioner">{children}</HubShell>;
}
