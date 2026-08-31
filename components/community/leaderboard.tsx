'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Award, Star, Users, MessageSquare, FileCheck, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

const TIER_LABELS: Record<string, string> = {
  TIER1_BASIC: 'Basic',
  TIER2_PROFESSIONAL: 'Professional',
  TIER3_EXPERT: 'Expert',
};

const ROLE_LABELS: Record<string, string> = {
  PRACTITIONER: 'Practitioner',
  INNOVATOR: 'Innovator',
  INVESTOR: 'Investor',
  EMPLOYER: 'Employer',
  POLICYMAKER: 'Policymaker',
};

type LeaderEntry = {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  tier: string;
  credibilityScore: number;
  healthAreas: string[];
  country: string | null;
  _count: { gpsEntries: number; debateContributions: number; gpsEndorsementsGiven: number };
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-[#FBBF24]" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-700" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-[#CD7F32]" />;
  return <span className="text-sm font-bold text-gray-500 w-5 text-center">{rank}</span>;
}

export function CommunityLeaderboard() {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard?limit=50')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setEntries(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <Award className="w-10 h-10 text-[#FBBF24] mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-[#1A2332]">Community Leaderboard</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto">
          Ranked by Praxis Credibility Score — earned through GPS evidence, debate contributions,
          expert opinions, peer endorsements, and community engagement.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 bg-white" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No community members with credibility scores yet.</p>
          <p className="text-xs mt-1">Contribute to debates and build your GPS profile to earn your score.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  isTop3
                    ? 'bg-white border-[#FBBF24]/20'
                    : 'bg-white border-[#E4E7EC] hover:border-[#2ABFB0]/30'
                }`}
              >
                <div className="flex-shrink-0 w-8 flex justify-center">
                  <RankIcon rank={rank} />
                </div>

                <div className="flex-shrink-0">
                  {entry.image ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden">
                      <Image src={entry.image} alt={entry.name || ''} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#2ABFB0]/10 flex items-center justify-center text-[#2ABFB0] font-bold text-sm">
                      {(entry.name || '?')[0]}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1A2332] truncate">{entry.name || 'Anonymous'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2ABFB0]/10 text-[#2ABFB0] font-medium">
                      {ROLE_LABELS[entry.role] || entry.role}
                    </span>
                    {entry.tier === 'TIER3_EXPERT' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] font-medium">
                        Expert
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                    {entry.country && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {entry.country}</span>
                    )}
                    <span className="flex items-center gap-1"><FileCheck className="w-3 h-3" /> {entry._count.gpsEntries} GPS</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {entry._count.debateContributions} debates</span>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-[#FBBF24] fill-current" />
                    <span className={`text-lg font-bold ${isTop3 ? 'text-[#FBBF24]' : 'text-[#1A2332]'}`}>
                      {entry.credibilityScore}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500">Praxis Score</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
