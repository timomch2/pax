'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Briefcase, ChevronDown, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

type Job = {
  id: string;
  title: string;
  organization: string;
  summary: string;
  employmentType: string;
  workMode: string;
  status: string;
  closesAt: string | null;
  _count: { applications: number };
};

type Application = {
  id: string;
  status: string;
  coverLetter: string;
  resumeAssetId: string | null;
  submittedAt: string;
  applicant: { name: string; headline: string | null; location: string | null; paxId: string | null; credibilityScore: number };
};

const EMPTY_FORM = {
  title: '', organization: '', summary: '', responsibilities: '', requirements: '',
  employmentType: 'FULL_TIME', workMode: 'ONSITE', location: '', country: '', closesAt: '', status: 'DRAFT',
};

export function JobsManager() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Record<string, Application[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadJobs = async () => {
    const response = await fetch('/api/jobs?mine=1');
    if (!response.ok) throw new Error('Could not load jobs');
    const data = await response.json();
    setJobs(data.jobs || []);
  };

  useEffect(() => { loadJobs().catch(() => toast.error('Could not load roles')); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          healthAreas: [],
          location: form.location || null,
          country: form.country || null,
          closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save role');
      toast.success(form.status === 'PUBLISHED' ? 'Role published' : 'Draft saved');
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadJobs();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save role'); }
    finally { setSaving(false); }
  };

  const toggleApplications = async (jobId: string) => {
    if (expanded === jobId) { setExpanded(null); return; }
    setExpanded(jobId);
    if (applications[jobId]) return;
    const response = await fetch(`/api/jobs/${jobId}/applications`);
    if (!response.ok) { toast.error('Could not load applications'); return; }
    const data = await response.json();
    setApplications((current) => ({ ...current, [jobId]: data.applications || [] }));
  };

  const changeStatus = async (jobId: string, applicationId: string, status: string) => {
    const response = await fetch(`/api/jobs/${jobId}/applications/${applicationId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) { toast.error(data.error || 'Could not update application'); return; }
    setApplications((current) => ({
      ...current,
      [jobId]: (current[jobId] || []).map((item) => item.id === applicationId ? { ...item, status: data.application.status } : item),
    }));
    toast.success('Application status updated');
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((value) => !value)}><Plus className="mr-2 h-4 w-4" />Post a role</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New role</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <FormField label="Role title"><Input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
              <FormField label="Organisation"><Input required value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></FormField>
              <FormField label="Summary" wide><Textarea required minLength={20} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></FormField>
              <FormField label="Responsibilities" wide><Textarea required minLength={20} value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} /></FormField>
              <FormField label="Requirements" wide><Textarea required minLength={20} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} /></FormField>
              <FormField label="Employment type"><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="CONTRACT">Contract</option><option value="CONSULTANCY">Consultancy</option><option value="INTERNSHIP">Internship</option><option value="VOLUNTEER">Volunteer</option></select></FormField>
              <FormField label="Work mode"><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })}><option value="ONSITE">On-site</option><option value="HYBRID">Hybrid</option><option value="REMOTE">Remote</option></select></FormField>
              <FormField label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></FormField>
              <FormField label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></FormField>
              <FormField label="Closing date"><Input type="datetime-local" value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} /></FormField>
              <FormField label="Save as"><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="DRAFT">Draft</option><option value="PUBLISHED">Publish now</option></select></FormField>
              <div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save role'}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
      {jobs.length === 0 ? (
        <Card><CardContent className="p-10 text-center"><Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">No roles yet. Create a draft or publish your first opening.</p></CardContent></Card>
      ) : jobs.map((job) => (
        <Card key={job.id}>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="flex items-center gap-2"><h3 className="font-semibold">{job.title}</h3><Badge variant="secondary">{job.status}</Badge></div><p className="text-sm text-muted-foreground">{job.organization} · {job.employmentType.replace(/_/g, ' ')} · {job.workMode.toLowerCase()}</p><p className="mt-2 max-w-3xl text-sm">{job.summary}</p></div>
              <Button variant="outline" onClick={() => toggleApplications(job.id)}>{job._count.applications} applications <ChevronDown className="ml-2 h-4 w-4" /></Button>
            </div>
            {expanded === job.id && <ApplicationsList jobId={job.id} applications={applications[job.id] || []} onStatus={changeStatus} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FormField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={wide ? 'space-y-2 md:col-span-2' : 'space-y-2'}><Label>{label}</Label>{children}</div>;
}

function ApplicationsList({ jobId, applications, onStatus }: { jobId: string; applications: Application[]; onStatus: (jobId: string, applicationId: string, status: string) => void }) {
  if (!applications.length) return <p className="mt-5 rounded-md bg-muted p-4 text-sm text-muted-foreground">No applications have been submitted.</p>;
  return <div className="mt-5 space-y-3 border-t pt-5">{applications.map((application) => <div key={application.id} className="rounded-md border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{application.applicant.name}</p><p className="text-xs text-muted-foreground">{application.applicant.headline || 'PAX member'} · Credibility {application.applicant.credibilityScore}</p></div><Badge>{application.status.replace(/_/g, ' ')}</Badge></div><p className="mt-3 whitespace-pre-wrap text-sm">{application.coverLetter}</p><div className="mt-3 flex flex-wrap gap-2">{application.resumeAssetId && <Button asChild size="sm" variant="outline"><a href={`/api/uploads/${application.resumeAssetId}/download`}><FileText className="mr-2 h-4 w-4" />Review résumé</a></Button>}{['UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'].map((status) => <Button key={status} size="sm" variant="ghost" onClick={() => onStatus(jobId, application.id, status)}>{status.replace(/_/g, ' ')}</Button>)}</div></div>)}</div>;
}
