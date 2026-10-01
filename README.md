# File in Image

[日本語版 README](README.ja.md)

File in Image hides one arbitrary file inside image pixels and recovers the original file from the generated PNG. Processing stays in the browser.

> **Current development release:** v0.7.0. The BKFI/BKFC format is still under development; the stable v1 compatibility format has not been frozen.

## Features

- PNG / JPEG / WebP carrier input, PNG output
- One arbitrary payload file, up to 32 MiB
- GZIP when the complete inner container becomes smaller
- Optional PBKDF2-HMAC-SHA-256 + AES-256-GCM password protection
- 8×8 adaptive high-detail placement
- Cancellable Blob Worker processing
- Progress display and stale-result protection
- **Mandatory generated-PNG recovery verification before Save**
- SHA-256 verification of recovered source bytes
- v0.2.0–v0.6.0 development-format decode compatibility
- Japanese / English UI
- No runtime CDN, API, analytics, telemetry, or file upload
- Direct `file://` use and single-HTML distribution

## Generated-PNG verification

v0.7.0 does not enable Save immediately after Canvas produces a PNG.

The generated PNG Blob is decoded again through the normal image path. The app reads its BKFI header, re-extracts the body with the normal Worker, and runs the real recovery path.

For password-protected output, PBKDF2 is run again from the password and decoded header, then AES-256-GCM authenticates/decrypts the recovered body. GZIP is expanded when required and BKFC is parsed.

The recovered file must match the original source SHA-256, filename, MIME, and byte length. Only after all checks succeed does the Save button become available.

This verifies the actual PNG produced by Canvas rather than only checking the pre-encode ImageData.

## Save safety

Save is guarded by both the disabled button state and an internal `encodedVerified` flag. A failed or cancelled verification never leaves a saveable generated Blob in application state.

Changing password protection settings or password text invalidates any in-flight/previous output.

## Memory behavior

The PNG must be decoded again to verify it. That verification ImageData is disposable, so its pixel ArrayBuffer is transferred directly to the extraction Worker instead of first making another full-size Worker copy.

The originally selected carrier remains intact for retry.

## Compatibility

v0.7.0 does not change the v0.5.0/v0.6.0 binary layout or adaptive placement algorithm.

- `formatVersion=0`
- new output `embeddingMode=1`
- legacy `embeddingMode=0` remains readable

## Important note

Automatic recovery verification confirms that the PNG produced by the app can be recovered at generation time. It does not make the PNG resistant to later editing. Resizing, cropping, filters, JPEG/lossy WebP conversion, screenshots, or social/messaging recompression can still destroy the embedded data.

## Privacy

Selected images, files, passwords, generated PNGs, and verification buffers stay local. The app keeps `connect-src 'none'` and introduces no third-party runtime dependency.

## Development

Edit `src/index.template.html`; do not hand-edit generated `dist` files.

```bat
build-standalone.bat
```

## License

MIT
