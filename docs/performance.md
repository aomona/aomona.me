# Portfolio performance investigation

Measured on 2026-09-30 against `b46ae0e`, using local Next.js 16.2.6 production
builds, headless Chromium, DPR 2, and 1440×1000 / 390×844 viewports.

## Library implementation findings

- **grain-gradient 1.2.0:** `dist/webgl.js` sizes the drawing buffer from the
  canvas's bounding rectangle and the pixel-ratio cap. The old wrapper included
  the entire page, so a mobile canvas rendered below-the-fold content every frame.
  A fixed background limits it to the viewport. The existing 30 FPS / 0.75 motion
  pixel-ratio caps and hidden-document guard remain in use.
- **grain-gradient 1.2.0:** `dist/core.js` generates SVG `feTurbulence` at the
  requested tile dimensions, then repeats the tile at its intrinsic CSS size.
  The default page texture was 3200×2200; nine cards used 1100×1100 each.
  Stitched 512×512 tiles retain the grain frequency, octave count, seed and
  contrast while reducing nominal SVG filter area. Stitching can slightly alter
  the exact noise pattern. This is a tile-area measurement, not GPU-memory usage.
- **grain-gradient 1.2.0:** the WebGL animation loop does not read the reduced-motion
  preference. Updating `motionPreset` to `none` cancels its animation loop. The
  new background subscribes to preference changes, starting static until hydrated.
  Android Chrome still uses the library's existing 1024×1024 canvas/PNG fallback;
  the SVG tile reduction does not apply to that path.
- **Next.js 16.2.6 / React 19.2.6:** awaiting every profile fetch in `Home` blocked
  the whole page. Fetches still start together, but only the cards await the
  promise inside `Suspense`. The server-rendered shell and hero can stream first,
  with transparent spacers reserving the card layout without flashing empty frames.
  The Spotify subscription now belongs to the
  card subtree, so its updates do not rerender the background or hero.
- **Next.js image implementation:** `get-img-props.js` bypasses responsive image
  generation when global `unoptimized` is enabled. Removing it enables resizing
  and WebP for the avatar and PNG logo; SVGs remain automatically unoptimized.
  Album art explicitly retains the original proxy URL so display and canvas color
  extraction share the browser cache instead of requesting two representations.
- **next/font:** Geist Mono was preloaded despite no `font-mono` usage. Removing
  that font saves one request. GSAP and the existing gradient library stay installed;
  no dependency upgrade or additional runtime package is needed.

Sources: the installed package files above, bundled Next.js guides in
`node_modules/next/dist/docs/`, [grain-gradient documentation](https://github.com/aomona/grain-gradient),
[Next.js streaming guidance](https://nextjs.org/docs/app/getting-started/fetching-data#with-suspense),
and [Image component documentation](https://nextjs.org/docs/app/api-reference/components/image).
The installed version's source was used for implementation details; upstream main
may describe a newer release.

## Before / after

| Measurement                                         |                    Before |                             After |
| --------------------------------------------------- | ------------------------: | --------------------------------: |
| Mobile WebGL drawing buffer                         | 293×1385 = 405,805 pixels | 293×633 = 185,469 pixels (−54.3%) |
| Desktop WebGL drawing buffer                        |                  1080×750 |                          1080×750 |
| Ten SVG grain tiles, total intrinsic area           |         17,930,000 pixels |         2,621,440 pixels (−85.4%) |
| Font response bodies                                | 52,396 bytes / 2 requests |          29,288 bytes / 1 request |
| Spotify logo response body                          |          24,349 bytes PNG |         2,564 bytes WebP (−89.5%) |
| Avatar response body                                |           9,659 bytes PNG |         2,170 bytes WebP (−77.5%) |
| JavaScript response bodies                          |             196,036 bytes |                     196,059 bytes |
| Layout shift score in observed desktop/mobile loads |                         0 |                                 0 |

Image/font/JS values are encoded response-body sizes, excluding headers. Avatar
original size was measured separately because cross-origin Resource Timing hides
its response size. API data and image caches were warmed between runs; therefore
these runs do not establish a production TTFB/LCP improvement or a Lighthouse score.
First-use image optimization also performs server work before its result is cached.

## Verification

`bun run check` includes lint, type-aware lint, formatting, tsgo, 17 regression
tests, and a production build. The streaming test holds all profile results
pending, checks that hero and accessible loading text arrive without visible card
frames, then resolves
the results and checks that cards arrive. The existing 16 JMA regressions remain.

Browser checks covered desktop, mobile, Android Chrome UA fallback, reduced motion
(including changing the setting while open), and unavailable WebGL. Checks found
no page exceptions, broken loaded images, or horizontal overflow. WebGL draw calls
stopped under reduced motion and resumed when the preference changed. The canvas
stayed at viewport y=0 after scrolling. Desktop/mobile screenshots were inspected;
the mobile background now follows the viewport, so its composition during scrolling
differs from the former document-height gradient. Android checks used Chromium
emulation, not a physical Android device. Safari and production deployment remain
unverified.

To reproduce drawing-buffer and transfer measurements, run `bun run build` then
`bun run start`, use a fresh browser context at the viewport sizes above and DPR 2,
and inspect `canvas.width`, `canvas.height`, grain-layer `backgroundSize`, and the
Network panel after cards and album art settle. Scroll and switch the OS/browser
reduced-motion setting to verify background behavior.
