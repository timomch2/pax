# DESIGN.md — PAX Platform Design System

**Version:** 1.1 · **Date:** 22 September 2026
Styling and system-design standards for the PAX Platform (Praxis Exchange).

This document is **authoritative**. Where it differs from the original `STYLE_GUIDE.md` template baseline
(most notably on typography), this document wins.

---

## 1. Design Principles

1. **Credible, not corporate.** PAX carries clinical and regulatory weight. The interface should feel calm,
   precise and trustworthy — never playful, never salesy.
2. **Evidence forward.** Data, scores and endorsements are the hero content. Decoration never competes with
   them.
3. **Light, warm, breathable.** A cream page surface with white cards, generous whitespace and soft shadows
   rather than heavy borders. The Admin Dashboard uses the dedicated dark palette in §3.4.
4. **One focal point per page.** Every screen has a clear primary action or primary reading.
5. **Mobile-first in practice.** Many users are on phones in the field. Every layout must work beautifully at
   small widths.
6. **Tokens, not hexes.** Colour, spacing, radius, shadow and motion all come from CSS variables.

---

## 2. Brand

### 2.1 Logo

The logo is rendered exclusively through `components/brand/pax-logo.tsx`. Do not recreate it inline, and do
not modify the component — the final lockup has not yet been signed off (four options, A–D, are pending
selection).

The lockup is a four-part wordmark:

| Element | Colour |
|---|---|
| PRAXIS | Purple |
| EXCHANGE | Teal |
| PAX | Gold |
| Tagline | Teal |

Fixed brand constants held in the component (the **only** permitted hardcoded colours in the codebase):

| Constant | Value | Use |
|---|---|---|
| `PRAXIS_LIGHT` | `#160E33` | PRAXIS wordmark on light surfaces |
| `TEAL_LIGHT` | `#1A9E90` | EXCHANGE and tagline on light surfaces |
| `PRAXIS_DARK` | `#B9AEF0` | PRAXIS wordmark on dark surfaces |
| `TEAL_DARK` | `#2ABFB0` | EXCHANGE and tagline on dark surfaces |
| `GOLD` | `#FBBF24` | PAX |

Sizes: `sm` (52px mark), `md` (66px), `lg` (84px), each with its own text size and letter-tracking. Use the
`tone="dark"` prop on dark or vivid surfaces — never restyle the logo from the outside.

### 2.2 Logo assets

| File | Use |
|---|---|
| `public/img/pax-mark-color.png` | Primary colour mark |
| `public/img/pax-mark.png` | Monochrome mark |
| `public/img/pax-logo-white.png` | Reversed logo for dark bands |
| `public/favicon.png`, `favicon.svg`, `apple-touch-icon.png`, `icon-512.png` | Browser and device icons |
| `public/og-image.png` | Social preview |

### 2.3 Voice

- Hero phrase (locked): **"Where Public Health Innovation Meets Impact"**
- Tagline: **"Bridging the Gap from Idea to Impact"**
- Global in wording, African-majority in imagery. Do not describe PAX as an Africa-only platform.
- Plain, professional English. No exclamation marks, no growth-hacking language.

---

## 3. Colour System

All colours are HSL CSS custom properties declared in `app/globals.css` and mapped into Tailwind through
`tailwind.config.ts` as `hsl(var(--token))`. **Consume them as Tailwind classes** — `bg-primary`,
`text-muted-foreground`, `border-border`. Never write a hex value in a component.

### 3.1 Approved brand palette

The following palette was approved on 22 September 2026 and supersedes earlier general brand colour
assignments in this document. These are design requirements; this documentation update does not
change runtime CSS, theme configuration, or the protected logo lockup.

| Colour | Exact value | Intended use |
|---|---|---|
| Deep Purple | `#3D2B7A` | Primary brand colour |
| Teal | `#2ABFB0` | Accent, CTAs, highlights |
| Cream | `#F5F0E8` | Background, warm neutral |
| Admin Dashboard BG | `#080F18` | Admin Dashboard dark-theme background |
| Admin Dashboard Accent | `#00C896` | Admin Dashboard green accent |

When implementing this palette, define colours through CSS variables and consume semantic Tailwind
classes. Keep the admin palette scoped to the Admin Dashboard. Verify readable foreground colours,
focus states, and contrast for buttons and text; do not assume white text works on teal or green.
Preserve existing semantic status meanings and the logo component unless separately authorized.

#### Existing light tokens (implementation reference, pending palette adoption)

