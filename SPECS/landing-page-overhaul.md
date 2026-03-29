# DuckSAT Landing Page Overhaul — Developer Spec

> **Goal:** Rebuild `src/app/page.tsx` (unauthenticated view) into a high-conversion landing page.  
> **Authenticated view** stays as-is (practice test dashboard).  
> **Stack:** Next.js 15 / React 18 / Tailwind v4 / Lucide icons / CSS animations (no framer-motion).  
> **Design tokens:** `src/styles/tokens.css` — use existing CSS vars. **Animations:** `src/styles/enhanced-ui.css`.

---

## Architecture Overview

```
src/app/page.tsx                         ← Orchestrator (conditionally renders landing vs dashboard)
src/components/landing/
  ├── HeroSection.tsx                    ← Section 1
  ├── SocialProofBar.tsx                 ← Reusable trust badges strip
  ├── HowItWorks.tsx                     ← Section 2 (3-step flow)
  ├── FeatureGrid.tsx                    ← Section 3 (2×3 grid)
  ├── WhyDuckSAT.tsx                     ← Section 4 (comparison table)
  ├── TestimonialCarousel.tsx            ← Section 5 (reusable, placed ×3)
  ├── PricingSection.tsx                 ← Section 6 (inline pricing w/ psychology)
  ├── ValueStack.tsx                     ← Section 7 (checklist)
  ├── GuaranteeSection.tsx               ← Section 8 (money-back badge)
  ├── UserSegmentation.tsx               ← Section 9 (who is this for)
  ├── UrgencyCTA.tsx                     ← Section 10 (countdown + final CTA)
  ├── LandingFooter.tsx                  ← Footer
  ├── CountdownTimer.tsx                 ← Reusable countdown widget
  └── ScrollReveal.tsx                   ← Wrapper for scroll-triggered animations
```

---

## Section-by-Section Spec

### 1. HeroSection.tsx

**File:** `src/components/landing/HeroSection.tsx`  
**Renders inside:** `src/app/page.tsx` (when `!session`)

#### Layout
```
┌──────────────────────────────────────────────────────┐
│  [badge] "AI-Powered SAT Prep"                       │
│                                                      │
│  Increase Your SAT Score                             │
│  by 150+ Points                    (gradient text)   │
│                                                      │
│  AI-powered SAT prep that adapts to how you learn.   │
│  Personalized practice. Real score improvement.      │
│                                                      │
│  [ Start Free ]  [ See How It Works ↓ ]              │
│                                                      │
│  ●●● "500+ students"  ★ "Avg +120 improvement"      │
│       "5,400+ questions"                             │
└──────────────────────────────────────────────────────┘
```

#### Implementation Details
- **Headline:** `text-5xl sm:text-6xl lg:text-7xl font-extrabold`  
  Text: "Increase Your SAT Score by" + gradient span "150+ Points"
- **Subtext:** `text-xl sm:text-2xl text-gray-600 max-w-3xl`
- **Primary CTA:** `<Button variant="primary" size="lg">` → calls `signIn("google")`  
  Label: "Start Free" with `ArrowRight` icon, glow animation on hover (`animate-glow` from enhanced-ui.css)
- **Secondary CTA:** `<Button variant="outline" size="lg">` → smooth-scrolls to `#how-it-works`  
  Label: "See How It Works"
- **Trust badges:** `<SocialProofBar />` — 3 inline badges:
  - `Users` icon + "500+ Students"
  - `TrendingUp` icon + "Avg +120 Score Improvement"  
  - `BookOpen` icon + "5,400+ Questions"
- **Background:** Keep existing gradient `from-blue-50 via-indigo-50 to-purple-50`
- **Animation:** Headline fades in with `animate-slide-in-up` (existing keyframe), staggered 200ms for subtext, 400ms for CTAs

#### Props
```typescript
interface HeroSectionProps {
  onGetStarted: () => void  // signIn("google")
}
```

---

### 2. SocialProofBar.tsx

**File:** `src/components/landing/SocialProofBar.tsx`

#### Implementation
```typescript
interface SocialProofBarProps {
  variant?: 'light' | 'dark'  // dark for use on colored backgrounds
  className?: string
}
```

- Horizontal flex row, centered, `gap-8`
- Each badge: icon (20px) + text (`text-sm font-semibold`)
- `light` variant: `text-gray-600` on white  
- `dark` variant: `text-white/80` on dark backgrounds
- Reused in: HeroSection, before PricingSection, footer

---

### 3. HowItWorks.tsx

