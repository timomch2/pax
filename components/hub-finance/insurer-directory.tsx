'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Building2, ShieldCheck, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { INSURER_CATEGORIES, INSURER_CATEGORY_LABELS } from '@/lib/hub-finance';

const TEAL = '#2ABFB0';

type Insurer = {
  id: string;
  name: string;
  shortName: string | null;
  category: string;
  contactPhone: string | null;
  contactEmail: string | null;
  isSystem: boolean;
};

const empty = { name: '', shortName: '', category: 'PRIVATE', contactPhone: '', contactEmail: '' };

export function InsurerDirectory() {
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hub/insurers');
      if (res.ok) setInsurers((await res.json()).insurers ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/hub/insurers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Payer added to your directory.');
      setOpen(false);
      setForm({ ...empty });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const system = insurers.filter((i) => i.isSystem);
  const own = insurers.filter((i) => !i.isSystem);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Payers &amp; insurers</h2>
          <p className="text-sm text-muted-foreground">Schemes, insurers and corporates you can assign to invoice payer lines.</p>
        </div>
        <Button type="button" onClick={() => setOpen(true)} className="gap-2" style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>
          <Plus className="h-4 w-4" /> Add payer
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          {own.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your payers</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {own.map((i) => <InsurerCard key={i.id} insurer={i} />)}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kenya directory</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {system.map((i) => <InsurerCard key={i.id} insurer={i} />)}
            </div>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a payer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Corporate Wellness Ltd" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Short name</Label>
                <Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="e.g. CWL" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSURER_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{INSURER_CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact phone</Label>
                <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              </div>
              <div>
                <Label>Contact email</Label>
                <Input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>
              {saving ? 'Saving…' : 'Add payer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InsurerCard({ insurer }: { insurer: Insurer }) {
  return (
    <Card className="border-black/[0.06] bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2ABFB0]/10" style={{ color: TEAL }}>
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{insurer.shortName || insurer.name}</p>
              <p className="truncate text-xs text-muted-foreground">{INSURER_CATEGORY_LABELS[insurer.category] || insurer.category}</p>
            </div>
          </div>
          {insurer.isSystem && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> System
            </span>
          )}
        </div>
        {insurer.shortName && insurer.name !== insurer.shortName && (
          <p className="mt-2 text-xs text-muted-foreground">{insurer.name}</p>
        )}
        {(insurer.contactPhone || insurer.contactEmail) && (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {insurer.contactPhone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {insurer.contactPhone}</div>}
            {insurer.contactEmail && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {insurer.contactEmail}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