The table below records the previous token palette; it is not the approved replacement palette.

| Token | HSL | Approx. hex | Use |
|---|---|---|---|
| `--background` | `40 33% 97%` | `#FAF8F5` | Page surface (warm cream) |
| `--foreground` | `218 32% 15%` | `#1A2332` | Primary text |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card and panel surfaces |
| `--primary` | `176 59% 30%` | `#1F7A74` | Brand teal — buttons, links, active states |
| `--secondary` | `40 24% 93%` | `#F1EEE8` | Secondary buttons, subtle fills |
| `--muted` | `40 24% 93%` | `#F1EEE8` | Muted backgrounds |
| `--muted-foreground` | `220 9% 40%` | — | Helper text, captions, disabled labels |
| `--accent` | `38 92% 50%` | amber | Hover states, highlights |
| `--destructive` | `0 72% 46%` | `#C81E1E` | Errors, destructive actions |
| `--border` | `218 17% 91%` | `#E4E7EC` | Dividers and card edges |
| `--input` | `218 17% 88%` | — | Form field borders |
| `--ring` | same as primary | `#1F7A74` | Focus rings |

Supporting palette used across features: bright teal `#15908A`, deep teal `#14615C`, bronze `#B26F09`,
purple `#6A5CBF`, gold `#FBBF24`.

### 3.2 Chart palette

| Token | HSL |
|---|---|
| `--chart-1` | `175 55% 40%` |
| `--chart-2` | `38 92% 50%` |
| `--chart-3` | `142 60% 45%` |
| `--chart-4` | `262 50% 58%` |
| `--chart-5` | `340 75% 55%` |

Use them in order. Do not introduce ad-hoc chart colours.

### 3.3 Semantic status colours

**Membership tiers** (`lib/access.ts`): Basic `#2D9B94` · Professional `#F59E0B` · Expert `#8B7FD4`.

**Credibility bands** (`lib/credibility.ts`): Highly Credible `#2ABFB0` · Established `#FBBF24` ·
Emerging `#8B7FD4` · New Contributor (neutral).

**Badge conventions:** preserve success, pending (amber), failure (destructive), and
neutral or archived (muted) meanings when adopting the new brand palette. Status labels always come from `lib/pax-labels.ts` or
`lib/admin-labels.ts` — never inline text.

### 3.4 Admin Dashboard dark theme

The Admin Dashboard is the approved exception to the light-theme design: use background `#080F18`
and green accent `#00C896`. Public and other service surfaces retain the light design with the approved
brand palette. This does not introduce a global dark mode or a user-facing theme toggle.

The existing root layout forces light mode, and the legacy `.dark` block does not implement this new
admin palette. Applying the admin theme requires a separately scoped UI implementation; do not claim
it is active merely because these design requirements are documented.

---

## 4. Typography

| Role | Font | CSS variable | Tailwind | Use |
|---|---|---|---|---|
| Display | **Outfit** (400–800) | `--font-display` | `font-display` | Page titles, hero, section headings |
| Body | **Outfit** | `--font-sans` | `font-sans` | All body copy, labels, descriptions |
| Mono | **JetBrains Mono** | `--font-mono` | `font-mono` | PAX IDs, certificate refs, timestamps, numeric data, code |

Both fonts are loaded through `next/font/google` in `app/layout.tsx`. Outfit intentionally serves as both
display and body face, giving a single, coherent voice.

**Scale:** use Tailwind's scale. Headings `text-4xl` → `text-3xl` → `text-2xl` → `text-xl`; body
`text-base` → `text-sm`; captions `text-xs`.

**Rules**

- Apply `tracking-tight` to every heading at `text-2xl` and above.
- Body copy stays at default tracking; never letter-space paragraphs.
- Numeric and identifier content uses `font-mono` so columns align and IDs are unambiguous.
- Maximum body measure around 70 characters — use `max-w-prose` or a `Container` size.

---

## 5. Spacing

An 8px grid, exposed as variables and used through the Tailwind equivalents.

| Token | Value | Tailwind |
|---|---|---|
| `--spacing-xs` | 4px | `p-1`, `gap-1` |
| `--spacing-sm` | 8px | `p-2`, `gap-2` |
| `--spacing-md` | 16px | `p-4`, `gap-4` |
| `--spacing-lg` | 24px | `p-6`, `gap-6` |
| `--spacing-xl` | 32px | `p-8`, `gap-8` |
| `--spacing-2xl` | 48px | `p-12`, `gap-12` |
| `--spacing-3xl` | 64px | `p-16`, `gap-16` |

