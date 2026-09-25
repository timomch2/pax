'use client';

import { useState } from 'react';
import { waLink, WA_MESSAGES } from '@/lib/whatsapp';

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.6 4.46 1.73 6.4L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.23 1.6h.01c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.33-6.63-3.75-9.05A12.7 12.7 0 0 0 16.004 3.2zm0 23.06h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4 1.05 1.07-3.9-.25-.4a10.58 10.58 0 0 1-1.62-5.66c0-5.86 4.77-10.62 10.63-10.62 2.84 0 5.5 1.11 7.51 3.12a10.56 10.56 0 0 1 3.11 7.51c0 5.86-4.77 10.62-10.63 10.62zm5.83-7.95c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1.01 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.89-1.78-2.21-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.74-.99-2.38-.26-.62-.52-.54-.72-.55l-.61-.01c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.66 0 1.57 1.14 3.09 1.3 3.3.16.21 2.25 3.43 5.44 4.81.76.33 1.35.52 1.81.67.76.24 1.46.21 2.01.13.61-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37z" />
    </svg>
  );
}

export function WhatsAppFab() {
  const [open, setOpen] = useState(false);

  const options = [
    { label: 'General enquiry', msg: WA_MESSAGES.general },
    { label: 'Join PAX', msg: WA_MESSAGES.join },
    { label: 'I am a practitioner', msg: WA_MESSAGES.practitioner },
    { label: 'I am an innovator', msg: WA_MESSAGES.innovator },
    { label: 'I am an investor', msg: WA_MESSAGES.investor },
  ];

  return (
    <div className="pax-contact-fab fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[260px] rounded-2xl border border-white/10 bg-[#141B2D] shadow-2xl overflow-hidden">
          <div className="bg-[#25D366] px-4 py-3">
            <div className="text-[13px] font-bold text-[#0B0F1A]">Chat with PAX on WhatsApp</div>
            <div className="text-[11px] text-[#0B0F1A]/70">No need to save the number</div>
          </div>
          <div className="p-2">
            {options.map((o) => (
              <a
                key={o.label}
                href={waLink(o.msg)}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2.5 rounded-lg text-[13px] text-gray-200 no-underline hover:bg-white/5 transition-colors"
              >
                {o.label}
              </a>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Chat on WhatsApp"
        className="flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-[0_6px_24px_rgba(37,211,102,0.5)] hover:scale-105 active:scale-95 transition-transform"
      >
        <WhatsAppGlyph className={open ? 'w-6 h-6' : 'w-7 h-7'} />
      </button>
    </div>
  );
}
