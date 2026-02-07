Changes Summary
Feature 1: Enhanced Context Encoding (3 modes)
New file: apiEmbeddings.ts — Gemini API wrapper with:

getEmbedding() — Gemini text-embedding-004 (768-dim vectors)
batchEmbed() — parallel batch embedding with rate limiting
describeWithVLM() — Gemini 2.0 Flash Vision to describe what file a page needs
Three modes selectable in popup:

Mode	Indexing	Matching
TF-IDF (default)	TF-IDF only	TF-IDF cosine search
Fast	TF-IDF + Gemini embedding	Gemini embedding cosine search
VLM	TF-IDF + Gemini embedding	Screenshot → Gemini Vision → description → embedding search
Modified files:

popup.html — API key input + mode dropdown
popup.ts — load/save API config to chrome.storage.local
background.ts — MATCH_REQUEST_ENHANCED handler, CAPTURE_TAB handler, batch embedding during indexing
content.ts — doMatch() routes to enhanced/TF-IDF based on config, cropScreenshot() for VLM
vectordb.ts — denseVector field, denseSearch() function
types.ts — XUploadConfig, MatchRequestEnhanced
manifest.json + manifest.dist.json — added activeTab permission
Feature 2: File Picker Navigation
When clicking "Use this file" in preview:

Opens native file dialog via showOpenFilePicker({ startIn: parentDirHandle }) — navigated to the file's actual directory
User sees and clicks the file
File fills the input
Path saved to persistent memory via SAVE_USED_PATH → IndexedDB
Falls back to direct auto-fill if showOpenFilePicker is unsupported.

New functions: getParentDirHandle() in content.ts, saveUsedPath()/getUsedPaths() in vectordb.ts

gemini要key吗，然后给我一个test指南
是的，Gemini 需要 API key，但有免费额度，对这个项目完全够用。

获取 Gemini API Key
去 Google AI Studio
登录 Google 账号 → 点击 "Create API Key"
复制 key（格式类似 AIzaSy...）
免费额度：text-embedding-004 每分钟 1500 请求，gemini-2.0-flash 每分钟 15 请求，日常使用完全够。

测试指南
1. 加载扩展

npm run build
Chrome → chrome://extensions → 开发者模式 → Load unpacked → 选 dist/ 目录
（如果已加载过，点刷新按钮）

2. 测试 TF-IDF 模式（无需 API key）
点击扩展图标 → popup 打开
确认 Mode 选的是 "TF-IDF (no API)"
点 "Select folder" → 选一个有文件的文件夹
等索引完成，显示文件数量
打开一个有 file upload 的网页（比如你截图里的 UCSD 申请页）
点 ⚡ 按钮 → 应该看到推荐文件列表
点推荐文件 → 预览 → 点 "Use this file" → 原生文件选择对话框弹出，定位到文件所在目录
选择文件 → 自动填入 input
3. 测试 Fast 模式（Gemini Embedding）
Popup 里填入 Gemini API Key
Mode 切换为 "Fast (Gemini Embedding)"
重新点 "Select folder" 扫描（会同时生成 TF-IDF + Gemini 768维向量）
打开 DevTools → background console 看到 Embedding progress: X/Y
去有 upload 的页面 → 点 ⚡ → 推荐结果应该语义更准确
比如页面写 "Upload your passport" → 即使文件名没有 passport，但内容是护照的 PDF 也能匹配
4. 测试 VLM 模式（Screenshot + Vision）
Mode 切换为 "VLM (Screenshot + Gemini)"
去有 upload 的页面 → 点 ⚡
Background console 会显示 VLM: analyzing screenshot... 和 VLM 返回的描述
推荐结果基于截图视觉分析 + 文本上下文，应该最精准
5. 测试路径记忆
在某个网站上传文件后
关闭页面 → 重新打开同一网站
点 ⚡ → 之前上传过的文件应该有 "Used Xx here" 标记且排名更高
调试技巧
Content script 日志: 在网页上 F12 → Console，搜 [xUpload]
Background 日志: chrome://extensions → 扩展的 "Service Worker" 链接 → Console
API 错误: 如果 Gemini 返回 403/429，检查 key 是否正确、是否超出免费额度