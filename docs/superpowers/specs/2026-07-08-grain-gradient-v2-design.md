# grain-gradient v2 migration design

## Goal

Update `grain-gradient` from `^1.2.0` to `^2.0.0` while preserving current color palettes. Page-wide background must keep animating. Non-color tuning should move to v2 defaults wherever possible.

## Current usage

- `package.json` depends on `grain-gradient` `^1.2.0` and Bun lockfile records same dependency.
- `src/components/portfolio/PortfolioShell.tsx` uses `WebGLGrainGradient` from `grain-gradient/webgl/react` for the full-page background.
- `src/components/portfolio/SocialCards.tsx` uses `GrainGradient` from `grain-gradient/react` for card backgrounds.

## v2 API constraints

`grain-gradient` v2 is WebGL-only. CSS/SVG generation and Android/canvas fallback helpers are removed. Existing v1 props such as `androidCanvasFallback`, `androidCanvasFallbackUserAgent`, `numOctaves`, `blur`, `size`, and `stitchTiles` should be removed. The React import `grain-gradient/react` remains available. The compatibility path `grain-gradient/webgl/react` remains exported, but the preferred v2 API is `GrainGradient` from `grain-gradient/react`.

## Migration approach

Use the v2 React component everywhere.

1. Update dependency metadata:
   - `package.json`: set `grain-gradient` to `^2.0.0`.
   - `bun.lock`: regenerate with Bun so it records v2 package resolution.
2. Full-page background (`PortfolioShell.tsx`):
   - Replace `WebGLGrainGradient` import and JSX tag with `GrainGradient` from `grain-gradient/react`.
     - Preserve current `baseColor` and `colors` exactly.
     - Keep `motionPreset="orbit"` and `motionSpeed={1}` as the minimal explicit non-default animation trigger for the page background.
     - Do not keep `motionIntensity`; let v2 defaults control animation intensity.
     - Remove other hand-tuned values so v2 defaults apply.
   - Remove Android fallback props.
3. Card backgrounds (`SocialCards.tsx`):
   - Keep existing `GrainGradient` import.
   - Preserve each card `baseColor` and `colors` exactly.
   - Remove non-color tuning from gradient definitions and defaults so v2 defaults apply.
   - Remove removed v1 props from the component call.
   - Simplify `CardGradient` type to match remaining data.

## Expected behavior

- Same color palettes remain visible on page background and social cards.
- Full-page background animates after migration.
- Cards use v2 default grain/gradient behavior except their existing colors.
- Build and typecheck pass against `grain-gradient` v2 types.

## Verification

Run:

- `bun run typecheck`
- `bun run build`

If formatting or lint changes are triggered, run the relevant project checks before completion.
