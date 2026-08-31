'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileLock2, Loader2, Trash2, Upload } from 'lucide-react';
import { uploadAsset } from '@/lib/client-upload';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Innovation = { id: string; title: string; status: string };
type Document = { id: string; title: string; description: string | null; assetId: string; createdAt: string };

export function VaultDocumentsManager() {
  const [innovations, setInnovations] = useState<Innovation[]>([]);
  const [innovationId, setInnovationId] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch('/api/innovator/innovations').then((response) => response.json()).then((data) => { setInnovations(data.innovations || []); setInnovationId(data.innovations?.[0]?.id || ''); }).catch(() => toast.error('Could not load innovations')); }, []);
  useEffect(() => { if (!innovationId) return; fetch(`/api/innovator/innovations/${innovationId}/vault-documents`).then((response) => response.json()).then((data) => setDocuments(data.documents || [])).catch(() => toast.error('Could not load vault documents')); }, [innovationId]);

  const add = async () => {
    if (!file || !innovationId || title.trim().length < 2) return;
    setBusy(true);
    try {
      const uploaded = await uploadAsset(file, 'VAULT_DOCUMENT');
      const response = await fetch(`/api/innovator/innovations/${innovationId}/vault-documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description: description || null, assetId: uploaded.assetId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not attach document');
      setDocuments((current) => [data.document, ...current]); setTitle(''); setDescription(''); setFile(null);
      toast.success('Vault document added');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add document'); }
    finally { setBusy(false); }
  };

  const retire = async (document: Document) => {
    const response = await fetch(`/api/innovator/innovations/${innovationId}/vault-documents/${document.id}`, { method: 'DELETE' });
    if (!response.ok) { toast.error('Could not retire document'); return; }
    setDocuments((current) => current.filter((item) => item.id !== document.id));
    toast.success('Document retired; its evidence record is retained');
  };

  return <div className="space-y-5">
    <div className="space-y-2"><Label htmlFor="vault-innovation">Innovation</Label><select id="vault-innovation" className="h-10 w-full rounded-md border border-input bg-background px-3" value={innovationId} onChange={(event) => setInnovationId(event.target.value)}>{innovations.map((innovation) => <option key={innovation.id} value={innovation.id}>{innovation.title} ({innovation.status})</option>)}</select></div>
    <Card><CardContent className="grid gap-4 p-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="vault-title">Document title</Label><Input id="vault-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="vault-file">PDF, JPG or PNG</Label><Input id="vault-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] || null)} /></div><div className="space-y-2 md:col-span-2"><Label htmlFor="vault-description">Description</Label><Textarea id="vault-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div><div className="md:col-span-2"><Button disabled={busy || !file || !innovationId || title.trim().length < 2} onClick={add}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Add to encrypted vault</Button></div></CardContent></Card>
    {documents.length === 0 ? <Card><CardContent className="p-10 text-center"><FileLock2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">No secured documents are attached to this innovation.</p></CardContent></Card> : <div className="space-y-3">{documents.map((document) => <Card key={document.id}><CardContent className="flex flex-wrap items-start justify-between gap-3 p-4"><div><p className="font-medium">{document.title}</p>{document.description && <p className="mt-1 text-sm text-muted-foreground">{document.description}</p>}<a className="mt-2 inline-block text-sm text-primary underline" href={`/api/uploads/${document.assetId}/download`}>Review secured document</a></div><Button variant="ghost" size="sm" onClick={() => retire(document)}><Trash2 className="mr-2 h-4 w-4" />Retire</Button></CardContent></Card>)}</div>}
  </div>;
}
