'use client';

import { ShieldAlert } from 'lucide-react';

export function RegulatoryDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#131929] border border-[#1e2a3a] rounded-lg px-4 py-3 ${className}`}>
      <div className="flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          <span className="text-gray-400 font-semibold">Regulatory Notice:</span>{' '}
          PAX (Praxis Exchange) is a technology platform and passive intermediary — not a healthcare provider,
          pharmacy, clinical authority, broker-dealer, or financial institution. Information on this platform is
          for professional reference and connection purposes only and does not constitute medical advice, clinical
          endorsement, investment advice, or regulatory approval. Regulatory compliance remains the responsibility
          of the relevant national authority and the individual parties involved. All transactions, negotiations,
          contracts, payments, warranties, fulfilment, and after-sales support occur directly between the parties.
          PAX assumes no civil, legal, criminal, technical, or warranty liability for third-party products,
          services, or conduct facilitated through this platform.
        </p>
      </div>
    </div>
  );
}

export function RegulatoryFooterBanner() {
  return (
    <div className="bg-[#080C16] border-t border-white/5 px-6 py-4">
      <div className="max-w-[1200px] mx-auto">
        <p className="text-[10px] text-gray-600 leading-relaxed text-center">
          <span className="text-gray-500 font-semibold">Regulatory Notice:</span>{' '}
          PAX (Praxis Exchange) operates as a technology platform and passive intermediary. It is not a healthcare
          provider, pharmacy, clinical authority, broker-dealer, or financial institution. Information presented is
          for professional reference only and does not constitute medical advice, clinical endorsement, or investment
          advice. All transactions occur directly between parties.{' '}
          <a href="/legal" className="text-[#2D9B94] hover:underline">Full disclaimer →</a>
        </p>
      </div>
    </div>
  );
}
