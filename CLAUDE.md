# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

xUpload is a lightweight Chrome Extension that recommends local files based on the semantic context of upload areas on a webpage, and auto-fills `<input type="file">` controls.

**Current stage:** Post-hackathon — focusing on optimization, quality improvements, and new features.

## How It Works

### Phase 1: Indexing (User-triggered)

1. User selects a local folder via the popup
2. Extension scans all files in the folder recursively
3. For each file, text is extracted and converted to an embedding vector
4. Vectors + file metadata are stored in local IndexedDB

### Phase 2: Recommendation (Auto-triggered)

1. Content script detects `<input type="file">` elements and injects a ⚡ button
2. User clicks the button → context text around the input is extracted (labels, placeholders, nearby text)
3. Context text is converted to a query vector
4. Vector database is searched for the top-N most similar files
5. A small panel shows the results
6. User clicks a result → file is auto-filled into the input

## Tech Stack

- Chrome Extension Manifest V3
- TypeScript
- Vite
- TF-IDF vectorization (local, no API required)
- Gemini API (optional: embedding + VLM modes)
- IndexedDB (local vector database)

## Module Overview

| Module | Responsibility |
|--------|---------------|
| `content.ts` | Detect file inputs, inject buttons, extract context, show recommendation panel |
| `background.ts` | Coordinate indexing and matching, serve as message hub |
| `popup.ts` | User-facing controls: folder selection, rescan, config |
| `embeddings.ts` | Text extraction + TF-IDF vectorization |
| `vectordb.ts` | IndexedDB storage + cosine similarity search |
| `apiEmbeddings.ts` | Gemini API wrappers (embedding + VLM) |
| `types.ts` | Shared TypeScript interfaces and message types |
| `workflow.ts` | Structured logging for debugging |

## File Content Handling

| File Type | How it's vectorized |
|-----------|---------------------|
| PDF / documents | Text extracted via regex → embedding |
| Images | Filename + path keywords → embedding (VLM optional) |
| Text files | Raw content → embedding |
| Office docs | Filename + type keywords → embedding |

## Design Principles

- **Local-first**: All data and computation stay on the user's device. No files are uploaded to any server.
- **Low-friction**: Only adds a small button next to file inputs; does not modify the rest of the page.
- **Hybrid matching**: TF-IDF for offline/free use; Gemini embedding/VLM for higher accuracy when an API key is provided.

## Build

```bash
npm run build    # Build to dist/
npm run dev      # Watch mode
```

Load extension in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select the `dist/` folder.

## Docs

See `docs/` for architecture, embedding details, and changelog:

- [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) — full architecture overview (start here)
- [docs/embedding-generation.md](docs/embedding-generation.md) — how files are indexed
- [docs/embedding_flow.md](docs/embedding_flow.md) — end-to-end data flow
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — what has been built so far
- [docs/roadmap.md](docs/roadmap.md) — planned improvements
