# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # Type-check (tsc -b) then bundle for production
npm run lint         # Run ESLint on src/
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier-format src/
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
```

Run a single test file: `npx vitest run src/parser/__tests__/readVbo.test.ts`

## Architecture

The app is a browser-only VBO telemetry viewer/editor — all processing happens client-side, no backend. It has two pages, switched via an in-app tab in `App.tsx` (no router, so it works on GitHub Pages without SPA-fallback config): the **Editor** (merge laps, export) and the **Track Map** (preview laps on a satellite map, color-graded by speed/braking/cornering).

**Layer separation:**

1. **`src/parser/`** — pure TypeScript, zero React. `readVbo.ts` parses the VBO text format into `Session` objects; `lapDetector.ts` finds lap boundaries from GPS speed data; `writeVbo.ts` serializes back to VBO text.

2. **`src/editor/`** — pure TypeScript, no React or Leaflet runtime dependency (type-only imports only). `merge.ts` combines selected laps from multiple sessions into one; `export.ts` triggers a browser download; `validateSession.ts` checks whether sessions are from the same track (via start/finish line proximity); `colorScale.ts` maps a telemetry value to a heat-gradient color; `trackSegments.ts` builds the colored map polyline segments for the Track Map page.

3. **`src/hooks/`** — `useVboParser.ts` owns the Web Worker lifecycle and session-parsing state (sessions, progress, errors); shared by both pages via an optional `validateSession`/`onSessionAdded` callback so each page can customize accept/reject and post-add behavior without duplicating the worker plumbing.

4. **`src/components/` + `src/pages/`** — React UI. `Home.tsx` (Editor) and `TrackMap.tsx` (Track Map) each call `useVboParser` and own their own lap-selection state. Components are stateless presentational pieces, with `TrackMapView.tsx` (Leaflet map) and `ColorMetricToggle.tsx` (heat-mode switcher) specific to the map page.

**Web Worker (`src/worker/parser.worker.ts`)** — parsing is offloaded here to keep the UI unblocked. Message types: `parse` (input), `progress` / `result` / `error` (output back to main thread).

**Data flow (Editor):**

```
Drop .vbo files → FileDrop → useVboParser (Web Worker)
→ readVbo() + detectLaps() → Session[] posted back
→ SessionCard + LapList (checkbox selection)
→ Export → mergeLaps() → writeVbo() → browser download
```

**Data flow (Track Map):**

```
Drop .vbo files → FileDrop → useVboParser (Web Worker)
→ SessionCard + LapList (checkbox selection, multi-lap overlay)
→ buildTrackSegments() (editor/trackSegments.ts) → TrackMapView (Leaflet + Esri satellite tiles)
```

**Core data types** (`src/parser/types.ts`):
- `GpsSample` — one GPS record: time, lat, lon, speed, `longAcc` (longitudinal g, from the `LongAcc` column), `leanAngle` (from `lean-angle`) — raw line preserved for round-trip fidelity. `longAcc`/`leanAngle` default to 0 when the file has no such column.
- `Lap` — slice of samples with duration
- `VboHeader` — parsed section map + column index positions (including `longAccIndex`/`leanAngleIndex`, -1 if absent)
- `Session` — file name + header + samples + laps
- `ColorMetric` (`editor/colorScale.ts`) — `'none' | 'speed' | 'braking' | 'cornering'`, the Track Map's coloring mode

## Key implementation details

- **VBO coordinate format:** lat/lon fields are the **whole number in signed minutes** (not `DDDMM.MMMM` — there's no separate degrees/minutes split), so decimal degrees = `value / 60`. Latitude is standard (north positive). **Longitude is stored WEST-positive** (a Racelogic-specific convention, opposite of normal GPS) — negate it after dividing by 60 to get conventional east-positive degrees. This applies to both the per-sample lat/lon and the `[laptiming]` start/finish line. Verified against an independent VBOX parser and real track coordinates — see `parseCoord` in `readVbo.ts` for the authoritative implementation.
- **Track Map coloring:** `heatMetricValue()` in `colorScale.ts` computes what each heat mode colors by — `speed` is raw km/h, `braking` is rectified deceleration (`max(0, -longAcc)`, so accelerating/coasting always reads 0), `cornering` is `abs(leanAngle)` (normalizes left/right turns onto one scale). All three share one blue→green→yellow→red gradient; `'none'` mode draws a single solid-colored polyline per lap instead.
- **Leaflet Polyline styling:** always pass `color`/`weight` via the `pathOptions` prop, not as top-level props — react-leaflet only re-applies style on prop changes when the `pathOptions` object reference changes; top-level style props are only read once at layer creation.
- **Lap detection thresholds:** minimum speed 5 km/h, minimum 10 samples; falls back to whole file as one lap.
- **Vite base path** is `/track-kit/` (GitHub Pages sub-directory, matching the `mrded/track-kit` repo name) — don't change this for production builds.
- **Code style:** no semicolons, single quotes, trailing commas, 100-char line width (Prettier). TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`.
- **Deployment:** push to `main` triggers GitHub Actions → lint → test → build → deploy to GitHub Pages automatically.
