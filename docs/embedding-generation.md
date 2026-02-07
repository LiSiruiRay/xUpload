# How xUpload Generates Embeddings

## Overview

xUpload creates searchable embeddings for your files using two steps:
1. **Text Extraction** - Convert file content to text
2. **Vectorization** - Transform text into numerical vectors for similarity search

---

## Text Extraction by File Type

**Main function**: [src/embeddings.ts:109-151](../src/embeddings.ts#L109-L151) `extractText(file, filePath)`

### 📄 Text Files
**Extensions**: `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.html`, `.js`, `.ts`, `.py`, `.java`, `.c`, `.cpp`, `.css`, `.log`, `.yaml`, `.toml`, `.ini`, `.rtf`

**Code**: [src/embeddings.ts:118-125](../src/embeddings.ts#L118-L125)
```typescript
if (isTextFile(ext)) {
  try {
    const text = await file.text();
    return `${pathKeywords} ${text.slice(0, 2000)}`;
  } catch {
    return pathKeywords;
  }
}
```

**Process**:
- Read full file content (first 2000 characters)
- Combine with path keywords
- Example: `"resume/cover_letter.txt"` → `"resume cover letter txt [file content...]"`

### 📑 PDF Files
**Extensions**: `.pdf`

**Code**: [src/embeddings.ts:127-138](../src/embeddings.ts#L127-L138)
```typescript
if (ext === "pdf") {
  try {
    const text = await extractPdfText(file);
    if (text.length > 10) {
      return `${pathKeywords} ${text.slice(0, 2000)}`;
    }
    return `${pathKeywords} pdf document`;
  } catch {
    return `${pathKeywords} pdf document`;
  }
}
```

**PDF Parser**: [src/embeddings.ts:162-183](../src/embeddings.ts#L162-L183)
```typescript
async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let raw = "";
  const len = Math.min(bytes.length, 500_000);  // First 500KB
  for (let i = 0; i < len; i++) {
    raw += String.fromCharCode(bytes[i]);
  }

  const parts: string[] = [];
  const btEt = /BT\s([\s\S]*?)ET/g;  // Find BT...ET blocks
  let m;
  while ((m = btEt.exec(raw)) !== null) {
    const tj = /\(([^)]*)\)/g;  // Extract text in parentheses
    let t;
    while ((t = tj.exec(m[1])) !== null) {
      parts.push(t[1]);
    }
  }

  return parts.join(" ").replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
}
```

**Process**:
- Extract text using basic PDF parsing (no external libraries)
- Uses regex to find text between BT/ET markers in PDF structure
- Fallback to path + "pdf document" if extraction fails
- Limit: First 500KB of file, first 2000 characters of extracted text

### 🖼️ Images
**Extensions**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg`, `.tiff`, `.heic`

**Code**: [src/embeddings.ts:141-143](../src/embeddings.ts#L141-L143)
```typescript
if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff", "heic"].includes(ext)) {
  return `${pathKeywords} image photo picture`;
}
```

**Process**:
- Use filename + path segments as keywords
- Add generic descriptors: "image photo picture"
- Example: `"vacation/beach.jpg"` → `"vacation beach jpg image photo picture"`

### 📊 Office Documents
**Extensions**: Word (`.doc`, `.docx`), Excel (`.xls`, `.xlsx`), PowerPoint (`.ppt`, `.pptx`)

**Code**: [src/embeddings.ts:146-148](../src/embeddings.ts#L146-L148)
```typescript
if (["doc", "docx"].includes(ext)) return `${pathKeywords} document word`;
if (["xls", "xlsx"].includes(ext)) return `${pathKeywords} spreadsheet excel`;
if (["ppt", "pptx"].includes(ext)) return `${pathKeywords} presentation slides`;
```

**Process**:
- Filename + path + document type keywords
- Word: adds "document word"
- Excel: adds "spreadsheet excel"
- PowerPoint: adds "presentation slides"

### 🗂️ Other Files

**Code**: [src/embeddings.ts:150](../src/embeddings.ts#L150)
```typescript
return pathKeywords;
```

**Process**:
- Filename + path segments only
- Example: `"data/report.zip"` → `"data report zip"`

### Path Keywords Generation

**Code**: [src/embeddings.ts:110-116](../src/embeddings.ts#L110-L116)
```typescript
const name = file.name.replace(/[._-]/g, " ");
const ext = file.name.split(".").pop()?.toLowerCase() || "";

const pathKeywords = filePath
  ? filePath.replace(/[/\\._-]/g, " ")
  : name;
```

All separators (`/`, `\`, `.`, `_`, `-`) are replaced with spaces to create searchable keywords.

---

## Vectorization Methods

### Method 1: TF-IDF (Default, Local)

**Process**:

#### 1. Tokenization

**Code**: [src/embeddings.ts:24-40](../src/embeddings.ts#L24-L40)
```typescript
export function tokenize(text: string): string[] {
  const normalized = text.toLowerCase().trim();
  const tokens: string[] = [];

  // Extract alphanumeric words
  const words = normalized.match(/[a-z0-9]+/g) || [];
  tokens.push(...words);

  // Extract CJK characters
  const cjk = normalized.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || [];
  tokens.push(...cjk);

  // Create CJK bigrams for better matching
  for (let i = 0; i < cjk.length - 1; i++) {
    tokens.push(cjk[i] + cjk[i + 1]);
  }

  return tokens;
}
```

**Stop word filtering**: [src/embeddings.ts:10-22](../src/embeddings.ts#L10-L22), [src/embeddings.ts:43-45](../src/embeddings.ts#L43-L45)

#### 2. Build Vocabulary

**Code**: [src/embeddings.ts:52-70](../src/embeddings.ts#L52-L70)
```typescript
export function buildVocabulary(docs: string[][]): void {
  const df: Map<string, number> = new Map();  // Document frequency
  const N = docs.length;

  // Count how many documents contain each term
  for (const doc of docs) {
    const seen = new Set(doc);
    for (const term of seen) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  // Build vocab and calculate IDF
  vocabulary = new Map();
  idfValues = new Map();
  let idx = 0;
  for (const [term, count] of df) {
    vocabulary.set(term, idx++);
    idfValues.set(term, Math.log((N + 1) / (count + 1)) + 1);  // IDF formula
  }
}
```

#### 3. Create TF-IDF Vectors

**Code**: [src/embeddings.ts:76-105](../src/embeddings.ts#L76-L105)
```typescript
export function vectorize(tokens: string[]): number[] {
  const dim = vocabulary.size;
  if (dim === 0) return [];

  const vec = new Array<number>(dim).fill(0);

  // Calculate term frequency
  const tf: Map<string, number> = new Map();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  const maxTf = Math.max(...tf.values(), 1);

  // TF-IDF: (tf/maxTf) * idf
  for (const [term, count] of tf) {
    const idx = vocabulary.get(term);
    if (idx !== undefined) {
      vec[idx] = (count / maxTf) * (idfValues.get(term) || 1);
    }
  }

  // L2 normalization
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  }

  return vec;
}
```

**Characteristics**:
- ✅ Fully local, no API calls
- ✅ Fast
- ✅ Works offline
- ⚠️ Lower accuracy for semantic matching

### Method 2: Gemini API (Optional)

**Batch embedding code**: [src/background.ts:519-541](../src/background.ts#L519-L541)
```typescript
if (config.apiKey && config.mode !== "tfidf") {
  servicesCalled.add("gemini.batchEmbed");
  logWorkflowStep(workflowId, "service.gemini.batchEmbed.start", {
    fileCount: files.length,
    mode: config.mode,
  });
  try {
    const texts = files.map((f) => f.text.slice(0, 2000));
    const vectors = await batchEmbed(texts, config.apiKey, 10, (done, total) => {
      logWorkflowStep(workflowId, "service.gemini.batchEmbed.progress", { done, total });
    });
    denseVectors = vectors;
    logWorkflowStep(workflowId, "service.gemini.batchEmbed.done", {
      vectorCount: vectors.length,
    });
  } catch (err) {
    logWorkflowError(workflowId, "service.gemini.batchEmbed.failed", err);
  }
}
```

**Process**:
1. Send extracted text to Gemini Embedding API
2. Receive 768-dimension dense vector
3. Store alongside TF-IDF vector

**Characteristics**:
- ✅ Better semantic understanding
- ✅ Matches concepts, not just keywords
- ⚠️ Requires API key
- ⚠️ Requires internet connection
- ⚠️ API costs apply

---

## Storage

**Type definition**: [src/vectordb.ts:7-17](../src/vectordb.ts#L7-L17)
```typescript
export interface VectorRecord {
  id: string;              // unique key (file path)
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: number;
  vector: number[];        // TF-IDF embedding vector
  denseVector?: number[];  // Gemini embedding (768-dim, optional)
  textPreview: string;     // first N chars of extracted text
}
```

**Upsert code**: [src/background.ts:544-558](../src/background.ts#L544-L558)
```typescript
for (let i = 0; i < files.length; i++) {
  const f = files[i];
  const vec = vectorize(allTokens[i]);  // TF-IDF
  await upsert({
    id: f.path,
    name: f.name,
    path: f.path,
    type: f.type,
    size: f.size,
    lastModified: f.lastModified,
    vector: vec,                    // TF-IDF vector
    denseVector: denseVectors[i],   // Gemini vector (optional)
    textPreview: f.text.slice(0, 500),
  });
}
```

All embeddings are stored in **IndexedDB** (local browser database)

---

## Matching Process

When you click the recommendation button:

### 1. Extract Context
**Code**: Content script extracts surrounding HTML (implementation in content.ts)

### 2. Vectorize Context
**Code**: [src/background.ts:200-201](../src/background.ts#L200-L201)
```typescript
const queryTokens = tokenize(req.context);
const queryVec = vectorize(queryTokens);
```

### 3. Search Using Cosine Similarity

**Cosine similarity function**: [src/vectordb.ts:109-118](../src/vectordb.ts#L109-L118)
```typescript
function cosine(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**Search code**: [src/vectordb.ts:125-153](../src/vectordb.ts#L125-L153)
```typescript
export async function search(
  queryVector: number[],
  topN: number = 5,
  acceptFilter?: string
): Promise<SearchResult[]> {
  const all = await getAll();
  let candidates = all;

  // Filter by file type if specified
  if (acceptFilter) {
    const accepts = acceptFilter.split(",").map((s) => s.trim().toLowerCase());
    const filtered = all.filter((r) => {
      const ext = "." + r.name.split(".").pop()?.toLowerCase();
      const mime = r.type.toLowerCase();
      return accepts.some(
        (a) =>
          a === ext ||
          a === mime ||
          (a.endsWith("/*") && mime.startsWith(a.replace("/*", "/")))
      );
    });
    if (filtered.length > 0) candidates = filtered;
  }

  return candidates
    .map((record) => ({ record, score: cosine(queryVector, record.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .filter((r) => r.score > 0);
}
```

### 4. Multi-Signal Ranking

**Ranking code**: [src/background.ts:272-317](../src/background.ts#L272-L317)
```typescript
const ranked = allRecords.map((r) => {
  const tfidfScore = r.score;

  // Upload history boost (decays over 90 days)
  let historyBoost = 0;
  let historyCount = 0;
  const hist = historyMap.get(r.record.id);
  if (hist) {
    historyCount = hist.count;
    const daysAgo = (now - hist.lastTs) / ONE_DAY;
    historyBoost = Math.max(0.1, 1.0 - daysAgo / 90);
  }

  // Path/filename keyword overlap
  const pathNameScore = computePathNameScore(r.record.path, req.context);

  // Content keyword overlap
  const contentOverlap = computeContentOverlap(r.record.textPreview, req.context);

  // Path memory (recently used paths on this site)
  const pathMemoryBoost = usedPathSet.has(r.record.path) ? 1 : 0;

  // Dynamic weights based on signal quality
  const weights = tfidfUseful
    ? (hasHistory
      ? { tfidf: 0.42, history: 0.28, path: 0.14, content: 0.08, pathMemory: 0.08 }
      : { tfidf: 0.56, history: 0.00, path: 0.22, content: 0.14, pathMemory: 0.08 })
    : (hasHistory
      ? { tfidf: 0.00, history: 0.36, path: 0.30, content: 0.20, pathMemory: 0.14 }
      : { tfidf: 0.00, history: 0.00, path: 0.44, content: 0.42, pathMemory: 0.14 });

  const finalScore =
    tfidfScore * weights.tfidf +
    historyBoost * weights.history +
    pathNameScore * weights.path +
    contentOverlap * weights.content +
    pathMemoryBoost * weights.pathMemory;

  return { ...r, score: finalScore };
});
```

**Ranking signals**:
- **TF-IDF similarity** (42-56% weight when useful)
- **Upload history** (28-36% weight) - previously used files on this website
- **Path/filename keywords** (14-44% weight) - keyword overlap
- **Content keywords** (8-42% weight) - text preview overlap
- **Path memory** (8-14% weight) - recently selected paths

---

## Complete Workflow

### Indexing Phase

**Entry point**: [src/background.ts:491-580](../src/background.ts#L491-L580) `handleBuildIndex()`

```
User selects folder via popup → Popup reads files → Sends to background.ts

Background receives FileEntry[] with:
  {
    path: "resume/Resume0915.pdf",
    name: "Resume0915.pdf",
    type: "application/pdf",
    text: "resume Resume0915 pdf [John Doe\nSoftware Engineer\n...]"
  }

1. Tokenize all files (background.ts:509)
   → [["resume", "0915", "pdf", "john", "doe", ...], ...]

2. Build vocabulary (background.ts:510)
   → vocabulary = Map { "resume" => 0, "0915" => 1, "pdf" => 2, ... }
   → idfValues = Map { "resume" => 1.2, "0915" => 3.5, "pdf" => 1.1, ... }

3. Vectorize each file (background.ts:546)
   → [0.12, 0.03, 0.45, ...] (TF-IDF vector)

4. Optional: Get Gemini embeddings (background.ts:519-541)
   → [0.45, -0.22, ...] (768-dim dense vector)

5. Store in IndexedDB (background.ts:547-558)
   → VectorRecord saved with both vectors

6. Save vocabulary for future queries (background.ts:563-567)
```

### Matching Phase

**Entry point**: [src/background.ts:186-359](../src/background.ts#L186-L359) `handleMatch()`

```
User visits page with <input type="file">
  → Content script detects input
  → User clicks recommendation button
  → Content script extracts context: "Upload your resume"

1. Vectorize query (background.ts:200-201)
   "Upload your resume"
   → tokenize → ["upload", "your", "resume"]
   → vectorize → [0.05, 0.01, 0.89, ...] (using same vocabulary)

2. Search database (background.ts:208-209)
   → For each file: cosine(query_vec, file_vec)
   → Resume0915.pdf: 0.78 (high similarity!)
   → passport.jpg: 0.12
   → tax_return.pdf: 0.05

3. Compute additional signals (background.ts:272-317)
   Resume0915.pdf:
     - tfidfScore: 0.78
     - historyBoost: 0.8 (used 2 days ago on this site)
     - pathNameScore: 0.6 ("resume" keyword match)
     - contentOverlap: 0.4 ("resume" in content)
     - pathMemoryBoost: 1 (recently selected path)

   Final score: 0.78×0.42 + 0.8×0.28 + 0.6×0.14 + 0.4×0.08 + 1×0.08 = 0.73

4. Rank and return top 5 (background.ts:319-320)
   → [Resume0915.pdf (73%), Resume0912.pdf (68%), ...]

5. Show in recommendation panel
```
