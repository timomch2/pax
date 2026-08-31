'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  ShieldCheck, UserCheck, Award, CheckCircle2, XCircle, Clock,
  FileText, Users, Loader2, ChevronDown, ChevronUp, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

type VReqDoc = { id: string; docType: string; fileName: string; uploadAssetId: string | null };
type VReq = {
  id: string; requestedLevel: string; status: string; adminNotes: string | null;
  peerVouchers: string | null;
  createdAt: string; reviewedAt: string | null;
  user: { id: string; name: string; email: string; role: string; tier: string; verificationLevel: string; paxId: string | null; country: string | null };
  documents: VReqDoc[];
};

const DOC_TYPE_LABELS: Record<string, string> = {
  NATIONAL_ID: 'National ID',
  PASSPORT: 'Passport',
  PROFESSIONAL_LICENSE: 'Professional License',
  BOARD_CERTIFICATE: 'Board Certification',
  PEER_LETTER: 'Peer Recommendation Letter',
  OTHER: 'Other Document',
};

export function AdminVerification() {
  const [requests, setRequests] = useState<VReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/verification?status=${tab}`);
      const data = await res.json();
      if (Array.isArray(data)) setRequests(data);
    } catch { /* */ }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const act = async (requestId: string, action: 'approve' | 'reject') => {
    setActing(requestId);
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, adminNotes: notes[requestId] || '' }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Request ${action}d`);
      load();
    } catch {
      toast.error('Action failed');
    }
    setActing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-[#2ABFB0]" />
        <h2 className="text-xl font-bold text-[#1A2332]">Verification Queue</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
          <Button key={s} variant={tab === s ? 'default' : 'outline'} size="sm" onClick={() => setTab(s)}
            className={tab === s ? 'bg-[#2ABFB0] text-[#0B0F1A]' : 'border-[#E4E7EC] text-gray-400'}>
            {s === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
            {s === 'APPROVED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {s === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
            {s}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 bg-white" />)}</div>
      ) : requests.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No {tab.toLowerCase()} verification requests.</p>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const expanded = expandedId === r.id;
            const vouchers = r.peerVouchers ? JSON.parse(r.peerVouchers) : [];
            return (
              <Card key={r.id} className="border-[#E4E7EC] bg-white">
                <CardContent className="p-4">
                  <button onClick={() => setExpandedId(expanded ? null : r.id)} className="w-full text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {r.requestedLevel === 'IDENTITY_VERIFIED' ? <UserCheck className="w-5 h-5 text-[#2ABFB0]" /> : <Award className="w-5 h-5 text-[#F59E0B]" />}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#1A2332]">{r.user.name}</span>
                            <span className="text-[10px] text-gray-500">{r.user.email}</span>
                            {r.user.paxId && <span className="text-[10px] text-[#2ABFB0]">{r.user.paxId}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                            <span>{r.user.role}</span>
                            <span>·</span>
                            <span>{r.user.tier.replace('TIER', 'T').replace('_', ' ')}</span>
                            {r.user.country && <><span>·</span><MapPin className="w-3 h-3" /><span>{r.user.country}</span></>}
                            <span>·</span>
                            <span>Currently: {r.user.verificationLevel.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          r.requestedLevel === 'IDENTITY_VERIFIED' ? 'bg-[#2ABFB0]/10 text-[#2ABFB0]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                        }`}>
                          {r.requestedLevel === 'IDENTITY_VERIFIED' ? 'Identity' : 'Expert'}
                        </span>
                        <span className="text-[10px] text-gray-500">{new Date(r.createdAt).toLocaleDateString('en-GB')}</span>
                        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-4 space-y-4 border-t border-[#E4E7EC] pt-4">
                      {/* Documents */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Documents</h4>
                        <div className="space-y-1">
                          {r.documents.map(d => (
                            <div key={d.id} className="flex items-center justify-between bg-[#FAF8F5] rounded p-2">
                              <span className="text-xs text-gray-700">{DOC_TYPE_LABELS[d.docType] || d.docType}: {d.fileName}</span>
                              {d.uploadAssetId && <Button asChild size="sm" variant="outline"><a href={`/api/uploads/${d.uploadAssetId}/download`} target="_blank" rel="noopener noreferrer">Review</a></Button>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Peer vouchers */}
                      {vouchers.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Peer Vouchers</h4>
                          <div className="space-y-1">
                            {vouchers.map((v: { name: string; email: string; relationship: string }, i: number) => (
                              <div key={i} className="bg-[#FAF8F5] rounded p-2 text-xs text-gray-700">
                                <span className="font-medium">{v.name}</span> &middot; {v.email} &middot; <span className="text-gray-500">{v.relationship}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin action */}
                      {tab === 'PENDING' && (
                        <div className="space-y-3">
                          <Textarea
                            value={notes[r.id] || ''}
                            onChange={e => setNotes({ ...notes, [r.id]: e.target.value })}
                            placeholder="Admin notes (optional)"
                            className="bg-[#FAF8F5] border-[#E4E7EC] text-sm"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button onClick={() => act(r.id, 'approve')} disabled={acting === r.id}
                              className="flex-1 bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90 gap-1">
                              {acting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve
                            </Button>
                            <Button onClick={() => act(r.id, 'reject')} disabled={acting === r.id}
                              variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1">
                              {acting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject
                            </Button>
                          </div>
                        </div>
                      )}

                      {r.adminNotes && tab !== 'PENDING' && (
                        <p className="text-xs text-gray-400 bg-[#FAF8F5] rounded p-2"><strong>Admin notes:</strong> {r.adminNotes}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
