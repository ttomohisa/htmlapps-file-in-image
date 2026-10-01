# File in Image

[日本語版 README](README.ja.md)

File in Image hides one arbitrary file inside image pixels and recovers the original file from the generated PNG. Processing stays in the browser.

> **Current development release:** v0.4.0. The BKFI/BKFC format is still under development; the stable v1 compatibility format has not been frozen.

## Features

- Carrier images: PNG / JPEG / WebP
- Payload: one arbitrary file, up to 32 MiB
- Output: PNG
- Optional password protection
- PBKDF2-HMAC-SHA-256 with 600,000 iterations and a random 16-byte salt
- AES-256-GCM with a random 12-byte IV and 128-bit authentication tag
- Filename and MIME metadata are encrypted together with the payload when password protection is enabled
- The BKFI outer header is authenticated as AES-GCM additional data
- GZIP-compresses the complete BKFC container when that actually makes it smaller
- Shows exact stored size and capacity before embedding, including encryption overhead
- Verifies recovered file bytes with SHA-256
- Japanese / English UI
- No runtime CDN, API, analytics, telemetry, or file upload
- Designed for direct `file://` use and single-HTML distribution

## Password protection

Password protection is optional. When enabled, the app compresses the BKFC container when useful and then encrypts the whole stored inner body with AES-256-GCM.

The password is encoded exactly as entered: the app does not trim or Unicode-normalize it. It is not written to localStorage or IndexedDB.

The BKFI header stores the KDF parameters, random salt, and IV needed to derive the key again. Those values are not secret. The complete header is authenticated through AES-GCM AAD, so authenticated header changes cause decryption to fail.

A wrong password or modified authenticated data is reported as an authentication failure without exposing the inner filename or MIME metadata.

## GZIP

GZIP is applied before encryption and only when it makes the complete BKFC container smaller. Compression improves capacity only; it is not encryption.

## Important note

Embedded data is stored in image-pixel least-significant bits. Resizing, cropping, editing, JPEG conversion, lossy WebP conversion, screenshots, or recompression by social/messaging services can make the payload unrecoverable. Keep the generated PNG unchanged.

v0.4.0 does not yet implement adaptive high-detail placement or automatic generated-PNG self-verification.

## Privacy

Selected images, files, and passwords are processed in browser memory. The app keeps `connect-src 'none'`, does not upload file contents, and does not persist file bytes or passwords in browser storage.

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
