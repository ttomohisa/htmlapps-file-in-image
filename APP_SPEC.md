# File in Image — APP_SPEC.md

## 1. Product identity

- **Name:** File in Image
- **Japanese name:** 画像にファイルを埋め込む
- **Slug:** `file-in-image`
- **Current version:** v0.5.0
- **Repository:** `ttomohisa/htmlapps-file-in-image`
- **One-sentence purpose:** Hide one arbitrary file inside image pixels and recover the original bytes later without uploading either file.
- **Release artifacts:** `dist/index.html`, `dist/index.self-extract.html`, and the generated repository-root `file-in-image.html`.

## 2. Current outcome

The app accepts a PNG/JPEG/WebP carrier and one arbitrary file, optionally GZIP-compresses and password-encrypts the inner container, embeds it into image RGB least-significant bits, and recovers the original bytes later. User-selected images, files, and passwords stay inside the browser.

v0.5.0 changes new output from sequential body placement to deterministic adaptive placement while retaining decode compatibility with v0.2.0–v0.4.0 images.

## 3. Format status

v0.5.0 remains a development format and **is not the final v1 compatibility freeze**.

- BKFI `formatVersion`: `0`
- legacy `embeddingMode`: `0` — sequential body placement used by v0.2.0–v0.4.0
- current `embeddingMode`: `1` — 8×8 adaptive high-detail placement
- BKFI outer header: 80 bytes
- BKFC inner fixed header: 48 bytes
- GZIP: optional, only when smaller
- Encryption: optional AES-256-GCM
- KDF: PBKDF2-HMAC-SHA-256, 600,000 iterations for new encrypted output
- Integrity: AES-GCM authentication when encrypted plus SHA-256 of recovered source bytes
- Output: PNG only

The final v1 format/version must not be frozen before cross-browser adaptive-placement regression passes.

## 4. BKFI outer header — 80 bytes

All integer fields are big-endian.

| Offset | Size | Field |
| ---: | ---: | --- |
| 0 | 4 | ASCII `BKFI` |
| 4 | 1 | format version (`0`) |
| 5 | 1 | embedding mode (`0` legacy or `1` adaptive) |
| 6 | 1 | flags |
| 7 | 1 | KDF ID |
| 8 | 2 | header length (`80`) |
| 10 | 2 | reserved (`0`) |
| 12 | 4 | stored body length |
| 16 | 4 | PBKDF2 iteration count |
| 20 | 16 | PBKDF2 salt |
| 36 | 12 | AES-GCM IV |
| 48 | 16 | placement salt |
| 64 | 16 | reserved |

Flags:

- bit 0: AES-GCM encrypted body
- bit 1: GZIP-compressed inner body
- bits 2–7: reserved

KDF IDs:

- `0`: none
- `1`: PBKDF2-HMAC-SHA-256

For adaptive mode, the 16-byte placement salt is generated with `crypto.getRandomValues()` for every output image. It is part of the authenticated BKFI header when encryption is enabled.

## 5. Header placement

The 80-byte BKFI header remains deliberately simple and deterministic so all supported versions can find the information needed to decode the body.

- Eligible header pixels: fully opaque pixels only.
- Header order: row-major opaque pixels, RGB channel order.
- Header size: 640 bits.
- Reserved header pixels: first 214 eligible opaque pixels.
- Header pixels are excluded from body placement in both legacy and adaptive modes.

## 6. Adaptive body placement — embeddingMode 1

### 6.1 Blocks

- Image is divided into 8×8 blocks.
- Partial edge blocks are allowed.
- Body capacity of a block is three slots for every fully opaque body-eligible pixel in that block.

### 6.2 LSB-independent luminance

Detail analysis must not change after body bits are written. Before computing luminance, the least-significant bit of every RGB channel is ignored:

```text
R' = R & 0xFE
G' = G & 0xFE
B' = B & 0xFE
Y  = (77R' + 150G' + 29B') >> 8
```

Alpha is not modified or included in luminance.

### 6.3 Detail score

- Use 3×3 Sobel gradients on the LSB-masked luminance image.
- Per analyzed pixel score: `abs(Gx) + abs(Gy)`.
- Block score is compared as an average without floating-point division.
- Comparison uses integer cross multiplication: `scoreA * countB` vs `scoreB * countA`.
- Exact ties are resolved by lower block index first.

This deterministic tie rule is part of the development format.

### 6.4 Candidate region

- Blocks with no body capacity are ignored.
- Blocks are ranked from higher detail to lower detail.
- Candidate blocks are accumulated until candidate capacity reaches at least `min(totalCapacity, bodyBits × 2)`.
- If the payload requires nearly all carrier capacity, the candidate set naturally expands to all available blocks.
- This rule prioritizes high-detail areas while avoiding unnecessary concentration of all bits into the smallest possible region.