**Vary the rhythm.** A page should not use one gap everywhere: hero → large gap → content → medium gap →
footer. Let content breathe; whitespace is the primary signal of quality in this interface.

---

## 6. Radius, Shadow and Motion

### Border radius

| Token | Value | Use |
|---|---|---|
| `--radius` | `0.625rem` | Default — buttons, inputs, cards |
| `--radius-sm` | `calc(var(--radius) - 4px)` | Badges, chips |
| `--radius-lg` | `calc(var(--radius) + 4px)` | Large containers, hero cards |
| `--radius-full` | `9999px` | Avatars, pills |

### Shadow

| Token | Use |
|---|---|
| `--shadow-sm` | Subtle card lift, input focus |
| `--shadow-md` | Cards, dropdowns, popovers |
| `--shadow-lg` | Modals, elevated panels |

These are CSS variables, applied as `var(--shadow-md)` — they are not mapped to Tailwind `shadow-*`
utilities. **Prefer shadow and layering over borders**; a heavy border is a last resort.

### Motion

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `--duration-fast` | 150ms | `duration-fast` | Hovers, toggles |
| `--duration-normal` | 250ms | `duration-normal` | Reveals, transitions |
| `--duration-slow` | 350ms | `duration-slow` | Modals, complex sequences |

Keyframes defined in `tailwind.config.ts`: `accordion-down`, `accordion-up`, `fade-in`
(opacity 0→1 with an 8px upward translate, 0.4s), `fade-out` (0.2s). The `tailwindcss-animate` plugin is
enabled.

Motion is restrained: content reveals and micro-feedback only. No parallax, no looping animation, nothing
that delays a user reading a clinical figure.

---

## 7. Global Base Layer

Defined in `app/globals.css`:

- `html { scroll-behavior: smooth }`
- Universal border colour bound to `--border`
- Antialiased body text
- `::selection` uses primary at 20% opacity
- A custom 6px scrollbar
- Utility `.scrollbar-none` to hide scrollbars where a design requires it

### Gradient utilities

The client UI integration also uses a scoped Home welcome gradient (`--home-welcome-start`
`#160E33` to `--home-welcome-end` `#3A2450`) and workspace action `#F7BE2D`, matching the
client reference. These Home tokens do not replace the approved general brand palette.

| Utility | Definition | Use |
|---|---|---|
| `.hero-gradient` | Three stacked radial gradients — teal 15%, teal 8%, purple 6% | Landing and marketing hero backgrounds on the cream page |
| `.cta-gradient` | `linear-gradient(135deg, #1a1545 0%, #2e2859 50%, #1a1545 100%)` | Deep call-to-action bands. Always pair with the white logo and light text |

Use these shared gradients or the reference-matched Home tokens above. Do not invent more.

---

## 8. Layout Primitives

| Component | Import | Purpose |
|---|---|---|
| `Container` | `@/components/layouts/container` | Centres content with responsive padding. Prop `size`: `sm` \| `md` \| `lg` \| `xl` \| `full` |
| `Section` | `@/components/layouts/section` | Vertical spacing wrapper for page sections. Props `id`, `className` |
| `PageHeader` | `@/components/layouts/page-header` | Title + description + actions. Use at the top of **every** app page |
| `AppShell` | `@/components/layouts/app-shell` | Sidebar + header + main. Standard for dashboards and the admin console |
| `AuthLayout` | `@/components/layouts/auth-layout` | Centred card on a gradient background. Login, register, onboarding |

Standard page composition:

```tsx
<AppShell sidebar={<Nav />}>
  <Container size="lg">
    <PageHeader title="Innovation Vault" description="..." actions={<Button>Submit</Button>} />
    <Section>{/* content */}</Section>
  </Container>
</AppShell>
```

### Navigation

The top navigation bar's styling is **locked** — do not restyle it. Module-level navigation goes on a
second line beneath it, never crowded into the primary bar.

---

## 9. Component Standards

All primitives live in `components/ui/` (49 components, shadcn/ui on Radix). **Extend a primitive's variants;
never fork one.** Feature UI goes in the matching feature folder.

### Key variants already available

| Component | Variants |
|---|---|
| `Button` | `default` \| `secondary` \| `outline` \| `ghost` \| `destructive` \| `link` \| `glass-dark` \| `glass-light`; sizes `xs` \| `sm` \| `default` \| `lg` \| `icon` \| `icon-sm`; `loading` boolean |
| `Card` | `default` \| `interactive` \| `glass-dark` \| `glass-light` (+ interactive variants) \| `ghost` |
| `Badge` | `default` \| `secondary` \| `outline` \| `destructive` |
| `Input` / `Textarea` | `default` \| `error` \| `success` \| `ghost`; sizes `sm` \| `default` \| `lg` |

