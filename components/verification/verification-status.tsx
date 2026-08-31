'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldCheck, ShieldAlert, Mail, UserCheck, Award, Upload, Loader2,
  CheckCircle2, XCircle, Clock, ChevronRight, Plus, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadAsset } from '@/lib/client-upload';

const LEVEL_META: Record<string, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  NONE: { label: 'Unverified', icon: <ShieldAlert className="w-5 h-5" />, color: 'text-gray-500', desc: 'Complete your email verification to begin.' },
  EMAIL_VERIFIED: { label: 'Email Verified', icon: <Mail className="w-5 h-5" />, color: 'text-[#2ABFB0]', desc: 'Your email address has been confirmed. Upload identity documents to reach the next level.' },
  IDENTITY_VERIFIED: { label: 'Identity Verified', icon: <UserCheck className="w-5 h-5" />, color: 'text-[#F59E0B]', desc: 'Your identity has been confirmed by PAX admin. Submit peer vouchers and credentials for Expert verification.' },
  EXPERT_VERIFIED: { label: 'Expert Verified', icon: <Award className="w-5 h-5" />, color: 'text-[#FBBF24]', desc: 'You have achieved the highest verification level — recognised as a verified expert by the PAX community.' },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-4 h-4 text-[#F59E0B]" />,
  APPROVED: <CheckCircle2 className="w-4 h-4 text-[#2ABFB0]" />,
  REJECTED: <XCircle className="w-4 h-4 text-red-400" />,
};

const IDENTITY_DOC_TYPES = [
  { value: 'NATIONAL_ID', label: 'National ID / Government-Issued ID' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'PROFESSIONAL_LICENSE', label: 'Professional License / Registration Certificate' },
];

const EXPERT_DOC_TYPES = [
  { value: 'BOARD_CERTIFICATE', label: 'Specialist Board Certification' },
  { value: 'PROFESSIONAL_LICENSE', label: 'Professional License' },
  { value: 'PEER_LETTER', label: 'Peer Recommendation Letter' },
  { value: 'OTHER', label: 'Other Supporting Document' },
];

type Doc = { docType: string; fileName: string; uploadAssetId: string; contentType: string };
type Voucher = { name: string; email: string; relationship: string };
type VRequest = {
  id: string; requestedLevel: string; status: string; adminNotes: string | null;
  createdAt: string; reviewedAt: string | null;
  documents: { id: string; docType: string; fileName: string }[];
};

