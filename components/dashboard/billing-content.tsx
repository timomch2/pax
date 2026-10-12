'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Receipt, DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface BillingRecord {
  id: string;
  amount: number;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
  appointment: {
    dateTime: string;
    type: string;
    location: string | null;
    patient: { name: string };
  };
}

interface BillingSummary {
  totalBilled: number;
  totalCollected: number;
  outstanding: number;
}

const statusColors: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

export function BillingContent() {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [summary, setSummary] = useState<BillingSummary>({ totalBilled: 0, totalCollected: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBilling = async () => {
    try {
      const res = await fetch('/api/billing');
      if (res.ok) {
        const data = await res.json();
        setRecords(data?.records ?? []);
        setSummary(data?.summary ?? { totalBilled: 0, totalCollected: 0, outstanding: 0 });
      }
    } catch (e: any) {
      console.error('Failed to load billing:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const markAsPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/billing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      });
      if (res.ok) {
        toast.success('Payment marked as received');
        fetchBilling();
      }
    } catch {
      toast.error('Failed to update payment status');
    }
  };

  const summaryCards = [
    { label: 'Total Billed', value: summary?.totalBilled ?? 0, icon: Receipt, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Collected', value: summary?.totalCollected ?? 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Outstanding', value: summary?.outstanding ?? 0, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i: number) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Billing & Finance</h2>
        <p className="text-sm text-muted-foreground">Track payments and revenue from completed appointments.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card: any, i: number) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400">{card.label}</p>
                    <p className="mt-1 font-display text-2xl font-bold tracking-tight">
                      KSh {(card.value ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            Payment Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(records?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No billing records found. Complete appointments to generate billing records.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(records ?? []).map((r: BillingRecord) => (
                  <TableRow key={r?.id}>
                    <TableCell className="font-medium">{r?.appointment?.patient?.name ?? ''}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {(r?.appointment?.type ?? '').replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {r?.appointment?.dateTime ? new Date(r.appointment.dateTime).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' }) : ''}
                    </TableCell>
                    <TableCell className="font-mono">KSh {(r?.amount ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[r?.paymentStatus ?? ''] ?? 'bg-gray-100 text-gray-700'}>
                        {r?.paymentStatus ?? ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r?.paymentStatus !== 'PAID' && (
                        <Button variant="outline" size="sm" onClick={() => markAsPaid(r?.id ?? '')}>
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
