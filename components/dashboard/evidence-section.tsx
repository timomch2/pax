'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Paperclip, FileText, Download, X, Loader2 } from 'lucide-react';
import { uploadAsset } from '@/lib/client-upload';

export interface Evidence {
  id: string;
  fileName: string;
  contentType: string;
  createdAt: string;
}

const MAX_BYTES = 25 * 1024 * 1024;

export function EvidenceSection({
  entryId,
  evidence,
  readOnly = false,
  onChange,
}: {
  entryId: string;
  evidence: Evidence[];
  readOnly?: boolean;
  onChange?: () => void | Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error('File is too large. Maximum size is 25MB.');
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadAsset(file, 'GPS_EVIDENCE');
      const attachRes = await fetch(`/api/gps-entries/${entryId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadAssetId: uploaded.assetId,
        }),
      });
      const attach = await attachRes.json();
      if (!attachRes.ok) { toast.error(attach?.error ?? 'Failed to attach evidence'); return; }

      toast.success('Evidence attached');
      await onChange?.();
    } catch (e) {
      console.error('Evidence upload error', e);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const download = async (ev: Evidence) => {
    setBusyId(ev.id);
    try {
      const res = await fetch(`/api/evidence/${ev.id}`);
      const data = await res.json();
      if (!res.ok || !data?.url) { toast.error('Could not open file'); return; }
      const a = document.createElement('a');
      a.href = data.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Could not open file');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (ev: Evidence) => {
    if (!confirm(`Remove "${ev.fileName}"?`)) return;
    setBusyId(ev.id);
    try {
      const res = await fetch(`/api/gps-entries/${entryId}/evidence?evidenceId=${ev.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Failed to remove'); return; }
      toast.success('Evidence removed');
      await onChange?.();
    } catch {
      toast.error('Failed to remove');
    } finally {
      setBusyId(null);
    }
  };

  if (readOnly && evidence.length === 0) return null;

  return (
    <div className="mt-4 border-t border-black/[0.06] pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" /> Evidence{evidence.length > 0 ? ` (${evidence.length})` : ''}
        </p>
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
              {uploading ? 'Uploading…' : 'Attach file'}
            </Button>
          </>
        )}
      </div>

      {evidence.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {evidence.map((ev) => (
            <li key={ev.id} className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-black/[0.02] px-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-[#2ABFB0]" />
              <span className="min-w-0 flex-1 truncate text-xs">{ev.fileName}</span>
              <button
                onClick={() => download(ev)}
                disabled={busyId === ev.id}
                aria-label="Download"
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {busyId === ev.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              </button>
              {!readOnly && (
                <button
                  onClick={() => remove(ev)}
                  disabled={busyId === ev.id}
                  aria-label="Remove"
                  className="shrink-0 rounded p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && evidence.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground/70">
          Optionally attach supporting documents, reports, photos or certificates (up to 100MB each).
        </p>
      )}
    </div>
  );
}
