'use client';

import { useCallback, useState, useEffect } from 'react';
import { PILLAR_LABELS, VENDOR_STATUS_LABELS, DOC_TYPE_LABELS } from '@/lib/marketplace';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Snowflake, Sun, FileText, Loader2, ChevronDown, ChevronUp, RefreshCw, ShieldAlert } from 'lucide-react';


type VendorDoc = { id: string; docType: string; fileName: string; cloudStoragePath: string; expiryDate: string | null };
type Vendor = {
  id: string; corporateName: string; tradingName: string | null; country: string;
  registrationNumber: string; primaryPillar: string; status: string; adminNotes: string | null;
  contactEmail: string; contactPhone: string; contactPerson: string;
  documents: VendorDoc[]; _count: { listings: number };
  user: { id: string; name: string; email: string; role: string; tier: string };
  licenseExpiryDate: string | null;
  createdAt: string;
};

function licenceInfo(expiry: string | null): { label: string; cls: string } | null {
  if (!expiry) return null;
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Licence expired ${Math.abs(days)}d ago`, cls: 'text-red-400 bg-red-400/10' };
  if (days <= 30) return { label: `Licence expires in ${days}d`, cls: 'text-amber-400 bg-amber-400/10' };
  return { label: `Licence valid · ${days}d left`, cls: 'text-[#2ABFB0] bg-[#2ABFB0]/10' };
}

export function AdminVendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await fetch(`/api/marketplace/admin/vendors${params}`);
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : []);
    } catch { /* noop */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  async function handleAction(vendorId: string, action: string) {
    setActing(vendorId);
    try {
      await fetch('/api/marketplace/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, action, adminNotes: notes[vendorId] || '' }),
      });
      fetchVendors();
    } catch { /* noop */ }
    setActing(null);
  }

  const statusColor: Record<string, string> = {
    PENDING: 'text-amber-400 bg-amber-400/10',
    APPROVED: 'text-[#2ABFB0] bg-[#2ABFB0]/10',
    REJECTED: 'text-red-400 bg-red-400/10',
    FROZEN: 'text-blue-400 bg-blue-400/10',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'APPROVED', 'REJECTED', 'FROZEN'].map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}
            className={filter === s ? 'bg-[#2ABFB0] text-[#0B0F1A]' : 'border-[#E4E7EC] text-gray-400'}>
            {s ? VENDOR_STATUS_LABELS[s] : 'All'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#2ABFB0]" /></div>
      ) : vendors.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No vendors found</p>
      ) : (
        <div className="space-y-3">
          {vendors.map(v => (
            <div key={v.id} className="rounded-xl border border-[#E4E7EC] bg-white overflow-hidden">
              <button onClick={() => setExpanded(e => e === v.id ? null : v.id)}
                className="w-full p-4 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2ABFB0]/20 flex items-center justify-center text-sm text-[#2ABFB0] font-bold">
                    {v.corporateName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A2332]">{v.tradingName || v.corporateName}</p>
                    <p className="text-xs text-gray-500">{v.contactPerson} · {v.country} · {PILLAR_LABELS[v.primaryPillar]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[v.status] || ''}`}>
                    {VENDOR_STATUS_LABELS[v.status]}
                  </span>
                  {licenceInfo(v.licenseExpiryDate) && (
                    <span className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-full font-medium ${licenceInfo(v.licenseExpiryDate)!.cls}`}>
                      {licenceInfo(v.licenseExpiryDate)!.label}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{v._count.listings} listing{v._count.listings !== 1 ? 's' : ''}</span>
                  {expanded === v.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>
              </button>

              {expanded === v.id && (
                <div className="px-4 pb-4 border-t border-[#E4E7EC] pt-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-gray-500">Corporate:</span> <span className="text-gray-700">{v.corporateName}</span></div>
                    <div><span className="text-gray-500">Reg #:</span> <span className="text-gray-700">{v.registrationNumber}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="text-gray-700" suppressHydrationWarning>{v.contactEmail}</span></div>
                    <div><span className="text-gray-500">Phone:</span> <span className="text-gray-700" suppressHydrationWarning>{v.contactPhone}</span></div>
                    <div><span className="text-gray-500">User:</span> <span className="text-gray-700">{v.user.name} ({v.user.email})</span></div>
                    <div><span className="text-gray-500">Tier:</span> <span className="text-gray-700">{v.user.tier}</span></div>
                  </div>

                  {/* Documents */}
                  <div>
                    <p className="text-xs text-gray-400 font-semibold mb-2">Regulatory Documents</p>
                    {v.documents.length === 0 ? (
                      <p className="text-xs text-gray-500">No documents uploaded</p>
                    ) : (
                      <div className="space-y-1">
                        {v.documents.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between text-xs p-2 rounded bg-[#FAF8F5]">
                            <div className="flex items-center gap-2 text-gray-700">
                              <FileText className="w-3 h-3 text-[#2ABFB0]" />
                              {DOC_TYPE_LABELS[doc.docType] || doc.docType}: {doc.fileName}
                            </div>
                            {doc.expiryDate && <span className="text-gray-500">Expires: {new Date(doc.expiryDate).toLocaleDateString('en-GB')}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Admin notes & actions */}
                  <div>
                    <Textarea value={notes[v.id] ?? v.adminNotes ?? ''} onChange={e => setNotes(prev => ({ ...prev, [v.id]: e.target.value }))}
                      placeholder="Admin notes (optional)" rows={2} className="bg-[#FAF8F5] border-[#E4E7EC] text-[#1A2332] text-sm" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {v.status !== 'APPROVED' && (
                      <Button size="sm" onClick={() => handleAction(v.id, 'approve')} disabled={acting === v.id}
                        className="bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90">
                        {acting === v.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />} Approve
                      </Button>
                    )}
                    {v.status !== 'REJECTED' && v.status !== 'FROZEN' && (
                      <Button size="sm" variant="outline" onClick={() => handleAction(v.id, 'reject')} disabled={acting === v.id}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    )}
                    {v.status === 'APPROVED' && (
                      <Button size="sm" variant="outline" onClick={() => handleAction(v.id, 'freeze')} disabled={acting === v.id}
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                        <Snowflake className="w-3 h-3 mr-1" /> Freeze
                      </Button>
                    )}
                    {v.status === 'FROZEN' && (
                      <Button size="sm" variant="outline" onClick={() => handleAction(v.id, 'unfreeze')} disabled={acting === v.id}
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                        <Sun className="w-3 h-3 mr-1" /> Unfreeze
                      </Button>
                    )}
                    {(v.status === 'APPROVED' || v.status === 'FROZEN') && (
                      <Button size="sm" variant="outline" onClick={() => handleAction(v.id, 'renew')} disabled={acting === v.id}
                        className="border-[#2ABFB0]/30 text-[#2ABFB0] hover:bg-[#2ABFB0]/10">
                        <RefreshCw className="w-3 h-3 mr-1" /> Renew Licence (365d)
                      </Button>
                    )}
                  </div>
                  {licenceInfo(v.licenseExpiryDate) && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <ShieldAlert className="w-3 h-3" />
                      Annual licence re-verification: {v.licenseExpiryDate ? new Date(v.licenseExpiryDate).toLocaleDateString('en-GB') : '—'}. Vendors auto-freeze when this lapses.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
