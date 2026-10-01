# Changelog

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
