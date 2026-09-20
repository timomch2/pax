'use client';

import { HubShell } from '@/components/hub/hub-shell';
import { MessagesSquare, PlusCircle, FileText, LayoutGrid, UserCircle } from 'lucide-react';

const navItems = [
  { href: '/community', label: 'Community Hub', icon: LayoutGrid },
  { href: '/knowledge', label: 'All Debates', icon: MessagesSquare },
  { href: '/knowledge/start', label: 'Start a Debate', icon: PlusCircle },
  { href: '/knowledge/reports', label: 'Consensus Reports', icon: FileText },
  { href: '/community/profile', label: 'My Profile', icon: UserCircle },
  { href: '/dashboard', label: 'Back to My Workspace', icon: LayoutGrid },
];

export function KnowledgeShell({ children }: { children: React.ReactNode }) {
  return (
    <HubShell navItems={navItems} roleLabel="PAX Exchange Community & Debate Hub">
      {children}
    </HubShell>
  );
}
