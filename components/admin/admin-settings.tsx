'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Info } from 'lucide-react';

export function AdminSettings({ name, email }: { name: string; email: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1A2332]">Settings</h2>
        <p className="text-sm text-muted-foreground">Your administrator account and platform information.</p>
      </div>

      <Card className="border-black/[0.06] bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2ABFB0]/15">
            <ShieldCheck className="h-6 w-6 text-[#2ABFB0]" />
          </div>
          <div>
            <p className="font-medium text-[#1A2332]">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
          <Badge className="ml-auto bg-[#2ABFB0]/15 text-[#2ABFB0]">Administrator</Badge>
        </div>
      </Card>

      <Card className="border-black/[0.06] bg-white p-5">
        <h3 className="mb-3 font-semibold text-[#1A2332]">Admin capabilities</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Manage member accounts — change user type, membership tier and Hub access.</li>
          <li>• Oversee innovations — move pipeline status and award verified badges.</li>
          <li>• Review investments, challenge briefs and the vault/NDA audit trail.</li>
          <li>• Monitor post-market safety reports and product feedback.</li>
          <li>• Track platform growth and distributions in Analytics.</li>
        </ul>
      </Card>

      <Card className="border-[#FBBF24]/20 bg-[#FBBF24]/5 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-[#FBBF24]" />
          <p className="text-sm text-muted-foreground">
            Additional platform-wide configuration (feature flags, fee rates, verification tiers) will be added here as those modules are built.
          </p>
        </div>
      </Card>
    </div>
  );
}
