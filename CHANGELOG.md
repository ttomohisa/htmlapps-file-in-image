# Changelog

## Unreleased

- Add localized Clear selection controls for the carrier and payload, including pending loads, while retaining the other input and password settings.
- Fix overlapping carrier/payload preparation silently discarding an independently selected input. Keep same-input latest-wins behavior and invalidate stale generated output.
- Preserve input loading/error feedback, release cleared carrier previews, and restore keyboard focus to Choose.
- Add deterministic synthetic selection/cancellation and recovery regressions to the repository check. Binary formats, crypto, compression, placement, and local-only processing are unchanged.

## 1.0.0 - 2026-10-02

- Release the first stable File in Image version.
- Adopt BKFI format version 1 and BKFC container version 1 unchanged from the v0.9.0 release candidate.
- Keep version 0 decoding for v0.2.0-v0.8.0 compatibility.
- Keep adaptive placement, GZIP, PBKDF2-HMAC-SHA-256, AES-256-GCM, Worker processing, cancellation, and generated-PNG verification unchanged from the RC.
- Rewrite Japanese and English README files using the PDF Organizer release-documentation structure.
- Pin Node.js 24 in the GitHub Pages deployment workflow before repository verification.
- Refresh desktop/mobile Japanese and English screenshots for the stable release.
- Keep runtime dependencies at zero and runtime network access blocked.

## 0.9.0 - 2026-10-02

- Promote new BKFI output to compatibility-format version 1.
- Promote new BKFC output to container version 1.
- Keep BKFI/BKFC version 0 decoding for v0.2.0-v0.8.0 compatibility.
- Require adaptive embedding mode 1 for stable BKFI version 1.
- Reject unknown future format versions instead of interpreting them as current data.
- Validate stable reserved fields and unexpected unencrypted KDF material.
- Keep the v0.5 adaptive placement semantics and placement domain unchanged.
- Add Node-based format regression covering version 0/1 parse behavior, reserved fields, adaptive round-trip, and legacy mode 0 decode.
- Run format regression from the standard repository check and pin Node.js 24 in validation CI.
- Add manual cross-browser/device RC checklists for the v1.0 release gate.

## 0.8.0 - 2026-10-01

- Remove nested interactive semantics from Drag & Drop areas and add explicit empty-state file-picker buttons.
- Add roving tabindex plus Arrow / Home / End keyboard behavior to Embed / Extract tabs.
- Add localized progress labels, aria-valuetext, atomic status messages, and aria-busy processing state.
- Move completion focus to result summaries before Save actions.
- Increase mobile touch targets and add safe-area-aware layout spacing.
- Use 16 px mobile password/filename inputs to avoid iOS focus zoom.
- Allow long filenames to wrap to two lines on small screens and preserve full names in title/alt metadata.
- Add explicit password description relationships.
- Fix hidden selected-file summaries appearing before a file is loaded.
- Compact selected-file drop zones while preserving Drag & Drop and Change actions.
- Add show / hide controls to all password fields.
- Rename the local-processing badge to `完全ローカル処理` / `Fully local processing`.
- Reset Extract to a clean empty state before validating a replacement file and scroll completed result summaries into view.
- Keep binary format, Worker algorithm, crypto, GZIP, adaptive placement, and generated-PNG verification unchanged.

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