**File:** `src/components/landing/HowItWorks.tsx`  
**Anchor:** `id="how-it-works"`

#### Layout
```
┌──────────────────────────────────────────────────────┐
│  How DuckSAT Works                                   │
│  "Three steps to your target score"                  │
│                                                      │
│  ┌──────┐    ┌──────────┐    ┌─────────┐            │
│  │  1   │───▶│    2     │───▶│   3     │            │
│  │ Learn│    │ Practice │    │ Improve │            │
│  │      │    │          │    │         │            │
│  │AI les│    │Adaptive  │    │Personal │            │
│  │sons +│    │questions │    │feedback │            │
│  │expla │    │that match│    │+ weak-  │            │
│  │nation│    │your level│    │ness det │            │
│  └──────┘    └──────────┘    └─────────┘            │
└──────────────────────────────────────────────────────┘
```

#### Implementation Details
- Section heading: `text-3xl sm:text-4xl font-bold` centered
- 3 cards in `grid grid-cols-1 md:grid-cols-3 gap-8`
- Each card: `bg-white rounded-2xl p-8 shadow-lg border`
  - Step number in gradient circle (`w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold`)
  - Icon: `Brain` / `Target` / `TrendingUp` from lucide-react
  - Title: `text-xl font-bold`
  - Description: `text-gray-600`
- **Connecting line:** SVG or CSS pseudo-element dashed line between cards (hidden on mobile)
- **Animation:** Cards use `ScrollReveal` wrapper — fade-in-up staggered by 150ms each

---

### 4. FeatureGrid.tsx

**File:** `src/components/landing/FeatureGrid.tsx`

#### Layout
```
┌──────────────────────────────────────────────────────┐
│  Everything You Get                                  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ 2000+    │  │ AI       │  │ Full     │          │
│  │ Questions│  │ Explain  │  │ Practice │          │
│  └──────────┘  └──────────┘  │ Tests    │          │
│  ┌──────────┐  ┌──────────┐  └──────────┘          │
│  │ Progress │  │ Adaptive │  ┌──────────┐          │
│  │ Tracking │  │ Learning │  │ Study    │          │
│  └──────────┘  └──────────┘  │ Plan     │          │
│                              └──────────┘          │
└──────────────────────────────────────────────────────┘
```

#### Implementation Details
- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`
- 6 feature cards, each:
  - `bg-white rounded-xl p-6 shadow border hover:shadow-xl hover:scale-[1.03] transition-all duration-300`  
  - Gradient icon container (48px, rounded-lg)
  - **Bold number** or metric (e.g., "2,000+") in `text-2xl font-bold`
  - Title in `text-lg font-semibold`
  - 1-line description in `text-sm text-gray-600`
- **Cards data:**

| # | Icon | Metric | Title | Description |
|---|------|--------|-------|-------------|
| 1 | `BookOpen` | 2,000+ | SAT Questions | Covering every topic on the Digital SAT |
| 2 | `Brain` | Instant | AI Explanations | Step-by-step breakdowns for every question |
| 3 | `ClipboardList` | 6 | Full Practice Tests | Timed, full-length tests matching the real exam |
| 4 | `BarChart3` | Real-time | Progress Tracking | See your strengths and weaknesses at a glance |
| 5 | `Target` | Adaptive | Smart Practice | Questions that adjust to your skill level |
| 6 | `GraduationCap` | Custom | Study Plan | Personalized path to your target score |

- **Animation:** `ScrollReveal` with stagger, hover lifts cards

---

### 5. WhyDuckSAT.tsx

**File:** `src/components/landing/WhyDuckSAT.tsx`

#### Layout
```
┌──────────────────────────────────────────────────────┐
│  Why DuckSAT Works                                   │
│                                                      │
│  ┌─────────────────┐    ┌─────────────────┐         │
│  │ Traditional Prep│    │    DuckSAT      │         │
│  │                 │    │                 │         │
│  │ ❌ Passive video│    │ ✅ Active learn │         │
│  │ ❌ One-size     │    │ ✅ Adapts to you│         │
│  │ ❌ No feedback  │    │ ✅ AI explains  │         │
│  │ ❌ Boring       │    │ ✅ Gamified     │         │
│  │ ❌ Expensive    │    │ ✅ Affordable   │         │
│  └─────────────────┘    └─────────────────┘         │
└──────────────────────────────────────────────────────┘
```

#### Implementation Details
- Two-column layout: `grid grid-cols-1 md:grid-cols-2 gap-8`
- **Left card** (problem): `bg-red-50 border-red-200 rounded-2xl p-8`
  - Header: "Traditional SAT Prep" in `text-red-800 font-bold`
  - List of 5 items with `X` icon in red
- **Right card** (solution): `bg-green-50 border-green-200 rounded-2xl p-8`
  - Header: "DuckSAT" in `text-green-800 font-bold`
  - List of 5 items with `Check` icon in green
- **Comparison rows:**
  1. Passive video lectures → Active practice with instant feedback
  2. One-size-fits-all → Adapts to your skill level
  3. No detailed feedback → AI-powered explanations for every question
  4. Boring and repetitive → Engaging and goal-oriented
  5. $100+/hour tutoring → Less than $6/hour

---

### 6. TestimonialCarousel.tsx

**File:** `src/components/landing/TestimonialCarousel.tsx`

#### Implementation
```typescript
interface Testimonial {
  name: string
  scoreBefore: number
  scoreAfter: number
  quote: string
  role: 'student' | 'parent'
  verified: boolean
}

