'use client';


import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { addressRequiredForTier } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BUYER_ENTITY_LABELS } from '@/lib/marketplace';
import { CheckCircle2, Loader2, AlertTriangle, Upload, Building2 } from 'lucide-react';
import { uploadAsset } from '@/lib/client-upload';

type BuyerData = {
  id: string; institutionName: string; entityType: string;
  jurisdiction: string; procurementOfficer: string; officerEmail: string; status: string;
};

export function BuyerOnboardingForm({ onComplete }: { onComplete?: () => Promise<void> } = {}) {
  const { data: session } = useSession() || {};
  const addrRequired = addressRequiredForTier((session?.user as { tier?: string } | undefined)?.tier);
  const req = (v: boolean) => (v ? ' *' : ' (optional)');
  const [buyer, setBuyer] = useState<BuyerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [institutionName, setInstitutionName] = useState('');
  const [entityType, setEntityType] = useState('');
  const [jurisdiction, setJurisdiction] = useState('Kenya');
  const [country, setCountry] = useState('Kenya');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [procurementOfficer, setProcurementOfficer] = useState('');
  const [officerTitle, setOfficerTitle] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [accreditationUploadAssetId, setAccreditationUploadAssetId] = useState('');
  const [accreditationFileName, setAccreditationFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [acceptedDirectProcurement, setAcceptedDirectProcurement] = useState(false);

  async function handleAccreditationUpload(file: File) {
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadAsset(file, 'VENDOR_DOCUMENT');
      setAccreditationUploadAssetId(uploaded.assetId);
      setAccreditationFileName(file.name);
    } catch { setError('Failed to upload accreditation document'); }
    setUploading(false);
  }

  useEffect(() => {
    fetch('/api/marketplace/buyers')
      .then(r => r.json())
      .then(d => { setBuyer(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    setError('');
    if (!institutionName || !entityType || !jurisdiction || !procurementOfficer || !officerEmail || !country) {
      setError('Please fill in all required fields');
      return;
    }
    if (addrRequired && (!physicalAddress || !city || !postalCode || !phone)) {
      setError('A full physical address (address, city, postal code) and phone are required for your membership tier');
      return;
    }
    if (!acceptedDirectProcurement) {
      setError('You must accept the direct procurement agreement');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/buyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionName, entityType, jurisdiction, country, physicalAddress, city, postalCode, phone, procurementOfficer, officerTitle, officerEmail, accreditationUploadAssetId: accreditationUploadAssetId || null, acceptedDirectProcurement }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit');
      } else {
        setSuccess(true);
        await onComplete?.();
        const data = await res.json();
        setBuyer(data);
      }
    } catch { setError('Network error'); }
    setSubmitting(false);
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#2ABFB0]" /></div>;

  // Already registered
  if (buyer) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#1A2332] mb-6">Buyer Profile</h1>
        <div className="p-6 rounded-xl border border-[#E4E7EC] bg-white max-w-lg">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-[#2ABFB0]" />
            <div>
              <p className="text-[#1A2332] font-semibold">{buyer.institutionName}</p>
              <p className="text-xs text-gray-400">{BUYER_ENTITY_LABELS[buyer.entityType]} · {buyer.jurisdiction}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Procurement Officer: {buyer.procurementOfficer}</p>
          <p className="text-xs text-gray-500">Status: <span className="text-[#2ABFB0]">{buyer.status === 'VERIFIED' ? 'Verified' : 'Pending Verification'}</span></p>
        </div>
      </div>
    );
  }

  // Onboarding
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-[#1A2332] mb-2">Institutional Buyer Registration</h1>
      <p className="text-sm text-gray-400 mb-6">Register your institution to discover and procure health products and services on PAX</p>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</div>}

      <div className="space-y-4">
        <div><Label className="text-gray-700">Institution Name *</Label><Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>

        <div>
          <Label className="text-gray-700">Entity Type *</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {Object.entries(BUYER_ENTITY_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => setEntityType(key)}
                className={`p-2 rounded-lg border text-xs text-left transition-colors ${
                  entityType === key ? 'border-[#2ABFB0] bg-[#2ABFB0]/10 text-[#2ABFB0]' : 'border-[#E4E7EC] text-gray-400 hover:border-gray-600'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-gray-700">Operating Jurisdiction *</Label><Input value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          <div><Label className="text-gray-700">Country of Origin *</Label><Input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Kenya" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
        </div>

        {!addrRequired && <p className="text-xs text-gray-500">Country of origin is required. The rest of your address is optional on the free Basic plan and becomes required when you upgrade to a Professional or Expert membership.</p>}

        <div><Label className="text-gray-700">Physical Address{req(addrRequired)}</Label><Input value={physicalAddress} onChange={e => setPhysicalAddress(e.target.value)} placeholder="Street / building, area" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>

        <div className="grid grid-cols-3 gap-4">
          <div><Label className="text-gray-700">City / Town{req(addrRequired)}</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="Nairobi" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          <div><Label className="text-gray-700">Postal Code{req(addrRequired)}</Label><Input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="00100" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          <div><Label className="text-gray-700">Phone{req(addrRequired)}</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254..." className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-gray-700">Procurement Officer *</Label><Input value={procurementOfficer} onChange={e => setProcurementOfficer(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          <div><Label className="text-gray-700">Title</Label><Input value={officerTitle} onChange={e => setOfficerTitle(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
        </div>

        <div><Label className="text-gray-700">Official Email *</Label><Input type="email" value={officerEmail} onChange={e => setOfficerEmail(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>

        <div>
          <Label className="text-gray-700">Accreditation / Registration Document</Label>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">Upload proof of institutional accreditation (facility licence, registration certificate). PDF or image.</p>
          <div className="p-4 rounded-lg border border-[#E4E7EC] bg-white flex items-center justify-between">
            {accreditationFileName ? (
              <div className="flex items-center gap-2 text-[#2ABFB0] text-sm"><CheckCircle2 className="w-4 h-4" />{accreditationFileName}</div>
            ) : (
              <span className="text-sm text-gray-500">No document uploaded</span>
            )}
            <label className="cursor-pointer">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => e.target.files?.[0] && handleAccreditationUpload(e.target.files[0])} />
              <span className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#1A2332] transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {accreditationFileName ? 'Replace' : 'Upload'}
              </span>
            </label>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-[#E4E7EC] bg-[#FAF8F5]">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptedDirectProcurement} onChange={e => setAcceptedDirectProcurement(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-600 bg-[#FAF8F5] accent-[#2ABFB0]" />
            <div>
              <p className="text-sm font-semibold text-[#1A2332]">Direct Procurement Agreement</p>
              <p className="text-xs text-gray-400 mt-1">I acknowledge that all price quotes, negotiations, purchase contracts, equipment delivery, and warranties are conducted directly with verified vendors, not PAX. PAX is a passive intermediary platform.</p>
            </div>
          </label>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Register as Buyer
        </Button>
      </div>
    </div>
  );
}
