# RaceBox VBO Editor

A lightweight browser-based editor for RaceBox VBO files. Upload multiple VBO sessions, select the laps you want to keep, and download a single merged VBO file.

**Everything runs locally in your browser — no data is uploaded anywhere.**

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
