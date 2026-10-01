# File in Image

[日本語版 README](README.ja.md)

File in Image hides one arbitrary file inside image pixels and recovers the original file from the generated PNG. Processing stays in the browser.

> **Current development release:** v0.8.0. The BKFI/BKFC format is still under development; the stable v1 compatibility format has not been frozen.

## Features

- PNG / JPEG / WebP carrier input, PNG output
- One arbitrary payload file, up to 32 MiB
- GZIP when the complete inner container becomes smaller
- Optional PBKDF2-HMAC-SHA-256 + AES-256-GCM password protection
- 8×8 adaptive high-detail placement
- Blob Worker processing with progress / Cancel
- Mandatory generated-PNG recovery verification before Save
- SHA-256 verification of recovered source bytes
- v0.2.0–v0.7.0 development-format decode compatibility
- Japanese / English UI
- No runtime CDN, API, analytics, telemetry, or file upload
- Direct `file://` use and single-HTML distribution

## v0.8.0 UI / mobile / accessibility

This release does not change the file format or embedding algorithm.

### File selection

Drop areas remain available for Drag & Drop, but the empty state now contains an explicit native file-selection button. This removes the previous nested-interactive pattern where a drop area exposed as a synthetic button also contained a Change button.

### Keyboard tabs

Embed / Extract use roving tab focus and support Left / Right Arrow, Home, and End.

### Processing state

The active panel exposes `aria-busy`. Status and progress information are announced with localized accessible text, and result focus moves to the completed summary rather than jumping directly to Save.

### Smartphone polish

- larger touch targets;
- 16 px password / filename fields on phones to avoid iOS focus zoom;
- safe-area-aware header / footer / dialog spacing;
- two-line long filename display;
- full-width mode tabs;
- no fixed bottom bar that could cover content.

## Compatibility

v0.8.0 retains the v0.7.0 binary format and runtime behavior:

- `formatVersion=0`
- new output `embeddingMode=1`
- legacy `embeddingMode=0` remains readable
- GZIP / AES-GCM / adaptive placement / Worker / generated-PNG verification unchanged

## Important note

Automatic recovery verification confirms that the PNG produced by the app is recoverable at generation time. Later resizing, cropping, image editing, JPEG/lossy WebP conversion, screenshots, or social/messaging recompression can still destroy the embedded data.

## Privacy

Selected images, files, passwords, Worker buffers, generated PNGs, and recovered data stay local. The app keeps `connect-src 'none'` and introduces no third-party runtime dependency.

## Development

Edit `src/index.template.html`; do not hand-edit generated `dist` files.

```bat
build-standalone.bat
```

## License

MIT
