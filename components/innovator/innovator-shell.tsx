'use client';

import { HubShell } from '@/components/hub/hub-shell';
import { Rocket, Users, Lightbulb, ShieldCheck, Scale, Store, FolderLock } from 'lucide-react';

const navItems = [
  { href: '/innovator', label: 'Growth Suite', icon: Rocket },
  { href: '/innovator/submit', label: 'Submit Innovation', icon: Lightbulb },
  { href: '/innovator/investors', label: 'Investors', icon: Users },
  { href: '/innovator/vault-requests', label: 'Vault Requests', icon: ShieldCheck },
  { href: '/innovator/vault-documents', label: 'Vault Documents', icon: FolderLock },
  { href: '/community', label: 'PAX Exchange Community & Debate Hub', icon: Scale },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
];

export function InnovatorShell({ children }: { children: React.ReactNode }) {
  return (
    <HubShell navItems={navItems} roleLabel="Innovator Suite">
      {children}
    </HubShell>
  );
}
