'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, Phone, Stethoscope, Hash, UserPlus, Building2, Linkedin, Briefcase, MapPin, Globe, Mailbox, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { USER_TYPES, roleFromSlug } from '@/lib/access';
import { TurnstileWidget } from '@/components/auth/turnstile-widget';

type Role = 'PRACTITIONER' | 'INNOVATOR' | 'INVESTOR' | 'EMPLOYER' | 'POLICYMAKER';
const VALID_ROLES: Role[] = ['PRACTITIONER', 'INNOVATOR', 'INVESTOR', 'EMPLOYER', 'POLICYMAKER'];

// Per-type configuration for the organisation field.
const ORG_FIELD: Record<'INNOVATOR' | 'INVESTOR' | 'EMPLOYER' | 'POLICYMAKER', { label: string; placeholder: string; required: boolean }> = {
  INNOVATOR: { label: 'Organisation / Venture', placeholder: 'e.g. MamaObi Health', required: false },
  INVESTOR: { label: 'Firm / Fund', placeholder: 'e.g. Savannah Impact Capital', required: false },
  EMPLOYER: { label: 'Organisation Name', placeholder: 'e.g. Aga Khan University Hospital', required: true },
  POLICYMAKER: { label: 'Ministry / Agency', placeholder: 'e.g. Ministry of Health, Kenya', required: true },
};

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(['PRACTITIONER']);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    physicalAddress: '',
    city: '',
    postalCode: '',
    country: 'Kenya',
    medicalRegNumber: '',
    specialty: '',
    organization: '',
    headline: '',
    linkedinUrl: '',
  });

  useEffect(() => {
    const mapped = roleFromSlug(searchParams?.get('role'));
    if (mapped && mapped !== 'PATIENT' && mapped !== 'ADMIN') {
      setSelectedRoles([mapped as Role]);
    }
  }, [searchParams]);

  const toggleRole = (r: Role) => {
    setSelectedRoles(prev => {
      if (prev.includes(r)) {
        // Can't deselect the last one
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== r);
      }
      return [...prev, r];
    });
  };

  // Primary role = first in list (drives initial landing page)
  const primaryRole = selectedRoles[0];
  const additionalRoles = selectedRoles.slice(1);

  // Determine which fields are needed based on the UNION of selected roles
  const needsPractitioner = selectedRoles.includes('PRACTITIONER');
  const needsOrg = selectedRoles.some(r => r === 'EMPLOYER' || r === 'POLICYMAKER' || r === 'INNOVATOR' || r === 'INVESTOR');
  const orgRequired = selectedRoles.some(r => r === 'EMPLOYER' || r === 'POLICYMAKER');
  // Pick the best org field config: prioritise the required ones
  const orgConfig = (() => {
    const orgRoles: Array<'EMPLOYER' | 'POLICYMAKER' | 'INNOVATOR' | 'INVESTOR'> = ['EMPLOYER', 'POLICYMAKER', 'INNOVATOR', 'INVESTOR'];
    for (const or of orgRoles) {
      if (selectedRoles.includes(or)) return ORG_FIELD[or];
    }
    return ORG_FIELD.INNOVATOR;
  })();

  const roleOptions = USER_TYPES;

  const updateField = (field: string, value: string) => {
    setForm((prev: any) => ({ ...(prev ?? {}), [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      toast.error('Please confirm you have read the Privacy Policy before continuing.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: primaryRole, additionalRoles, consentGiven: true, turnstileToken: turnstileToken || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Registration failed');
        return;
      }
      toast.success('Check your email for a verification link before signing in.');
      router.replace('/login?verification=pending');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn('google', { redirect: true, callbackUrl: '/hub' });
    } catch {
      toast.error('An error occurred with Google Sign-In.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-4">
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Role Selector — multi-select */}
      <div className="space-y-2">
        <Label>I am joining as... <span className="text-muted-foreground text-xs font-normal">(select all that apply)</span></Label>
        <div className="grid grid-cols-2 gap-2">
          {roleOptions.map((opt) => {
            const Icon = opt.icon;
            const active = selectedRoles.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleRole(opt.value)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors relative ${
                  active
                    ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                    : 'border-black/[0.08] bg-muted/40 text-muted-foreground hover:text-foreground hover:border-black/[0.12]'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                {opt.shortLabel}
                {active && <Check className="h-3.5 w-3.5 text-primary absolute top-1.5 right-1.5" />}
              </button>
            );
          })}
        </div>
        {selectedRoles.length > 1 && (
          <p className="text-xs text-muted-foreground">Primary: <span className="text-primary">{roleOptions.find(o => o.value === primaryRole)?.shortLabel}</span> (your landing page). You can switch surfaces anytime from the sidebar.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="name" placeholder="Your full name" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('name', e.target.value)} className="pl-10" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="reg-email" type="email" placeholder="you@example.com" value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('email', e.target.value)} className="pl-10" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="reg-password" type="password" placeholder="Min 6 characters" value={form.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('password', e.target.value)} className="pl-10" required minLength={6} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number <span className="text-muted-foreground">(include country code)</span></Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="phone" placeholder="+254 712 345 678" value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('phone', e.target.value)} className="pl-10" required />
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mb-1">
        Country of origin is required for everyone. The rest of your address is optional on the free Basic plan and becomes required when you upgrade to a Professional or Expert membership.
      </p>

      <div className="space-y-2">
        <Label htmlFor="physicalAddress">Physical Address <span className="text-muted-foreground">(optional)</span></Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="physicalAddress" placeholder="Street / building, area" value={form.physicalAddress} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('physicalAddress', e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="city">City / Town <span className="text-muted-foreground">(optional)</span></Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="city" placeholder="e.g. Nairobi" value={form.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('city', e.target.value)} className="pl-10" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code <span className="text-muted-foreground">(optional)</span></Label>
          <div className="relative">
            <Mailbox className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="postalCode" placeholder="e.g. 00100" value={form.postalCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('postalCode', e.target.value)} className="pl-10" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country of Origin</Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="country" placeholder="e.g. Kenya" value={form.country} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('country', e.target.value)} className="pl-10" required />
        </div>
      </div>

      {(
        <>
          <div className="space-y-2">
            <Label htmlFor="headline">Headline <span className="text-muted-foreground">(optional)</span></Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="headline" placeholder="e.g. Community Health Innovator" value={form.headline} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('headline', e.target.value)} className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn <span className="text-muted-foreground">(optional — import as a starting point)</span></Label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="linkedinUrl" placeholder="https://linkedin.com/in/you" value={form.linkedinUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('linkedinUrl', e.target.value)} className="pl-10" />
            </div>
          </div>
        </>
      )}

      {needsPractitioner && (
        <>
          <div className="space-y-2">
            <Label htmlFor="medReg">Professional Registration / Licence Number</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="medReg" placeholder="e.g. A12345 (as issued by your regulator)" value={form.medicalRegNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('medicalRegNumber', e.target.value)} className="pl-10" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Profession / Specialty</Label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="specialty" placeholder="e.g. Nurse, Pharmacist, General Surgery" value={form.specialty} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('specialty', e.target.value)} className="pl-10" required />
            </div>
          </div>
        </>
      )}

      {needsOrg && (
        <div className="space-y-2">
          <Label htmlFor="organization">{orgConfig.label}{orgRequired ? '' : ' (optional)'}</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="organization" placeholder={orgConfig.placeholder} value={form.organization} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('organization', e.target.value)} className="pl-10" required={orgRequired} />
          </div>
        </div>
      )}

      <p className="rounded-lg border border-black/[0.08] bg-black/[0.03] p-3 text-xs leading-relaxed text-muted-foreground">
        On PAX, your profile is built on what you&apos;ve <span className="text-foreground">solved</span> — not just where you&apos;ve worked. After joining, you&apos;ll build your GPS profile: the gaps you found, the solutions you designed, and the outcomes you achieved.
      </p>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/[0.08] bg-white p-3 text-xs leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          checked={consentGiven}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConsentGiven(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
          aria-label="Consent to data processing"
        />
        <span>
          I have read the{' '}
          <Link href="/privacy" target="_blank" className="font-medium text-primary underline underline-offset-2">
            Privacy Policy
          </Link>{' '}
          and I consent to The Praxis Exchange collecting and processing my personal data for the purposes
          described in it. I understand I can withdraw this consent at any time from my account settings.
        </span>
      </label>

      <TurnstileWidget onToken={setTurnstileToken} />

      <Button type="submit" className="w-full gap-2" loading={loading} disabled={!consentGiven}>
        <UserPlus className="h-4 w-4" /> Create Account
      </Button>
    </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-black/[0.08]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>

      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' && <Button
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
        {googleLoading ? 'Signing up...' : 'Sign up with Google'}
      </Button>}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
