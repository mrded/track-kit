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

The app is a browser-only VBO telemetry file editor — all processing happens client-side, no backend.

**Three-layer separation:**

1. **`src/parser/`** — pure TypeScript, zero React. `readVbo.ts` parses the VBO text format into `Session` objects; `lapDetector.ts` finds lap boundaries from GPS speed data; `writeVbo.ts` serializes back to VBO text.

2. **`src/editor/`** — pure TypeScript. `merge.ts` combines selected laps from multiple sessions into one; `export.ts` triggers a browser download.

3. **`src/components/` + `src/pages/`** — React UI. `Home.tsx` owns all state (sessions, selected laps, parse progress) and orchestrates the flow. Components are stateless presentational pieces.

**Web Worker (`src/worker/parser.worker.ts`)** — parsing is offloaded here to keep the UI unblocked. Message types: `parse` (input), `progress` / `result` / `error` (output back to main thread).

**Data flow:**

```
Drop .vbo files → FileDrop → Home.tsx → Web Worker
→ readVbo() + detectLaps() → Session[] posted back
→ SessionCard + LapList (checkbox selection)
→ Export → mergeLaps() → writeVbo() → browser download
```

**Core data types** (`src/parser/types.ts`):
- `GpsSample` — one GPS record with time, lat, lon, speed (raw line preserved for round-trip fidelity)
- `Lap` — slice of samples with duration
- `VboHeader` — parsed section map + column index positions
- `Session` — file name + header + samples + laps

## Key implementation details

- **VBO coordinate format:** lat/lon stored as `DDDMM.MMMM` (degrees + decimal minutes), converted to decimal degrees as `deg + min/60`.
- **Lap detection thresholds:** minimum speed 5 km/h, minimum 10 samples; falls back to whole file as one lap.
- **Vite base path** is `/VBO-editor/` (GitHub Pages sub-directory) — don't change this for production builds.
- **Code style:** no semicolons, single quotes, trailing commas, 100-char line width (Prettier). TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`.
- **Deployment:** push to `main` triggers GitHub Actions → lint → test → build → deploy to GitHub Pages automatically.
