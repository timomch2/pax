'use client';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { hasRole } from '@/lib/access';
import Link from 'next/link';
import { toast } from 'sonner';
import { PracticeForm, practiceFetch, practiceSend, type PracticeField } from '@/components/hub/practice-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PILLAR_LABELS, VENDOR_STATUS_LABELS, BUYER_ENTITY_LABELS } from '@/lib/marketplace';
import type { EditableServiceProfile } from '@/lib/service-profile-validation';
import { PracticeProfileEditor } from '@/components/profile/practice-profile-editor';

const definitions: Record<EditableServiceProfile, { title: string; fields: PracticeField[] }> = {
  practice: { title: 'Clinical profile', fields: [
    { name: 'specialty', label: 'Specialty', required: true }, { name: 'hospital', label: 'Hospital / facility' },
    { name: 'consultationRate', label: 'Consultation rate (KSh)', type: 'number', required: true },
    { name: 'affiliations', label: 'Professional affiliations' }, { name: 'bio', label: 'About your practice', type: 'textarea' },
  ] },
  community: { title: 'Community profile', fields: [
    { name: 'headline', label: 'Professional headline' }, { name: 'organization', label: 'Organization' },
    { name: 'location', label: 'Location' }, { name: 'healthAreas', label: 'Health areas and interests' },
    { name: 'linkedinUrl', label: 'LinkedIn profile', type: 'url' }, { name: 'bio', label: 'About your community work', type: 'textarea' },
  ] },
  vendor: { title: 'Vendor profile', fields: [
    { name: 'contactPerson', label: 'Business contact', required: true }, { name: 'contactEmail', label: 'Business email', type: 'email', required: true }, { name: 'contactPhone', label: 'Business phone', required: true },
  ] },
  buyer: { title: 'Buyer profile', fields: [
    { name: 'procurementOfficer', label: 'Procurement officer', required: true }, { name: 'officerTitle', label: 'Officer title' }, { name: 'officerEmail', label: 'Procurement email', type: 'email', required: true }, { name: 'phone', label: 'Institution phone' },
  ] },
};

/** Reuse each service's stored profile without editing another service or the shared login identity. */
export function ServiceProfileForm({ service }: { service: EditableServiceProfile }) {
  const url = `/api/service-profile/${service}`;
  const { data, error, mutate } = useSWR<Record<string, string | number | boolean | null> | null>(url, practiceFetch);
  const { data: session } = useSession();
  const { data: access } = useSWR<{ permissions: string[] }>('/api/auth/capabilities', practiceFetch);
  const canEdit = Boolean(access?.permissions.includes('profile.update') &&
    (service !== 'vendor' || access.permissions.includes('marketplace.vendor.manage')) &&
    (service !== 'practice' || hasRole(session?.user?.role, session?.user?.additionalRoles, 'PRACTITIONER')));
  const definition = definitions[service];
  if (error) return <p role="alert" className="text-destructive">{error.message}</p>;
  if (data === undefined) return <Skeleton className="h-64 w-full" />;
  if (!data) return <Card><CardHeader><CardTitle>{definition.title}</CardTitle></CardHeader><CardContent className="space-y-4">
    <p>{service === 'practice' ? 'Your account does not have a registered practitioner profile. Invited staff can use the Practice sections permitted by their workspace owner.' : `Complete ${service} registration to set up your ${service} profile.`}</p>
    {(service === 'buyer' || (service === 'vendor' && access?.permissions.includes('marketplace.vendor.manage'))) && <Button asChild><Link href={`/marketplace/${service}`}>Register as {service}</Link></Button>}
  </CardContent></Card>;
  return <Card><CardHeader><CardTitle>{definition.title}</CardTitle></CardHeader><CardContent className="space-y-6">
    {service === 'practice' && <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Medical registration</dt><dd>{data.medicalRegNumber || 'Not recorded'}</dd></div><div><dt className="text-sm text-muted-foreground">Clinic ID</dt><dd>{data.clinicId || 'Not assigned'}</dd></div></dl>}
    {service === 'vendor' && <div><h3 className="font-semibold">{data.tradingName || data.corporateName}</h3><p>{PILLAR_LABELS[String(data.primaryPillar)]} · {VENDOR_STATUS_LABELS[String(data.status)]}</p><p className="text-sm text-muted-foreground">Registration: {data.registrationNumber} · {data.country}</p><Link href="/marketplace/vendor" className="text-sm text-primary underline">Open vendor dashboard</Link></div>}
    {service === 'buyer' && <div><h3 className="font-semibold">{data.institutionName}</h3><p>{BUYER_ENTITY_LABELS[String(data.entityType)]} · {data.jurisdiction}</p></div>}
    {service === 'practice' ? <PracticeProfileEditor key={JSON.stringify(data)} data={data} disabled={!canEdit} onSaved={async () => { await mutate(); }} /> : <PracticeForm disabled={!canEdit} key={JSON.stringify(data)} fields={definition.fields.map(field => ({ ...field, value: String(data[field.name] ?? '') }))} submitLabel="Save profile" onSubmit={async values => {
      const saved = await practiceSend(url, values, 'PATCH');
      await mutate(saved, false);
      toast.success('Profile saved');
    }} />}
  </CardContent></Card>;
}
