'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Search, Trash2, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_CATALOG } from '@/lib/service-navigation';
import type { ServiceSummary } from '@/lib/service-enrollment';
import { SERVICE_STATE_LABEL, SERVICE_ACCESS_LABEL } from '@/lib/pax-labels';
import { ROLE_LABEL, TIER_LABEL } from '@/lib/admin-labels';

interface AdminUser {
  services: ServiceSummary[];
  id: string; name: string; email: string; role: string; tier: string;
  organization: string | null; paxId: string | null; hubMember: boolean;
  credibilityScore: number; createdAt: string;
  _count: { innovations: number; investments: number; gpsEntries: number };
}

const ROLES = ['PRACTITIONER', 'INNOVATOR', 'INVESTOR', 'EMPLOYER', 'POLICYMAKER', 'ADMIN'];
const TIERS = ['TIER1_BASIC', 'TIER2_PROFESSIONAL', 'TIER3_EXPERT'];

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [serviceAccess, setServiceAccess] = useState('ALL');
  const [serviceState, setServiceState] = useState('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (roleFilter !== 'ALL') params.set('role', roleFilter);
    if (tierFilter !== 'ALL') params.set('tier', tierFilter);
    if (serviceFilter !== 'ALL') {
      params.set('service', serviceFilter);
      if (serviceState !== 'ALL') params.set('serviceState', serviceState);
      if (serviceAccess !== 'ALL') params.set('serviceAccess', serviceAccess);
    }
    fetch(`/api/admin/users?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setUsers(d.users); })
      .finally(() => setLoading(false));
  }, [q, roleFilter, tierFilter, serviceFilter, serviceState, serviceAccess]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function patchUser(id: string, body: any) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || 'Update failed'); return; }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.user } : u)));
      toast.success('User updated.');
    } catch { toast.error('Update failed'); }
    finally { setBusyId(null); }
  }

  async function deleteUser(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || 'Delete failed'); return; }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success('User deleted.');
    } catch { toast.error('Delete failed'); }
    finally { setBusyId(null); setToDelete(null); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1A2332]">Users</h2>
        <p className="text-sm text-muted-foreground">Manage member accounts, roles and membership tiers.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or organisation" className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All tiers</SelectItem>
            {TIERS.map((t) => <SelectItem key={t} value={t}>{TIER_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-48" aria-label="Filter by service"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All services</SelectItem>{SERVICE_CATALOG.map(service => <SelectItem key={service.id} value={service.id}>{service.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={serviceState} onValueChange={setServiceState} disabled={serviceFilter === 'ALL'}>
          <SelectTrigger className="w-48" aria-label="Filter by service state"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">Any enrollment</SelectItem>{Object.entries(SERVICE_STATE_LABEL).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Select value={serviceAccess} onValueChange={setServiceAccess} disabled={serviceFilter === 'ALL'}>
        <SelectTrigger className="w-56" aria-label="Filter by workspace access"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="ALL">Any workspace access</SelectItem>{Object.entries(SERVICE_ACCESS_LABEL).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
      </Select>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : users.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No users match your filters.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{users.length} user{users.length === 1 ? '' : 's'}</p>
          {users.map((u) => (
            <Card key={u.id} className="border-black/[0.06] bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-[#1A2332]">{u.name}</p>
                    {u.hubMember && <Badge className="gap-1 bg-[#2ABFB0]/15 text-[#2ABFB0]"><Stethoscope className="h-3 w-3" /> Hub</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{u.email}{u.organization ? ` · ${u.organization}` : ''}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {u.paxId ? `${u.paxId} · ` : ''}Score {u.credibilityScore} · {u._count.innovations} innov · {u._count.investments} invest · {u._count.gpsEntries} GPS
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={u.role} onValueChange={(v) => patchUser(u.id, { role: v })} disabled={busyId === u.id}>
                    <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={u.tier} onValueChange={(v) => patchUser(u.id, { tier: v })} disabled={busyId === u.id}>
                    <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIERS.map((t) => <SelectItem key={t} value={t}>{TIER_LABEL[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-9" disabled={busyId === u.id}
                    onClick={() => patchUser(u.id, { hubMember: !u.hubMember })}>
                    {u.hubMember ? 'Remove Hub' : 'Grant Hub'}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-[#DC2626] hover:bg-[#DC2626]/10"
                    disabled={busyId === u.id} onClick={() => setToDelete(u)}>
                    {busyId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <details className="mt-3 border-t border-border pt-3 text-sm">
                <summary className="cursor-pointer text-primary">Services ({u.services?.filter(service => service.state === 'ENABLED').length ?? 0} enabled)</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">{u.services?.map(service => <div key={service.id} className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">{service.label} · {SERVICE_STATE_LABEL[service.state]}</p>
                  <p className="text-xs text-muted-foreground">Workspace: {SERVICE_ACCESS_LABEL[service.access]} · Existing access rules</p>
                  <p className="mt-1 text-xs text-muted-foreground">{service.reason}</p>
                  {service.source && <p className="mt-1 text-xs">Enrollment: {service.source === 'SELF' ? 'Account owner' : 'Existing service records'}</p>}
                </div>)}</div>
              </details>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="border-black/[0.08] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1A2332]">Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-medium text-[#1A2332]">{toDelete?.name}</span> ({toDelete?.email}). This cannot be undone. Users with linked records cannot be deleted — change their role instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-[#DC2626] hover:bg-[#DC2626]/90" onClick={() => toDelete && deleteUser(toDelete.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
