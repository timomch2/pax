'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  innovationId: string;
  innovationTitle: string;
  innovationRef?: string;
  investorName: string;
  investorEmail: string;
  investorOrg?: string;
  onSigned: () => void;
};

type Template = { title: string; body: string; version: number; contentHash: string; effectiveAt: string };

export function NdaClickwrap({
  open, onOpenChange, innovationId, innovationTitle, innovationRef,
  investorName, investorEmail, investorOrg, onSigned,
}: Props) {
  const [accepted, setAccepted] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (!open) return;
    setAccepted(false);
    setTypedName('');
    fetch('/api/vault-access/nda-template').then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'NDA unavailable');
      setTemplate(data.template);
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'NDA unavailable'));
  }, [open]);

  const sign = async () => {
    if (!template) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/vault-access', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ innovationId, accepted: true, typedName, templateVersion: template.version, contentHash: template.contentHash }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to sign NDA');
      toast.success('NDA accepted. The innovator will review your request.');
      onSigned();
      onOpenChange(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to sign NDA'); }
    finally { setSubmitting(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />{template?.title || 'Digital Non-Disclosure Agreement'}</DialogTitle></DialogHeader>
      {!template ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /><span className="sr-only">Loading agreement</span></div> : <>
        <div className="rounded-md bg-muted p-3 text-xs">
          <p><strong>Innovation:</strong> {innovationTitle} ({innovationRef || innovationId})</p>
          <p><strong>Recipient:</strong> {investorName}{investorOrg ? ` (${investorOrg})` : ''}</p>
          <p><strong>Account:</strong> {investorEmail}</p>
          <p><strong>Agreement version:</strong> {template.version}</p>
        </div>
        <ScrollArea className="max-h-[45vh] flex-1 rounded-md border p-4"><div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{template.body}</div></ScrollArea>
        <div className="space-y-4 border-t pt-4">
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>I have read this exact version and am authorized to bind myself or my entity to it.</span></label>
          <div className="space-y-2"><Label htmlFor="nda-typed-name">Type your full account name to sign</Label><Input id="nda-typed-name" autoComplete="name" value={typedName} onChange={(event) => setTypedName(event.target.value)} placeholder={investorName} /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!accepted || !template || typedName.trim().length < 2 || submitting} onClick={sign}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Accept and request access</Button></div>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
