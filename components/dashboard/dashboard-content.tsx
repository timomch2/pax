'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, DollarSign, Clock, TrendingUp, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { PractitionerHubCard } from '@/components/dashboard/practitioner-hub-card';

interface DashboardStats {
  todayAppointments: number;
  totalPatients: number;
  monthRevenue: number;
  pendingAppointments: number;
  completedToday: number;
  totalRevenue: number;
}

export function DashboardContent() {
  const { data: session } = useSession() || {};
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data?.stats ?? null);
          setRecentAppointments(data?.recentAppointments ?? []);
        }
      } catch (e: any) {
        console.error('Failed to load dashboard stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Today's Appointments", value: stats?.todayAppointments ?? 0, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Patients', value: stats?.totalPatients ?? 0, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: "This Month's Revenue", value: `KSh ${(stats?.monthRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Pending Appointments', value: stats?.pendingAppointments ?? 0, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i: number) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Welcome back, {session?.user?.name?.split(' ')?.[0] ?? 'Doctor'}
        </h2>
        <p className="text-sm text-muted-foreground">Here&apos;s an overview of your practice today.</p>
      </div>

      <PractitionerHubCard />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card: any, i: number) => (
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
                    <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                    <p className="mt-1 font-display text-2xl font-bold tracking-tight">{card.value}</p>
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

      {/* Recent Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Recent Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(recentAppointments?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No recent appointments found.</p>
          ) : (
            <div className="space-y-3">
              {(recentAppointments ?? []).map((apt: any) => (
                <div key={apt?.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{apt?.patient?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {apt?.type ?? 'Consultation'} • {apt?.location ?? 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">
                      {apt?.dateTime ? new Date(apt.dateTime).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' }) : ''}
                    </p>
                    <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      apt?.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                      apt?.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {apt?.status ?? 'SCHEDULED'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
