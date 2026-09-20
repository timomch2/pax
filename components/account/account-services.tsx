'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ServiceSummary } from '@/lib/service-enrollment';
import { SERVICE_STATE_LABEL, SERVICE_ACCESS_LABEL, SERVICE_SOURCE_LABEL } from '@/lib/pax-labels';

export async function serviceFetcher() {
  const response = await fetch('/api/account/services', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load services');
  return data;
}

export function AccountServices({ initialServices, selectedService, userId }: { initialServices: ServiceSummary[]; selectedService?: string; userId: string }) {
  const { data, error, mutate } = useSWR<{ services: ServiceSummary[] }>(['/api/account/services', userId], serviceFetcher, { fallbackData: { services: initialServices } });
  const [busy, setBusy] = useState<string | null>(null);
  async function change(service: ServiceSummary) {
    setBusy(service.id);
    try {
      const response = await fetch('/api/account/services', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceKey: service.id, enabled: service.state !== 'ENABLED' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update service');
      await mutate(result);
      toast.success(service.state === 'ENABLED' ? 'Service disabled in your account' : 'Service enabled in your account');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to update service'); }
    finally { setBusy(null); }
  }
  return <section id="my-services" className="space-y-4 scroll-mt-20" aria-labelledby="my-services-heading">
    <div><h2 id="my-services-heading" className="text-xl font-semibold">My services</h2><p className="mt-1 text-sm text-muted-foreground">Choose the services you want to use, then complete their setup.</p></div>
    <p className="text-sm text-muted-foreground">Enabling a service keeps your existing permissions and verification requirements. Disabling removes it from your enabled services; it preserves your data and does not revoke existing workspace access or cancel a subscription.</p>
    {error && <p role="alert" className="text-sm text-destructive">Could not refresh your services. Please try again.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      {data?.services.map(service => <Card key={service.id} className={`flex flex-col gap-4 p-5 shadow-sm ${selectedService === service.id ? 'ring-2 ring-primary' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{service.label}</h3><Badge variant={service.state === 'ENABLED' ? 'default' : 'secondary'}>{SERVICE_STATE_LABEL[service.state]}</Badge></div>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Workspace access: </span>{SERVICE_ACCESS_LABEL[service.access]}</p>
          <p className="text-muted-foreground">{service.reason}</p>
          {service.source && <p className="text-xs text-muted-foreground">{SERVICE_SOURCE_LABEL[service.source]} · Existing access rules</p>}
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {service.state === 'ENABLED' && service.access !== 'UNAVAILABLE' && service.access !== 'ACCOUNT_RESTRICTED' && <Button asChild size="sm"><a href={service.href}>{service.access === 'SETUP_REQUIRED' ? 'Continue setup' : 'Open service'}</a></Button>}
          <Button size="sm" variant="outline" disabled={busy !== null || service.access === 'ACCOUNT_RESTRICTED'} onClick={() => void change(service)}>{busy === service.id ? 'Saving…' : service.state === 'ENABLED' ? 'Disable service' : 'Enable service'}</Button>
          {service.state === 'ENABLED' && <Button asChild size="sm" variant="ghost"><a href={service.profileHref}>Service profile</a></Button>}
        </div>
      </Card>)}
    </div>
  </section>;
}
