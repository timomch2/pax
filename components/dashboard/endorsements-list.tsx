'use client';

import { BadgeCheck } from 'lucide-react';
import { ENDORSER_TYPES, type GpsEndorserType } from '@/lib/gps';

export interface EndorsementItem {
  id: string;
  endorserType: GpsEndorserType;
  comment: string | null;
  createdAt?: string;
  endorser?: { id: string; name: string | null } | null;
}

export function EndorsementsList({ endorsements }: { endorsements: EndorsementItem[] }) {
  if (!endorsements?.length) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Endorsements ({endorsements.length})
      </p>
      {endorsements.map((en) => {
        const meta = ENDORSER_TYPES[en.endorserType];
        return (
          <div
            key={en.id}
            className="rounded-lg border border-[#2D9B94]/25 bg-[#2D9B94]/[0.07] p-3"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <BadgeCheck className="h-4 w-4 shrink-0 text-[#2ABFB0]" />
              <span className="font-medium">{en.endorser?.name ?? 'A member'}</span>
              <span className="text-xs text-muted-foreground">
                · {meta?.label ?? en.endorserType}
              </span>
            </div>
            <p className="mt-1 pl-6 text-xs italic text-muted-foreground">
              “{en.comment || meta?.confirms}”
            </p>
          </div>
        );
      })}
    </div>
  );
}
