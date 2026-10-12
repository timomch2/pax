'use client';
import { HubShell, type HubNavItem } from '@/components/hub/hub-shell';
import { Wallet, UserCircle, LayoutDashboard, Building2, Users, Calendar, CalendarCheck, Receipt, Landmark, ChartNoAxesCombined, UsersRound, ClipboardCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { practiceFetch } from '@/components/hub/practice-form';
import { PRACTICE_SECTIONS, type PracticeSection } from '@/lib/practice-routes';
import type { Workspace } from '@/components/hub/practice-workspace';

const sectionIcons: Record<PracticeSection, HubNavItem['icon']> = {
  facilities: Building2, patients: Users, calendar: Calendar, bookings: CalendarCheck,
  finance: Receipt, accounts: Landmark, reports: ChartNoAxesCombined, team: UsersRound,
  reconciliation: ClipboardCheck,
};
const defaultNavItems = [
  { href: '/practice', label: 'Practice Workspace', icon: LayoutDashboard },
  { href: '/practice/finance', label: 'Practice Finance', icon: Wallet },
  { href: '/practice/profile', label: 'My Profile', icon: UserCircle },
];
export function PracticeShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const { data } = useSWR<{ workspaces: Workspace[] }>('/api/practice/workspaces', practiceFetch);
  const workspace = data?.workspaces.find((row) => row.id === searchParams.get('workspace')) ?? data?.workspaces[0];
  const navItems: HubNavItem[] = workspace
    ? Object.entries(PRACTICE_SECTIONS)
      .filter(([, item]) => !item.capability || workspace.capabilities.includes(item.capability))
      .map(([section, item]) => {
        const query = new URLSearchParams(searchParams.toString());
        query.set('workspace', workspace.id);
        return { href: `${item.path}?${query}`, activePath: item.path, label: item.label, icon: sectionIcons[section as PracticeSection] };
      })
    : defaultNavItems.slice(0, 1);
  const query = new URLSearchParams(searchParams.toString());
  if (workspace) query.set('workspace', workspace.id);
  // Active workspaces use the consolidated ledger; legacy finance remains available to unmigrated accounts.
  navItems.push(...defaultNavItems.slice(workspace ? 2 : 1).map((item) => ({
    ...item,
    href: `${item.href}${query.size ? `?${query}` : ''}`,
    // Keep legacy finance subpages highlighted without matching other workspace sections.
    activePath: item.href === '/practice/finance' ? undefined : item.href,
  })));
  return <HubShell navItems={navItems} roleLabel="Medical Practitioner" closeSidebarOnNavigate>{children}</HubShell>;
}
