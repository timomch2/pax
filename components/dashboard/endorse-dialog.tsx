'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BadgeCheck, Handshake } from 'lucide-react';
import { toast } from 'sonner';
import { ENDORSER_TYPE_OPTIONS, ENDORSER_TYPES, type GpsEndorserType } from '@/lib/gps';
import type { EndorsementItem } from '@/components/dashboard/endorsements-list';

export function EndorseDialog({
  entryId, entryTitle, memberName, open, onOpenChange, onEndorsed,
}: {
  entryId: string;
  entryTitle: string;
  memberName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEndorsed?: (score: number, endorsement: EndorsementItem) => void;
}) {
  const [endorserType, setEndorserType] = useState<GpsEndorserType | ''>('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const confirms = endorserType ? ENDORSER_TYPES[endorserType].confirms : '';

  const submit = async () => {
    if (!endorserType) {
      toast.error('Please choose your relationship to this work.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/gps-entries/${entryId}/endorsements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endorserType, comment }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Failed to endorse'); return; }
      toast.success('Endorsement added — thank you for vouching.');
      onEndorsed?.(data.credibilityScore, data.endorsement);
      onOpenChange(false);
      setEndorserType('');
      setComment('');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-[#2ABFB0]" /> Endorse this impact
          </DialogTitle>
          <DialogDescription>
            You are vouching for <span className="font-medium text-foreground">{memberName}</span>&apos;s
            work: <span className="italic">&ldquo;{entryTitle}&rdquo;</span>. Endorsements are public and
            tied to your name, so please only endorse what you can genuinely speak to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>How do you know this work? <span className="text-red-400">*</span></Label>
            <Select value={endorserType} onValueChange={(v) => setEndorserType(v as GpsEndorserType)}>
              <SelectTrigger><SelectValue placeholder="Choose your relationship" /></SelectTrigger>
              <SelectContent>
                {ENDORSER_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {confirms && (
            <div className="flex items-start gap-2 rounded-lg border border-[#2D9B94]/25 bg-[#2D9B94]/[0.07] p-3 text-sm">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2ABFB0]" />
              <span>By endorsing, you confirm: <span className="italic">&ldquo;{confirms}&rdquo;</span></span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Add a note (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. I supervised this campaign and can confirm the coverage gains."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} loading={saving} className="gap-2">
            <Handshake className="h-4 w-4" /> Add Endorsement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
