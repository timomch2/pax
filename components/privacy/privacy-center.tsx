'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layouts/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Download,
  PencilLine,
  Ban,
  Trash2,
  ShieldCheck,
  FileText,
  Loader2,
} from 'lucide-react';

type ConsentRecord = {
  id: string;
  consentType: string;
  granted: boolean;
  policyVersion: string | null;
  grantedAt: string;
  withdrawnAt: string | null;
};

const OBJECTION_SCOPES = [
  { value: 'MARKETING', label: 'News, updates and marketing messages' },
  { value: 'PROFILE_VISIBILITY', label: 'My profile being visible to other members' },
  { value: 'CREDIBILITY_SCORE', label: 'The credibility score calculated about me' },
  { value: 'REMINDERS', label: 'Payment reminders sent using my details' },
  { value: 'OTHER', label: 'Something else (describe below)' },
];

export function PrivacyCenter() {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [objectScope, setObjectScope] = useState('MARKETING');
  const [objectReason, setObjectReason] = useState('');
  const [erasureReason, setErasureReason] = useState('');
  const [confirmErasure, setConfirmErasure] = useState(false);

  const loadConsents = async () => {
    setLoadingRecords(true);
    try {
      const res = await fetch('/api/privacy/consent');
      const data = await res.json();
      if (res.ok) setRecords(data.records ?? []);
    } catch {
      /* silent */
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadConsents();
  }, []);

  const marketingOn = records.some((r) => r.consentType === 'MARKETING' && !r.withdrawnAt);

  const toggleMarketing = async (next: boolean) => {
    setBusy('marketing');
    try {
      const res = await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentType: 'MARKETING', granted: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? 'Consent recorded.' : 'Consent withdrawn.');
      await loadConsents();
    } catch {
      toast.error('Could not update your preference. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const downloadData = () => {
    const a = document.createElement('a');
    a.href = '/api/privacy/export';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('Your data file is downloading.');
  };

  const lodgeObjection = async () => {
    setBusy('object');
    try {
      const res = await fetch('/api/privacy/object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: objectScope, reason: objectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      toast.success(data.message);
      setObjectReason('');
      await loadConsents();
    } catch {
      toast.error('Could not lodge your objection. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const requestErasure = async () => {
    setBusy('erase');
    try {
      const res = await fetch('/api/privacy/erasure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: erasureReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      toast.success(data.message);
      if (Array.isArray(data.retained) && data.retained.length > 0) {
        toast.message('Some records must be kept by law', {
          description: data.retained.join('; '),
        });
      }
      setErasureReason('');
      setConfirmErasure(false);
      await loadConsents();
    } catch {
      toast.error('Could not lodge your request. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Privacy & Your Data"
        description="Exercise the rights you have under the Kenya Data Protection Act, 2019. Everything here is free and takes effect immediately or is resolved within thirty days."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-[#1F7A74]" /> Get a copy of your data
          </CardTitle>
          <CardDescription>
            Your right of access and portability. Downloads everything we hold about you in a machine-readable file.
            If you are a practitioner it also includes the records you created, so keep the file confidential.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadData} className="gap-2">
            <Download className="h-4 w-4" /> Download my data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PencilLine className="h-4 w-4 text-[#1F7A74]" /> Correct your information
          </CardTitle>
          <CardDescription>
            Your right to rectification. Anything inaccurate or incomplete can be changed on your profile and takes
            effect straight away.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/profile">
              <PencilLine className="h-4 w-4" /> Edit my profile
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-[#1F7A74]" /> Your consents
          </CardTitle>
          <CardDescription>
            What you have agreed to, and when. Withdrawing consent does not affect anything lawfully done before you
            withdrew it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-4">
              <p className="text-sm font-medium">News, updates and marketing</p>
              <p className="text-xs text-muted-foreground">Optional. Turn this off at any time.</p>
            </div>
            <Switch
              checked={marketingOn}
              disabled={busy === 'marketing'}
              onCheckedChange={toggleMarketing}
              aria-label="Marketing consent"
            />
          </div>

          <div className="rounded-lg border">
            <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Consent history
            </div>
            {loadingRecords ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : records.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">No consent records yet.</p>
            ) : (
              <ul className="divide-y">
                {records.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                    <span className="font-medium">{r.consentType.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.withdrawnAt
                        ? `withdrawn ${new Date(r.withdrawnAt).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })}`
                        : `granted ${new Date(r.grantedAt).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })}`}
                      {r.policyVersion ? ` · policy v${r.policyVersion}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ban className="h-4 w-4 text-[#B26F09]" /> Object to a particular use
          </CardTitle>
          <CardDescription>
            Your right to object and to restrict processing. Tell us what to stop and we will act within thirty days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="objectScope">What are you objecting to?</Label>
            <select
              id="objectScope"
              value={objectScope}
              onChange={(e) => setObjectScope(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {OBJECTION_SCOPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="objectReason">Anything you want us to know (optional)</Label>
            <Textarea
              id="objectReason"
              rows={3}
              value={objectReason}
              onChange={(e) => setObjectReason(e.target.value)}
              placeholder="Tell us why, if you would like to."
            />
          </div>
          <Button variant="outline" onClick={lodgeObjection} loading={busy === 'object'} className="gap-2">
            <Ban className="h-4 w-4" /> Lodge objection
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-700">
            <Trash2 className="h-4 w-4" /> Ask us to delete your data
          </CardTitle>
          <CardDescription>
            Your right to erasure. We withdraw your consents immediately and delete what we can. Some records —
            invoices kept for tax, medicine safety reports, and the security audit trail — must be kept or
            de-identified rather than deleted. We will explain exactly what, in writing, within thirty days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="erasureReason">Reason (optional)</Label>
            <Textarea
              id="erasureReason"
              rows={3}
              value={erasureReason}
              onChange={(e) => setErasureReason(e.target.value)}
              placeholder="You do not have to give a reason."
            />
          </div>
          <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={confirmErasure}
              onChange={(e) => setConfirmErasure(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-red-600"
            />
            <span>I understand this withdraws my consents and starts the erasure process.</span>
          </label>
          <Button
            variant="destructive"
            disabled={!confirmErasure}
            loading={busy === 'erase'}
            onClick={requestErasure}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" /> Request erasure
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-[#3B2352]" /> Read the policy or complain
          </CardTitle>
          <CardDescription>
            Our Data Protection Officer can be reached at praxis@thepraxisexchange.com with “Data Protection” in the
            subject line. You may also complain directly to the Office of the Data Protection Commissioner at
            odpc.go.ke.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/privacy" target="_blank">
              <FileText className="h-4 w-4" /> Read the Privacy Policy
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
