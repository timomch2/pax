'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Star, MapPin } from 'lucide-react';
import { SurveillanceDashboard } from '@/components/safety/surveillance-dashboard';

const SEVERITY_COLOR: Record<string, string> = {
  MILD: 'bg-[#2D9B94]/20 text-[#2ABFB0]',
  MODERATE: 'bg-[#F59E0B]/20 text-[#FBBF24]',
  SEVERE: 'bg-[#DC2626]/20 text-[#F87171]',
  LIFE_THREATENING: 'bg-[#DC2626]/30 text-[#F87171]',
};

export function SafetySignals() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, fRes] = await Promise.all([
          fetch('/api/safety/drug-report?page=1'),
          fetch('/api/safety/product-feedback?page=1'),
        ]);
        if (aRes.ok) { const a = await aRes.json(); setReports(a.reports || []); }
        if (fRes.ok) { const f = await fRes.json(); setFeedback(f.feedback || []); }
      } catch (e: any) {
        console.error('Failed to load safety signals:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Safety Signals</h2>
        <p className="text-sm text-muted-foreground">
          Monitor adverse drug reports and product feedback surfacing across the network.
        </p>
      </div>

      <SurveillanceDashboard />

      <div>
        <h3 className="font-display text-lg font-semibold">Recent submissions</h3>
        <p className="text-sm text-muted-foreground">The latest individual reports and reviews as they arrive.</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (
        <Tabs defaultValue="adr">
          <TabsList>
            <TabsTrigger value="adr">
              <AlertTriangle className="mr-2 h-4 w-4" /> Adverse Reports ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <Star className="mr-2 h-4 w-4" /> Product Feedback ({feedback.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="adr" className="mt-4">
            {reports.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/[0.08] p-8 text-center text-sm text-muted-foreground">
                No adverse drug reports on record yet.
              </p>
            ) : (
              <div className="space-y-2">
                {reports.map((r) => (
                  <Card key={r.id} className="border-black/[0.08]">
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{r.drugName}</p>
                          <Badge className={`${SEVERITY_COLOR[r.severity] || 'bg-black/[0.06] text-white'} hover:opacity-100`}>
                            {String(r.severity).replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{r.sideEffects}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {r.province ? `${r.province}, ` : ''}{r.country}
                          <span>· Patient {r.patientAge}{r.patientGender ? `, ${r.patientGender}` : ''}</span>
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedback" className="mt-4">
            {feedback.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/[0.08] p-8 text-center text-sm text-muted-foreground">
                No product feedback on record yet.
              </p>
            ) : (
              <div className="space-y-2">
                {feedback.map((f) => (
                  <Card key={f.id} className="border-black/[0.08]">
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{f.productName}</p>
                          <span className="flex items-center gap-0.5 text-[#FBBF24]">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < f.rating ? 'fill-current' : 'opacity-30'}`} />
                            ))}
                          </span>
                          {f.isExpertReview && (
                            <Badge className="bg-[#2D9B94]/20 text-[#2ABFB0] hover:opacity-100">Expert</Badge>
                          )}
                        </div>
                        {f.comment && <p className="mt-1 text-sm text-muted-foreground">{f.comment}</p>}
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {f.province ? `${f.province}, ` : ''}{f.country}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(f.createdAt).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
