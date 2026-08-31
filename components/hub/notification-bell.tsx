'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setItems(data?.notifications ?? []);
      }
    } catch (e: any) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const markRead = async (ids?: string[]) => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids ? { ids } : { all: true }) });
      setItems((prev) => prev.map((n) => (!ids || ids.includes(n.id)) ? { ...n, read: true } : n));
    } catch {
      console.error('Failed to mark notifications read');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-semibold"><span>Notifications</span>{unread > 0 && <button type="button" className="text-xs font-normal text-primary hover:underline" onClick={() => markRead()}>Mark all read</button>}</div>
        {loading ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          items.map((n) => {
            const clickable = !!n.link;
            const Wrapper: any = clickable ? 'button' : 'div';
            return (
              <Wrapper
                key={n.id}
                type={clickable ? 'button' : undefined}
                onClick={() => { if (!n.read) markRead([n.id]); if (clickable) router.push(n.link as string); }}
                className={`block w-full px-3 py-2.5 text-left border-b border-black/[0.06] last:border-0 ${n.read ? 'opacity-70' : ''} ${clickable ? 'cursor-pointer hover:bg-black/[0.04]' : ''}`}
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
              </Wrapper>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
