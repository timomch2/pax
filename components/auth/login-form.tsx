'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/hub';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        otp: otp || undefined,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        toast.error('Invalid email or password');
      } else {
        window.location.assign(result?.url || '/hub');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn('google', { redirect: true, callbackUrl });
    } catch {
      toast.error('An error occurred with Google Sign-In.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="text-right"><Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link></div>
        <div className="space-y-2">
          <Label htmlFor="otp">Authentication code <span className="font-normal text-muted-foreground">(if enabled)</span></Label>
          <Input id="otp" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code or recovery code" value={otp} onChange={(event) => setOtp(event.target.value)} />
        </div>
        <Button type="submit" className="w-full gap-2" loading={loading}>
          <LogIn className="h-4 w-4" /> Sign In
        </Button>
      </form>

      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' && <><div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-black/[0.08]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-3 border-black/[0.08] bg-black/[0.04] hover:bg-black/[0.06] text-[#1A2332]"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {googleLoading ? 'Signing in...' : 'Sign in with Google'}
      </Button></>}

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href={callbackUrl.includes('/talent') || callbackUrl.includes('talent.') ? `/talent/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/register'} className="font-medium text-primary hover:underline">
          Register here
        </Link>
      </p>
    </div>
  );
}
