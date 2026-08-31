'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PILLAR_LABELS, PILLAR_LISTING_TYPES, LISTING_TYPE_LABELS } from '@/lib/marketplace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, X } from 'lucide-react';

export default function NewListingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [pillar, setPillar] = useState('');
  const [listingType, setListingType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>(['']);
  const [catalogNumber, setCatalogNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [regionFocus, setRegionFocus] = useState('East Africa');
  const [externalUrl, setExternalUrl] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');

  const availableTypes = pillar ? (PILLAR_LISTING_TYPES[pillar] || []) : [];

  async function handleSubmit() {
    setError('');
    if (!pillar || !listingType || !title || !description) {
      setError('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar, listingType, title, description,
          features: features.filter(f => f.trim()),
          catalogNumber: catalogNumber || null,
          manufacturer: manufacturer || null,
          regionFocus: regionFocus || null,
          externalUrl: externalUrl || null,
          priceDisplay: priceDisplay || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create listing');
      } else {
        router.push('/marketplace/vendor');
      }
    } catch { setError('Network error'); }
    setSubmitting(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1A2332] mb-6">Create New Listing</h1>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}

      <div className="space-y-5">
        <div>
          <Label className="text-gray-700">Marketplace Pillar *</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {Object.entries(PILLAR_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => { setPillar(key); setListingType(''); }}
                className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                  pillar === key ? 'border-[#2ABFB0] bg-[#2ABFB0]/10 text-[#2ABFB0]' : 'border-[#E4E7EC] bg-white text-gray-400 hover:border-gray-600'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        {pillar && (
          <div>
            <Label className="text-gray-700">Listing Type *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableTypes.map(t => (
                <button key={t} onClick={() => setListingType(t)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    listingType === t ? 'border-[#2ABFB0] bg-[#2ABFB0]/10 text-[#2ABFB0]' : 'border-[#E4E7EC] text-gray-400 hover:border-gray-600'
                  }`}>{LISTING_TYPE_LABELS[t]}</button>
              ))}
            </div>
          </div>
        )}

        <div><Label className="text-gray-700">Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. AI-Powered Chest X-Ray Screening Platform" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
        <div><Label className="text-gray-700">Description *</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>

        <div>
          <Label className="text-gray-700">Key Features</Label>
          <div className="space-y-2 mt-2">
            {features.map((f, i) => (
              <div key={i} className="flex gap-2">
                <Input value={f} onChange={e => { const n = [...features]; n[i] = e.target.value; setFeatures(n); }}
                  placeholder={`Feature ${i + 1}`} className="bg-white border-[#E4E7EC] text-[#1A2332]" />
                {features.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setFeatures(features.filter((_, j) => j !== i))}><X className="w-4 h-4 text-gray-500" /></Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setFeatures([...features, ''])} className="border-[#E4E7EC] text-gray-400">
              <Plus className="w-3 h-3 mr-1" /> Add Feature
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-gray-700">Catalog / Model #</Label><Input value={catalogNumber} onChange={e => setCatalogNumber(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          <div><Label className="text-gray-700">Manufacturer / Brand</Label><Input value={manufacturer} onChange={e => setManufacturer(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-gray-700">Region Focus</Label><Input value={regionFocus} onChange={e => setRegionFocus(e.target.value)} className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
          <div><Label className="text-gray-700">Price</Label><Input value={priceDisplay} onChange={e => setPriceDisplay(e.target.value)} placeholder="e.g. KSh 150,000 or Contact vendor" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
        </div>

        {(pillar === 'PHARMA_DIRECTORY' || listingType === 'DIRECTORY_PROFILE') && (
          <div><Label className="text-gray-700">External Portal URL</Label><Input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://" className="mt-1 bg-white border-[#E4E7EC] text-[#1A2332]" /></div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSubmit} disabled={submitting} className="bg-[#2ABFB0] text-[#0B0F1A] hover:bg-[#2ABFB0]/90">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Publish Listing
          </Button>
        </div>
      </div>
    </div>
  );
}