### 6.5 Randomized placement

Candidate block order and per-block RGB slot order are pseudorandomized with deterministic xoshiro128**.

- New output stores a random 16-byte placement salt.
- Unencrypted placement seed: SHA-256 of a fixed domain separator plus placement salt.
- Encrypted placement seed: SHA-256 of the same domain separator plus the second 256 bits of PBKDF2-derived material plus placement salt.
- The first 256 PBKDF2-derived bits are imported as the AES-256-GCM key.
- The second 256 bits are used only to derive the placement seed and are cleared from the temporary byte buffer after use.
- Randomized placement is **not** described as encryption.

Payload bits are distributed proportionally across the selected candidate blocks. A reusable maximum-192-slot buffer is used for per-block shuffling; the implementation must not allocate a full-image RGB-slot array.

## 7. Backward compatibility

Decoder behavior:

- `embeddingMode=0`: use the v0.2.0–v0.4.0 sequential RGB-LSB body order.
- `embeddingMode=1`: recompute deterministic adaptive block ranking and randomized placement.
- Encrypted mode 0 images remain decryptable with their stored PBKDF2 parameters.
- Unencrypted/GZIP combinations from prior development releases remain readable.

New v0.5.0 output always uses `embeddingMode=1`.

## 8. Compression and encryption

Processing order for new output:

```text
BKFC
→ GZIP if smaller
→ AES-256-GCM if password enabled
→ adaptive placement
→ PNG
```

Extraction reverses this order.

Password protection requirements remain:

- PBKDF2-HMAC-SHA-256
- 600,000 iterations for new output
- random 16-byte KDF salt
- AES-256-GCM
- random 12-byte IV
- 128-bit GCM tag
- complete BKFI header used as AES-GCM AAD
- password is not trimmed or Unicode-normalized
- password is not persisted

## 9. Capacity and transparency

- Only pixels with `alpha === 255` are eligible.
- Alpha is never modified.
- Exactly one LSB per R/G/B channel is used.
- Theoretical body capacity remains based on eligible pixels minus the 214 reserved header pixels.
- Adaptive mode changes *where* body bits are written, not the maximum capacity.
- Payload hard limit remains 32 MiB before compression/encryption.
- Carrier maximum remains 32,000,000 pixels and 8192 px per dimension.

## 10. UX

The primary flow stays simple. Technical terms such as Sobel, xoshiro128**, and PBKDF2 placement material belong in README/help/spec rather than the main controls.

User-visible processing states include:

- preparing file
- compressing file
- preparing encryption key
- encrypting/decrypting
- analyzing image detail
- embedding/extracting
- creating PNG
- verifying recovered bytes

Help must explain factually that v0.5.0 prioritizes detailed image areas to reduce visible LSB changes, but that this does **not** make the payload resistant to resizing, JPEG conversion, cropping, filters, screenshots, or messaging-service recompression.

## 11. Privacy

- Carrier image, payload, password, generated PNG, and recovered bytes remain in browser memory.
- Runtime external network access remains blocked with `connect-src 'none'`.
- No CDN, analytics, telemetry, remote font, or external API.
- No file/password persistence in localStorage or IndexedDB.
- No third-party runtime dependency.

## 12. v0.5.0 acceptance criteria

- v0.2.0–v0.4.0 `embeddingMode=0` images remain readable.
- New output writes `embeddingMode=1`.
- Header remains readable through the existing deterministic 214-pixel reservation.
- LSB-masked detail ranking is identical before and after body embedding.
- 8×8 block score ordering is deterministic, including exact-score ties.
- Candidate capacity is at least twice the payload bit count when carrier capacity allows it.
- Adaptive embed → extract restores body bytes exactly.
- Unencrypted + adaptive round-trip succeeds.
- GZIP + adaptive round-trip succeeds.
- AES-GCM + adaptive round-trip succeeds.
- GZIP + AES-GCM + adaptive round-trip succeeds.
- Wrong password fails authentication.
- Changing a non-header embedded body bit causes AES-GCM or SHA-256 validation failure.
- Per-block shuffling never uses more than 192 slot entries.
- Runtime dependency count remains zero.
- Standalone and self-extract template checks remain green.

## 13. Roadmap after v0.5.0

- **v0.6.0:** Worker, progress/cancel, stale-result protection, memory/performance regression.
- **v0.7.0:** mandatory generated-PNG self-verification.
- **v0.8.0:** UI/mobile/accessibility polish.
- **v0.9.0:** release candidate and cross-browser format freeze.
- **v1.0.0:** stable release; no new scope beyond RC fixes.