interface TestimonialCarouselProps {
  testimonials?: Testimonial[]
  variant?: 'compact' | 'full'  // compact = single row, full = multi-card
  className?: string
}
```

#### Default Testimonials Data (hardcoded for now)
```typescript
const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { name: "Sarah M.", scoreBefore: 1180, scoreAfter: 1380, quote: "The adaptive practice made all the difference. I could feel myself improving every week.", role: "student", verified: true },
  { name: "James K.", scoreBefore: 1340, scoreAfter: 1480, quote: "The AI explanations helped me understand concepts I'd been struggling with for months.", role: "student", verified: true },
  { name: "Maria T.", scoreBefore: 1050, scoreAfter: 1250, quote: "My daughter went from dreading SAT prep to actually looking forward to her daily practice.", role: "parent", verified: true },
  { name: "David L.", scoreBefore: 1400, scoreAfter: 1540, quote: "Better than any tutor I've tried. The questions feel just like the real test.", role: "student", verified: true },
  { name: "Priya R.", scoreBefore: 1220, scoreAfter: 1410, quote: "I improved 190 points in just 8 weeks. The personalized study plan kept me on track.", role: "student", verified: true },
  { name: "Tom W.", scoreBefore: 1100, scoreAfter: 1300, quote: "As a parent, I love that I can see exactly how my son is progressing. Worth every penny.", role: "parent", verified: true },
]
```

#### Carousel Behavior
- Auto-scrolls every 5 seconds
- Pause on hover
- Manual left/right arrows (`ChevronLeft` / `ChevronRight`)
- Dot indicators at bottom
- Cards show:
  - Name + verified badge (`ShieldCheck` icon, blue)
  - Score: `1180 → 1380` in bold with green `+200` badge
  - Quote in `text-gray-600 italic`
  - Role tag: "Student" or "Parent"
- CSS `overflow-x: auto; scroll-snap-type: x mandatory;` for smooth scrolling
- No JS carousel library — pure CSS scroll-snap + `setInterval`

#### Placement
Used in 3 locations with different `variant`:
1. Below HeroSection — `variant="compact"` (single scrolling row)
2. Below WhyDuckSAT — `variant="full"` (3-card grid on desktop)
3. Below PricingSection — `variant="compact"`

---

### 7. PricingSection.tsx

**File:** `src/components/landing/PricingSection.tsx`

#### Layout
```
┌──────────────────────────────────────────────────────┐
│  Simple, Transparent Pricing                         │
│                                                      │
│  ┌─────────┐  ┌══════════════┐  ┌─────────┐        │
│  │  Free   │  ║   Monthly    ║  │  Yearly │        │
│  │  $0     │  ║ ̶$̶4̶7̶0̶  $297  ║  │  $250  │        │
│  │         │  ║ SAVE $173    ║  │ Best Val│        │
│  │ 1 test  │  ║ < $6/hour    ║  │ Save $50│        │
│  │ 3 drill │  ║              ║  │         │        │
│  │         │  ║ [March Sale] ║  │         │        │
│  │[Start]  │  ║ ⏰ 48:00:00  ║  │[Start]  │        │
│  └─────────┘  ╚══════════════╝  └─────────┘        │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │ Compare: Tutor $100/hr │ Competitor $400+│       │
│  │          DuckSAT $297  │ ✅ Best value   │       │
│  └──────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

