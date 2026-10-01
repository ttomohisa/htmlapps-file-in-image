# File in Image — APP_SPEC.md

## 1. Product identity

- **Name:** File in Image
- **Japanese name:** 画像にファイルを埋め込む
- **Slug:** `file-in-image`
- **Current version:** v0.6.0
- **Repository:** `ttomohisa/htmlapps-file-in-image`
- **Purpose:** Hide one arbitrary file inside image pixels and recover the original bytes later without uploading either file.
- **Release artifacts:** `dist/index.html`, `dist/index.self-extract.html`, and the generated repository-root `file-in-image.html`.

## 2. Current outcome

The app accepts a PNG/JPEG/WebP carrier and one arbitrary file, optionally GZIP-compresses and password-encrypts the inner container, embeds it with adaptive RGB-LSB placement, and recovers the original bytes later.

v0.6.0 keeps the v0.5.0 BKFI/BKFC format unchanged. This release changes execution architecture: CPU-heavy image analysis, embedding, and extraction run in an embedded cancellable Blob Web Worker.

## 3. Format compatibility

v0.6.0 must not change the v0.5.0 placement or binary format.

- BKFI `formatVersion=0`
- legacy `embeddingMode=0`: sequential body placement used by v0.2.0–v0.4.0
- current `embeddingMode=1`: adaptive 8×8 placement introduced in v0.5.0
- BKFI outer header: 80 bytes
- BKFC fixed inner header: 48 bytes
- GZIP behavior unchanged
- PBKDF2-HMAC-SHA-256 / AES-256-GCM behavior unchanged
- v0.2.0–v0.4.0 sequential images remain readable
- v0.5.0 adaptive images remain readable

The stable v1 format is still not frozen.

## 4. Main-thread responsibilities

The main thread owns:

- file selection / Drag & Drop;
- image decode to Canvas / ImageData;
- capacity and metadata UI;
- BKFC packing and optional GZIP preparation;
- PBKDF2 and AES-GCM via Web Crypto;
- placement-seed derivation;
- PNG encoding through Canvas;
- save/download actions;
- progress, cancel, and stale-result UI state.

Canvas decode and PNG encoding intentionally remain on the main thread in v0.6.0.

## 5. Worker responsibilities

The embedded Blob Worker owns CPU-heavy pixel processing:

- LSB-independent luminance generation;
- 8×8 Sobel block analysis;
- adaptive block ranking and candidate selection;
- deterministic xoshiro128** block/slot ordering;
- `embeddingMode=1` body embedding;
- `embeddingMode=1` body extraction;
- legacy `embeddingMode=0` sequential body extraction.

There is no external Worker file and no runtime network request.

## 6. Worker lifecycle

The Worker source is embedded in the single HTML and exposed through a Blob URL.

CSP must retain:

```text
worker-src 'self' blob:
connect-src 'none'
```

A fresh Worker instance is created per heavy image operation. It is terminated after:

- success;
- Worker error;
- explicit cancellation;
- replacement by a newer operation;
- page hide.

The reusable Worker Blob URL is revoked on page hide.

If Blob Worker creation is unavailable, the operation fails with a clear browser-support error. There is no blocking main-thread fallback for adaptive processing.

## 7. Buffer transfer and memory rules

Persistent selected ImageData must remain usable after cancellation and repeated processing.

For each Worker task:

1. create one `Uint8ClampedArray` copy of selected ImageData;
2. transfer that ArrayBuffer to the Worker;
3. do not structured-clone the large pixel buffer;
4. embed by mutating the Worker-side transferred pixel buffer in place;
5. transfer the modified pixel buffer back to the main thread;
6. extract by transferring only the recovered body buffer back.

Header/body/seed data sent to the Worker are copied before transfer so persistent app state is not detached.

Adaptive RGB-slot storage remains capped at 192 entries per 8×8 block. The Worker must not create a full-image RGB-slot array.

## 8. Progress

Both Embed and Extract show:

- a concise current processing state;
- a progress bar;
- a Cancel button while active.

Worker stages:

- `analyzingImage`
- `embedding`
- `extracting`

Main-thread stages include preparation, KDF/encryption, decryption, GZIP expansion, PNG creation, and verification.

Worker-local progress is mapped into an overall operation range so progress does not reset when control moves between main thread and Worker. Progress is informative, not a duration guarantee.

## 9. Cancellation

Explicit cancellation must:

- increment the generation token;
- terminate the active Worker immediately when present;
- discard any pending result;
- never expose a partial PNG or recovered file;
- preserve selected source files;
- restore usable controls;
- show a concise cancellation status.

PBKDF2, AES-GCM, compression/decompression, and PNG encoding may not support synchronous abort. Cancellation therefore marks their generation stale; any eventual result is discarded.

## 10. Stale-result protection

Every source-changing action creates a new generation.

This includes selecting another carrier, payload, or encoded PNG. Switching away from an actively processing mode also invalidates the active operation.

Before asynchronous work updates state or DOM, its generation must still be current.

An older operation must never:

- replace a newer generated PNG;
- show an older recovered filename;
- re-enable controls for stale input;
- overwrite a newer result/error state.

Starting a replacement Worker terminates the older Worker.

## 11. Adaptive placement invariants

Moving pixel work into the Worker must not alter v0.5.0 semantics:

- 8×8 blocks;
- RGB LSB masked before luminance;
- non-opaque pixels excluded from body capacity and treated as zero luminance;
- integer Sobel score;
- deterministic score comparison and block-index tie break;
- candidate capacity target up to 2× body bits;
- deterministic xoshiro128** ordering;
- maximum 192 per-block slot entries.

For the same image, body, header, and placement seed, v0.6.0 must recover the same body as v0.5.0.

## 12. Privacy and runtime dependencies

- user images/files/passwords stay local;
- Worker buffers stay local;
- no CDN/API/analytics/telemetry;
- no user file or password persistence in localStorage / IndexedDB;
- runtime dependency count remains zero;
- `connect-src 'none'` remains mandatory.

## 13. v0.6.0 acceptance criteria

- adaptive mode 1 Worker embed → extract restores body bytes exactly;
- legacy mode 0 Worker extraction restores existing sequential bodies;
- v0.5.0 adaptive files remain readable;
- v0.2.0–v0.4.0 files remain readable;
- Worker source parses independently;
- main source parses with build placeholders substituted;
- image buffer is transferred, not structured-cloned;
- embed mutates the Worker-side transferred buffer in place;
- per-block slot buffer remains capped at 192;
- visible progress messages are emitted during adaptive analysis and body processing;
- Cancel terminates active Worker work and exposes no partial result;
- generation guards suppress stale non-Worker async results;
- standalone / self-extract template checks remain green;
- Blob Worker CSP remains enabled while runtime network access remains blocked.

## 14. Roadmap

- **v0.7.0:** mandatory generated-PNG self-verification.
- **v0.8.0:** UI/mobile/accessibility polish.
- **v0.9.0:** release candidate and cross-browser format freeze.
- **v1.0.0:** stable release; no new scope beyond RC fixes.
