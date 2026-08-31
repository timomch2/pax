'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { userRoles, USER_TYPES, homePathForRole, roleLabel } from '@/lib/access';
import { ArrowRightLeft } from 'lucide-react';

// Map each role to its surface home path
const SURFACE_HOME: Record<string, string> = {
  PRACTITIONER: '/dashboard',
  INNOVATOR: '/innovator',
  INVESTOR: '/investor',
  EMPLOYER: '/employer',
  POLICYMAKER: '/policymaker',
};

export function SurfaceSwitcher() {
  const { data: session } = useSession() || {};
  const pathname = usePathname() ?? '';

  if (!session?.user) return null;

  const primary = (session.user as any).role as string | undefined;
  const additional = ((session.user as any).additionalRoles ?? []) as string[];
  const allRoles = userRoles(primary, additional);

  // Only show if user has more than one surface
  if (allRoles.length <= 1) return null;

  // Get display info for each role
  const surfaces = allRoles
    .map(r => {
      const def = USER_TYPES.find(t => t.value === r);
      if (!def) return null;
      const home = SURFACE_HOME[r] || '/dashboard';
      const isActive = pathname.startsWith(home);
      return { role: r, label: def.shortLabel, icon: def.icon, home, isActive };
    })
    .filter(Boolean) as Array<{ role: string; label: string; icon: any; home: string; isActive: boolean }>;

  if (surfaces.length <= 1) return null;

  return (
    <div className="mb-4 pb-3 border-b border-black/[0.08]">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <ArrowRightLeft className="h-3 w-3 text-[#2ABFB0]" />
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Switch Surface</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {surfaces.map(s => {
          const Icon = s.icon;
          return (
            <Link
              key={s.role}
              href={s.home}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                s.isActive
                  ? 'bg-[#2ABFB0]/15 text-[#2ABFB0]'
                  : 'text-gray-400 hover:bg-black/[0.04] hover:text-[#1A2332]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