#### Implementation Details
- **Reuses Stripe checkout logic** from existing `src/app/pricing/page.tsx`
- 3-tier card layout (same structure as existing pricing page)
- **Monthly card** is "featured" — double border, `ring-2 ring-indigo-500`, slight scale `scale-[1.05]`
- **Pricing psychology (Monthly card):**
  - Original price: `<span className="line-through text-gray-400 text-lg">$470</span>`
  - Current price: `<span className="text-4xl font-extrabold text-gray-900">$297</span>`
  - Savings badge: `<span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">SAVE $173</span>`
  - Microcopy: `"Less than $6/hour of prep"` in `text-sm text-gray-500`
  - Urgency: `<CountdownTimer />` component
  - Sale badge: `"March Sale"` floating badge top-right, `bg-red-500 text-white`
- **Comparison row** below cards:
  - `bg-gray-50 rounded-xl p-6`
  - 3-column: "Private Tutor: $100/hr" | "Online Courses: $400+" | "DuckSAT: $297 ✅"

#### Props
```typescript
interface PricingSectionProps {
  onCheckout: (plan: 'monthly' | 'yearly') => void
  onSignIn: () => void
  isAuthenticated: boolean
  currentPlan?: string
}
```

---

### 8. CountdownTimer.tsx

**File:** `src/components/landing/CountdownTimer.tsx`

#### Implementation
```typescript
interface CountdownTimerProps {
  endDate?: Date          // defaults to end of current month
  label?: string          // "March Sale ends in"
  className?: string
}
```

- Uses `useState` + `useEffect` with `setInterval(1000)`
- Displays: `DD : HH : MM : SS` in monospace font
- Each unit in its own box: `bg-gray-900 text-white rounded-lg px-3 py-2 text-xl font-bold font-mono`
- Separators: `:` in `text-gray-400`
- When expired: shows "Sale ended" text
- **No SSR issues:** render `--:--:--:--` on server, hydrate on client with `useEffect`

---

### 9. ValueStack.tsx

**File:** `src/components/landing/ValueStack.tsx`

#### Layout
```
┌──────────────────────────────────────────────────────┐
│  Everything You Get with DuckSAT                     │
│                                                      │
│  ✅ 2,000+ SAT Practice Questions                    │
│  ✅ AI-Powered Explanations for Every Question       │
│  ✅ 6 Full-Length Practice Tests                     │
│  ✅ Personalized Study Plan                          │
│  ✅ Real-Time Progress Tracking                      │
│  ✅ Adaptive Difficulty System                       │
│  ✅ Detailed Score Analytics                         │
│  ✅ Topic-Specific Drills                            │
│  ✅ Mobile-Friendly Interface                        │
│  ✅ New Questions Added Weekly                       │
│                                                      │
│  Total Value: ̶$̶9̶9̶7̶  → Yours for $297              │
└──────────────────────────────────────────────────────┘
```

#### Implementation Details
- `max-w-2xl mx-auto`
- Each item: `flex items-center gap-3 py-3 border-b border-gray-100`
  - `CheckCircle2` icon in `text-green-500 w-6 h-6`
  - Text in `text-lg text-gray-800`
- Bottom: value anchoring line with crossed-out total + actual price
- `ScrollReveal` — items animate in sequentially (50ms stagger)

---

### 10. GuaranteeSection.tsx

**File:** `src/components/landing/GuaranteeSection.tsx`

#### Layout
```
┌──────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────┐          │
│  │  🛡️  Score Improvement Guarantee       │          │
│  │                                        │          │
│  │  Improve your score or get a full      │          │
│  │  refund. No questions asked.           │          │
│  │                                        │          │
│  │  [See terms]                           │          │
│  └────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────┘
```

#### Implementation Details
- Centered card: `bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-green-200 rounded-2xl p-8 max-w-xl mx-auto text-center`
- Shield icon: `Shield` from lucide, `w-16 h-16 text-green-600 mx-auto`
- Headline: `text-2xl font-bold text-gray-900`
- Subtext: `text-gray-600`
- Terms link: `text-sm text-green-600 underline` — opens modal or links to `/terms`

---

### 11. UserSegmentation.tsx

**File:** `src/components/landing/UserSegmentation.tsx`

#### Layout
```
┌──────────────────────────────────────────────────────┐
│  Who Is DuckSAT For?                                 │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ 🎯       │  │ 📊       │  │ 🔄       │          │
│  │ Just     │  │ Already  │  │ Retaking │          │
│  │ Starting │  │ Studying │  │ the SAT  │          │
│  │          │  │          │  │          │          │
│  │"Build a  │  │"Break    │  │"Target   │          │
│  │ strong   │  │ through  │  │ your     │          │
│  │ foundat" │  │ plateau" │  │ weak spots│         │
│  └──────────┘  └──────────┘  └──────────┘          │
└──────────────────────────────────────────────────────┘
```

