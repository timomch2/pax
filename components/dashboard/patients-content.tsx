'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Eye, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface PatientSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  lastVisit: string;
  totalVisits: number;
}

interface PatientDetail {
  patient: { id: string; name: string; email: string; phone: string | null; createdAt: string };
  appointments: any[];
  notes: any[];
}

export function PatientsContent() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const data = await res.json();
          setPatients(data ?? []);
        }
      } catch (e: any) {
        console.error('Failed to load clients:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const viewPatient = async (id: string) => {
    try {
      const res = await fetch(`/api/patients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPatient(data ?? null);
        setShowDetail(true);
      }
    } catch {
      toast.error('Failed to load client details');
    }
  };

  const addNote = async () => {
    if (!newNote?.trim() || !selectedPatient?.patient?.id) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/patients/${selectedPatient.patient.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });
      if (res.ok) {
        toast.success('Note added');
        setNewNote('');
        // Refresh patient detail
        viewPatient(selectedPatient.patient.id);
      }
    } catch {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const filtered = (patients ?? []).filter((p: PatientSummary) =>
    (p?.name ?? '').toLowerCase().includes((search ?? '').toLowerCase()) ||
    (p?.email ?? '').toLowerCase().includes((search ?? '').toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Client Management</h2>
        <p className="text-sm text-muted-foreground">View and manage your client records.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Clients ({filtered?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i: number) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (filtered?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No clients found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Last Visit</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: PatientSummary) => (
                  <TableRow key={p?.id}>
                    <TableCell className="font-medium">{p?.name ?? ''}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{p?.phone ?? 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {p?.lastVisit ? new Date(p.lastVisit).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' }) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p?.totalVisits ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => viewPatient(p?.id ?? '')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Patient Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPatient?.patient?.name ?? 'Client Details'}</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Email:</span> {selectedPatient?.patient?.email ?? ''}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedPatient?.patient?.phone ?? 'N/A'}</div>
                <div><span className="text-muted-foreground">Registered:</span> {selectedPatient?.patient?.createdAt ? new Date(selectedPatient.patient.createdAt).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' }) : ''}</div>
              </div>

              {/* Visit History */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4 text-primary" /> Visit History
                </h3>
                {(selectedPatient?.appointments?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No visits recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedPatient?.appointments ?? []).map((apt: any) => (
                      <div key={apt?.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <div>
                          <p className="font-medium">{apt?.type ? apt.type.replace(/_/g, ' ') : 'Consultation'}</p>
                          <p className="text-xs text-muted-foreground">
                            {apt?.dateTime ? new Date(apt.dateTime).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : ''}
                            {apt?.location ? ` • ${apt.location}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono">KSh {(apt?.fee ?? 0).toLocaleString()}</p>
                          <Badge className={`mt-1 text-[10px] ${
                            apt?.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            apt?.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{apt?.status ?? ''}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4 text-primary" /> Clinical Notes
                </h3>
                {(selectedPatient?.notes ?? []).map((note: any) => (
                  <div key={note?.id} className="mb-2 rounded-lg bg-muted/50 p-3 text-sm">
                    <p>{note?.content ?? ''}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {note?.createdAt ? new Date(note.createdAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : ''}
                    </p>
                  </div>
                ))}
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewNote(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') addNote(); }}
                  />
                  <Button size="sm" onClick={addNote} loading={addingNote}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
