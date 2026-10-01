# File in Image — APP_SPEC.md

## 1. Product identity

- **Name:** File in Image
- **Japanese name:** 画像にファイルを埋め込む
- **Slug:** `file-in-image`
- **Current version:** v0.9.0
- **Repository:** `ttomohisa/htmlapps-file-in-image`
- **Purpose:** Hide one arbitrary file inside image pixels and recover the original bytes later without uploading either file.
- **Release artifacts:** `dist/index.html`, `dist/index.self-extract.html`, and the generated repository-root `file-in-image.html`.

## 2. Release-candidate scope

v0.9.0 is the release candidate for the stable v1 line.

No new user-facing feature scope is added here. The release focuses on:

- freezing the compatibility-format candidate;
- preserving version 0 decode compatibility;
- rejecting malformed or unsupported stable headers more strictly;
- automated format regression in CI;
- manual cross-browser / device regression before v1.0.

If a blocker is found after this release that requires changing binary semantics, the format version must be bumped instead of silently reinterpreting version 1.

## 3. Compatibility-format versioning

### New output

v0.9.0 writes:

- BKFI outer format version: **1**
- BKFC inner container version: **1**
- embedding mode: **1** (adaptive)
- outer header length: 80 bytes
- inner fixed header length: 48 bytes

### Backward compatibility

Decoder support remains:

- BKFI version 0 + embedding mode 0
- BKFI version 0 + embedding mode 1
- BKFI version 1 + embedding mode 1
- BKFC version 0
- BKFC version 1

Stable BKFI version 1 with embedding mode 0 is invalid.

Versions greater than 1 are rejected as unsupported.

## 4. BKFI outer header — stable candidate

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

Stable version 1 rules:

- format version = `1`
- embedding mode = `1`
- header length = `80`
- offset 10..11 = zero
- offsets 64..79 = zero
- unknown flag bits are rejected
- if unencrypted, KDF ID / iterations / salt / IV must be zero
- if encrypted, KDF ID = PBKDF2-HMAC-SHA-256 and iterations must remain within parser bounds
- placement salt remains 16 bytes
- complete BKFI header remains AES-GCM AAD when encrypted

Flags:

- bit 0: AES-GCM encrypted body
- bit 1: GZIP-compressed body

KDF IDs:

- 0: none
- 1: PBKDF2-HMAC-SHA-256

## 5. BKFC inner container — stable candidate

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

Stable version 1 rules:

- version = `1`
- reserved byte = zero
- fixed header length = `48`
- payload must remain within the 32 MiB application limit
- exact total length must match the encoded metadata + file length
- filename and MIME must decode as valid UTF-8

Version 0 remains readable for compatibility.

## 6. Frozen adaptive placement semantics

Stable version 1 continues the v0.5.0 adaptive algorithm unchanged.

- 8×8 blocks
- only fully opaque pixels are body-eligible
- first 214 fully opaque pixels remain reserved for the BKFI header
- RGB least-significant bits are masked before detail analysis
- luminance: `(77R + 150G + 29B) >> 8`
- integer Sobel score
- deterministic average-score comparison
- lower block index breaks exact score ties
- candidate capacity grows to approximately 2× body bits when possible
- deterministic xoshiro128** ordering
- maximum 192 per-block RGB slot entries
- one LSB per RGB channel
- alpha is never modified

The placement-domain string remains exactly:

```text
BKFI-placement-v0.5
```

The historical name is retained because changing it would change placement compatibility.

## 7. Compression and encryption

Processing order remains:

```text
BKFC
→ GZIP only when smaller
→ AES-256-GCM when password protection is enabled
→ adaptive placement
→ PNG
→ mandatory generated-PNG recovery verification
```

New encrypted output remains:

- PBKDF2-HMAC-SHA-256
- 600,000 iterations
- random 16-byte salt
- AES-256-GCM
- random 12-byte IV
- 128-bit GCM tag
- full BKFI header as AAD

Passwords remain exact UTF-8 input and are not trimmed, normalized, logged, or persisted.

## 8. Generated-PNG verification

Save remains blocked until the actual Canvas-generated PNG Blob is:

1. decoded again;
2. parsed for BKFI;
3. re-extracted through the normal Worker;
4. decrypted/authenticated when needed;
5. decompressed when needed;
6. parsed as BKFC;
7. checked against SHA-256, filename, MIME, and source byte length.

This behavior is unchanged from v0.7.0.

## 9. Runtime architecture

Unchanged from v0.8.0:

- adaptive analysis/embed/extract in an embedded Blob Worker
- legacy mode 0 extraction in the same Worker
- cancellable Worker lifecycle
- generation-token stale-result protection
- transferred pixel buffers
- no full-image RGB-slot list
- no runtime third-party dependency
- `connect-src 'none'`
- `worker-src 'self' blob:`

## 10. v0.9.0 automated regression

`scripts/check-format-regression.mjs` is part of `scripts/check-repository.ps1`.

The regression verifies:

- new BKFI output writes version 1;
- new BKFC output writes version 1;
- BKFI/BKFC version 0 remains readable;
- unsupported future versions are rejected;
- stable version 1 + mode 0 is rejected;
- unknown flags are rejected;
- reserved stable fields are rejected when non-zero;
- unexpected unencrypted KDF material is rejected;
- PBKDF2 lower-bound validation remains enforced;
- adaptive mode 1 Worker round-trip restores body bytes exactly;
- legacy mode 0 Worker extraction remains readable.

CI explicitly sets up Node.js 24 before running repository checks.

## 11. Manual release-candidate regression

Automated CI does not replace real browser/device testing.

Before v1.0, manually verify at minimum:

- Chrome desktop
- Edge desktop
- Firefox desktop
- Safari desktop
- Android Chrome
- iOS Safari

Also verify:

- Japanese / English
- direct `file://` use
- standalone readable HTML
- self-extract HTML
- unencrypted output
- GZIP-compressible and incompressible payloads
- password-protected output
- wrong password
- v0 legacy image recovery
- cancellation / stale-result behavior
- long filenames
- mobile file picker/drop-zone compact state
- password show/hide controls
- generated-PNG self-verification
- no runtime network request
- modified/recompressed image failure states

Detailed manual checklist is stored in `docs/RELEASE_CANDIDATE_CHECKLIST.ja.md` and `docs/RELEASE_CANDIDATE_CHECKLIST.md`.

## 12. Privacy

- files, images, passwords, generated PNGs, and recovered bytes remain local;
- no user-data upload;
- no runtime CDN/API/analytics/telemetry;
- file/password bytes are not persisted in browser storage;
- language preference may be stored locally;
- runtime network access remains blocked by CSP.

## 13. v0.9.0 acceptance criteria

- new output uses BKFI/BKFC version 1;
- version 0 decode compatibility remains;
- stable version 1 semantics are not changed after RC except for blocker fixes;
- automated format regression is mandatory in repository checks;
- standalone and self-extract verification remain green;
- app UI remains v0.8 UX plus the PR #9 file-picker/password fixes;
- manual browser/device checklist exists and is completed before v1.0.

## 14. Next milestone

- **v1.0.0:** complete RC manual regression, fix blockers only, refresh README/screenshots/version/release artifacts, then release.
