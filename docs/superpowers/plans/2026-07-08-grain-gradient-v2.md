# grain-gradient v2 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `grain-gradient` to v2 while preserving all current colors, keeping the page background animated, and letting non-color settings use v2 defaults.

**Architecture:** Keep the existing portfolio component structure. Migrate full-page and card gradient calls to the v2 React API, remove v1-only props, and regenerate Bun dependency metadata. No new runtime abstraction is needed.

**Tech Stack:** Next.js 16, React 19, TypeScript, Bun, `grain-gradient` v2, GSAP.

---

## File structure

- Modify `package.json`: change `grain-gradient` dependency from `^1.2.0` to `^2.0.0`.
- Modify `bun.lock`: regenerate with `bun install` after package update.
- Modify `src/app/page.tsx`: keep `export const dynamic = "force-dynamic";`, stop fetching/threading `userAgent` to `PortfolioPage`.
- Modify `src/components/portfolio/PortfolioPage.tsx`: remove `userAgent` prop and stop passing it to `PortfolioShell`.
- Modify `src/components/portfolio/PortfolioShell.tsx`: use `GrainGradient` from `grain-gradient/react`, preserve page colors, keep `motionPreset="orbit"` and `motionSpeed={1}` as the minimal explicit animation trigger, remove v1 and other tuning props, stop passing `userAgent` to `SocialCards`.
- Modify `src/components/portfolio/SocialCards.tsx`: simplify `CardGradient` to color data only, remove card grain defaults and non-color gradient tuning, keep card colors unchanged, remove v1-only fallback props from `GrainGradient`, remove `userAgent` from component interfaces.
- No new files.

## Task 1: Update dependency metadata

**Files:**

- Modify: `package.json:17-24`
- Modify: `bun.lock`

- [ ] **Step 1: Change package version**

Edit `package.json` dependency block so `grain-gradient` reads:

```json
  "dependencies": {
    "@gsap/react": "^2.1.2",
    "grain-gradient": "^2.0.0",
    "gsap": "^3.15.0",
    "lucide-react": "^1.16.0",
    "next": "16.2.6",
    "react": "19.2.6",
    "react-dom": "19.2.6"
  }
```

- [ ] **Step 2: Regenerate Bun lockfile**

Run:

```bash
bun install
```

Expected:

- Command exits `0`.
- `bun.lock` records workspace dependency `"grain-gradient": "^2.0.0"`.
- `bun.lock` package entry resolves `grain-gradient@2.0.0`.

- [ ] **Step 3: Inspect dependency diff**

Run:

```bash
git diff -- package.json bun.lock
```

Expected:

- Only `grain-gradient` version and lockfile resolution changes for this dependency.
- No unrelated dependency upgrades.

## Task 2: Migrate full-page background component

**Files:**

- Modify: `src/components/portfolio/PortfolioShell.tsx:1-67`

- [ ] **Step 1: Replace component import**

Change:

```tsx
import { WebGLGrainGradient } from "grain-gradient/webgl/react";
```

to:

```tsx
import { GrainGradient } from "grain-gradient/react";
```

- [ ] **Step 2: Replace full-page JSX wrapper**

Replace the full `return` wrapper with this code:

```tsx
return (
  <GrainGradient
    className="min-h-dvh text-white"
    baseColor="#031a58"
    colors={["#003fa6", "#0078e6", "#16b4eb", "#05388d", "#67c7f4"]}
    motionPreset="orbit"
    motionSpeed={1}
  >
    <div className="relative z-10 min-h-dvh">
      <main className="flex min-h-dvh items-center justify-center px-6 pt-[104px] pb-8 sm:px-10 lg:px-16">
        <div className="flex w-full max-w-[1312px] flex-col items-center gap-10 min-[1141px]:h-[calc(100dvh-40px)] min-[1141px]:flex-row">
          <HeroIntro />
          <SocialCards
            weather={weather}
            githubContributions={githubContributions}
            osuProfile={osuProfile}
            tetrioProfile={tetrioProfile}
            track={track}
            colors={colors}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  </GrainGradient>
);
```

