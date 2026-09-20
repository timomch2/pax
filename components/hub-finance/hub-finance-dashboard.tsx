'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  FileText,
  Users,
  Building2,
  Download,
  ArrowRight,
  Plus,
  ReceiptText,
} from 'lucide-react';
import {
  formatKsh,
  AGEING_LABELS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE,
  PAYER_TYPE_LABELS,
  type AgeingBucket,
} from '@/lib/hub-finance';

const TEAL = '#2ABFB0';
const GOLD = '#FBBF24';
const RED = '#DC2626';

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }) : '—';

export function HubFinanceDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hub/summary');
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error('Failed to load hub summary:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/hub/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pax-ageing-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Ageing report downloaded', { description: 'Your outstanding-balance CSV has been saved.' });
    } catch (e) {
      console.error('CSV export failed:', e);
      toast.error('Export failed', { description: 'We could not build the ageing report. Please try again.' });
    } finally {
      setExporting(false);
    }
  };

  const totals = data?.totals;
  const ageing: { bucket: AgeingBucket; amount: number }[] = data?.ageing ?? [];
  const maxAgeing = Math.max(1, ...ageing.map((a) => a.amount));
  const topDebtors: any[] = data?.topDebtors ?? [];
  const recent: any[] = data?.recent ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Practice Finances</h2>
          <p className="text-sm text-muted-foreground">
            Track what you bill, who pays, who owes — and settle the rest.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleExportCsv} disabled={exporting}>
            <Download className="h-4 w-4" /> {exporting ? 'Preparing…' : 'Ageing CSV'}
          </Button>
          <Link href="/practice/finance/invoices">
            <Button size="sm" className="gap-2" style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>
              <Plus className="h-4 w-4" /> New invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <KpiCard icon={<FileText className="h-5 w-5" />} label="Total billed" value={formatKsh(totals?.totalBilled ?? 0)} hint={`${totals?.invoiceCount ?? 0} invoices`} color={TEAL} />
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Collected" value={formatKsh(totals?.totalCollected ?? 0)} hint={`${totals?.collectionRate ?? 0}% collection rate`} color={GOLD} />
            <KpiCard icon={<Wallet className="h-5 w-5" />} label="Outstanding" value={formatKsh(totals?.outstanding ?? 0)} hint="awaiting payment" color={RED} />
            <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Overdue lines" value={String(totals?.overdueLines ?? 0)} hint="past due date" color={RED} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ageing */}
        <Card className="border-black/[0.06] bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Outstanding by age</h3>
              <span className="text-xs text-muted-foreground">since due date</span>
            </div>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : ageing.every((a) => a.amount === 0) ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nothing outstanding. You&apos;re all settled.</p>
            ) : (
              <div className="space-y-3">
                {ageing.map((a) => (
                  <div key={a.bucket}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{AGEING_LABELS[a.bucket]}</span>
                      <span className="font-medium">{formatKsh(a.amount)}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/[0.04]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(a.amount / maxAgeing) * 100}%`,
                          backgroundColor: a.bucket === 'CURRENT' ? TEAL : a.bucket === 'D90_PLUS' ? RED : GOLD,
                          minWidth: a.amount > 0 ? '6px' : '0',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top debtors */}
        <Card className="border-black/[0.06] bg-white">
          <CardContent className="p-5">
            <h3 className="mb-4 font-display text-base font-semibold">Who owes you most</h3>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : topDebtors.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No outstanding debtors.</p>
            ) : (
              <ul className="space-y-3">
                {topDebtors.map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {PAYER_TYPE_LABELS[d.type] || d.type}
                        {d.oldestDays > 0 ? ` · ${d.oldestDays}d overdue` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold" style={{ color: d.oldestDays > 0 ? RED : GOLD }}>
                      {formatKsh(d.outstanding)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card className="border-black/[0.06] bg-white">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Recent invoices</h3>
            <Link href="/practice/finance/invoices" className="flex items-center gap-1 text-xs font-medium" style={{ color: TEAL }}>
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <ReceiptText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No invoices yet. Create your first one to start tracking payments.</p>
              <Link href="/practice/finance/invoices">
                <Button size="sm" style={{ backgroundColor: TEAL, color: '#0B0F1A' }}>New invoice</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {recent.map((inv) => (
                <Link key={inv.id} href={`/practice/finance/invoices/${inv.id}`} className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-black/[0.02]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.patientName}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoiceNumber} · {fmtDate(inv.serviceDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatKsh(inv.totalAmount)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${INVOICE_STATUS_BADGE[inv.status] || ''}`}>
                      {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <QuickLink href="/practice/finance/invoices" icon={<FileText className="h-5 w-5" />} label="Invoices" desc="Bill & split payers" />
        <QuickLink href="/practice/finance/patients" icon={<Users className="h-5 w-5" />} label="Patients" desc="Your records" />
        <QuickLink href="/practice/finance/insurers" icon={<Building2 className="h-5 w-5" />} label="Payers" desc="Insurer directory" />
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, hint, color }: { icon: React.ReactNode; label: string; value: string; hint: string; color: string }) {
  return (
    <Card className="border-black/[0.06] bg-white">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2" style={{ color }}>
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <p className="font-display text-xl font-bold tracking-tight">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="border-black/[0.06] bg-white transition-colors hover:border-[#2ABFB0]/40">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2ABFB0]/10" style={{ color: TEAL }}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{label}</p>
            <p className="truncate text-xs text-muted-foreground">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
