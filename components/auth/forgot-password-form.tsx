'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault();
      setLoading(true);
      try {
        await fetch('/api/auth/password-reset/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        toast.success('If an eligible account exists, reset instructions will be sent.');
      } catch {
        toast.error('Unable to submit the request. Please try again.');
      } finally {
        setLoading(false);
      }
    }}>
      <div className="space-y-2"><Label htmlFor="reset-email">Email</Label><Input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      <Button type="submit" className="w-full" loading={loading}>Send reset instructions</Button>
    </form>
  );
}

