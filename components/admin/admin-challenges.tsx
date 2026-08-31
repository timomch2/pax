'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';
import { ROLE_LABEL } from '@/lib/admin-labels';

interface AdminChallenge {
  id: string; title: string; organization: string | null; healthArea: string | null;
  geography: string | null; status: string; deadline: string | null; createdAt: string;
  author: { id: string; name: string; role: string };
  _count: { responses: number };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function AdminChallenges() {
  const [items, setItems] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/challenges')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setItems(d.challenges); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1A2332]">Challenge Briefs</h2>
        <p className="text-sm text-muted-foreground">Problems posted by members and organisations, and how many have responded.</p>
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No challenge briefs posted yet.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{items.length} brief{items.length === 1 ? '' : 's'}</p>
          {items.map((c) => (
            <Card key={c.id} className="border-black/[0.06] bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-[#1A2332]">{c.title}</p>
                    <Badge variant="outline" className={`text-[10px] ${c.status === 'OPEN' ? 'border-[#2ABFB0]/40 text-[#2ABFB0]' : 'border-black/[0.08] text-muted-foreground'}`}>{c.status}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.organization, c.healthArea, c.geography].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    By {c.author?.name} ({ROLE_LABEL[c.author?.role] ?? c.author?.role}) · Posted {fmtDate(c.createdAt)}{c.deadline ? ` · Deadline ${c.deadline}` : ''}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-black/[0.04] px-3 py-2 text-sm text-[#1A2332]">
                  <Users className="h-4 w-4 text-[#2ABFB0]" /> {c._count.responses}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
