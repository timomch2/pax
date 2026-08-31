'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Target, Save, Sparkles } from 'lucide-react';
import { INVESTOR_GEOGRAPHIES, INNOVATION_SECTORS, MANDATE_STAGES } from '@/lib/pax-labels';

type MandateState = {
  geographies: string[];
  sectors: string[];
  stages: string[];
  ticketMinUsd: number;
  ticketMaxUsd: number;
  notes: string;
  notifyOnMatch: boolean;
  active: boolean;
};

const EMPTY: MandateState = {
  geographies: [],
  sectors: [],
  stages: [],
  ticketMinUsd: 0,
  ticketMaxUsd: 0,
  notes: '',
  notifyOnMatch: true,
  active: true,
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function InvestorMandate() {
  const { toast } = useToast();
  const [state, setState] = useState<MandateState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/investor/mandate');
        if (res.ok) {
          const json = await res.json();
          if (json?.mandate) {
            const m = json.mandate;
            setState({
              geographies: m.geographies ?? [],
              sectors: m.sectors ?? [],
              stages: m.stages ?? [],
              ticketMinUsd: m.ticketMinUsd ?? 0,
              ticketMaxUsd: m.ticketMaxUsd ?? 0,
              notes: m.notes ?? '',
              notifyOnMatch: m.notifyOnMatch !== false,
              active: m.active !== false,
            });
          }
        }
      } catch (e) {
        console.error('Failed to load mandate:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/investor/mandate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (res.ok) {
        toast({ title: 'Mandate saved', description: 'Your matchmaking preferences are now active.' });
      } else {
        const j = await res.json().catch(() => ({}));
        toast({ title: 'Could not save', description: j?.error ?? 'Please try again.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Network error', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-[#2ABFB0]/15 p-2.5 text-[#2ABFB0]">
          <Target className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Investment Mandate</h2>
          <p className="text-sm text-muted-foreground">
            Tell the Neural Matchmaking engine what you back. We score every verified opportunity
            against your mandate and can alert you when a strong match goes investor-ready.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Target Geographies</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {INVESTOR_GEOGRAPHIES.map((g) => (
            <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={state.geographies.includes(g)}
                onCheckedChange={() => setState((s) => ({ ...s, geographies: toggle(s.geographies, g) }))}
              />
              {g}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sectors / Health Pillars</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {INNOVATION_SECTORS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={state.sectors.includes(s)}
                onCheckedChange={() => setState((st) => ({ ...st, sectors: toggle(st.sectors, s) }))}
              />
              {s}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Funding Stages</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MANDATE_STAGES.map((st) => (
            <label key={st.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={state.stages.includes(st.key)}
                onCheckedChange={() => setState((s) => ({ ...s, stages: toggle(s.stages, st.key) }))}
              />
              {st.label}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ticket Size (USD)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Minimum</Label>
            <Input
              type="number" min={0} inputMode="numeric"
              value={state.ticketMinUsd || ''}
              placeholder="e.g. 25000"
              onChange={(e) => setState((s) => ({ ...s, ticketMinUsd: Math.max(0, Number(e.target.value) || 0) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Maximum</Label>
            <Input
              type="number" min={0} inputMode="numeric"
              value={state.ticketMaxUsd || ''}
              placeholder="e.g. 250000"
              onChange={(e) => setState((s) => ({ ...s, ticketMaxUsd: Math.max(0, Number(e.target.value) || 0) }))}
            />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            Leave a field at 0 for no limit on that end. Opportunities publish funding goals in KSh; we convert automatically.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Thesis Notes <span className="font-normal text-muted-foreground">(optional)</span></CardTitle></CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Anything else that guides your investment decisions — impact priorities, exclusions, co-investment preferences..."
            value={state.notes}
            onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#FBBF24]" /> Deal alerts</p>
              <p className="text-xs text-muted-foreground">Notify me when a strong match becomes investor-ready.</p>
            </div>
            <Switch checked={state.notifyOnMatch} onCheckedChange={(v) => setState((s) => ({ ...s, notifyOnMatch: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Mandate active</p>
              <p className="text-xs text-muted-foreground">Turn off to pause matchmaking without deleting your mandate.</p>
            </div>
            <Switch checked={state.active} onCheckedChange={(v) => setState((s) => ({ ...s, active: v }))} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save mandate'}
        </Button>
      </div>
    </div>
  );
}