export function VerificationStatus() {
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('NONE');
  const [emailVerified, setEmailVerified] = useState(false);
  const [requests, setRequests] = useState<VRequest[]>([]);
  const [showForm, setShowForm] = useState<'identity' | 'expert' | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([{ name: '', email: '', relationship: '' }, { name: '', email: '', relationship: '' }]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/verification');
      const data = await res.json();
      setLevel(data.user?.verificationLevel || 'NONE');
      setEmailVerified(!!data.user?.emailVerified);
      setRequests(data.requests || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDocUpload = async (docType: string, file: File) => {
    setUploading(docType);
    try {
      const uploaded = await uploadAsset(file, 'VERIFICATION_DOCUMENT');
      setDocs(prev => [...prev.filter(d => d.docType !== docType), {
        docType, fileName: file.name, uploadAssetId: uploaded.assetId, contentType: file.type,
      }]);
      toast.success(`Uploaded ${file.name}`);
    } catch {
      toast.error('Upload failed');
    }
    setUploading(null);
  };

  const submit = async () => {
    if (!showForm) return;
    const requestedLevel = showForm === 'identity' ? 'IDENTITY_VERIFIED' : 'EXPERT_VERIFIED';
    if (docs.length === 0) { toast.error('Upload at least one document'); return; }
    if (showForm === 'expert') {
      const validV = vouchers.filter(v => v.name.trim() && v.email.trim());
      if (validV.length < 2) { toast.error('At least 2 peer vouchers with name & email required'); return; }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedLevel,
          documents: docs,
          peerVouchers: showForm === 'expert' ? vouchers.filter(v => v.name.trim()) : undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success('Verification request submitted — PAX admin will review it.');
      setShowForm(null);
      setDocs([]);
      setVouchers([{ name: '', email: '', relationship: '' }, { name: '', email: '', relationship: '' }]);
      load();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Submission failed');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 bg-white" />)}</div>;

  const meta = LEVEL_META[level] || LEVEL_META.NONE;
  const hasPendingIdentity = requests.some(r => r.requestedLevel === 'IDENTITY_VERIFIED' && r.status === 'PENDING');
  const hasPendingExpert = requests.some(r => r.requestedLevel === 'EXPERT_VERIFIED' && r.status === 'PENDING');
  const canRequestIdentity = emailVerified && level === 'EMAIL_VERIFIED' && !hasPendingIdentity;
  const canRequestExpert = level === 'IDENTITY_VERIFIED' && !hasPendingExpert;

  const docTypes = showForm === 'identity' ? IDENTITY_DOC_TYPES : EXPERT_DOC_TYPES;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <ShieldCheck className="w-10 h-10 text-[#2ABFB0] mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-[#1A2332]">Verification Centre</h1>
        <p className="text-sm text-gray-400 mt-2">
          Build trust in the PAX community by verifying your identity and credentials.
        </p>
      </div>

      {/* Current Level */}
      <Card className="border-[#E4E7EC] bg-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-[#FAF8F5] ${meta.color}`}>{meta.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#1A2332]">{meta.label}</h2>
                {level === 'EXPERT_VERIFIED' && <Award className="w-5 h-5 text-[#FBBF24]" />}
              </div>
              <p className="text-sm text-gray-400 mt-1">{meta.desc}</p>
            </div>
          </div>

          {/* Level progress bar */}
          <div className="mt-6 flex items-center gap-1">
            {['EMAIL_VERIFIED', 'IDENTITY_VERIFIED', 'EXPERT_VERIFIED'].map((lvl, i) => {
              const levels = ['NONE', 'EMAIL_VERIFIED', 'IDENTITY_VERIFIED', 'EXPERT_VERIFIED'];
              const currentIdx = levels.indexOf(level);
              const stepIdx = i + 1;
              const achieved = currentIdx >= stepIdx;
              return (
                <div key={lvl} className="flex-1 flex items-center gap-1">
                  <div className={`h-2 flex-1 rounded-full ${achieved ? 'bg-[#2ABFB0]' : 'bg-[#1e2a3a]'}`} />
                  {i < 2 && <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-500">
            <span>Email</span><span>Identity</span><span>Expert</span>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      {canRequestIdentity && !showForm && (
        <Button onClick={() => setShowForm('identity')} className="w-full gap-2 bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90">
          <Upload className="w-4 h-4" /> Apply for Identity Verification
        </Button>
      )}
      {canRequestExpert && !showForm && (
        <Button onClick={() => setShowForm('expert')} className="w-full gap-2 bg-[#F59E0B] text-[#0B0F1A] hover:bg-[#F59E0B]/90">
          <Award className="w-4 h-4" /> Apply for Expert Verification
        </Button>
      )}

      {/* Submission form */}
      {showForm && (
        <Card className="border-[#2ABFB0]/30 bg-white">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-base font-semibold text-[#1A2332]">
              {showForm === 'identity' ? 'Identity Verification' : 'Expert Verification'} Application
            </h3>

            <div className="space-y-3">
              <p className="text-sm text-gray-400">Upload supporting documents:</p>
              {docTypes.map(dt => {
                const uploaded = docs.find(d => d.docType === dt.value);
                return (
                  <div key={dt.value} className="p-3 rounded-lg border border-[#E4E7EC] bg-[#FAF8F5] flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[#1A2332]">{dt.label}</span>
                      {uploaded && <p className="text-[10px] text-[#2ABFB0] truncate">✓ {uploaded.fileName}</p>}
                    </div>
                    <label className="cursor-pointer">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => e.target.files?.[0] && handleDocUpload(dt.value, e.target.files[0])} />
                      <Button variant="outline" size="sm" asChild>
                        <span>{uploading === dt.value ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                      </Button>
                    </label>
                  </div>
                );
              })}
            </div>

            {showForm === 'expert' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Peer vouchers (minimum 2 — colleagues who can verify your expertise):</p>
                {vouchers.map((v, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <input value={v.name} onChange={e => { const nv = [...vouchers]; nv[i] = { ...nv[i], name: e.target.value }; setVouchers(nv); }}
                      placeholder="Full name" className="px-3 py-2 rounded bg-[#FAF8F5] border border-[#E4E7EC] text-sm text-[#1A2332] placeholder:text-gray-600" />
                    <input value={v.email} onChange={e => { const nv = [...vouchers]; nv[i] = { ...nv[i], email: e.target.value }; setVouchers(nv); }}
                      placeholder="Email" className="px-3 py-2 rounded bg-[#FAF8F5] border border-[#E4E7EC] text-sm text-[#1A2332] placeholder:text-gray-600" />
                    <input value={v.relationship} onChange={e => { const nv = [...vouchers]; nv[i] = { ...nv[i], relationship: e.target.value }; setVouchers(nv); }}
                      placeholder="Relationship" className="px-3 py-2 rounded bg-[#FAF8F5] border border-[#E4E7EC] text-sm text-[#1A2332] placeholder:text-gray-600" />
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setVouchers([...vouchers, { name: '', email: '', relationship: '' }])} className="gap-1 text-gray-400">
                  <Plus className="w-3 h-3" /> Add another voucher
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => { setShowForm(null); setDocs([]); }} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={submit} disabled={submitting || docs.length === 0} className="flex-1 bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</> : 'Submit for Review'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past requests */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Verification History</h3>
          {requests.map(r => (
            <Card key={r.id} className="border-[#E4E7EC] bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {STATUS_ICON[r.status]}
                    <span className="text-sm font-medium text-[#1A2332]">
                      {r.requestedLevel === 'IDENTITY_VERIFIED' ? 'Identity' : 'Expert'} Verification
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      r.status === 'APPROVED' ? 'bg-[#2ABFB0]/10 text-[#2ABFB0]' :
                      r.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                      'bg-[#F59E0B]/10 text-[#F59E0B]'
                    }`}>{r.status}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">{new Date(r.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
                {r.adminNotes && (
                  <p className="text-xs text-gray-400 mt-2 bg-[#FAF8F5] rounded p-2">{r.adminNotes}</p>
                )}
                <div className="flex gap-2 mt-2">
                  {r.documents.map(d => (
                    <span key={d.id} className="text-[10px] text-gray-500 bg-[#FAF8F5] px-2 py-0.5 rounded">{d.fileName}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
