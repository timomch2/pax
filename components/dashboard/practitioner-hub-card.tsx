'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Stethoscope, Lock, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface HubStatus {
  isPractitioner: boolean;
  eligible: boolean;
  hubMember: boolean;
  tier: string;
}

export function PractitionerHubCard() {
  const [status, setStatus] = useState<HubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const load = async () => {
    try {
      const res = await fetch('/api/practitioner-hub');
      if (res.ok) setStatus(await res.json());
    } catch (e: any) {
      console.error('Failed to load Practitioners Hub status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch('/api/practitioner-hub', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('You have joined the Practitioners Hub.');
        setStatus((s) => (s ? { ...s, hubMember: true } : s));
      } else {
        toast.error(data?.error || 'Could not join the Practitioners Hub.');
      }
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <Skeleton className="h-40 rounded-xl" />;
  // Only relevant to practitioners.
  if (!status?.isPractitioner) return null;

  // Already a member.
  if (status.hubMember) {
    return (
      <Card className="border-[#2D9B94]/30 bg-gradient-to-br from-[#E8F3F1] to-[#F1EEE8]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2D9B94]/15 text-[#2ABFB0]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-[#1A2332]">Practitioners Hub</h3>
                <Badge className="bg-[#2D9B94]/20 text-[#2ABFB0] hover:bg-[#2D9B94]/20">Member</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage and monitor the finances of your clinical practice — track revenue and invoices, manage patients, and organise your appointment calendar, all in one place.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Practitioner, but still on the free Basic tier — locked behind membership.
  if (!status.eligible) {
    return (
      <Card className="border-[#F59E0B]/25 bg-gradient-to-br from-[#FFF7E8] to-[#F1EEE8]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#FBBF24]">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-[#1A2332]">Practitioners Hub</h3>
                <Badge variant="outline" className="border-[#F59E0B]/40 text-[#FBBF24]">Membership required</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                The Practitioners Hub is where you manage the finances of your clinical practice — revenue, invoices, patients and your appointment calendar. Upgrade to a Professional membership to unlock it.
              </p>
            </div>
          </div>
          <Button asChild className="bg-[#F59E0B] text-black hover:bg-[#FBBF24]">
            <Link href="/membership">
              Upgrade Membership <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Eligible practitioner who hasn't joined yet.
  return (
    <Card className="border-[#2D9B94]/30 bg-gradient-to-br from-[#E8F3F1] to-[#F1EEE8]">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2D9B94]/15 text-[#2ABFB0]">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold text-[#1A2332]">Practitioners Hub</h3>
              <Badge className="bg-[#2D9B94]/20 text-[#2ABFB0] hover:bg-[#2D9B94]/20">Eligible</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Your membership unlocks the Practitioners Hub — manage and monitor the finances of your clinical practice, track invoices and revenue, manage patients, and organise your appointment calendar. Join now to get started.
            </p>
          </div>
        </div>
        <Button onClick={handleJoin} disabled={joining} className="bg-[#2D9B94] hover:bg-[#2ABFB0]">
          {joining ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining…</> : <>Join the Hub <ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
      </CardContent>
    </Card>
  );
}