`glass-dark` is for dark or vivid backgrounds (for example over `.cta-gradient`); `glass-light` is for pale
surfaces.

### Animation components — `@/components/ui/animate`

`FadeIn` (reveal on scroll) · `ScaleIn` · `SlideIn` (`from` top/bottom/left/right) · `Stagger` +
`StaggerItem` (sequential list reveal) · `HoverLift` · `PressScale` · `SkeletonPulse`.

Pattern: wrap sections in `FadeIn`, list and grid items in `Stagger`/`StaggerItem`, interactive cards in
`HoverLift`.

### Feedback

Toasts use **sonner**, mounted once in the root layout. Import `toast` from `sonner`. Do not add a second
toaster.

### Rules

- An interactive `Card` must be wrapped in an `<a>` or `<button>` for keyboard access.
- Every button needs a real handler. No decorative buttons.
- Loading states use `Skeleton` or `SkeletonPulse`, not spinners over blank pages.
- Empty states always explain what to do next, with a primary action.

---

## 10. Data Display

- **Tables** use `@/components/ui/table` with numeric columns right-aligned and set in `font-mono`.
- **Currency** in Practice Hub is KSh, formatted through `formatKsh()` (`en-KE` locale). Never format money
  inline.
- **Dates** use `date-fns` with an explicit format; operational timezone is `Africa/Nairobi`.
- **Scores** (credibility, match) always show the band label alongside the number — a bare number is not
  meaningful to a member.
- **Charts** use the `--chart-*` palette, always with an accessible legend and axis labels.

---

## 11. Imagery

- Use `next/image` for everything. The optimizer is **off** (`images.unoptimized: true`), so ship correctly
  sized files.
- Wrap images in a container with a fixed aspect ratio (`aspect-video`, `aspect-[2/3]`) and a subtle
  `bg-muted` placeholder; use `fill` with `relative` on the parent.
- Always write meaningful `alt` text — never "image" or "photo".
- Photography is African-majority, documentary in tone, showing real practice settings. Avoid stock-looking
  corporate imagery.
- **Never overwrite an existing file in `public/`.** Use a new filename or bump a `?v=N` query on every
  reference; CDN and browsers cache by URL.

---

## 12. Accessibility

- **Contrast is non-negotiable.** Never light text on a light surface. Body text uses `--foreground` on
  `--background` or `--card`; helper text uses `--muted-foreground`, never lighter.
- Focus is always visible — the semantic `--ring` token with contrast against its surrounding surface. Links use an underline on focus rather than
  a ring.
- Every interactive element is keyboard reachable and has an accessible name.
- Icons that carry meaning need a text label or `aria-label`; decorative icons are `aria-hidden`.
- Do not communicate status by colour alone — always pair a colour with a label.
- Respect reduced-motion preferences; animation is enhancement, never a requirement to understand content.

---

## 13. Responsive Behaviour

- Mobile-first. Design the small-width layout first, then enhance.
- Breakpoints are Tailwind defaults (`sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280).
- `AppShell` sidebars collapse to a `Sheet` or `Drawer` at small widths.
- Tables become stacked cards, or scroll horizontally inside a `ScrollArea` — never squash columns.
- Touch targets are at least 44px.
- Test at 390px width before considering a screen complete.

---

## 14. System Design Standards

- **Tokens over values.** If you find yourself typing a hex, a pixel value or a millisecond, there is a token
  for it.
- **One source of truth per rule.** Labels in `lib/*-labels.ts`, money in `lib/hub-finance.ts`, scoring in
  `lib/credibility.ts` and `lib/match-scoring.ts`. Components display; they do not calculate.
- **Composition over configuration.** Prefer combining small components to adding another boolean prop.
- **Server components by default;** `'use client'` only where interaction demands it.
- **Deterministic rendering.** No `Date.now()`, `Math.random()` or locale-less formatting in server-rendered
  markup — it causes hydration mismatches.
- **Smallest possible change.** Shared components and layouts are used across dozens of screens; a cosmetic
  tweak there is a platform-wide change. Grep usages first.

---

*PAX Platform — confidential. © 2026 Praxis Exchange. Version 1.0, 12 August 2026.*
