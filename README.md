# File in Image

[日本語版 README](README.ja.md)

File in Image hides one arbitrary file inside image pixels and recovers the original file from the generated PNG. Processing stays in the browser.

> **Current development release:** v0.5.0. The BKFI/BKFC format is still under development; the stable v1 compatibility format has not been frozen.

## Features

- PNG / JPEG / WebP carrier input, PNG output
- One arbitrary payload file, up to 32 MiB
- GZIP when the complete inner container becomes smaller
- Optional PBKDF2-HMAC-SHA-256 + AES-256-GCM password protection
- Filename and MIME are encrypted with the payload when protection is enabled
- 8×8 adaptive placement that prioritizes higher-detail image regions
- LSB-independent Sobel scoring so extraction recomputes the same ranking after embedding
- Deterministic randomized placement without allocating a full-image RGB-slot array
- SHA-256 verification of recovered source bytes
- Japanese / English UI
- No runtime CDN, API, analytics, telemetry, or file upload
- Direct `file://` use and single-HTML distribution

## Adaptive placement

New v0.5.0 output uses BKFI `embeddingMode=1`. The first 214 fully opaque pixels remain reserved for the BKFI header. The body is placed separately.

The image is divided into 8×8 blocks. Detail is measured with Sobel gradients after masking the least-significant RGB bits, so writing body bits does not change the detail ranking used during extraction. Higher-detail blocks are selected first until roughly twice the required body capacity is available, then the selected blocks and their RGB slots are traversed in a deterministic pseudorandom order.

For encrypted output, placement randomization also depends on PBKDF2-derived material. For unencrypted output it depends on a random placement salt stored in the BKFI header.

This placement is an image-quality technique, not an encryption guarantee.

## Backward compatibility

v0.5.0 still reads development images created by v0.2.0–v0.4.0 with sequential `embeddingMode=0`. New v0.5.0 images use adaptive `embeddingMode=1`.

## Password protection

Password protection remains optional. New encrypted output uses PBKDF2-HMAC-SHA-256 at 600,000 iterations, a random 16-byte salt, AES-256-GCM with a random 12-byte IV, and a 128-bit tag. The complete BKFI header is authenticated as AES-GCM AAD.

Passwords are not trimmed or Unicode-normalized and are not persisted in browser storage.

## Important note

Adaptive placement does not make the PNG tolerant of image modification. Resizing, cropping, filters, JPEG/lossy WebP conversion, screenshots, or social/messaging recompression can destroy the embedded data. Keep the generated PNG unchanged.

v0.5.0 does not yet include Worker-based processing or automatic generated-PNG self-verification.

## Privacy

Selected images, files, and passwords are processed in browser memory. The app keeps `connect-src 'none'`, does not upload user data, and does not persist file bytes or passwords.

## Development

The repository follows the current `htmlapps-template` contract. Edit `src/index.template.html`; do not hand-edit generated `dist` files.

```bat
build-standalone.bat
```

## License

MIT