#### Implementation Details
- 3-card grid: `grid grid-cols-1 md:grid-cols-3 gap-8`
- Cards:

| # | Icon | Title | Message |
|---|------|-------|---------|
| 1 | `BookOpen` | Just Starting | Build a strong foundation with structured lessons and adaptive practice that meets you where you are. |
| 2 | `BarChart3` | Already Studying | Break through your score plateau with AI-powered weakness detection and targeted drills. |
| 3 | `RefreshCcw` | Retaking the SAT | Focus on your specific weak areas with precision practice and watch your score climb. |

- Each card: `bg-white rounded-2xl p-8 shadow-lg border text-center hover:shadow-xl transition`
- Icon in gradient circle (same style as HowItWorks)

---

### 12. UrgencyCTA.tsx

**File:** `src/components/landing/UrgencyCTA.tsx`

#### Layout
```
┌──────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────┐  │
│  │  bg-gradient-to-br indigo → purple             │  │
│  │                                                │  │
│  │  Ready to Hit Your Target Score?               │  │
│  │                                                │  │
│  │  Join 500+ students already improving.         │  │
│  │  March Sale ends in: ⏰ 02:14:33:07            │  │
│  │                                                │  │
│  │  [ Start Free Now ]                            │  │
│  │                                                │  │
│  │  "No credit card required • Cancel anytime"    │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

#### Implementation Details
- Full-width gradient section: `bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-12 text-center text-white`
- Headline: `text-3xl sm:text-4xl font-extrabold text-white`
- `<CountdownTimer variant="dark" />`
- CTA button: `bg-white text-indigo-700 font-bold hover:bg-gray-100` (inverted)
- Trust line: `text-indigo-200 text-sm`

---

### 13. LandingFooter.tsx

**File:** `src/components/landing/LandingFooter.tsx`

Keep existing footer structure but add:
- `<SocialProofBar variant="light" />` above footer links
- Add Pricing link to nav

---

### 14. ScrollReveal.tsx

**File:** `src/components/landing/ScrollReveal.tsx`

#### Implementation
```typescript
interface ScrollRevealProps {
  children: React.ReactNode
  delay?: number           // ms delay before animation starts
  className?: string
  direction?: 'up' | 'left' | 'right' | 'fade'  // animation direction
}
```

- Uses `IntersectionObserver` (no external lib)
- Initial state: `opacity-0 translate-y-8` (for `up`)
- When intersecting: transitions to `opacity-100 translate-y-0`
- `threshold: 0.1`, `triggerOnce: true` (via `observer.unobserve`)
- Transition: `transition-all duration-700 ease-out`

---

## Page Assembly (src/app/page.tsx)

```tsx
// Unauthenticated flow (landing page):
<div>
  <HeroSection onGetStarted={() => signIn("google")} />
  <TestimonialCarousel variant="compact" />
  <HowItWorks />                                       {/* id="how-it-works" */}
  <FeatureGrid />
  <WhyDuckSAT />
  <TestimonialCarousel variant="full" />
  <PricingSection ... />
  <TestimonialCarousel variant="compact" />
  <ValueStack />
  <GuaranteeSection />
  <UserSegmentation />
  <UrgencyCTA onGetStarted={() => signIn("google")} />
  <LandingFooter />
</div>

// Authenticated flow (existing dashboard — unchanged):
<div>
  {/* existing practice test cards, random practice, etc. */}
</div>
```

---

## New CSS Additions (src/styles/enhanced-ui.css)

```css
/* Scroll reveal base state */
.scroll-reveal {
  opacity: 0;
  transform: translateY(2rem);
  transition: opacity 0.7s ease-out, transform 0.7s ease-out;
}
.scroll-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
.scroll-reveal-left {
  opacity: 0;
  transform: translateX(-2rem);
  transition: opacity 0.7s ease-out, transform 0.7s ease-out;
}
.scroll-reveal-left.visible {
  opacity: 1;
  transform: translateX(0);
}

/* Countdown timer digits */
.countdown-digit {
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
}

