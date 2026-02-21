# xUpload

xUpload is a lightweight Chrome extension that recommends local files based on the semantic context of upload areas on a webpage, and helps users auto-fill `<input type="file">` controls.

## Features

- Local folder scan and indexing (with incremental rescan support)
- Upload context extraction (label / placeholder / nearby text)
- Multi-strategy matching:
  - TF-IDF (fully local, no API required)
  - Gemini Embedding (Fast mode)
  - Screenshot + VLM (VLM mode)
- Preview support (image / PDF / text)
- One-click file fill for upload controls
- Upload history and path-memory ranking boosts
- One-click index cleanup (`Clear scanned data`) without deleting real files

## Tech Stack

- Chrome Extension Manifest V3
- TypeScript
- Vite
- IndexedDB (local vectors + metadata)
- `chrome.storage.local` (extension config)

## Project Structure

```text
xUpload/
├─ src/
│  ├─ content.ts        # Page injection: detect file inputs, show panel, fill files
│  ├─ background.ts     # Message hub: matching, indexing, file read, clear flow
│  ├─ popup.ts          # Popup interactions: scan, rescan, config, clear
│  ├─ embeddings.ts     # Local tokenization + TF-IDF
│  ├─ apiEmbeddings.ts  # Gemini embedding / VLM calls
│  ├─ vectordb.ts       # IndexedDB persistence and search
│  ├─ workflow.ts       # Workflow logging helpers
│  └─ types.ts          # Message and shared data types
├─ popup.html
├─ manifest.json
├─ manifest.dist.json
└─ dist/                # Build output (used by Load unpacked)
```

## Install & Build

### 1) Install dependencies

```bash
npm install
```

### 2) Build extension

```bash
npm run build
```

### 3) Watch mode for development

```bash
npm run dev
```

## Load Extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select this project's `dist/` folder

After code changes:

1. Run `npm run build`
2. Click refresh (↻) on xUpload in `chrome://extensions`
3. Refresh your test page (hard refresh recommended)

## Usage

### A. First-time indexing

1. Click the xUpload icon in the browser toolbar
2. Click **Select folder** and choose your local folder
3. Wait until scan/index completes (`Indexed files` updates)

### B. Recommend and fill

1. Open a page that contains file upload controls
2. Hover over the upload area to open recommendation panel
3. Pick a recommended file, preview it, and click **Use this file**

### C. Clear scanned index

Click **Clear scanned data** in popup:

- Clears xUpload index data (vectors, history, directory handle, path memory)
- Does **not** delete your real local files
- Resets state (`Indexed files: 0`, `Last scan: Never scanned`)

## Data Storage

### IndexedDB (primary storage)

Database name: `xupload_vectors`

Stores:

- `files`: file metadata + vectors + text preview
- `vocabulary`: TF-IDF vocabulary snapshot
- `dir_handles`: persisted directory handle
- `upload_history`: upload history entries
- `config`: rescan config and path memory

### `chrome.storage.local` (config storage)

- `xupload_config`: API key and match mode
- `xupload_enabled`: extension enable/disable toggle
- `vocab`: legacy compatibility field (migration path)

> Note: xUpload does not copy or move your real files. Files are read on demand via the stored directory handle.

## Match Modes

- **TF-IDF (no API)**: fully local matching
- **Fast (Gemini Embedding)**: semantic embedding-based matching
- **VLM (Screenshot + Gemini)**: screenshot-assisted intent understanding

## Troubleshooting

### 1) `'cp' is not recognized` on Windows

This project uses `shx cp` for cross-platform copy in scripts.  
Run `npm install` first, then `npm run build`.

### 2) `Extension context invalidated` / `sendMessage` errors

Usually happens after extension reload while old content script is still in a tab.

1. Reload extension in `chrome://extensions`
2. Close/reopen the test tab (or hard refresh)
3. Trigger xUpload again

## License

MIT — add a `LICENSE` file before public release.
