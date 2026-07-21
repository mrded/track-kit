# Track Kit

RaceBox and RaceChrono Pro don't handle multiple sessions well, making it hard to compare laps across different track days. Track Kit lets you import multiple VBO sessions, pick the laps you care about, merge and export them as a single new session file — ready to analyse in RaceChrono Pro or any other tool that supports VBO — and preview laps on a satellite map, color-graded by speed, braking, or cornering.

**Everything runs locally in your browser — your `.vbo` files are never uploaded anywhere.** (The Track Map page does fetch satellite tile images from Esri based on the track's location, same as any map.)

> Mainly developed around motorcycle track days using RaceBox, so it may not work correctly for other situations. If something isn't working, feel free to [open a ticket](https://github.com/mrded/track-kit/issues).

## Features

**Editor**
- Drag & drop or browse to upload multiple `.vbo` files
- Automatic lap detection from GPS samples
- Select / deselect individual laps across sessions
- Export a single merged `merged.vbo` file

**Track Map**
- Preview one or more selected laps on a satellite map
- Color-graded by Speed, Braking G-Force, or Cornering (lean angle), or a plain solid line
- No API key required (Esri World Imagery tiles)

Parsing runs in a Web Worker on both pages (UI never freezes).

## Usage

1. Open [the app](https://mrded.github.io/track-kit/)
2. **Editor:** drop your `.vbo` files, tick the laps you want, click **Export merged.vbo**
3. **Track Map:** switch tabs, drop `.vbo` files, tick laps to preview them on the map, pick a coloring mode

## Development

```bash
npm install
npm run dev       # Start dev server
npm test          # Run tests
npm run build     # Production build
npm run lint      # Lint
npm run format    # Format with Prettier
```

## Tech Stack

- React 19 + TypeScript (strict mode)
- Vite 8
- Leaflet + react-leaflet for the Track Map
- Vitest for unit tests
- ESLint + Prettier
- GitHub Actions → GitHub Pages

## Architecture

```
src/
  parser/       – VBO parser (no React deps)
    types.ts
    readVbo.ts
    lapDetector.ts
    writeVbo.ts
  editor/       – Pure logic: merge, export, validation, map coloring
    merge.ts
    export.ts
    validateSession.ts
    colorScale.ts
    trackSegments.ts
  hooks/        – Shared Web Worker parsing state
    useVboParser.ts
  worker/       – Web Worker
    parser.worker.ts
  components/   – UI components
    FileDrop.tsx
    SessionCard.tsx
    LapList.tsx
    ExportButton.tsx
    ParsingStatus.tsx
    TrackMapView.tsx
    ColorMetricToggle.tsx
    FitBounds.tsx
  pages/
    Home.tsx        – Editor
    TrackMap.tsx     – Track Map
```