/* Testimonial carousel scroll-snap */
.testimonial-track {
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.testimonial-card {
  scroll-snap-align: start;
  flex-shrink: 0;
}

/* Comparison table strikethrough */
.price-original {
  text-decoration: line-through;
  text-decoration-color: var(--color-error);
  text-decoration-thickness: 2px;
}

/* Pulsing CTA glow */
.cta-glow {
  animation: glow 2s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
}
.cta-glow:hover {
  animation: none;
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.6);
}
```

---

## Dark Mode Considerations

All new components must respect the existing `[data-theme="dark"]` system:
- Use `bg-white` → auto-overridden by `globals.css` dark rules
- Use `text-gray-900` / `text-gray-600` → auto-overridden
- Gradient backgrounds: add dark variants in `globals.css` if needed
- Test both themes before shipping

---

## Dependencies

**No new npm packages.** Everything uses:
- `lucide-react` (icons)
- `tailwindcss` v4 (styling)
- `class-variance-authority` + `tailwind-merge` (component variants)
- `IntersectionObserver` API (scroll animations — native browser)
- `setInterval` (countdown timer — native)

---

## File Creation Order (Build Sequence)

1. `ScrollReveal.tsx` — needed by most sections
2. `CountdownTimer.tsx` — needed by Pricing + UrgencyCTA
3. `SocialProofBar.tsx` — needed by Hero + UrgencyCTA
4. `HeroSection.tsx`
5. `TestimonialCarousel.tsx`
6. `HowItWorks.tsx`
7. `FeatureGrid.tsx`
8. `WhyDuckSAT.tsx`
9. `PricingSection.tsx`
10. `ValueStack.tsx`
11. `GuaranteeSection.tsx`
12. `UserSegmentation.tsx`
13. `UrgencyCTA.tsx`
14. `LandingFooter.tsx`
15. Update `src/styles/enhanced-ui.css`
16. Update `src/app/page.tsx` — assemble all sections

---

## Pricing Data Constants

Create `src/constants/pricing.ts`:
```typescript
export const PRICING = {
  monthly: {
    original: 470,
    current: 297,
    savings: 173,
    perHour: 5.94,
    stripePlan: 'monthly' as const,
  },
  yearly: {
    original: 300,
    current: 250,
    savings: 50,
    perMonth: 20.83,
    stripePlan: 'yearly' as const,
  },
  competitors: {
    privateTutor: 100,  // per hour
    onlineCourse: 400,
  },
} as const

export const SALE = {
  name: 'March Sale',
  // End of current month
  getEndDate: () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  },
} as const
```

---

## Testimonials Data

Create `src/constants/testimonials.ts`:
```typescript
export interface Testimonial {
  name: string
  scoreBefore: number
  scoreAfter: number
  quote: string
  role: 'student' | 'parent'
  verified: boolean
}

export const TESTIMONIALS: Testimonial[] = [
  { name: "Sarah M.", scoreBefore: 1180, scoreAfter: 1380, quote: "The adaptive practice made all the difference. I could feel myself improving every week.", role: "student", verified: true },
  { name: "James K.", scoreBefore: 1340, scoreAfter: 1480, quote: "The AI explanations helped me understand concepts I'd been struggling with for months.", role: "student", verified: true },
  { name: "Maria T.", scoreBefore: 1050, scoreAfter: 1250, quote: "My daughter went from dreading SAT prep to actually looking forward to her daily practice.", role: "parent", verified: true },
  { name: "David L.", scoreBefore: 1400, scoreAfter: 1540, quote: "Better than any tutor I've tried. The questions feel just like the real test.", role: "student", verified: true },
  { name: "Priya R.", scoreBefore: 1220, scoreAfter: 1410, quote: "I improved 190 points in just 8 weeks. The personalized study plan kept me on track.", role: "student", verified: true },
  { name: "Tom W.", scoreBefore: 1100, scoreAfter: 1300, quote: "As a parent, I love seeing exactly how my son is progressing. Worth every penny.", role: "parent", verified: true },
]
```

---

## QA Checklist

- [ ] All sections render on mobile (320px), tablet (768px), desktop (1280px)
- [ ] Dark mode: every section looks correct with `[data-theme="dark"]`
- [ ] CTAs all trigger `signIn("google")` when unauthenticated
- [ ] Smooth scroll to `#how-it-works` works
- [ ] Countdown timer doesn't cause hydration mismatch
- [ ] Testimonial carousel auto-scrolls and pauses on hover
- [ ] Stripe checkout still works from inline pricing section
- [ ] Existing authenticated dashboard view is unmodified
- [ ] Page loads fast (no layout shift, images optimized)
- [ ] Accessibility: all interactive elements focusable, proper headings hierarchy
