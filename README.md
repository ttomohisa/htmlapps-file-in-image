# File in Image

[日本語版 README](README.ja.md)

File in Image hides one arbitrary file inside image pixels and recovers the original file from the generated PNG. Processing stays in the browser.

> **Current development release:** v0.3.0. The BKFI/BKFC format is still under development; the stable v1 compatibility format has not been frozen.

## Features

- Carrier images: PNG / JPEG / WebP
- Payload: one arbitrary file, up to 32 MiB
- Output: PNG
- GZIP-compresses the complete BKFC container when that actually makes it smaller
- Shows original size, exact stored size, compression decision, image capacity, and fit state before embedding
- Deterministic sequential 1-bit LSB embedding in RGB channels of fully opaque pixels
- Verifies recovered file bytes with SHA-256
- Drag & Drop / file picker
- Japanese / English UI
- No runtime CDN, API, analytics, telemetry, or file upload
- Designed for direct `file://` use and single-HTML distribution

## Usage

### Embed

1. Choose a PNG, JPEG, or WebP carrier image.
2. Choose one file to embed.
3. The app prepares the BKFC container and tries GZIP.
4. Confirm the exact stored size fits the image capacity.
5. Run **Embed in image**.
6. Save the generated PNG.

### Extract

1. Switch to **Extract**.
2. Choose a PNG created by this tool.
3. If the body is GZIP-compressed, it is decompressed automatically.
4. The recovered file is verified against the embedded SHA-256.
5. Save the original file.

## Compression behavior

GZIP is applied to the full BKFC container, including filename, MIME metadata, SHA-256, and file bytes. The GZIP result is used only when it is smaller than the uncompressed container.

If CompressionStream is unavailable, embedding falls back to an uncompressed body. Recovering an image that contains a GZIP body requires DecompressionStream.

Compression improves capacity only; it does not provide confidentiality.

## Important note

Embedded data is stored in image-pixel least-significant bits. Resizing, cropping, editing, JPEG conversion, lossy WebP conversion, screenshots, or recompression by social/messaging services can make the payload unrecoverable. Keep the generated PNG unchanged.

v0.3.0 does not yet implement encryption, adaptive high-detail placement, or automatic generated-PNG self-verification.

## Privacy

Selected images and files are processed in browser memory. The app keeps `connect-src 'none'`, does not upload file contents, and does not persist file bytes in localStorage or IndexedDB.

## Development

The repository follows the current `htmlapps-template` contract. Edit `src/index.template.html`; do not hand-edit generated `dist` files.

On Windows:

```bat
build-standalone.bat
```

## Browser support

Current Chrome / Edge / Firefox / Safari / Android Chrome / iOS Safari are targeted. Direct `file://` opening is a product requirement.

## License

MIT
