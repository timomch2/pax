'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, ExternalLink, Scale } from 'lucide-react';
import { debateType } from '@/lib/debate';
import { TypeBadge, feasibilityColor } from '@/components/knowledge/bits';

interface PublishedDebate {
  id: string;
  title: string;
  type: string;
  healthDomain: string | null;
  geographyFocus: string | null;
  feasibilityConsensus: number | null;
  consensusPublishedAt: string;
  initiator: { name: string | null };
  _count: { contributions: number; stances: number };
}

export function ConsensusReportsList() {
  const [debates, setDebates] = useState<PublishedDebate[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/debates/published');
      if (res.ok) {
        const data = await res.json();
        setDebates(data.debates || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const downloadPdf = async (debateId: string, title: string) => {
    setDownloading(debateId);
    try {
      // Start PDF generation
      const startRes = await fetch(`/api/debates/${debateId}/brief`);
      const startData = await startRes.json();
      if (!startRes.ok || !startData.requestId) {
        toast.error(startData.error || 'Could not start PDF generation');
        return;
      }

      // Poll for completion
      let attempts = 0;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const statusRes = await fetch(`/api/debates/${debateId}/brief/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: startData.requestId }),
        });
        const statusData = await statusRes.json();
        if (statusData.status === 'SUCCESS' && statusData.pdfBase64) {
          const byteChars = atob(statusData.pdfBase64);
          const byteNums = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
          const blob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `PAX_Consensus_Brief_${title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Brief downloaded.');
          return;
        }
        if (statusData.status === 'FAILED') {
          toast.error('PDF generation failed.');
          return;
        }
        attempts++;
      }
      toast.error('PDF generation timed out.');
    } catch { toast.error('Something went wrong.'); }
    finally { setDownloading(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B7FD4]/10">
          <FileText className="h-7 w-7 text-[#8B7FD4]" />
        </div>
        <h1 className="text-center font-display text-2xl font-semibold">Consensus Intelligence Briefs</h1>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
          When a debate closes, its field evidence is synthesised into a concise, citable Consensus Brief
          — drafted with AI assistance and approved by a human editor before publication.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : debates.length === 0 ? (
        <Card className="border-black/[0.08] bg-white">
          <CardContent className="py-12 text-center">
            <Scale className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No briefs published yet. The first ones will appear once debates reach synthesis and are approved.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/knowledge">Browse active debates</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {debates.map((d) => {
            const t = debateType(d.type);
            return (
              <Card key={d.id} className="border-black/[0.08] bg-white transition-colors hover:border-black/[0.12]">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <TypeBadge type={d.type} />
                        {d.healthDomain && <span className="text-xs text-muted-foreground">{d.healthDomain}</span>}
                        {d.geographyFocus && <span className="text-xs text-muted-foreground">· {d.geographyFocus}</span>}
                      </div>
                      <Link href={`/knowledge/${d.id}`} className="font-semibold hover:text-[#2ABFB0] transition-colors">
                        {d.title}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{d._count.contributions} contributions</span>
                        <span>{d._count.stances} reactions</span>
                        {d.feasibilityConsensus != null && (
                          <span>Feasibility <span className="font-semibold" style={{ color: feasibilityColor(d.feasibilityConsensus) }}>{d.feasibilityConsensus.toFixed(1)}/5</span></span>
                        )}
                        <span>Published {new Date(d.consensusPublishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
                        <Link href={`/knowledge/${d.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" /> View debate
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs bg-[#8B7FD4] hover:bg-[#8B7FD4]/80"
                        onClick={() => downloadPdf(d.id, d.title)}
                        disabled={downloading === d.id}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloading === d.id ? 'Generating…' : 'Download PDF'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