This intentionally removes:

```tsx
androidCanvasFallback="auto"
androidCanvasFallbackUserAgent={userAgent}
opacity={0.23}
frequency={0.5}
numOctaves={4}
contrast={1.2}
blur={20}
saturation={1.32}
swirl={34}
motionSpeed={22}
motionIntensity={34}
maxPixelRatio={1.25}
motionMaxPixelRatio={0.75}
fps={30}
```

- [ ] **Step 3: Remove dead `userAgent` threading**

Remove `userAgent` from `PortfolioShell` props and stop passing it to `SocialCards`. The page-level `userAgent` fetch/threading is also removed from `src/app/page.tsx` and `src/components/portfolio/PortfolioPage.tsx` because grain-gradient v2 no longer needs Android fallback props.

Run:

```bash
bun run typecheck
```

Expected at this stage:

- It may still fail because `SocialCards.tsx` still contains v1-only props.
- It must not fail because `WebGLGrainGradient` is missing or because `userAgent` is unused in `PortfolioShell`.

## Task 3: Migrate card gradients to color-only v2 defaults

**Files:**

- Modify: `src/components/portfolio/SocialCards.tsx:23-313`

- [ ] **Step 1: Simplify `CardGradient` type**

Replace current `CardGradient` type with:

```tsx
type CardGradient = {
  baseColor: string;
  colors: string[];
};
```

- [ ] **Step 2: Remove `cardGrainDefaults`**

Delete this block:

```tsx
const cardGrainDefaults = {
  numOctaves: 2,
  size: 1100,
  stitchTiles: true,
} satisfies Pick<CardGradient, "numOctaves" | "size" | "stitchTiles">;
```

- [ ] **Step 3: Replace `gradients` object with color-only data**

Replace `const gradients = { ... } satisfies Record<string, CardGradient>;` with:

```tsx
const gradients = {
  github: {
    baseColor: "#0d0d0d",
    colors: ["#050505", "#151515", "#3b3b3b", "#0a0a0a"],
  },
  discord: {
    baseColor: "#5865f2",
    colors: ["#5865f2", "#7c3aed", "#3b82f6", "#a78bfa"],
  },
  x: {
    baseColor: "#101010",
    colors: ["#050505", "#262626", "#4b4b4b", "#111111"],
  },
  player: {
    baseColor: "#132325",
    colors: ["#1e3a3a", "#455a5d", "#0b1416", "#2f4242"],
  },
  weather: {
    baseColor: "#101010",
    colors: ["#070707", "#242424", "#454545", "#101010"],
  },
  nostr: {
    baseColor: "#6d0bc5",
    colors: ["#f000b8", "#7c3aed", "#2f1a87", "#c500d6"],
  },
  osu: {
    baseColor: "#c83f79",
    colors: ["#ff6aa5", "#d9467c", "#9f2b5d", "#ffd1dc"],
  },
  tetrio: {
    baseColor: "#2d3ccf",
    colors: ["#5747df", "#2637c7", "#7c3aed", "#38bdf8"],
  },
  vrchat: {
    baseColor: "#d97706",
    colors: ["#f59e0b", "#facc15", "#b45309", "#fef3c7"],
  },
} satisfies Record<string, CardGradient>;
```

- [ ] **Step 4: Remove v1-only and default-overriding props from card `GrainGradient`**

Replace the opening card gradient JSX at `GlassCard` with:

```tsx
    <GrainGradient
      {...gradient}
      className={`${cardBase} ${className} ${onClick ? "cursor-pointer" : ""}`}
      style={{ backgroundColor: gradient.baseColor }}
    >
```

This intentionally removes:

```tsx
{...cardGrainDefaults}
androidCanvasFallback="auto"
androidCanvasFallbackUserAgent={userAgent}
```

