# Changelog

## 0.7.0 - 2026-10-01

- Require generated-PNG recovery verification before Save becomes available.
- Decode the actual Canvas-generated PNG Blob and re-read the BKFI header.
- Re-extract the generated PNG through the normal Worker path.
- Repeat PBKDF2 + AES-GCM authentication/decryption for encrypted self-verification.
- Verify recovered SHA-256 against both BKFC and the original source digest.
- Verify recovered filename, MIME, and byte length against the selected source.
- Keep generated Blob state unavailable when verification fails or is cancelled.
- Guard Save with both button disabled state and an internal verified flag.
- Transfer disposable verification ImageData directly to the Worker to avoid one extra full-size copy.
- Invalidate in-flight output when password/protection fields change.

## 0.6.0 - 2026-10-01

- Move adaptive image analysis, embed, adaptive extract, and legacy body extraction into an embedded Blob Web Worker.
- Keep the v0.5.0 BKFI/BKFC format and adaptive placement algorithm unchanged.
- Transfer copied pixel buffers to the Worker to avoid structured-clone duplication.
- Mutate the transferred embed buffer in place and keep the 192-entry per-block slot cap.
- Add visible progress bars and Cancel actions for Embed / Extract.
- Terminate active Workers on cancel, stale replacement, mode switch, or page hide.
- Add generation-token guards so stale async crypto / compression / PNG results cannot update newer UI state.
- Keep runtime dependencies at zero and preserve `connect-src 'none'` with Blob Worker CSP support.

## 0.5.0 - 2026-10-01

- Add adaptive `embeddingMode=1` for all new output while retaining legacy mode 0 decoding.
- Rank 8×8 blocks with deterministic Sobel detail scores computed from LSB-masked RGB luminance.
- Select high-detail candidate blocks until approximately twice the required body capacity is available.
- Add random per-image placement salt and deterministic xoshiro128** block/slot shuffling.
- Use the second 256 bits of PBKDF2-derived material when deriving encrypted placement order.
- Avoid a full-image RGB-slot array by shuffling at most 192 slots per block.
- Keep v0.2.0–v0.4.0 sequential development images readable.
- Keep runtime dependencies at zero and preserve the template privacy/CSP contract.

## 0.4.0 - 2026-10-01

- Add optional password protection with PBKDF2-HMAC-SHA-256 and AES-256-GCM.
- Use 600,000 PBKDF2 iterations, random 16-byte salt, random 12-byte IV, and a 128-bit GCM tag.
- Encrypt filename, MIME, SHA-256, and payload bytes together inside the stored inner body.
- Authenticate the complete BKFI outer header as AES-GCM additional data.
- Include GCM tag overhead in capacity checks before embedding.
- Detect encrypted images before extraction and request a password only when required.
- Keep v0.2.0/v0.3.0 unencrypted images readable.
- Keep runtime dependencies at zero and preserve the template privacy/CSP contract.

## 0.3.0 - 2026-10-01

- Add browser-native GZIP compression for the complete BKFC container.
- Use the compressed body only when it is smaller than the uncompressed container.
- Show exact stored-body size and compression state before embedding.
- Add a BKFI GZIP flag while keeping v0.2.0 flags=0 images readable.
- Decompress GZIP bodies with a bounded streaming reader before BKFC parsing.
- Keep runtime dependencies at zero and preserve the template privacy/CSP contract.

## 0.2.0

- Add working image-to-file round trip with sequential 1-bit RGB LSB embedding.
- Add 80-byte BKFI development header and BKFC payload container.
- Add SHA-256 verification for recovered payload bytes.
- Add PNG/JPEG/WebP carrier input and PNG output.
- Add opaque-pixel capacity checks, 32 MiB payload ceiling, 32 MP carrier ceiling, drag-and-drop, bilingual UI, editable output names, and local-only processing.

## 0.1.0

- Establish File in Image product specification and BKFI/BKFC development container.
