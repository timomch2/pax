'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VerifyEmailResult({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then((response) => setState(response.ok ? 'success' : 'error')).catch(() => setState('error'));
  }, [token]);

  if (state === 'loading') return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Verifying your email…</div>;
  if (state === 'success') return <div className="space-y-4"><p className="text-sm text-muted-foreground">Your email is verified. You can now sign in.</p><Button asChild><Link href="/login">Continue to sign in</Link></Button></div>;
  return <div className="space-y-4"><p className="text-sm text-destructive">This verification link is invalid or has expired.</p><Button asChild variant="outline"><Link href="/login">Return to sign in</Link></Button></div>;
}

