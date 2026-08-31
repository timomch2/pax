'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Appointment {
  id: string;
  dateTime: string;
  type: string;
  status: string;
  location: string | null;
  fee: number;
  notes: string | null;
  patient: { id: string; name: string; phone?: string | null };
}

const APPOINTMENT_TYPES = ['CONSULTATION', 'REVIEW', 'WARD_ROUND', 'THEATRE'];
const STATUSES = ['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'];

const typeColors: Record<string, string> = {
  CONSULTATION: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-amber-100 text-amber-700',
  WARD_ROUND: 'bg-purple-100 text-purple-700',
  THEATRE: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function formatType(t: string): string {
  return (t ?? '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase());
}

export function CalendarContent() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [newApt, setNewApt] = useState({
    patientId: '',
    dateTime: '',
    type: 'CONSULTATION',
    location: '',
    fee: '',
    notes: '',
  });

  const fetchAppointments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await fetch(`/api/appointments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data ?? []);
      }
    } catch (e: any) {
      console.error('Failed to fetch appointments:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch('/api/patients/list');
        if (res.ok) {
          const data = await res.json();
          setPatients(data ?? []);
        }
      } catch (e: any) {
        console.error('Failed to fetch patients:', e);
      }
    };
    fetchPatients();
  }, []);

  const handleCreate = async () => {
    if (!newApt.patientId || !newApt.dateTime) {
      toast.error('Patient and date/time are required');
      return;
    }
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApt),
      });
      if (res.ok) {
        toast.success('Appointment created');
        setShowCreate(false);
        setNewApt({ patientId: '', dateTime: '', type: 'CONSULTATION', location: '', fee: '', notes: '' });
        fetchAppointments();
      } else {
        const err = await res.json();
        toast.error(err?.error ?? 'Failed to create appointment');
      }
    } catch {
      toast.error('Failed to create appointment');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Appointment marked as ${status.toLowerCase()}`);
        fetchAppointments();
        setEditingApt(null);
      }
    } catch {
      toast.error('Failed to update appointment');
    }
  };

  const prevMonth = () => setCurrentDate((d: Date) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate((d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Build calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getAppointmentsForDay = (day: number) => {
    return (appointments ?? []).filter((apt: Appointment) => {
      const d = new Date(apt?.dateTime ?? '');
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Appointment Calendar</h2>
          <p className="text-sm text-muted-foreground">Manage your schedule and appointments.</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={newApt.patientId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewApt((p: any) => ({ ...(p ?? {}), patientId: e.target.value }))}
                >
                  <option value="">Select patient...</option>
                  {(patients ?? []).map((p: any) => (
                    <option key={p?.id} value={p?.id}>{p?.name} ({p?.email})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={newApt.dateTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewApt((p: any) => ({ ...(p ?? {}), dateTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={newApt.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewApt((p: any) => ({ ...(p ?? {}), type: e.target.value }))}
                >
                  {APPOINTMENT_TYPES.map((t: string) => (
                    <option key={t} value={t}>{formatType(t)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Location / Hospital</Label>
                <Input placeholder="e.g. Kenyatta National Hospital" value={newApt.location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewApt((p: any) => ({ ...(p ?? {}), location: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fee (KSh)</Label>
                <Input type="number" placeholder="2500" value={newApt.fee} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewApt((p: any) => ({ ...(p ?? {}), fee: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input placeholder="Optional notes" value={newApt.notes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewApt((p: any) => ({ ...(p ?? {}), notes: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleCreate}>Create Appointment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {STATUSES.map((s: string) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === 'ALL' ? 'All' : formatType(s)}
          </Button>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="font-display text-lg">{monthName}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d: string) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {calendarDays.map((day: number | null, i: number) => {
              const dayAppts = day ? getAppointmentsForDay(day) : [];
              const today = new Date();
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <div
                  key={i}
                  className={`min-h-[80px] rounded-md border p-1 text-sm ${
                    day ? 'bg-background hover:bg-muted/50' : 'bg-muted/20'
                  } ${isToday ? 'ring-2 ring-primary/30' : ''}`}
                >
                  {day && (
                    <>
                      <span className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{day}</span>
                      {dayAppts.slice(0, 2).map((apt: Appointment) => (
                        <button
                          key={apt?.id}
                          onClick={() => setEditingApt(apt)}
                          className={`mt-0.5 block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${typeColors[apt?.type ?? ''] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {apt?.patient?.name ?? 'Patient'}
                        </button>
                      ))}
                      {(dayAppts?.length ?? 0) > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{(dayAppts?.length ?? 0) - 2} more</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Appointment List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : (appointments?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No appointments found.</p>
          ) : (
            <div className="space-y-3">
              {(appointments ?? []).map((apt: Appointment, i: number) => (
                <motion.div
                  key={apt?.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30 cursor-pointer"
                  onClick={() => setEditingApt(apt)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{apt?.patient?.name ?? 'Unknown'}</p>
                      <Badge variant="outline" className={typeColors[apt?.type ?? ''] ?? ''}>
                        {formatType(apt?.type ?? '')}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(apt?.dateTime ?? '').toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      {apt?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {apt.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">KSh {(apt?.fee ?? 0).toLocaleString()}</p>
                    <Badge className={`mt-1 ${statusColors[apt?.status ?? ''] ?? ''}`}>
                      {apt?.status ?? 'SCHEDULED'}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingApt} onOpenChange={(open: boolean) => { if (!open) setEditingApt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {editingApt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Patient:</span> <strong>{editingApt?.patient?.name ?? ''}</strong></div>
                <div><span className="text-muted-foreground">Type:</span> <strong>{formatType(editingApt?.type ?? '')}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> <strong>{new Date(editingApt?.dateTime ?? '').toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</strong></div>
                <div><span className="text-muted-foreground">Fee:</span> <strong>KSh {(editingApt?.fee ?? 0).toLocaleString()}</strong></div>
                <div><span className="text-muted-foreground">Location:</span> <strong>{editingApt?.location ?? 'N/A'}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColors[editingApt?.status ?? ''] ?? ''}>{editingApt?.status ?? ''}</Badge></div>
              </div>
              {editingApt?.notes && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">{editingApt.notes}</div>
              )}
              <div className="flex gap-2">
                {editingApt?.status === 'SCHEDULED' && (
                  <>
                    <Button className="flex-1" onClick={() => handleStatusUpdate(editingApt?.id ?? '', 'COMPLETED')}>Mark Completed</Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleStatusUpdate(editingApt?.id ?? '', 'CANCELLED')}>Cancel</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