- [ ] **Step 5: Remove `userAgent` from card interfaces**

Remove `userAgent` from `GlassCard`, `ServiceCard`, and the `SocialCards` prop interface. Because grain-gradient v2 removed the Android fallback props, `userAgent` is no longer needed anywhere in the card tree and should not produce an unused-binding lint warning.

## Task 4: Typecheck, lint, format, and build

**Files:**

- Verify: all modified files

- [ ] **Step 1: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected:

- Exit `0`.
- No TypeScript errors from `grain-gradient` props or imports.

- [ ] **Step 2: Run formatter check**

Run:

```bash
bun run format:check
```

Expected:

- Exit `0`.

If it fails, run:

```bash
bun run format
```

Then rerun:

```bash
bun run format:check
```

Expected after formatting:

- Exit `0`.

- [ ] **Step 3: Run lint**

Run:

```bash
bun run lint
```

Expected:

- Exit `0`.
- No unused `userAgent` binding remains; the prop was removed from `PortfolioShell`, `SocialCards`, `GlassCard`, and `ServiceCard` in Task 2 and Task 3.

- [ ] **Step 4: Run build**

Run:

```bash
bun run build
```

Expected:

- Exit `0`.
- No runtime build errors from Next.js or `grain-gradient` exports.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
git diff -- package.json bun.lock src/app/page.tsx src/components/portfolio/PortfolioPage.tsx src/components/portfolio/PortfolioShell.tsx src/components/portfolio/SocialCards.tsx docs/superpowers/specs/2026-07-08-grain-gradient-v2-design.md docs/superpowers/plans/2026-07-08-grain-gradient-v2.md
```

Expected:

- Dependency updated to `^2.0.0`.
- `src/app/page.tsx` keeps request-time rendering via `export const dynamic = "force-dynamic";`.
- `src/app/page.tsx`, `src/components/portfolio/PortfolioPage.tsx`, `src/components/portfolio/PortfolioShell.tsx`, and `src/components/portfolio/SocialCards.tsx` no longer thread `userAgent`.
- Page background colors unchanged.
- Page background keeps `motionPreset="orbit"` and `motionSpeed={1}`.
- Card colors unchanged.
- v1-only props removed.
- No unrelated edits.

## Task 5: Commit-ready review

**Files:**

- Verify: all modified files

- [ ] **Step 1: Check worktree status**

Run:

```bash
git status --short
```

Expected modified/added files:

```text
 M bun.lock
 M package.json
 M src/app/page.tsx
 M src/components/portfolio/PortfolioPage.tsx
 M src/components/portfolio/PortfolioShell.tsx
 M src/components/portfolio/SocialCards.tsx
 A docs/superpowers/specs/2026-07-08-grain-gradient-v2-design.md
 A docs/superpowers/plans/2026-07-08-grain-gradient-v2.md
```

- [ ] **Step 2: Do not commit unless explicitly requested**

The repository workflow requires explicit user permission before committing. If the user asks for a commit, run:

```bash
git diff
git log --oneline -10
git add package.json bun.lock src/app/page.tsx src/components/portfolio/PortfolioPage.tsx src/components/portfolio/PortfolioShell.tsx src/components/portfolio/SocialCards.tsx docs/superpowers/specs/2026-07-08-grain-gradient-v2-design.md docs/superpowers/plans/2026-07-08-grain-gradient-v2.md
git commit -m "chore: update grain-gradient to v2"
```

Expected:

- Commit succeeds.
- Commit contains only the listed files.

## Self-review

- Spec coverage: dependency update, full-page animation, color preservation, v2 defaults, removed v1 props, and verification are covered by Tasks 1-4.
- Placeholder scan: no `TBD`, `TODO`, or deferred implementation steps remain.
- Type consistency: `CardGradient` is color-only before the color-only `gradients` object and `GrainGradient` JSX spread are defined.
