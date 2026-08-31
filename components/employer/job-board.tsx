'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Briefcase, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadAsset } from '@/lib/client-upload';

type Job = {
  id: string; title: string; organization: string; summary: string; responsibilities: string; requirements: string;
  employmentType: string; workMode: string; location: string | null; country: string | null; closesAt: string | null;
};

export function JobBoard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/jobs').then(async (response) => {
      if (!response.ok) throw new Error();
      setJobs((await response.json()).jobs || []);
    }).catch(() => toast.error('Could not load available roles'));
  }, []);

  const apply = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const uploaded = resume ? await uploadAsset(resume, 'TALENT_RESUME') : null;
      const response = await fetch(`/api/jobs/${selected.id}/applications`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverLetter, resumeAssetId: uploaded?.assetId || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit application');
      toast.success('Application submitted');
      setSelected(null); setCoverLetter(''); setResume(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not submit application'); }
    finally { setSaving(false); }
  };

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
    <div className="space-y-4">{jobs.length === 0 ? <Card><CardContent className="p-10 text-center"><Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">There are no open roles right now.</p></CardContent></Card> : jobs.map((job) => <Card key={job.id} className={selected?.id === job.id ? 'ring-2 ring-primary' : ''}><CardContent className="p-5"><div className="flex flex-wrap gap-2"><Badge variant="secondary">{job.employmentType.replace(/_/g, ' ')}</Badge><Badge variant="outline">{job.workMode}</Badge></div><h2 className="mt-3 text-lg font-semibold">{job.title}</h2><p className="text-sm text-muted-foreground">{job.organization}</p>{(job.location || job.country) && <p className="mt-2 flex items-center text-xs text-muted-foreground"><MapPin className="mr-1 h-3.5 w-3.5" />{[job.location, job.country].filter(Boolean).join(', ')}</p>}<p className="mt-3 line-clamp-3 text-sm">{job.summary}</p><Button className="mt-4" variant="outline" onClick={() => setSelected(job)}>View and apply</Button></CardContent></Card>)}</div>
    <div>{selected ? <Card className="sticky top-4"><CardContent className="space-y-4 p-5"><div><h2 className="text-lg font-semibold">{selected.title}</h2><p className="text-sm text-muted-foreground">{selected.organization}</p></div><section><h3 className="text-sm font-medium">About the role</h3><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selected.summary}</p></section><section><h3 className="text-sm font-medium">Responsibilities</h3><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selected.responsibilities}</p></section><section><h3 className="text-sm font-medium">Requirements</h3><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selected.requirements}</p></section><div className="space-y-2"><Label htmlFor="cover-letter">Cover letter</Label><Textarea id="cover-letter" minLength={50} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="Explain how your verified experience fits this role." /></div><div className="space-y-2"><Label htmlFor="resume">Résumé (optional PDF, JPG or PNG)</Label><Input id="resume" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setResume(e.target.files?.[0] || null)} /></div><Button className="w-full" disabled={saving || coverLetter.trim().length < 50} onClick={apply}>{saving ? 'Submitting…' : 'Submit application'}</Button></CardContent></Card> : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Select a role to review the details and apply.</CardContent></Card>}</div>
  </div>;
}
