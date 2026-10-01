# File in Image — APP_SPEC.md

## 1. Product identity

- **Name:** File in Image
- **Japanese name:** 画像にファイルを埋め込む
- **Slug:** `file-in-image`
- **Current version:** v0.7.0
- **Repository:** `ttomohisa/htmlapps-file-in-image`
- **Purpose:** Hide one arbitrary file inside image pixels and recover the original bytes later without uploading either file.
- **Release artifacts:** `dist/index.html`, `dist/index.self-extract.html`, and the generated repository-root `file-in-image.html`.

## 2. Current outcome

The app accepts a PNG/JPEG/WebP carrier and one arbitrary file, optionally GZIP-compresses and password-encrypts the inner container, embeds it with adaptive RGB-LSB placement, and recovers the original bytes later.

v0.7.0 keeps the v0.5.0/v0.6.0 file format unchanged and adds **mandatory generated-PNG recovery verification before Save is enabled**.

## 3. Format compatibility

v0.7.0 does not change BKFI/BKFC binary layout or placement semantics.

- BKFI `formatVersion=0`
- legacy `embeddingMode=0`
- current `embeddingMode=1`
- GZIP behavior unchanged
- PBKDF2-HMAC-SHA-256 / AES-256-GCM behavior unchanged
- adaptive 8×8 placement unchanged
- v0.2.0–v0.6.0 generated images remain readable

The stable v1 compatibility format is still not frozen.

## 4. Mandatory generated-PNG verification

After adaptive embedding completes:

1. encode the modified ImageData to a PNG Blob;
2. keep Save disabled;
3. decode that **generated PNG Blob** through the normal image-decoding path;
4. read the BKFI outer header from the decoded pixels;
5. require the decoded header bytes to match the header used for generation;
6. derive the placement seed again from the decoded header;
7. run the normal extraction Worker against the decoded PNG pixels;
8. if encrypted, derive PBKDF2 material again from the password and decoded header, then authenticate/decrypt with AES-256-GCM;
9. if GZIP is set, decompress the recovered body;
10. parse BKFC;
11. SHA-256 the recovered file bytes;
12. require that hash to match both the BKFC digest and the original source digest;
13. require recovered filename, MIME, and byte length to match the selected source file;
14. only then mark the generated PNG as verified and enable Save.

Verification must test the actual Canvas-generated PNG bytes. Reusing the pre-encode ImageData alone is insufficient.

## 5. Save gate

The generated PNG Save action is protected in two layers:

- the Save button remains disabled until verification succeeds;
- the Save click handler also requires `state.encodedVerified === true`.

`state.encodedBlob` must not be committed to reusable application state until the generated-PNG verification succeeds.

If verification fails, Save remains unavailable and the app shows a clear error.

## 6. Encrypted self-verification

Encrypted generated PNGs are verified through the real extraction path.

The self-check must:

- parse the decoded BKFI header;
- derive PBKDF2-HMAC-SHA-256 material again using the entered password, stored salt, and stored iteration count;
- derive the adaptive placement seed again;
- extract the encrypted body from decoded PNG pixels;
- authenticate/decrypt using AES-256-GCM and the decoded BKFI header as AAD;
- continue through optional GZIP and BKFC verification.

The verification must not reuse only a previously derived AES key in place of this decode path.

## 7. Memory behavior during verification

The generated PNG must be decoded back to ImageData. That verification ImageData is disposable.

When sending it to the extraction Worker:

- transfer the decoded verification ImageData buffer directly;
- do not make the normal extra Worker copy;
- after transfer, the disposable verification ImageData may be detached;
- transfer only the recovered body back.

The originally selected carrier ImageData remains intact for retry/reprocessing.

## 8. Progress and cancellation

Self-verification is part of the same Embed operation.

User-facing status:

- creating PNG;
- verifying generated PNG;
- success or failure.

The detailed Worker analysis/extraction stages used during the verification run are mapped to the single user-facing `verifyingGenerated` status.

Cancel during verification must terminate the active verification Worker and invalidate the operation generation.

If cancellation occurs during non-abortable decode / PBKDF2 / decryption / decompression / SHA-256 work, generation invalidation ensures any later result is discarded.

## 9. Stale-result protection

In addition to source-file replacement, v0.7.0 treats embed password/protection changes as source-affecting state.

Changing any of the following during an active Embed invalidates that operation:

- password protection toggle;
- password;
- password confirmation.

An output produced with an older password state must never become saveable after those fields change.

## 10. Verification failure behavior

Any of the following prevents Save:

- generated PNG cannot be decoded;
- BKFI header differs from the generated header;
- adaptive extraction fails;
- AES-GCM authentication fails;
- GZIP expansion fails;
- BKFC parse fails;
- recovered SHA-256 differs;
- recovered filename/MIME/length differs from the source.

Expected cancellation/stale errors remain non-failure control flow. Memory and Worker-support errors keep their dedicated user-facing messages where useful.

Other generated-output validation failures are normalized to `SELF_VERIFY_FAILED`.

## 11. Worker/runtime rules

v0.6.0 Worker architecture remains:

- adaptive analysis / embed / extract run in a Blob Worker;
- legacy mode 0 body extraction runs in that Worker;
- selected source ImageData is copied before Worker transfer;
- generated-PNG verification ImageData is disposable and transferred without that extra copy;
- per-block slot buffer remains capped at 192;
- no runtime external network access;
- runtime dependency count remains zero.

CSP continues to require:

```text
worker-src 'self' blob:
connect-src 'none'
```

## 12. Privacy

- carrier image, payload, generated PNG, recovered bytes, and password stay in browser memory;
- self-verification does not upload or persist the generated PNG;
- password is not stored in localStorage / IndexedDB;
- no external API/CDN/analytics/telemetry.

## 13. v0.7.0 acceptance criteria

- Save is disabled by default.
- Save remains disabled while PNG generation and self-verification are running.
- Generated PNG Blob is decoded again before verification.
- Decoded BKFI header exactly matches the generated header.
- Adaptive body is re-extracted from decoded PNG pixels through the Worker.
- Encrypted output repeats PBKDF2 derivation and AES-GCM authentication/decryption.
- GZIP output is decompressed before BKFC verification.
- Recovered file SHA-256 matches both BKFC and original-source digest.
- Recovered filename, MIME, and byte length match the selected source.
- Save becomes enabled only after all checks pass.
- Save click handler refuses unverified state even if invoked programmatically.
- Verification failure leaves no reusable generated Blob in state.
- Password/protection changes invalidate in-flight or previously generated output.
- disposable verification ImageData is transferred to Worker without an extra full-size copy.
- v0.2.0–v0.6.0 decode compatibility remains unchanged.
- standalone / self-extract checks remain green.

## 14. Roadmap

- **v0.8.0:** UI/mobile/accessibility polish.
- **v0.9.0:** release candidate and cross-browser format freeze.
- **v1.0.0:** stable release; no new scope beyond RC fixes.
