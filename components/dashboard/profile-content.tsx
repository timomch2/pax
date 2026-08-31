'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserCircle, Save, Stethoscope, Phone, Mail, Hash, Building, IdCard, Fingerprint, Award, Linkedin, MapPin, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { GpsProfile } from '@/components/dashboard/gps-profile';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  paxId: string | null;
  organization: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  linkedinUrl: string | null;
  healthAreas: string | null;
  credibilityScore: number;
  practitionerProfile: {
    id: string;
    medicalRegNumber: string;
    specialty: string;
    consultationRate: number;
    hospital: string | null;
    bio: string | null;
    clinicId: string | null;
    affiliations: string | null;
  } | null;
}

export function ProfileContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState(0);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    headline: '',
    location: '',
    linkedinUrl: '',
    healthAreas: '',
    bio: '',
    specialty: '',
    consultationRate: '',
    hospital: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data ?? null);
          setScore(data?.credibilityScore ?? 0);
          setForm({
            name: data?.name ?? '',
            phone: data?.phone ?? '',
            headline: data?.headline ?? '',
            location: data?.location ?? '',
            linkedinUrl: data?.linkedinUrl ?? '',
            healthAreas: data?.healthAreas ?? '',
            bio: data?.bio ?? '',
            specialty: data?.practitionerProfile?.specialty ?? '',
            consultationRate: String(data?.practitionerProfile?.consultationRate ?? ''),
            hospital: data?.practitionerProfile?.hospital ?? '',
          });
        }
      } catch (e: any) {
        console.error('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data ?? null);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev: any) => ({ ...(prev ?? {}), [field]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const isPractitioner = profile?.role === 'PRACTITIONER' || profile?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your personal and professional information.</p>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <UserCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">{profile?.name ?? ''}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge>{profile?.role ?? ''}</Badge>
                {isPractitioner && profile?.practitionerProfile && (
                  <Badge variant="outline">{profile.practitionerProfile.specialty}</Badge>
                )}
              </div>
              {profile?.headline && <p className="mt-1 text-sm font-medium text-foreground/90">{profile.headline}</p>}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {profile?.email ?? ''}</span>
                {profile?.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.location}</span>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credibility Score Card */}
      <Card className="border-[#F59E0B]/20 bg-gradient-to-br from-[#F59E0B]/[0.06] to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F59E0B]/15">
                <Award className="h-7 w-7 text-[#FBBF24]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Credibility Score</p>
                <p className="font-display text-3xl font-bold text-[#FBBF24]">{score}<span className="text-lg text-muted-foreground">/100</span></p>
              </div>
            </div>
            <p className="max-w-xs text-xs text-muted-foreground">
              Built from documented impact and endorsements — not qualifications or job titles. Add GPS entries below to grow it.
            </p>
          </div>
          <Progress value={score} className="mt-4 h-2" />
        </CardContent>
      </Card>

      {/* GPS Profile */}
      <GpsProfile onScoreChange={setScore} />

      {/* PAX Identity Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IdCard className="h-5 w-5 text-[#2ABFB0]" />
            PAX Identity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#2D9B94]/30 bg-[#2D9B94]/5 p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Fingerprint className="h-3.5 w-3.5" /> PAX ID</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-wider text-[#2ABFB0]">{profile?.paxId ?? 'Not assigned'}</p>
              <p className="text-xs text-muted-foreground">Your unique identity across the PAX ecosystem.</p>
            </div>
            {isPractitioner && (
              <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building className="h-3.5 w-3.5" /> Clinic ID</p>
                <p className="mt-1 font-mono text-lg font-bold tracking-wider text-[#FBBF24]">{profile?.practitionerProfile?.clinicId ?? 'Not assigned'}</p>
                <p className="text-xs text-muted-foreground">Identifies your practice for billing &amp; patient workflow.</p>
              </div>
            )}
          </div>
          {isPractitioner && profile?.practitionerProfile?.affiliations && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-1">Affiliations</p>
              <p className="text-sm">{profile.practitionerProfile.affiliations}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Stethoscope className="h-5 w-5 text-primary" />
            Update Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('name', e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('phone', e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={profile?.email ?? ''} disabled className="pl-10 opacity-60" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Headline</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.headline} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('headline', e.target.value)} className="pl-10" placeholder="e.g. Community Health Innovator" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('location', e.target.value)} className="pl-10" placeholder="e.g. Kisumu, Kenya" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>LinkedIn Profile</Label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.linkedinUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('linkedinUrl', e.target.value)} className="pl-10" placeholder="https://linkedin.com/in/you" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Health Areas</Label>
              <Input value={form.healthAreas} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('healthAreas', e.target.value)} placeholder="e.g. Maternal Health, Nutrition" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>About You</Label>
              <Textarea value={form.bio} onChange={(e) => updateField('bio', e.target.value)} placeholder="A short summary of who you are and the impact you're focused on." rows={3} />
            </div>
            {isPractitioner && (
              <>
                <div className="space-y-2">
                  <Label>Medical Reg. Number</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={profile?.practitionerProfile?.medicalRegNumber ?? ''} disabled className="pl-10 opacity-60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <Input value={form.specialty} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('specialty', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Consultation Rate (KSh)</Label>
                  <Input type="number" value={form.consultationRate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('consultationRate', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hospital / Facility</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={form.hospital} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('hospital', e.target.value)} className="pl-10" placeholder="e.g. Kenyatta National Hospital" />
                  </div>
                </div>
              </>
            )}
          </div>
          <Button className="mt-6 gap-2" onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
