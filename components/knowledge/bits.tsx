'use client';

import { debateType, DEBATE_STATUS_META, type DebateStatus } from '@/lib/debate';

export function TypeBadge({ type }: { type: string }) {
  const t = debateType(type);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${t.accent}`}
    >
      {t.shortLabel}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = DEBATE_STATUS_META[status as DebateStatus] ?? DEBATE_STATUS_META.OPEN;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.accent}`}
    >
      {meta.label}
    </span>
  );
}

export function DimensionChip({ dimension }: { dimension: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-black/[0.08] bg-black/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground">
      {dimension}
    </span>
  );
}

// Circular community-score ring (0-100).
export function ScoreRing({
  value,
  size = 96,
  label = 'Community Score',
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? '#2ABFB0' : pct >= 45 ? '#FBBF24' : '#DC2626';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={8} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <div className="-mt-[62px] mb-[26px] text-center">
        <div className="font-display text-2xl font-bold" style={{ color }}>
          {Math.round(pct)}
        </div>
      </div>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

export function feasibilityColor(v: number): string {
  return v >= 4 ? '#2ABFB0' : v >= 3 ? '#FBBF24' : '#DC2626';
}
