# SPEC: Progress Page Redesign — Animated Dashboard

## Overview

Replace `src/app/progress/page.tsx` with a redesigned progress dashboard featuring CSS animations, count-up numbers, animated SVG ring gauges, and an encouraging empty state.

## Architecture

- **Single file replacement**: `src/app/progress/page.tsx` (self-contained, no new components)
- **Data source**: Existing `GET /api/progress` — no API changes needed
- **Animation approach**: CSS `@keyframes` via Tailwind `animate-*` classes + inline styles, React `useEffect` for count-up timers, SVG `stroke-dashoffset` for ring gauges
- **Zero new dependencies**: Pure CSS + React

## Animation Inventory

| Animation | Technique | Duration | Trigger |
|-----------|-----------|----------|---------|
| Number count-up | `useEffect` + `requestAnimationFrame` | 1.2s | Component mount |
| SVG ring gauge fill | `stroke-dashoffset` transition via CSS | 1.5s | Component mount (delayed) |
| Card fade-in + slide-up | CSS `@keyframes` with `animation-delay` | 0.5s stagger | Mount |
| Bar chart grow | `width` transition via inline style | 1s | Mount |
| Score color pulse | `@keyframes` scale pulse | 2s loop | Always |
| Empty state float | `@keyframes` translateY | 3s loop | Always |
| Empty state particle dots | Absolute positioned divs with `animate-ping` | Varied | Always |

## Component Structure

```
ProgressPage (client component)
├── Loading State (3-dot bounce animation)
├── Empty State
│   ├── Floating illustration (animated duck/chart icon)
│   ├── Headline: "Your SAT Journey Starts Here"
│   ├── 3 benefit cards (fade-in staggered)
│   └── CTA button (pulse shadow)
└── Data State
    ├── Header (gradient text)
    ├── Hero Score Ring (large SVG donut, count-up center number)
    │   └── Contextual encouragement message
    ├── Stat Ribbon (4 cards, count-up numbers, staggered fade-in)
    ├── Module Comparison (2 SVG rings: R&W + Math, side by side)
    ├── Score Progression (animated bar chart)
    ├── Category Mastery Grid (cards with mini ring gauges)
    ├── Difficulty Breakdown (3 animated horizontal bars)
    ├── Strong / Weak Areas (icon lists with green/amber styling)
    ├── Test History Table (score color pills, module badges)
    └── Motivational CTA Footer
```

## Key Implementation Details

### Count-Up Hook
```typescript
function useCountUp(target: number, duration: number = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return value
}
```

### SVG Ring Gauge
- ViewBox 0 0 120 120, circle r=52, cx/cy=60
- `stroke-dasharray` = circumference (2πr ≈ 327)
- `stroke-dashoffset` transitions from circumference → `circumference * (1 - percentage/100)`
- CSS transition: `stroke-dashoffset 1.5s ease-out`

### Score Bracket Messages
| SAT Range | Message | Color |
|-----------|---------|-------|
| 1400+ | "Outstanding! You're in elite territory!" | emerald |
| 1200–1399 | "Great job! You're above average!" | blue |
| 1000–1199 | "Solid progress! Keep pushing!" | amber |
| <1000 | "You're building a foundation — keep going!" | purple |

### Color Coding for Percentages
| Range | Color | Meaning |
|-------|-------|---------|
| ≥75% | green-500 | Strong |
| 60–74% | amber-500 | Developing |
| <60% | rose-500 | Needs focus |

### Staggered Fade-in
Cards use inline `animation-delay` with a shared `@keyframes fadeSlideUp` that translates Y from 20px→0 and opacity 0→1.

## Empty State Design

- Background: subtle gradient with 6 floating dots (absolute, `animate-ping` or `animate-pulse` with varied delays)
- Center: Large icon (TrendingUp) in a pulsing gradient circle
- Headline: "Your SAT Journey Starts Here"
- Subtext: Encouraging paragraph
- 3 cards in a row: "Track Your Growth", "Find Your Strengths", "Boost Your Score" — each with an icon and 1-line description, stagger fade-in
- CTA: "Take Your First Practice Test" button with animated gradient shadow

## Testing

- Verify page loads with no data → shows encouraging empty state
- Verify page loads with data → all animations play smoothly
- Verify percentages display correctly for all metrics
- Verify mobile responsiveness (stack to single column)
- Build succeeds with no TypeScript errors
