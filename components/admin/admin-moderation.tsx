'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Flag, Check, Trash2, MessageSquare, ExternalLink, ShieldAlert } from 'lucide-react';

interface ModerationItem {
  id: string;
  body: string;
  kind: string;
  moderationStatus: string;
  moderationReason: string | null;
  createdAt: string;
  author: { id: string; name: string | null; role: string };
  debate: { id: string; title: string; type: string };
}

export function AdminModerationQueue() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/moderation');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const moderate = async (cid: string, action: 'approve' | 'remove') => {
    try {
      const res = await fetch(`/api/debates/contributions/${cid}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(action === 'remove' ? 'Contribution removed.' : 'Contribution approved.');
        load();
      } else toast.error('Action failed.');
    } catch { toast.error('Something went wrong.'); }
  };

  const flagged = items.filter((i) => i.moderationStatus === 'FLAGGED');
  const removed = items.filter((i) => i.moderationStatus === 'REMOVED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Moderation Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-flagged contributions awaiting your review. You decide what stays and what goes.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : flagged.length === 0 && removed.length === 0 ? (
        <Card className="border-black/[0.08] bg-white">
          <CardContent className="py-12 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-[#2ABFB0]/40" />
            <p className="text-sm text-muted-foreground">No flagged contributions. The community is self-regulating well.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {flagged.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#FBBF24]">
                <Flag className="h-4 w-4" /> Pending Review ({flagged.length})
              </h2>
              {flagged.map((item) => (
                <ModerationCard key={item.id} item={item} onModerate={moderate} />
              ))}
            </div>
          )}

          {removed.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Trash2 className="h-4 w-4" /> Previously Removed ({removed.length})
              </h2>
              {removed.map((item) => (
                <ModerationCard key={item.id} item={item} onModerate={moderate} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ModerationCard({ item, onModerate }: { item: ModerationItem; onModerate: (id: string, action: 'approve' | 'remove') => void }) {
  const isFlagged = item.moderationStatus === 'FLAGGED';
  const typeColor = item.debate.type === 'POLICY_PRACTICE' ? '#2ABFB0' : item.debate.type === 'RESEARCH_FEASIBILITY' ? '#8B7FD4' : '#FBBF24';
  return (
    <Card className={`border-black/[0.08] ${isFlagged ? 'bg-[#FBBF24]/[0.04]' : 'bg-white'}`}>
      <CardContent className="p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <Link href={`/knowledge/${item.debate.id}`} className="inline-flex items-center gap-1 font-medium hover:text-[#2ABFB0]" style={{ color: typeColor }}>
            <MessageSquare className="h-3 w-3" /> {item.debate.title}
            <ExternalLink className="h-3 w-3" />
          </Link>
          <span className="text-muted-foreground">by {item.author.name || 'Member'} ({item.author.role})</span>
          <span className="text-muted-foreground">{new Date(item.createdAt).toLocaleDateString('en-GB')}</span>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {item.body.length > 400 ? item.body.slice(0, 400) + '…' : item.body}
        </p>

        {item.moderationReason && (
          <p className="mt-2 rounded-md bg-[#FBBF24]/10 px-3 py-1.5 text-xs text-[#FBBF24]">
            AI note: {item.moderationReason}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          {isFlagged && (
            <>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onModerate(item.id, 'approve')}>
                <Check className="h-3 w-3" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 border-[#DC2626]/40 text-xs text-[#DC2626]" onClick={() => onModerate(item.id, 'remove')}>
                <Trash2 className="h-3 w-3" /> Remove
              </Button>
            </>
          )}
          {!isFlagged && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onModerate(item.id, 'approve')}>
              <Check className="h-3 w-3" /> Restore
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
