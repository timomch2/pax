'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Star, Archive, ShieldCheck } from 'lucide-react';
import { SurveillanceDashboard } from '@/components/safety/surveillance-dashboard';

interface DrugReport {
  id: string; drugName: string; severity: string; sideEffects: string;
  patientAge: number; patientGender: string; province: string | null; country: string;
  createdAt: string; reporter: { name: string } | null;
}
interface Feedback {
  id: string; productName: string; rating: number; isExpertReview: boolean;
  feedbackTier: string; comment: string | null; province: string | null; country: string;
  createdAt: string; reviewer: { name: string } | null;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const SEV_COLOR: Record<string, string> = {
  MILD: 'border-[#2ABFB0]/40 text-[#2ABFB0]',
  MODERATE: 'border-[#FBBF24]/40 text-[#FBBF24]',
  SEVERE: 'border-[#DC2626]/40 text-[#DC2626]',
  LIFE_THREATENING: 'border-[#DC2626]/60 text-[#DC2626]',
};

export function AdminSafety() {
  const [drugReports, setDrugReports] = useState<DrugReport[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [bySeverity, setBySeverity] = useState<Record<string, number>>({});
  const [retention, setRetention] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/safety')
      .then((r) => r.json())
      .then((d) => { if (!d.error) { setDrugReports(d.drugReports); setFeedback(d.feedback); setBySeverity(d.bySeverity); setRetention(d.retention ?? null); } })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Post-Market Surveillance</h2>
        <p className="text-sm text-muted-foreground">Adverse drug reports and product feedback collected across the platform.</p>
      </div>

      {retention && (
        <Card className="border-black/[0.06] bg-[#131929] p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#2ABFB0]" />
            <h3 className="font-display text-sm font-semibold text-white">Retention &amp; Archive</h3>
            <Badge variant="outline" className="border-[#2ABFB0]/40 text-[#2ABFB0]">No deletion</Badge>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Every reported side effect is written to the database permanently. Nothing is ever deleted &mdash; not by
            reporters, not by administrators, and not when a member closes their account. Records older than{' '}
            {retention.retentionYears} years are snapshotted to secure long-term storage each year and stamped as
            archived, while remaining fully searchable here.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-black/[0.06] bg-[#0B0F1A] p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Side-effect reports held</p>
              <p className="mt-1 font-display text-xl font-bold text-white">{retention.reportsTotal}</p>
            </div>
            <div className="rounded-lg border border-black/[0.06] bg-[#0B0F1A] p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Product reviews held</p>
              <p className="mt-1 font-display text-xl font-bold text-white">{retention.feedbackTotal}</p>
            </div>
            <div className="rounded-lg border border-black/[0.06] bg-[#0B0F1A] p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Records deleted, all time</p>
              <p className="mt-1 font-display text-xl font-bold text-[#2ABFB0]">{retention.deleted}</p>
            </div>
            <div className="rounded-lg border border-black/[0.06] bg-[#0B0F1A] p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Archived snapshots</p>
              <p className="mt-1 font-display text-xl font-bold text-[#FBBF24]">
                {retention.reportsArchived + retention.feedbackArchived}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Archive className="h-3.5 w-3.5 text-[#FBBF24]" />
              {retention.dueForArchive} record{retention.dueForArchive === 1 ? '' : 's'} due at the next archive run
            </span>
            {retention.oldestRecord && <span>Oldest record on file: {fmtDate(retention.oldestRecord)}</span>}
          </div>
        </Card>
      )}

      <Tabs defaultValue="signals">
        <TabsList>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="reports">Adverse Reports ({drugReports.length})</TabsTrigger>
          <TabsTrigger value="feedback">Product Feedback ({feedback.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="pt-4">
          <SurveillanceDashboard />
        </TabsContent>

        <TabsContent value="reports" className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(bySeverity).map(([s, n]) => (
              <Badge key={s} variant="outline" className={SEV_COLOR[s] ?? 'border-black/[0.08]'}>{s.replace('_', ' ')}: {n}</Badge>
            ))}
          </div>
          {drugReports.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No adverse drug reports.</p>
          ) : drugReports.map((r) => (
            <Card key={r.id} className="border-black/[0.06] bg-[#131929] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{r.drugName}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.sideEffects}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {r.patientGender}, {r.patientAge}y · {[r.province, r.country].filter(Boolean).join(', ')} · {r.reporter?.name ?? 'Anonymous'} · {fmtDate(r.createdAt)}
                  </p>
                </div>
                <Badge variant="outline" className={SEV_COLOR[r.severity] ?? 'border-black/[0.08]'}>{r.severity.replace('_', ' ')}</Badge>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-3 pt-4">
          {feedback.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No product feedback.</p>
          ) : feedback.map((f) => (
            <Card key={f.id} className="border-black/[0.06] bg-[#131929] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-white">{f.productName}</p>
                    {f.isExpertReview && <Badge className="bg-[#2ABFB0]/15 text-[10px] text-[#2ABFB0]">Expert</Badge>}
                  </div>
                  {f.comment && <p className="truncate text-xs text-muted-foreground">{f.comment}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {[f.province, f.country].filter(Boolean).join(', ')} · {f.reviewer?.name ?? 'Anonymous'} · {fmtDate(f.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 text-[#FBBF24]">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className={`h-3.5 w-3.5 ${idx < f.rating ? 'fill-current' : 'opacity-30'}`} />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
