# File in Image

[日本語版 README](README.ja.md)

File in Image hides one arbitrary file inside image pixels and recovers the original file from the generated PNG. Processing stays in the browser.

> **Current development release:** v0.6.0. The BKFI/BKFC format is still under development; the stable v1 compatibility format has not been frozen.

## Features

- PNG / JPEG / WebP carrier input, PNG output
- One arbitrary payload file, up to 32 MiB
- GZIP when the complete inner container becomes smaller
- Optional PBKDF2-HMAC-SHA-256 + AES-256-GCM password protection
- 8×8 adaptive high-detail placement with deterministic LSB-independent Sobel ranking
- v0.2.0–v0.4.0 legacy sequential decode compatibility
- v0.5.0 adaptive format compatibility
- CPU-heavy adaptive analysis / embed / extract in an embedded Blob Web Worker
- Visible processing progress and Cancel controls
- Generation-token stale-result protection when input changes
- SHA-256 verification of recovered source bytes
- Japanese / English UI
- No runtime CDN, API, analytics, telemetry, or file upload
- Direct `file://` use and single-HTML distribution

## Worker processing

v0.6.0 keeps the v0.5.0 file format unchanged. Adaptive image analysis, body embedding, adaptive extraction, and legacy sequential body extraction run in a Worker created from source embedded in the single HTML file.

The app creates one pixel-buffer copy for a Worker task and transfers its ArrayBuffer. This avoids structured-clone duplication of the large image buffer. During embedding, the Worker mutates that transferred pixel buffer in place instead of allocating another full-size output image.

Adaptive placement still uses a reusable maximum-192-entry RGB slot buffer per 8×8 block rather than a full-image slot list.

Canvas decode and PNG encoding remain on the main thread.

## Progress and cancellation

Embed and Extract display the current processing stage and a progress bar. A Cancel button is visible while an operation is active.

When cancellation occurs during Worker processing, the Worker is terminated and its result is discarded. Browser-native asynchronous work such as PBKDF2 or PNG encoding may not be synchronously abortable; cancellation invalidates the operation generation so any later result is ignored.

Selecting a different carrier, payload, or encoded image also invalidates older work. Stale operations cannot replace newer UI state or results.

## Compatibility

v0.6.0 writes the same adaptive development format as v0.5.0:

- `formatVersion=0`
- new output `embeddingMode=1`
- legacy `embeddingMode=0` remains readable

No binary-layout or adaptive-placement change is intended in this release.

## Important note

Adaptive placement does not make the PNG tolerant of image modification. Resizing, cropping, filters, JPEG/lossy WebP conversion, screenshots, or social/messaging recompression can destroy the embedded data. Keep the generated PNG unchanged.

v0.6.0 does not yet include automatic generated-PNG self-verification.

## Privacy

Selected images, files, passwords, Worker buffers, and recovered data remain local. The app keeps `connect-src 'none'` and introduces no third-party runtime dependency.

## Development

Edit `src/index.template.html`; do not hand-edit generated `dist` files.

```bat
build-standalone.bat
```

## License

MIT
