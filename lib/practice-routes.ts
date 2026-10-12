/** Canonical Practice URLs; old dashboard URLs remain compatible through redirects. */
export const PRACTICE_SECTIONS = {
  facilities: { path: '/practice', label: 'Facilities', capability: null },
  patients: { path: '/practice/patients', label: 'Clients', capability: 'patient.read' },
  calendar: { path: '/practice/calendar', label: 'Calendar', capability: 'calendar.read' },
  bookings: { path: '/practice/bookings', label: 'Booking requests', capability: 'calendar.read' },
  finance: { path: '/practice/billing', label: 'Practice Finance', capability: 'billing.read' },
  accounts: { path: '/practice/accounts', label: 'Accounts', capability: 'billing.read' },
  reports: { path: '/practice/reports', label: 'Reports', capability: 'report.read' },
  team: { path: '/practice/team', label: 'Team', capability: 'team.manage' },
  reconciliation: { path: '/practice/reconciliation', label: 'Reconciliation', capability: 'clinical.read' },
} as const;
export type PracticeSection = keyof typeof PRACTICE_SECTIONS;

export function legacyPracticeRedirect(path: string): string | null {
  const routes: Record<string, string> = {
    '/dashboard/practice': '/practice',
    '/dashboard/calendar': '/practice/calendar',
    '/dashboard/patients': '/practice/patients',
    '/dashboard/billing': '/practice/billing',
  };
  if (routes[path]) return routes[path];
  if (path.startsWith('/dashboard/practice/')) return path.replace('/dashboard/practice', '/practice');
  if (/^\/book\/[^/]+$/.test(path)) return `/practice${path}`;
  if (path === '/dashboard/hub' || path.startsWith('/dashboard/hub/')) return path.replace('/dashboard/hub', '/practice/finance');
  return null;
}
