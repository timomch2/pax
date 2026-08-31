'use client';

import { useEffect, useState } from 'react';
import { EthicalManifesto } from '@/components/investor/ethical-manifesto';
import { Loader2 } from 'lucide-react';

export function ManifestoGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'required' | 'accepted'>('loading');

  useEffect(() => {
    fetch('/api/investor/manifesto')
      .then(r => r.json())
      .then(d => setStatus(d.accepted ? 'accepted' : 'required'))
      .catch(() => setStatus('accepted')); // fail-open so investor isn't locked out
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#2ABFB0]" />
      </div>
    );
  }

  if (status === 'required') {
    return <EthicalManifesto onAccepted={() => setStatus('accepted')} />;
  }

  return <>{children}</>;
}
