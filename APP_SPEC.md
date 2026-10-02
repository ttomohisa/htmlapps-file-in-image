# File in Image — APP_SPEC.md

## 1. Product identity

- **Name:** File in Image
- **Japanese name:** 画像にファイルを埋め込む
- **Slug:** `file-in-image`
- **Current version:** v1.0.0
- **Repository:** `ttomohisa/htmlapps-file-in-image`
- **Purpose:** Hide one arbitrary file inside image pixels and recover the original bytes later without uploading either file.
- **Release artifacts:** `dist/index.html`, `dist/index.self-extract.html`, and generated repository-root `file-in-image.html`.

## 2. Stable release

v1.0.0 is the first stable release.

The compatibility format frozen during v0.9.0 is adopted unchanged:

- BKFI outer format version: **1**
- BKFC inner container version: **1**
- current embedding mode: **1** (adaptive)
- BKFI outer header: **80 bytes**
- BKFC fixed inner header: **48 bytes**

Version 0 images produced by v0.2.0–v0.8.0 remain readable.

Future binary changes that alter version 1 semantics require a new format version.

## 3. Supported input and output

Carrier image input:

- PNG
- JPEG
- WebP

Output:

- PNG only

Payload:

- one arbitrary file
- maximum 32 MiB

The output PNG must be preserved byte-for-byte at the image-content level. Resizing, cropping, filters, screenshots, JPEG/lossy WebP conversion, or social/messaging recompression can destroy the embedded data.

## 4. Stable BKFI outer header

All multi-byte integers are big-endian.

| Offset | Size | Field |
| ---: | ---: | --- |
| 0 | 4 | ASCII `BKFI` |
| 4 | 1 | format version |
| 5 | 1 | embedding mode |
| 6 | 1 | flags |
| 7 | 1 | KDF ID |
| 8 | 2 | header length |
| 10 | 2 | reserved |
| 12 | 4 | stored body length |
| 16 | 4 | PBKDF2 iterations |
| 20 | 16 | KDF salt |
| 36 | 12 | AES-GCM IV |
| 48 | 16 | placement salt |
| 64 | 16 | reserved |

Version 1 requirements:

- format version = `1`
- embedding mode = `1`
- header length = `80`
- offsets 10..11 = zero
- offsets 64..79 = zero
- unknown flag bits are rejected
- unencrypted output requires KDF ID, iteration count, salt, and IV to remain zero
- encrypted output uses PBKDF2-HMAC-SHA-256
- full BKFI header is AES-GCM AAD

Flags:

- bit 0: AES-GCM encrypted body
- bit 1: GZIP-compressed body

KDF IDs:

- 0: none
- 1: PBKDF2-HMAC-SHA-256

Decoder compatibility:

- BKFI v0 + mode 0
- BKFI v0 + mode 1
- BKFI v1 + mode 1

BKFI v1 + mode 0 is invalid.

## 5. Stable BKFC inner container

| Offset | Size | Field |
| ---: | ---: | --- |
| 0 | 4 | ASCII `BKFC` |
| 4 | 1 | container version |
| 5 | 1 | reserved |
| 6 | 2 | fixed header length |
| 8 | 2 | filename UTF-8 byte length |
| 10 | 2 | MIME UTF-8 byte length |
| 12 | 4 | original file size |
| 16 | 32 | SHA-256 of original bytes |
| 48 | variable | filename, MIME, original bytes |

Version 1 requirements:

- version = `1`
- reserved byte = zero
- fixed header length = `48`
- original payload ≤ 32 MiB
- exact encoded length must match
- filename and MIME must be valid UTF-8

BKFC version 0 remains readable.

## 6. Adaptive embedding

The stable placement semantics are unchanged from the v0.5.0 implementation:

- 8×8 blocks
- only fully opaque pixels are body-eligible
- first 214 fully opaque pixels store the BKFI header
- RGB LSB is masked before detail analysis
- luminance: `(77R + 150G + 29B) >> 8`
- integer Sobel scoring
- deterministic score comparison with lower block index tie-break
- candidate capacity grows to approximately 2× body bits when possible
- xoshiro128** deterministic ordering
- maximum 192 RGB slots buffered per block
- one LSB per RGB channel
- alpha is never modified

The placement-domain string remains:

```text
BKFI-placement-v0.5
```

Its historical name is intentionally retained because changing it would break compatibility.

## 7. Compression

The complete BKFC container is passed through native GZIP only when the compressed result is smaller.

If `CompressionStream('gzip')` is unavailable, new output remains uncompressed.

Extraction of GZIP data requires `DecompressionStream('gzip')`.

Decompression is size-limited to prevent unbounded expansion.

## 8. Password protection

Optional password protection uses:

- PBKDF2-HMAC-SHA-256
- 600,000 iterations for new output
- random 16-byte KDF salt
- AES-256-GCM
- random 12-byte IV
- 128-bit authentication tag
- complete BKFI header as AAD

Password text is encoded exactly as entered in UTF-8. It is not trimmed or Unicode-normalized.

Passwords are not persisted in localStorage or IndexedDB.

## 9. Generated-PNG verification

Save remains disabled until the actual generated PNG Blob passes the normal recovery pipeline:

1. decode the PNG Blob again;
2. parse BKFI from decoded pixels;
3. re-extract through the Worker;
4. derive/decrypt again if password protected;
5. GZIP-decompress when required;
6. parse BKFC;
7. verify SHA-256;
8. verify filename, MIME, and byte length.

A failed self-check leaves no saveable generated Blob in application state.

## 10. Worker and cancellation

CPU-heavy adaptive image analysis, embedding, and extraction run in an embedded Blob Worker.

- source image buffers are transferred rather than structured-cloned where appropriate
- embed mutates the transferred pixel buffer in place
- no full-image RGB-slot list
- active Worker can be terminated on Cancel
- generation tokens suppress stale results from non-abortable browser-native operations
- changing source/password state invalidates older output

## 11. Mobile and accessibility

Stable UI requirements include:

- no horizontal scrolling at narrow smartphone widths
- approximately 44 px primary touch targets
- safe-area-aware header/footer/dialog layout
- 16 px mobile password/filename inputs
- long filename handling
- compact selected-file drop zones with replacement Drag & Drop
- password show/hide controls
- accessible tabs with roving tabindex and Arrow/Home/End support
- `aria-busy`, status, progress labels, and result focus

## 12. Privacy and runtime network policy

- selected images, payloads, passwords, generated PNGs, and recovered bytes remain on the device
- runtime dependencies: zero
- no CDN/API/analytics/telemetry
- no user file upload
- `connect-src 'none'`
- Blob Worker permitted with `worker-src 'self' blob:`
- only language preference may be stored locally

## 13. Automated regression

`scripts/check-format-regression.mjs` is part of `scripts/check-repository.ps1`.

It verifies:

- BKFI/BKFC version 1 output
- version 0 decode compatibility
- future-version rejection
- reserved-field validation
- adaptive mode 1 Worker round-trip
- legacy mode 0 Worker decode

GitHub validation and Pages deployment pin Node.js 24 before repository checks.

## 14. Release acceptance

v1.0.0 release artifacts must satisfy:

- repository check passes
- format regression passes
- readable standalone verification passes
- self-extract verification passes
- CSP blocks runtime network access
- favicon and app icon use the canonical `assets/favicon.svg`
- Japanese / English README are current
- desktop / mobile screenshots are current
- no new external runtime dependency
- no binary-format semantic change from v0.9.0 RC
