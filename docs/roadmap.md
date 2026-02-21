# xUpload Roadmap

Post-hackathon improvement plan. Items are grouped by area, roughly ordered by priority.

---

## Matching Quality

### Better image indexing
**Current state:** Images are indexed using only the filename and path keywords (e.g., `photos/passport.jpg` → `photos passport jpg image photo picture`).

**Goal:** Extract actual visual content. Options:
- On-device: use `transformers.js` with a CLIP-style model to generate image embeddings without any API
- API-based: send image to Gemini Vision and get a description, then embed the description

**Why it matters:** A file named `IMG_3421.jpg` that contains a passport photo gets no meaningful signal from its filename.

---

### Element-wise page analysis
**Current state:** The extension grabs text around the file input (label, placeholder, nearby DOM text) and uses that as the query.

**Goal:** Understand the page more deeply:
- Parse form structure to understand what each input section is for
- Identify upload context from section headers, instructions, or sibling inputs
- Handle multi-step forms where context is spread across steps

---

### Better PDF text extraction
**Current state:** Raw regex on PDF bytes — works for simple PDFs, fails on compressed or encrypted ones.

**Goal:** Use a proper PDF library (e.g., `pdf.js`) to reliably extract text from all PDFs.

---

### Vocabulary incremental update
**Current state:** The entire vocabulary is rebuilt from scratch every time files are re-scanned.

**Goal:** Support true incremental vocabulary updates so adding a few files doesn't require reprocessing all existing vectors.

---

## Performance

### Scale to 10,000+ files
**Current state:** `search()` does a linear scan over all records. Works fine for ~1,000 files.

**Goal:** Add approximate nearest neighbor (ANN) indexing (e.g., HNSW or IVF) for large corpora. Could be implemented in-browser using a WASM library.

---

### Web Worker for indexing
**Current state:** TF-IDF vectorization runs on the main thread in the background service worker.

**Goal:** Offload heavy computation (tokenization, vectorization) to a Web Worker to keep the background worker responsive.

---

## UX

### Keyboard navigation in panel
**Current state:** The recommendation panel is mouse-only.

**Goal:** Arrow keys to navigate results, Enter to select, Escape to close.

---

### Drag-and-drop upload zones
**Current state:** The ⚡ button only targets `<input type="file">` and custom upload buttons.

**Goal:** Also detect drag-and-drop zones (divs with `ondragover`, Dropzone.js, etc.) and inject the ⚡ button there.

---

### Better duplicate button prevention
**Current state:** The current deduplication logic (using a `WeakSet` on anchor elements) can miss cases where multiple DOM elements all represent the same upload field. See [bug_duplicate_buttons.md](./bug_duplicate_buttons.md) for a full analysis.

**Goal:** Fix the dedup logic to reliably produce exactly one button per logical upload field, regardless of how the page structures its HTML.

---

### File type badges in the panel
**Current state:** All files show the same generic file icon.

**Goal:** Show distinct icons for PDFs, images, Word docs, etc. to help users identify files faster.

---

## Infrastructure

### Test coverage
**Current state:** No automated tests.

**Goal:** Unit tests for:
- `embeddings.ts` — tokenization, vectorization, IDF computation
- `vectordb.ts` — search, upsert, delete, clear
- `background.ts` — ranking logic (multi-signal scoring)

---

### Error handling and recovery
**Current state:** If a file read fails during indexing, it's silently skipped.

**Goal:**
- Show a count of unreadable files after indexing
- On recommendation click, if file read fails, auto-retry by rescanning the folder rather than showing a raw error

---

### Settings page
**Current state:** Config lives in the popup (small and cramped).

**Goal:** A dedicated options page (`chrome.runtime.openOptionsPage()`) for:
- Multiple folder selection
- Per-site configuration
- Index statistics (file count, storage size, last scan)
- Manual vocab reset
