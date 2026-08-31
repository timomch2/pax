import Image from 'next/image';

type Size = 'sm' | 'md' | 'lg';
type Tone = 'light' | 'dark';

const CFG: Record<Size, {
  mark: number;
  gap: string;
  praxis: string;
  exchange: string;
  pax: string;
  tag: string;
  trackTitle: string;
  trackPax: string;
}> = {
  sm: {
    mark: 52,
    gap: 'gap-3',
    praxis: 'text-[18px]',
    exchange: 'text-[18px]',
    pax: 'text-[15px]',
    tag: 'text-[13px]',
    trackTitle: 'tracking-[2.4px]',
    trackPax: 'tracking-[3.2px]',
  },
  md: {
    mark: 66,
    gap: 'gap-3.5',
    praxis: 'text-[22px]',
    exchange: 'text-[22px]',
    pax: 'text-[18px]',
    tag: 'text-[15px]',
    trackTitle: 'tracking-[2.8px]',
    trackPax: 'tracking-[3.6px]',
  },
  lg: {
    mark: 84,
    gap: 'gap-4',
    praxis: 'text-[27px]',
    exchange: 'text-[27px]',
    pax: 'text-[21px]',
    tag: 'text-[17px]',
    trackTitle: 'tracking-[3.2px]',
    trackPax: 'tracking-[4px]',
  },
};

/* Brand colours */
/* Light surfaces: near-black deep purple for PRAXIS */
const PRAXIS_LIGHT = '#160E33';
const TEAL_LIGHT   = '#1A9E90';
/* Dark surfaces: bright lavender purple so PRAXIS stays legible */
const PRAXIS_DARK  = '#B9AEF0';
const TEAL_DARK    = '#2ABFB0';
const GOLD         = '#FBBF24';

/**
 * PAX brand lock-up — coloured wordmark on transparent background.
 * PRAXIS (deep purple) · EXCHANGE (teal) · PAX (gold) · tagline (teal).
 * Pass tone="dark" when placed on a dark background so the purple stays legible.
 */
export function PaxLogo({
  size = 'sm',
  tone = 'light',
  className = '',
}: {
  size?: Size;
  tone?: Tone;
  className?: string;
}) {
  const c = CFG[size];
  const praxisColor = tone === 'dark' ? PRAXIS_DARK : PRAXIS_LIGHT;
  const tealColor = tone === 'dark' ? TEAL_DARK : TEAL_LIGHT;

  return (
    <span className={`inline-flex items-center ${c.gap} ${className}`}>
      {/* Coloured PX icon mark */}
      <span className="relative flex-shrink-0" style={{ width: c.mark, height: c.mark }}>
        <Image
          src="/logo-mark.png"
          alt="Praxis Exchange"
          fill
          className="object-contain"
          priority
        />
      </span>

      {/* Wordmark stack */}
      <span className="flex flex-col leading-none text-left">
        {/* PRAXIS EXCHANGE on one line */}
        <span className={`font-bold uppercase ${c.trackTitle} ${c.praxis}`}>
          <span style={{ color: praxisColor }}>Praxis</span>{' '}
          <span style={{ color: tealColor }}>Exchange</span>
        </span>

        {/* PAX */}
        <span
          className={`font-extrabold uppercase ${c.trackPax} mt-[3px] ${c.pax}`}
          style={{ color: GOLD }}
        >
          PAX
        </span>

        {/* Tagline */}
        <span
          className={`italic mt-[3px] ${c.tag}`}
          style={{ color: tealColor }}
        >
          Bridging the Gap from Idea to Impact
        </span>
      </span>
    </span>
  );
}
