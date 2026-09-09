'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PracticeForm, practiceSend } from '@/components/hub/practice-form';

export function PracticeInvitationForm() {
  const { data: session, status } = useSession();
  const [token, setToken] = useState(''), [complete, setComplete] = useState(false);
  useEffect(() => { setToken(window.location.hash.slice(1)); }, []);
  if (complete) return <p>Invitation accepted. <Link className="text-primary underline" href={session ? '/dashboard/practice' : '/login?callbackUrl=%2Fdashboard%2Fpractice'}>{session ? 'Open workspace' : 'Sign in to your staff account'}</Link></p>;
  if (status === 'loading') return <p>Loading your account…</p>;
  if (!token) return <p>Open the invitation link from your email to continue.</p>;
  return <div className="space-y-4">
    {session ? <p>Signed in as <span suppressHydrationWarning>{session.user.email}</span>. This must match the invited email address.</p> : <p>If you already have an account, <Link className="text-primary underline" href={`/login?callbackUrl=${encodeURIComponent(`/practice/invitation#${token}`)}`}>sign in first</Link>. Otherwise, create your staff account below. Use at least 12 characters with upper/lowercase letters, a number, and a symbol.</p>}
    <PracticeForm key={session ? 'existing' : 'new'} fields={session ? [] : [{ name: 'name', label: 'Your name', required: true }, { name: 'password', label: 'Password', type: 'password', required: true }]} submitLabel={session ? 'Accept invitation' : 'Create staff account and accept'} onSubmit={async (values) => { await practiceSend('/api/practice/invitation', { token, ...values }); window.history.replaceState(null, '', window.location.pathname); setComplete(true); }} />
  </div>;
}
