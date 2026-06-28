# RaceBox VBO Editor

RaceBox and RaceChrono Pro don't handle multiple sessions well, making it hard to compare laps across different track days. This tool lets you import multiple VBO sessions, pick the laps you care about, and export them as a single new session file — ready to analyse in RaceChrono Pro or any other tool that supports VBO.

**Everything runs locally in your browser — no data is uploaded anywhere.**

> Mainly developed around motorcycle track days using RaceBox, so it may not work correctly for other situations. If something isn't working, feel free to [open a ticket](https://github.com/mrded/vbo-editor/issues).

## Features

- Drag & drop or browse to upload multiple `.vbo` files
- Automatic lap detection from GPS samples
- Select / deselect individual laps across sessions
- Export a single merged `merged.vbo` file
- Parsing runs in a Web Worker (UI never freezes)

## Usage

1. Open [the app](https://mrded.github.io/VBO-editor/)
2. Drop your `.vbo` files onto the upload area
3. Tick the laps you want to include
4. Click **Export merged.vbo**

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
  editor/       – Merge & export logic
    merge.ts
    export.ts
  worker/       – Web Worker
    parser.worker.ts
  components/   – UI components
    FileDrop.tsx
    SessionCard.tsx
    LapList.tsx
    ExportButton.tsx
  pages/
    Home.tsx
```
