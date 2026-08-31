'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  if (complete) return <div className="space-y-4"><p className="text-sm text-muted-foreground">Your password has been changed and all existing sessions were revoked.</p><Button asChild><Link href="/login">Sign in</Link></Button></div>;

  return (
    <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault();
      setLoading(true);
      try {
        const response = await fetch('/api/auth/password-reset/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Password reset failed');
        setComplete(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Password reset failed');
      } finally {
        setLoading(false);
      }
    }}>
      <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required /><p className="text-xs text-muted-foreground">Use at least 12 characters with upper and lowercase letters, a number, and a symbol.</p></div>
      <Button type="submit" className="w-full" loading={loading}>Reset password</Button>
    </form>
  );
}

