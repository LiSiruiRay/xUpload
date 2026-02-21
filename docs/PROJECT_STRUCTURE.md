# xUpload Project Structure Documentation

**Target Audience:** Junior Software Engineers
**Last Updated:** February 7, 2026

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [How It Works (User Journey)](#how-it-works-user-journey)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Core Modules Deep Dive](#core-modules-deep-dive)
6. [Data Flow](#data-flow)
7. [Key Technologies](#key-technologies)
8. [Build & Development](#build--development)
9. [Important Concepts](#important-concepts)

---

## Product Overview

**xUpload** is a Chrome Extension that helps users quickly fill file upload fields on websites by intelligently recommending files from their local computer.

### The Problem It Solves

When you're filling out web forms (job applications, visa forms, online registrations), you often need to upload documents like resumes, passports, transcripts, etc. Normally, you have to:
1. Click the upload button
2. Navigate through your file system
3. Remember where you saved the file
4. Find and select it

This is tedious and time-consuming, especially when filling multiple forms.

### The Solution

xUpload automatically:
1. Detects file upload fields on any webpage
2. Reads the context around the upload field (labels, hints like "Upload your passport")
3. Matches that context against your pre-indexed local files
4. Recommends the most relevant files
5. Fills the upload field with one click

### Three Operating Modes

1. **TF-IDF Mode** (default, no API key needed)
   - Uses traditional text similarity (Term Frequency-Inverse Document Frequency)
   - Fast, works offline, good for basic matching

2. **Fast Mode** (requires Gemini API key)
   - Uses Google's Gemini embedding model for semantic understanding
   - Better at understanding meaning, not just keywords

3. **VLM Mode** (requires Gemini API key)
   - Uses Vision-Language Model to analyze screenshot of the upload area
   - Most intelligent, understands visual context

---

## How It Works (User Journey)

### Setup Phase

1. **User clicks extension icon** → Opens popup window
2. **User clicks "Select folder"** → Browser shows folder picker dialog
3. **User grants folder access** → Extension scans all files in that folder
4. **Extension builds index:**
   - Reads file metadata (name, path, size, type)
   - Extracts text content from files (PDFs, text files, etc.)
   - Generates embedding vectors for semantic search
   - Stores everything in local IndexedDB

### Usage Phase

1. **User visits any website** → Content script runs automatically
2. **Extension detects file input fields** → Injects a ⚡ button next to each
3. **User clicks ⚡ button:**
   - Extension extracts context text around the upload field
   - Sends context to background script for matching
   - Background script searches indexed files and ranks by relevance
4. **Panel shows top 5 recommended files** with scores
5. **User clicks a recommended file:**
   - Extension reads the actual file from disk (via stored folder handle)
   - Shows preview (image, PDF, or text)
6. **User clicks "Use this file":**
   - Extension fills the file input with selected file
   - Tracks usage history for future recommendations

---

## Architecture Overview

xUpload follows the **Chrome Extension Manifest V3** architecture with three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                         WEBPAGE                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Content Script (content.ts)                       │    │
│  │  • Detects file inputs                             │    │
│  │  • Injects ⚡ buttons                              │    │
│  │  • Shows recommendation panel                      │    │
│  │  • Fills file inputs                               │    │
│  └───────────┬────────────────────────────────────────┘    │
└──────────────┼──────────────────────────────────────────────┘
               │ chrome.runtime.sendMessage()
               ▼
┌──────────────────────────────────────────────────────────────┐
│  Background Service Worker (background.ts)                   │
│  • Receives match requests                                   │
│  • Performs vector search                                    │
│  • Manages vocabulary                                        │
│  • Coordinates indexing                                      │
│  • Handles auto-rescan scheduling                            │
└───────────┬──────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│  IndexedDB (vectordb.ts)                                     │
│  • Stores file vectors & metadata                            │
│  • Persists folder access handle                             │
│  • Stores upload history                                     │
│  • Saves vocabulary for TF-IDF                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Popup UI (popup.html + popup.ts)                            │
│  • Folder selection interface                                │
│  • Shows indexed file count                                  │
│  • Configuration (API key, mode, auto-rescan)                │
└──────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

- **Content Scripts** run in webpage context, can access and modify the DOM
- **Background Service Worker** runs independently, persists across pages, handles heavy computation
- **Popup** provides user interface for configuration
- **IndexedDB** allows storing large amounts of data locally (vectors, file metadata)

---

## Project Structure

```
xUpload/
├── src/                          # Source code
│   ├── background.ts             # Background service worker
│   ├── content.ts                # Content script (runs on webpages)
│   ├── popup.ts                  # Popup UI logic
│   ├── vectordb.ts               # IndexedDB wrapper for vector storage
│   ├── embeddings.ts             # TF-IDF tokenization & vectorization
│   ├── apiEmbeddings.ts          # Gemini API integration
│   ├── workflow.ts               # Logging utilities
│   ├── types.ts                  # TypeScript type definitions
│   └── content.css               # Styles for injected UI elements
│
├── dist/                         # Build output (generated)
│   ├── background.js
│   ├── content.js
│   ├── popup.js
│   ├── popup.html
│   ├── content.css
│   └── manifest.json
│
├── docs/                         # Documentation
│
├── manifest.json                 # Extension manifest (template)
├── manifest.dist.json            # Production manifest (copied to dist/)
├── popup.html                    # Popup UI HTML
├── vite.config.ts                # Vite build configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # NPM dependencies & scripts
├── CLAUDE.md                     # Project instructions for AI assistant
└── README.md                     # Project readme
```

---

## Core Modules Deep Dive

### 1. `content.ts` - The Page Scanner

**Purpose:** Runs on every webpage, detects file upload fields, handles user interactions

**Key Functions:**

#### `findUploadTargets()`
Scans the page for:
- Standard visible `<input type="file">` elements
- Hidden file inputs triggered by custom buttons/links
- Uses keyword detection (regex for "upload", "browse", "选择文件", etc.)

Returns an array of `UploadTarget` objects:
```typescript
interface UploadTarget {
  anchor: HTMLElement;      // Element to attach ⚡ button to
  fileInput: HTMLInputElement | null;  // Actual file input (may be hidden)
  context: string;          // Surrounding text for matching
  accept?: string;          // File type filter (e.g., ".pdf,image/*")
}
```

#### `extractContext()`
Extracts text hints around a file input:
- Associated `<label>` elements
- `placeholder` and `title` attributes
- `aria-label` accessibility text
- Text content from parent containers

Example output: `"Please upload your passport or national ID card"`

#### `handleRecommend()`
Main click handler when user clicks ⚡ button:
1. Checks if index exists (if not, shows inline scan button)
2. Loads configuration (TF-IDF vs Fast vs VLM mode)
3. For VLM mode: captures screenshot of page
4. Sends match request to background script
5. Shows recommendation panel

#### `showPanel()`
Displays recommendation results:
- Creates floating panel near the upload button
- Shows file icon, name, path, and confidence score
- Displays history badge if file was used before on this site
- Handles click to preview file

#### `showPreview()`
Shows file preview before final confirmation:
- Images: displays in `<img>` tag
- PDFs: displays in `<embed>` tag
- Text files: shows content in `<pre>` tag
- Unknown types: shows basic info (name, size)

#### `fillFileWithObj()`
Actually fills the file input:
- Uses `DataTransfer` API to create a file list
- Sets `input.files` property
- Dispatches `change` and `input` events for frameworks to detect
- Fallback: simulates drag-and-drop event

**Technologies Used:**
- MutationObserver (watches for dynamically added file inputs)
- Intersection Observer concepts (for button positioning)
- File System Access API (reading files on-demand)
- Canvas API (screenshot cropping for VLM mode)

---

### 2. `background.ts` - The Brain

**Purpose:** Coordinates matching, manages vocabulary, handles API calls

**Key Functions:**

#### `ensureVocab()`
Loads vocabulary on startup:
1. Tries IndexedDB first
2. Falls back to chrome.storage (migration path)
3. Imports into in-memory data structures for fast access

#### `handleMatch()` - TF-IDF Matching
Multi-layer ranking algorithm:

1. **TF-IDF Similarity**
   - Tokenizes query text
   - Creates query vector using stored vocabulary
   - Computes cosine similarity with all file vectors

2. **History Boost**
   - Checks if file was uploaded to this website before
   - Applies time-based decay (recent uploads weighted higher)

3. **Path Name Overlap**
   - Compares query keywords with file path tokens
   - E.g., "resume" query matches "documents/John_Resume.pdf"

4. **Content Overlap**
   - Matches query keywords with file's extracted text preview

5. **Path Memory**
   - Remembers last 20 files used per website
   - Boosts files from those paths

**Weighting Strategy:**
- If TF-IDF has good signal (max score > 0.05):
  - TF-IDF: 56%, Path: 22%, Content: 14%, Path Memory: 8% (no history)
  - TF-IDF: 42%, History: 28%, Path: 14%, Content: 8%, Path Memory: 8% (with history)
- If TF-IDF has weak signal:
  - Path: 44%, Content: 42%, Path Memory: 14% (no history)
  - History: 36%, Path: 30%, Content: 20%, Path Memory: 14% (with history)

#### `handleMatchEnhanced()` - Gemini-Powered Matching
1. Checks for API key, falls back to TF-IDF if missing
2. For VLM mode: calls Gemini Vision API to describe upload intent
3. Calls Gemini Embedding API to get query vector
4. Performs dense vector search (768-dimensional embeddings)
5. Returns top-N results sorted by cosine similarity

#### `handleBuildIndex()`
Processes files from popup/content script:
1. **TF-IDF Phase:**
   - Tokenizes all file texts
   - Builds global vocabulary
   - Computes IDF (Inverse Document Frequency) for each term

2. **Dense Embedding Phase** (if API key configured):
   - Batches files (10 at a time)
   - Calls Gemini Embedding API for each
   - Adds 200ms delay between batches (rate limiting)

3. **Storage Phase:**
   - Clears old index
   - Inserts records with both sparse (TF-IDF) and dense (Gemini) vectors
   - Persists vocabulary to IndexedDB and chrome.storage

#### Auto-Rescan System
Uses Chrome Alarms API:
- Sets up periodic alarm based on user configuration (5/10/30/60 min)
- On alarm: checks directory handle permission
- If permission expired: sets badge to "!" as reminder
- Note: Background service worker can't directly re-scan (File System Access API limitation)

**Message Handling:**
Listens for messages:
- `MATCH_REQUEST` → TF-IDF matching
- `MATCH_REQUEST_ENHANCED` → Gemini matching
- `GET_FILE` → Read file via stored handle
- `BUILD_INDEX` → Build/update index
- `GET_INDEX_COUNT` → Return number of indexed files
- `TRACK_UPLOAD` → Record upload history
- `CAPTURE_TAB` → Take screenshot for VLM mode

---

### 3. `popup.ts` - The Control Panel

**Purpose:** User interface for folder selection and configuration

**Key Functions:**

#### `buildIndex()`
Main indexing function:
1. Calls `collectFiles()` to recursively traverse folder
2. Reads each file using File System Access API
3. Calls `extractText()` to get searchable text
4. Sends batch to background for vectorization
5. Updates progress UI

**Incremental Scan:**
- Compares file size + lastModified timestamp
- Only re-processes changed files
- Deletes records for removed files
- Revectorizes unchanged files (vocabulary might have changed)

#### Rescan Button
- Retrieves stored directory handle from IndexedDB
- Requests permission if expired (requires user gesture)
- Performs incremental scan

#### Configuration Management
- Saves to chrome.storage.local
- Auto-rescan toggle + interval
- API key (stored as password type input)
- Match mode selector (TF-IDF/Fast/VLM)

---

### 4. `vectordb.ts` - The Database

**Purpose:** IndexedDB wrapper for local vector storage

**Database Schema:**

```typescript
// Object Store: "files"
interface VectorRecord {
  id: string;              // Primary key (file path)
  name: string;            // File name
  path: string;            // Full relative path
  type: string;            // MIME type
  size: number;            // Bytes
  lastModified: number;    // Timestamp
  vector: number[];        // TF-IDF vector (vocab-size dimensions)
  denseVector?: number[];  // Gemini embedding (768 dimensions)
  textPreview: string;     // First 500 chars
}

// Object Store: "dir_handles"
// Stores FileSystemDirectoryHandle for on-demand file reading

// Object Store: "vocabulary"
interface VocabSnapshot {
  terms: string[];   // Ordered list of terms
  idf: number[];     // IDF value for each term
}

// Object Store: "upload_history"
interface UploadHistoryEntry {
  id?: number;               // Auto-increment
  fileId: string;            // References VectorRecord.id
  fileName: string;
  fileType: string;
  websiteHost: string;       // Index: for fast lookup
  pageUrl: string;
  pageTitle: string;
  uploadContext: string;     // Context text that triggered selection
  timestamp: number;         // Index: for time-based queries
}

// Object Store: "config"
// Stores RescanConfig and PathMemoryStore
```

**Key Functions:**

#### `search()` - Sparse Vector Search
1. Loads all records from "files" store
2. Applies accept filter if provided (e.g., only `.pdf` or `image/*`)
3. Computes cosine similarity between query vector and each file vector
4. Sorts by score, returns top-N

#### `denseSearch()` - Dense Vector Search
Same as `search()` but uses `denseVector` field (Gemini embeddings)

#### `getFileData()` - On-Demand File Reading
1. Gets VectorRecord by ID (file path)
2. Retrieves stored directory handle
3. Requests permission if needed
4. Navigates handle tree to file location
5. Reads file, converts to base64
6. Returns to caller

**Why IndexedDB?**
- Can store large amounts of data (vectors for thousands of files)
- Asynchronous API (doesn't block UI)
- Can store complex objects (File handles, typed arrays)
- Persists across browser sessions

---

### 5. `embeddings.ts` - The NLP Engine

**Purpose:** Text processing and TF-IDF vectorization

**Key Functions:**

#### `tokenize()`
Breaks text into searchable tokens:
- Lowercase normalization
- Alphanumeric words: `[a-z0-9]+`
- CJK characters: `[\u4e00-\u9fff\u3400-\u4dbf]`
- CJK bigrams: for better Chinese/Japanese matching

Example:
```
Input: "Upload your Resume.pdf — 简历"
Output: ["upload", "your", "resume", "pdf", "简", "历", "简历"]
```

#### `tokenizeFiltered()`
Same as `tokenize()` but removes stop words ("the", "is", "a", etc.) and short tokens

#### `buildVocabulary()`
Builds global vocabulary from all documents:
1. Counts document frequency (DF) for each term
2. Computes IDF: `log((N + 1) / (DF + 1)) + 1`
3. Creates term → index mapping

**Why IDF?**
Rare terms are more informative. "passport" is more useful than "document".

#### `vectorize()`
Converts token list to fixed-size vector:
1. Counts term frequency (TF) in document
2. Normalizes by max TF
3. Multiplies by IDF
4. L2-normalizes the vector

**TF-IDF Formula:**
```
weight[term] = (TF[term] / max_TF) × IDF[term]
normalize: vector /= ||vector||
```

Result: A sparse vector where each dimension represents a term from vocabulary.

#### `extractText()` - Content Extraction
Handles different file types:

**Text Files** (.txt, .md, .json, .csv, etc.):
- Reads via `file.text()`
- Takes first 2000 chars

**PDFs**:
- Reads raw bytes
- Uses regex to find text between `BT` and `ET` markers (PDF text objects)
- Extracts strings inside parentheses: `(text content)`
- Fallback: uses path keywords + "pdf document"

**Images**:
- Cannot extract content (no ML model in browser)
- Uses path + keywords: "image photo picture"

**Office Documents**:
- Cannot parse binary formats
- Uses path + type keywords: "document word" / "spreadsheet excel"

---

### 6. `apiEmbeddings.ts` - The AI Connector

**Purpose:** Integrates with Google Gemini API

**Key Functions:**

#### `getEmbedding()`
Calls Gemini text-embedding-004 model:
- Input: text string (max 8000 chars)
- Output: 768-dimensional vector
- Model: text-embedding-004 (Google's latest embedding model)

**Why Gemini Embeddings?**
- Better semantic understanding than TF-IDF
- "passport photo" matches "ID picture"
- Understands context and synonyms

#### `batchEmbed()`
Efficiently embeds multiple texts:
- No native batch endpoint, so parallelizes requests
- Processes in batches of 10
- 200ms delay between batches (rate limiting)
- Progress callback for UI updates

#### `describeWithVLM()`
Uses Gemini 2.0 Flash Vision model:
- Input: screenshot (base64) + context text
- Prompt: "Describe what file this upload field needs"
- Output: 2-3 sentence description
- Max tokens: 200 (concise output)
- Temperature: 0.2 (factual, not creative)

**Example:**
```
Input screenshot: [Form with "Upload passport" label]
Context text: "Please upload a clear photo of your passport"
VLM output: "This upload field requires a passport document or photo.
It's specifically requesting a clear image showing the passport information
page with personal details."
```

---

## Data Flow

### Indexing Flow

```
User clicks "Select folder" in popup
    ↓
popup.ts: showDirectoryPicker() → User grants permission
    ↓
popup.ts: collectFiles() → Recursively lists all files
    ↓
popup.ts: extractText() → For each file, extract searchable text
    ↓
popup.ts: Sends files[] to background via chrome.runtime.sendMessage()
    ↓
background.ts: handleBuildIndex()
    ├→ embeddings.ts: tokenize() → Break text into tokens
    ├→ embeddings.ts: buildVocabulary() → Build global term index
    ├→ [Optional] apiEmbeddings.ts: batchEmbed() → Get Gemini vectors
    └→ For each file:
         vectordb.ts: upsert() → Store record with vectors
    ↓
vectordb.ts: saveVocab() → Persist vocabulary
    ↓
popup.ts: Updates UI with count
```

### Matching Flow (TF-IDF Mode)

```
User clicks ⚡ button on webpage
    ↓
content.ts: handleRecommend()
    ├→ extractContext() → Get text around upload field
    └→ Sends MATCH_REQUEST to background
    ↓
background.ts: handleMatch()
    ├→ embeddings.ts: tokenize() → Process query text
    ├→ embeddings.ts: vectorize() → Create query vector
    ├→ vectordb.ts: search() → Find similar files
    ├→ Multi-layer ranking:
    │   ├→ Compute TF-IDF similarity
    │   ├→ Check upload history
    │   ├→ Compute path name overlap
    │   ├→ Compute content overlap
    │   └→ Check path memory
    └→ Returns MATCH_RESPONSE with top 5
    ↓
content.ts: showPanel() → Display recommendations
    ↓
User clicks a file
    ↓
content.ts: getFile()
    ├→ Try in-memory directory handle (fastest)
    └→ Fallback: Send GET_FILE to background
        ↓
        background.ts: handleGetFile()
            └→ vectordb.ts: getFileData() → Read via stored handle
    ↓
content.ts: showPreview() → Display file preview
    ↓
User clicks "Use this file"
    ↓
content.ts: fillFileWithObj()
    ├→ Creates DataTransfer with file
    ├→ Sets input.files
    └→ Dispatches change event
    ↓
content.ts: Tracks upload history (fire-and-forget)
    └→ background.ts: addUploadHistory()
```

### Matching Flow (VLM Mode)

```
User clicks ⚡ button on webpage
    ↓
content.ts: doMatch()
    ├→ Sends CAPTURE_TAB to background
    │   └→ background.ts: chrome.tabs.captureVisibleTab()
    ├→ content.ts: cropScreenshot() → Crop to upload area
    └→ Sends MATCH_REQUEST_ENHANCED with screenshot
    ↓
background.ts: handleMatchEnhanced()
    ├→ apiEmbeddings.ts: describeWithVLM()
    │   └→ Gemini analyzes screenshot + context
    ├→ apiEmbeddings.ts: getEmbedding() → Vectorize description
    ├→ vectordb.ts: denseSearch() → Find similar files
    └→ Returns MATCH_RESPONSE
    ↓
content.ts: showPanel() → Display recommendations
    ↓
[Same as TF-IDF from here...]
```

---

## Key Technologies

### 1. Chrome Extension APIs

#### chrome.runtime
- `sendMessage()`: Communication between content/background/popup
- `onMessage`: Listen for messages
- `lastError`: Check for errors

#### chrome.storage
- `storage.local`: Key-value store (limited to 10MB)
- Used for: vocabulary migration, configuration

#### chrome.tabs
- `captureVisibleTab()`: Screenshot current tab (for VLM mode)
- Requires `activeTab` permission

#### chrome.alarms
- `alarms.create()`: Schedule periodic tasks
- `onAlarm`: Trigger on schedule
- Used for: auto-rescan feature

### 2. File System Access API

Modern browser API for reading/writing local files:

```javascript
// Request folder access
const dirHandle = await window.showDirectoryPicker({ mode: "read" });

// List files
for await (const entry of dirHandle.values()) {
  if (entry.kind === "file") {
    const fileHandle = entry;
    const file = await fileHandle.getFile();
  }
}

// Persist handle
await indexedDB.put(dirHandle, "main");

// Retrieve later
const stored = await indexedDB.get("main");
await stored.requestPermission({ mode: "read" });
```

**Advantages:**
- No need to upload files anywhere
- Direct access to user's file system
- Handles persist across sessions
- User controls access

**Limitations:**
- Permission expires if not used
- Requires user gesture to request permission
- Background service worker has limited access

### 3. IndexedDB

Browser database for structured data:

```javascript
// Open database
const db = await indexedDB.open("xupload_vectors", 5);

// Create object store (table)
db.createObjectStore("files", { keyPath: "id" });

// Insert/update
const tx = db.transaction("files", "readwrite");
tx.objectStore("files").put(record);

// Query all
const all = tx.objectStore("files").getAll();

// Index for fast lookup
store.createIndex("websiteHost", "websiteHost", { unique: false });
const results = store.index("websiteHost").getAll("example.com");
```

### 4. TF-IDF (Term Frequency-Inverse Document Frequency)

Classic NLP technique for text similarity:

**Term Frequency (TF):**
How often a word appears in a document (normalized)

**Inverse Document Frequency (IDF):**
How rare a word is across all documents

**TF-IDF Score:**
TF × IDF = Importance of term in document

**Cosine Similarity:**
Measures angle between two vectors
```
similarity = (A · B) / (||A|| × ||B||)
```
Range: 0 (unrelated) to 1 (identical)

**Why TF-IDF?**
- Fast (no API calls)
- Works offline
- Deterministic results
- Good for keyword matching

**Limitations:**
- Doesn't understand meaning
- "passport" ≠ "national ID"
- Requires exact word matches

### 5. Dense Embeddings (Gemini)

Neural network-based text representation:

**How It Works:**
1. Text → Transformer Model → 768-dimensional vector
2. Similar meanings → Close vectors in semantic space
3. "passport" and "national ID" have similar vectors

**Advantages:**
- Understands semantics
- Handles synonyms
- Multilingual support
- Better for fuzzy matching

**Disadvantages:**
- Requires API key (costs money)
- Slower (network latency)
- Needs internet connection

---

## Build & Development

### Setup

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run dev

# Production build
npm run build
```

### Build Process (Vite)

1. **Input Files:**
   - `src/background.ts` → Entry point for background script
   - `src/content.ts` → Entry point for content script
   - `popup.html` → Entry point for popup (imports `src/popup.ts`)

2. **TypeScript Compilation:**
   - Vite uses esbuild for fast TS → JS compilation
   - Type checking via `tsconfig.json`

3. **Bundling:**
   - Each entry creates a separate bundle
   - No code splitting (each bundle is self-contained)
   - Tree-shaking removes unused code

4. **Output:**
   - `dist/background.js`
   - `dist/content.js`
   - `dist/popup.js`
   - `dist/popup.html`

5. **Post-build:**
   - Copies `manifest.dist.json` → `dist/manifest.json`
   - Copies `src/content.css` → `dist/content.css`

### Loading Extension

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/` folder

### Debugging

**Background Script:**
- Click "service worker" link in extension card
- Opens DevTools for background context

**Content Script:**
- Open webpage DevTools (F12)
- Content script logs appear in page console
- Look for `[xUpload]` prefix

**Popup:**
- Right-click extension icon → "Inspect popup"
- Opens DevTools for popup window

---

## Important Concepts

### 1. Chrome Extension Contexts

Three isolated JavaScript execution environments:

**Content Script Context:**
- Has access to page DOM
- Cannot access page's JavaScript variables
- Can read/modify HTML elements
- Limited Chrome API access

**Background Service Worker Context:**
- No DOM access
- Full Chrome API access
- Persists across pages
- Can be terminated by browser (must be stateless)

**Popup Context:**
- Separate window with its own DOM
- Full Chrome API access
- Closes when user clicks away

**Communication:**
Via `chrome.runtime.sendMessage()` / `onMessage`

### 2. Permissions

Declared in `manifest.json`:

- `storage`: Access chrome.storage API
- `alarms`: Schedule periodic tasks
- `activeTab`: Capture tab screenshot, read URL

**File System Access:**
Not a manifest permission, requires user gesture

### 3. Vector Similarity

**Sparse Vectors (TF-IDF):**
- High-dimensional (vocabulary size)
- Most values are 0
- Example: [0, 0, 0.3, 0, 0.7, 0, 0, ...]

**Dense Vectors (Embeddings):**
- Fixed dimension (768 for Gemini)
- All values non-zero
- Example: [0.12, -0.34, 0.56, 0.78, ...]

**Cosine Similarity:**
Works for both sparse and dense vectors

### 4. Rate Limiting

**Gemini API Limits:**
- Free tier: 15 requests per minute
- Paid tier: Higher limits

**Our Strategy:**
- Batch 10 files per API call
- 200ms delay between batches
- User can interrupt scanning

### 5. Privacy

**All data stays local:**
- Files never leave user's computer
- Vectors stored in browser's IndexedDB
- API calls only send text snippets, not full files

**API Mode Considerations:**
- Text content sent to Google Gemini
- Screenshots sent for VLM mode
- User must provide own API key

### 6. Incremental Updates

**Why Incremental Scanning?**
- Faster than full re-scan
- Preserves unchanged file vectors
- Only re-processes modified files

**How It Works:**
1. Compare `size + lastModified` timestamp
2. If unchanged: keep old vector, re-vectorize with new vocabulary
3. If changed: extract text again, vectorize
4. If deleted: remove from index

### 7. Multi-Layer Ranking

**Why Not Just TF-IDF?**
- Single signal is fragile
- Different contexts need different strategies
- History adds personalization

**Layer Interactions:**
- TF-IDF finds semantic matches
- History boosts familiar files
- Path matching helps when TF-IDF fails
- Content overlap finds keyword matches

**Adaptive Weighting:**
- If TF-IDF is confident → trust it more
- If TF-IDF is uncertain → rely on simpler signals
- If user has history → personalize heavily

---

## Glossary

**Background Service Worker:** Background script in Manifest V3, can be terminated by browser
**Content Script:** JavaScript that runs in webpage context
**Cosine Similarity:** Measure of similarity between two vectors (0-1)
**Dense Vector:** Fixed-size embedding from neural network
**Embedding:** Numeric representation of text that captures meaning
**IDF:** Inverse Document Frequency, measures term rarity
**IndexedDB:** Browser database for large structured data
**Manifest V3:** Latest Chrome extension architecture
**MutationObserver:** API to watch for DOM changes
**Sparse Vector:** High-dimensional vector with many zeros
**TF-IDF:** Term Frequency-Inverse Document Frequency, classic text similarity
**Tokenization:** Breaking text into words/terms
**Vector:** Array of numbers representing text/data
**VLM:** Vision-Language Model, AI that understands images and text

---

## Next Steps for Junior Engineers

1. **Start with Content Script:**
   - Read `content.ts`
   - Understand how it detects file inputs
   - Try adding a new detection pattern

2. **Explore TF-IDF:**
   - Read `embeddings.ts`
   - Tokenize some example text
   - Visualize how vectors are created

3. **Study Message Passing:**
   - Trace a match request from content → background → vectordb
   - Add console.logs to see data flow

4. **Experiment with UI:**
   - Modify `content.css` to change button style
   - Adjust panel layout
   - Add new file type icons

5. **Build a Feature:**
   - Add support for new file types
   - Improve ranking algorithm
   - Add keyboard shortcuts

---

## Questions to Explore

1. Why is vocabulary rebuilt every time, not incrementally?
2. How would you optimize for 10,000+ files?
3. What happens if two files have identical scores?
4. How to handle files with non-English names?
5. Could we use localStorage instead of IndexedDB?
6. Why not use a Web Worker for vectorization?
7. How to prevent duplicate file indexing?
8. What if user renames the folder?

---

**Document Version:** 1.1
**Last Updated:** February 2026
