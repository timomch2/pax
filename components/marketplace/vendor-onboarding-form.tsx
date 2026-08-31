'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { addressRequiredForTier } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PILLAR_LABELS, DOC_TYPE_LABELS, LEGAL_INITIALS, PILLAR_REQUIRED_DOCS, OPTIONAL_DOCS } from '@/lib/marketplace';
import { Upload, FileCheck, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { uploadAsset } from '@/lib/client-upload';

type DocUpload = { docType: string; fileName: string; uploadAssetId: string; contentType: string; expiryDate: string };

export function VendorOnboardingForm() {
  const router = useRouter();
  const { data: session } = useSession() || {};
  const addrRequired = addressRequiredForTier((session?.user as { tier?: string } | undefined)?.tier);
  const req = (v: boolean) => (v ? ' *' : ' (optional)');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Step 1: Business ID
  const [corporateName, setCorporateName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [headOfficeAddress, setHeadOfficeAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [primaryPillar, setPrimaryPillar] = useState('');

  // Step 2: Documents
  const [documents, setDocuments] = useState<DocUpload[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  // Step 3: Legal initials
  const [legalAccepted, setLegalAccepted] = useState<Record<string, boolean>>({});

  const requiredDocs = primaryPillar ? (PILLAR_REQUIRED_DOCS[primaryPillar] || []) : [];
  const allDocs = [...requiredDocs, ...OPTIONAL_DOCS.filter(d => !requiredDocs.includes(d))];

  async function handleDocUpload(docType: string, file: File) {
    setUploading(docType);
    try {
      const uploaded = await uploadAsset(file, 'VENDOR_DOCUMENT');
      setDocuments(prev => [...prev.filter(d => d.docType !== docType), {
        docType, fileName: file.name, uploadAssetId: uploaded.assetId, contentType: file.type, expiryDate: '',
      }]);
    } catch { setError('Failed to upload document'); }
    setUploading(null);
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corporateName, tradingName, country, registrationNumber, taxId,
          headOfficeAddress, city, postalCode, contactPerson, contactEmail, contactPhone, primaryPillar,
          documents,
          acceptedNoDirectDrugSales: !!legalAccepted.acceptedNoDirectDrugSales,
          acceptedPureIntermediary: !!legalAccepted.acceptedPureIntermediary,
          acceptedB2BTestKitRestriction: !!legalAccepted.acceptedB2BTestKitRestriction,
          acceptedFullIndemnification: !!legalAccepted.acceptedFullIndemnification,
          acceptedAIModeration: !!legalAccepted.acceptedAIModeration,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/marketplace'), 2000);
      }
    } catch { setError('Network error'); }
    setSubmitting(false);
  }

  const canProceedStep1 = corporateName && country && registrationNumber &&
    (!addrRequired || (headOfficeAddress && city && postalCode)) &&
    contactPerson && contactEmail && contactPhone && primaryPillar;
  const requiredDocsUploaded = requiredDocs.every(d => documents.some(doc => doc.docType === d));
  const allLegalAccepted = LEGAL_INITIALS.every(l => legalAccepted[l.key]);

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <CheckCircle2 className="w-16 h-16 text-[#2ABFB0]" />
        <h2 className="text-xl font-bold text-[#1A2332]">Application Submitted</h2>
        <p className="text-gray-400 text-center max-w-md">Your vendor application is under review. You will be notified once approved.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === s ? 'bg-[#2ABFB0] text-[#0B0F1A]' : step > s ? 'bg-[#2ABFB0]/20 text-[#2ABFB0]' : 'bg-white text-gray-500'
            }`}>{s}</div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-[#2ABFB0]' : 'bg-white'}`} />}
          </div>
        ))}
      </div>
      <div className="text-center mb-6">
        <p className="text-xs text-gray-500">{step === 1 ? 'Business Identification' : step === 2 ? 'Regulatory Documents' : 'Legal Terms & Submission'}</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex gap-2 items-start"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</div>}

      {/* Step 1: Business ID */}
      {step === 1 && (
        <div className="space-y-4">
          <div><Label className="text-gray-700">Registered Corporate Name *</Label><Input value={corporateName} onChange={e => setCorporateName(e.target.value)} placeholder="Praxis Diagnostics Ltd" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          <div><Label className="text-gray-700">Trading Name / Brand</Label><Input value={tradingName} onChange={e => setTradingName(e.target.value)} placeholder="PraxisDx" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-gray-700">Country *</Label><Input value={country} onChange={e => setCountry(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
            <div><Label className="text-gray-700">Registration Number *</Label><Input value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} placeholder="CPR/2024/12345" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          </div>
          <div><Label className="text-gray-700">Tax ID (TIN / VAT)</Label><Input value={taxId} onChange={e => setTaxId(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          {!addrRequired && <p className="text-xs text-gray-500">Address details are optional on the free Basic plan. They become required when you upgrade to a Professional or Expert membership.</p>}
          <div><Label className="text-gray-700">Head Office Address{req(addrRequired)}</Label><Textarea value={headOfficeAddress} onChange={e => setHeadOfficeAddress(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-gray-700">City / Town{req(addrRequired)}</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Nairobi" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
            <div><Label className="text-gray-700">Postal Code{req(addrRequired)}</Label><Input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="e.g. 00100" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label className="text-gray-700">Contact Person *</Label><Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
            <div><Label className="text-gray-700">Email *</Label><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
            <div><Label className="text-gray-700">Phone *</Label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          </div>
          <div>
            <Label className="text-gray-700">Primary Marketplace Pillar *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {Object.entries(PILLAR_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setPrimaryPillar(key)}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                    primaryPillar === key ? 'border-[#2ABFB0] bg-[#2ABFB0]/10 text-[#2ABFB0]' : 'border-[#E4E7EC] bg-white text-gray-400 hover:border-gray-600'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Document Upload */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400 mb-4">Upload the required regulatory documents. Documents marked with * are mandatory for your pillar.</p>
          {allDocs.map(docType => {
            const uploaded = documents.find(d => d.docType === docType);
            const required = requiredDocs.includes(docType);
            return (
              <div key={docType} className="p-4 rounded-lg border border-[#E4E7EC] bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-[#1A2332]">{DOC_TYPE_LABELS[docType] || docType}</span>
                    {required && <span className="ml-2 text-xs text-red-400">*Required</span>}
                  </div>
                  {uploaded ? (
                    <div className="flex items-center gap-2 text-[#2ABFB0] text-sm"><FileCheck className="w-4 h-4" />{uploaded.fileName}</div>
                  ) : (
                    <label className="cursor-pointer">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => e.target.files?.[0] && handleDocUpload(docType, e.target.files[0])} />
                      <span className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#1A2332] transition-colors">
                        {uploading === docType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload
                      </span>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)} className="border-[#E4E7EC] text-gray-400"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep(3)} disabled={!requiredDocsUploaded} className="bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Legal Initials */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <p className="text-sm text-amber-400 font-semibold mb-1">Mandatory Legal Terms</p>
            <p className="text-xs text-gray-400">You must accept all five terms below to submit your vendor application. These are binding legal obligations.</p>
          </div>
          {LEGAL_INITIALS.map(item => (
            <div key={item.key} className="p-4 rounded-lg border border-[#E4E7EC] bg-white">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={!!legalAccepted[item.key]} onChange={e => setLegalAccepted(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  className="mt-1 w-4 h-4 rounded border-gray-600 bg-[#FAF8F5] accent-[#2ABFB0]" />
                <div>
                  <p className="text-sm font-semibold text-[#1A2332]">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                </div>
              </label>
            </div>
          ))}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)} className="border-[#E4E7EC] text-gray-400"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={handleSubmit} disabled={!allLegalAccepted || submitting} className="bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Application
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
