# xUpload Privacy Policy

**Last updated:** February 2026

---

## Summary

xUpload is a local-first Chrome extension. **Your files never leave your device.** All indexing, matching, and history tracking happen entirely inside your browser. The only exception is the optional Gemini API mode, described below.

---

## What xUpload Stores (All Local, On Your Device)

All data is stored in your browser's **IndexedDB** or **chrome.storage.local** — sandboxed to this extension, never transmitted to any server.

| Data | Where stored | Why |
|------|-------------|-----|
| File names, paths, and text excerpts | IndexedDB | Used to match files to upload fields |
| TF-IDF vectors (numerical representations of file content) | IndexedDB | Used for similarity search |
| A reference to the folder you authorized | IndexedDB | Used to read files on demand |
| Upload history (which file you uploaded, to which site, when) | IndexedDB | Used to rank frequently-used files higher |
| Your API key (if you provide one) | chrome.storage.local | Used to call the Gemini API on your behalf |
| Extension settings (mode, auto-rescan interval) | chrome.storage.local | Used to restore your preferences |

---

## What xUpload Does NOT Do

- Does not upload your files to any server
- Does not collect your browsing history
- Does not track you across websites
- Does not send analytics or usage data anywhere
- Does not share any data with third parties
- Does not store anything in the cloud

---

## Optional Gemini API Mode

If you choose to enter a Gemini API key and switch to **Fast** or **VLM** mode, xUpload will send limited data to **Google's Gemini API** on your behalf:

| Mode | What is sent to Google |
|------|----------------------|
| Fast | Short text excerpts from your files (used to generate embedding vectors) |
| VLM | A cropped screenshot of the upload area on the current page + surrounding text |

**Your files themselves are never sent.** Only extracted text snippets (up to ~2,000 characters per file) are transmitted, solely to generate matching vectors.

This data is sent directly from your browser to Google's API using your own API key. xUpload does not act as an intermediary server. Google's handling of this data is governed by [Google's Privacy Policy](https://policies.google.com/privacy) and the [Gemini API Terms of Service](https://ai.google.dev/gemini-api/terms).

The Gemini API mode is **opt-in**. The default TF-IDF mode makes no network requests and works entirely offline.

---

## Permissions Explained

| Permission | Why it's needed |
|------------|----------------|
| `storage` | Save your settings and vocabulary index locally |
| `alarms` | Schedule automatic folder rescans |
| `activeTab` | Capture a screenshot of the upload area (VLM mode only, triggered by your click) |
| Access to all websites (`<all_urls>`) | Detect `<input type="file">` elements on any site — there is no way to predict which sites you will upload files on |

---

## How to Delete Your Data

To remove all data xUpload has stored:

1. Open the xUpload popup
2. Click **"Clear all data"** (clears the file index and upload history)

Or to remove everything completely:

1. Go to `chrome://extensions`
2. Find xUpload → click **Remove**
3. Chrome will delete all associated IndexedDB and chrome.storage data automatically

---

## Children's Privacy

xUpload does not knowingly collect any data from children under 13. The extension stores only local file metadata that you explicitly authorize.

---

## Changes to This Policy

If this policy changes in a material way, the **Last updated** date at the top will be updated. Significant changes will also be noted in the extension's changelog.

---

## Contact

If you have questions about this privacy policy, open an issue on the [GitHub repository](https://github.com/LiSiruiRay/xUpload).
