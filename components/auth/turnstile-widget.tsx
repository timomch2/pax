'use client';

import { useEffect, useRef } from 'react';

export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey || !container.current) return;
    const render = () => (window as any).turnstile?.render(container.current, {
      sitekey,
      callback: onToken,
      'expired-callback': () => onToken(''),
      'error-callback': () => onToken(''),
    });
    if ((window as any).turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>('script[data-pax-turnstile]');
      if (!script) {
        script = document.createElement('script');
        script.dataset.paxTurnstile = 'true';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', render, { once: true });
    }
  }, [onToken]);
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return null;
  return <div ref={container} />;
}

