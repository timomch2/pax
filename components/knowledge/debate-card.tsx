'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, MessageSquare, Award, Users, ArrowRight, Star } from 'lucide-react';
import { TypeBadge, StatusBadge } from '@/components/knowledge/bits';
import { CredentialBadge } from '@/components/community/credential-badge';

export interface DebateListItem {
  id: string;
  type: string;
  status: string;
  title: string;
  motion: string;
  healthDomain: string | null;
  geographyFocus: string | null;
  featured: boolean;
  closesAt: string | null;
  responseCount: number;
  expertCount: number;
  stanceCount: number;
  feasibilityAvg: number | null;
  initiator: { id: string; name: string | null; tier?: string | null };
}

export function DebateCard({ d }: { d: DebateListItem }) {
  return (
    <Link href={`/knowledge/${d.id}`} className="group block">
      <Card className="h-full border-black/[0.08] bg-white transition-colors hover:border-[#2ABFB0]/40">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={d.type} />
            <StatusBadge status={d.status} />
            {d.featured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-2 py-0.5 text-[11px] font-medium text-[#FBBF24]">
                <Star className="h-3 w-3" /> Featured
              </span>
            )}
            {d.initiator?.tier === 'TIER3_EXPERT' && (
              <CredentialBadge tier={d.initiator.tier} size="xs" variant="short" />
            )}
          </div>

          <div>
            <h3 className="font-display text-base font-semibold leading-snug group-hover:text-[#2ABFB0]">
              {d.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.motion}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {d.healthDomain && <span>{d.healthDomain}</span>}
            {d.geographyFocus && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {d.geographyFocus}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-black/[0.06] pt-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> {d.responseCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {d.stanceCount}
              </span>
              {d.expertCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[#8B7FD4]">
                  <Award className="h-3.5 w-3.5" /> {d.expertCount} expert{d.expertCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
