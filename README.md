# xUpload

> **Smart file upload recommendations for any website.**
> xUpload watches for file upload fields as you browse, highlights them, and instantly recommends the right file from your local computer — no digging through folders required.


<p align="center">
  <img src="https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Extension"/>
  <img src="https://img.shields.io/badge/Manifest-V3-green" alt="Manifest V3"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License"/>
  <img src="https://img.shields.io/badge/Privacy-Local--first-brightgreen" alt="Local First"/>
</p>

---

## What it does

When you land on a page that has a file upload field — a job application, a homework submission, a passport upload form — xUpload:

1. **Automatically highlights** the upload area
2. **Shows a ranked list** of your local files that best match what the page is asking for
3. **Lets you preview** the file (image, PDF, or text) before committing
4. **Fills the upload field** in one click — no file picker dialog

It learns from your usage: if you always submit OS homework from `~/Documents/23S/OS/`, xUpload will rank those files higher the next time you're on that course page.

---

## Install

**From the Chrome Web Store** *(recommended)*

> [Install xUpload on the Chrome Web Store](#) <!-- add link when live -->

**From source** — see [Build & Development](#build--development) below.

---

## Quick Start (Users)

### 1. Index your folder

1. Click the **xUpload icon** in your Chrome toolbar
2. Click **Select folder** and choose the local folder that contains your files
3. Wait for the scan to finish — the indexed file count will update

You only need to do this once. xUpload can automatically re-scan for new files in the background.

### 2. Upload smarter

1. Navigate to any page with a file upload field
2. The upload area will be highlighted automatically
3. Hover over it — a recommendation panel appears with ranked files
4. Click a file to preview it, then click **Use this file**

### 3. Reset the index

Click **Clear scanned data** in the popup to wipe the index without touching your real files.

---

## Matching Modes

xUpload has three modes, selectable in the popup:

| Mode | Requires | How it works |
|------|----------|-------------|
| **TF-IDF** (default) | Nothing — fully offline | Keyword-based matching using local TF-IDF vectors. Fast and private. |
| **Fast** | Gemini API key | Uses Google's Gemini embedding model for semantic understanding. Handles synonyms and meaning, not just keywords. |
| **VLM** | Gemini API key | Captures a screenshot of the upload area and uses Gemini Vision to understand the visual context before matching. Most accurate. |

TF-IDF mode works out of the box with no account or API key. Fast and VLM modes require a free [Google AI Studio](https://aistudio.google.com/) API key.

---

## Privacy

**Your files never leave your device.**

- All indexing and matching runs locally in your browser
- File vectors and upload history are stored in your browser's IndexedDB — never on a server
- The optional Gemini modes send only short text excerpts (not your actual files) to Google's API, using your own API key

Read the full [Privacy Policy](docs/PRIVACY.md).

---

## Build & Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/LiSiruiRay/xUpload.git
cd xUpload
npm install
```

### Build

```bash
npm run build      # Production build → dist/
npm run dev        # Watch mode (rebuilds on save)
```

> The content script uses a separate Vite config (`vite.config.content.ts`) and is built as an IIFE. `npm run build` runs both automatically.

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `dist/` folder

After making code changes:

```bash
npm run build
# Then click ↻ on xUpload in chrome://extensions
# Hard-refresh the page you're testing on
```

### Project Structure

```
xUpload/
├── src/
│   ├── content.ts        # Detects file inputs, injects UI, fills upload fields
│   ├── background.ts     # Matching engine, indexing coordinator, message hub
│   ├── popup.ts          # Popup UI — folder scan, config, clear
│   ├── embeddings.ts     # TF-IDF tokenization and vectorization
│   ├── apiEmbeddings.ts  # Gemini API calls (embedding + VLM)
│   ├── vectordb.ts       # IndexedDB wrapper — store, search, history
│   ├── workflow.ts       # Structured debug logging
│   └── types.ts          # Shared TypeScript interfaces
├── popup.html
├── manifest.dist.json    # Production manifest (copied to dist/ on build)
├── vite.config.ts        # Main build config (background + popup)
├── vite.config.content.ts # Content script build config (IIFE format)
└── dist/                 # Build output — load this folder in Chrome
```

For a deeper walkthrough of the architecture, see [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

---

## Docs

| Document | Description |
|----------|-------------|
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Full architecture overview — start here |
| [docs/roadmap.md](docs/roadmap.md) | Planned improvements |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Privacy policy |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | What's been built |

---

## Troubleshooting

**"Extension context invalidated" errors**
Happens when the extension is reloaded while a content script is still running in an open tab. Fix: reload the extension in `chrome://extensions`, then hard-refresh the affected tab.

**Recommendations not appearing / "No matching files found"**
- Make sure you've scanned a folder first (popup → Select folder)
- Try rescanning — the folder permission may have expired
- If using Gmail or similar: the recommendation panel uses the email subject and body as context. Type your email content first, then hover over the attachment zone.

**`cp` not found on Windows**
Run `npm install` first — the build script uses `shx cp` for cross-platform compatibility.

---

## Contributing

Issues and pull requests are welcome.

Before contributing:
1. Read [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) to understand the architecture
2. Check [docs/roadmap.md](docs/roadmap.md) for planned work
3. Open an issue to discuss large changes before building

---

## License

MIT — see [LICENSE](LICENSE) for details.
