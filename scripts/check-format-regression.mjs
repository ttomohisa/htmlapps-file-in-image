import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = readFileSync(resolve(root, 'src/index.template.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrow(fn, code, label) {
  try {
    fn();
  } catch (error) {
    if (error?.message === code) return;
    throw new Error(`${label}: expected ${code}, got ${error?.message || error}`);
  }
  throw new Error(`${label}: expected ${code}, but no error was thrown`);
}

async function expectThrowAsync(fn, code, label) {
  try {
    await fn();
  } catch (error) {
    if (error?.message === code) return;
    throw new Error(`${label}: expected ${code}, got ${error?.message || error}`);
  }
  throw new Error(`${label}: expected ${code}, but no error was thrown`);
}

function sliceBetween(startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`Could not locate source segment: ${startToken}`);
  return source.slice(start, end);
}

function bytesEqual(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

// Freeze markers that are part of the candidate stable format.
for (const marker of [
  'const LEGACY_FORMAT_VERSION = 0;',
  'const STABLE_FORMAT_VERSION = 1;',
  'const CURRENT_FORMAT_VERSION = STABLE_FORMAT_VERSION;',
  'const LEGACY_INNER_VERSION = 0;',
  'const STABLE_INNER_VERSION = 1;',
  'const CURRENT_INNER_VERSION = STABLE_INNER_VERSION;',
  'const LEGACY_EMBEDDING_MODE = 0;',
  'const ADAPTIVE_EMBEDDING_MODE = 1;',
  "const PLACEMENT_DOMAIN = encoder.encode('BKFI-placement-v0.5');",
  'const OUTER_HEADER_BYTES = 80;',
  'const INNER_FIXED_BYTES = 48;',
  'const PBKDF2_ITERATIONS = 600_000;',
  'const KDF_SALT_BYTES = 16;',
  'const AES_GCM_IV_BYTES = 12;',
  'const AES_GCM_TAG_BYTES = 16;'
]) {
  assert(source.includes(marker), `Missing frozen format marker: ${marker}`);
}

const packInnerSource = sliceBetween('async function packInner', 'function parseInner');
const parseInnerSource = sliceBetween('function parseInner', 'function buildOuter');
const buildOuterSource = sliceBetween('function buildOuter', 'function parseOuter');
const parseOuterSource = sliceBetween('function parseOuter', 'function getBit');

const factory = new Function('crypto', `
  const MAX_PAYLOAD_BYTES = 32 * 1024 * 1024;
  const OUTER_HEADER_BYTES = 80;
  const INNER_FIXED_BYTES = 48;
  const LEGACY_FORMAT_VERSION = 0;
  const STABLE_FORMAT_VERSION = 1;
  const CURRENT_FORMAT_VERSION = STABLE_FORMAT_VERSION;
  const LEGACY_INNER_VERSION = 0;
  const STABLE_INNER_VERSION = 1;
  const CURRENT_INNER_VERSION = STABLE_INNER_VERSION;
  const LEGACY_EMBEDDING_MODE = 0;
  const ADAPTIVE_EMBEDDING_MODE = 1;
  const CURRENT_EMBEDDING_MODE = ADAPTIVE_EMBEDDING_MODE;
  const FLAG_ENCRYPTED = 0x01;
  const FLAG_GZIP = 0x02;
  const KDF_NONE = 0;
  const KDF_PBKDF2_SHA256 = 1;
  const PBKDF2_MIN_ITERATIONS = 100_000;
  const PBKDF2_MAX_ITERATIONS = 2_000_000;
  const KDF_SALT_BYTES = 16;
  const AES_GCM_IV_BYTES = 12;
  const AES_GCM_TAG_BYTES = 16;
  const PLACEMENT_SALT_BYTES = 16;
  const MAX_BODY_BYTES = MAX_PAYLOAD_BYTES + INNER_FIXED_BYTES + 131070 + AES_GCM_TAG_BYTES;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });

  function writeAscii(bytes, offset, text) {
    for (let i = 0; i < text.length; i += 1) bytes[offset + i] = text.charCodeAt(i);
  }
  function readAscii(bytes, offset, length) {
    let out = '';
    for (let i = 0; i < length; i += 1) out += String.fromCharCode(bytes[offset + i]);
    return out;
  }
  function mimeOrDefault(file) { return file.type || 'application/octet-stream'; }
  async function sha256(bytes) { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); }

  ${packInnerSource}
  ${parseInnerSource}
  ${buildOuterSource}
  ${parseOuterSource}

  return { packInner, parseInner, buildOuter, parseOuter, sha256 };
`);

const api = factory(webcrypto);

const payload = new Uint8Array(4096);
for (let i = 0; i < payload.length; i += 1) payload[i] = (i * 73 + 19) & 255;
const file = { name: '資料-rc-テスト.bin', type: 'application/octet-stream' };

const inner = await api.packInner(file, payload);
assert(inner[4] === 1, 'New BKFC output must use version 1.');
assert(inner[5] === 0, 'BKFC reserved byte must be zero.');

const parsedInner = api.parseInner(inner);
assert(parsedInner.filename === file.name, 'BKFC filename round-trip failed.');
assert(parsedInner.mime === file.type, 'BKFC MIME round-trip failed.');
assert(bytesEqual(parsedInner.fileBytes, payload), 'BKFC payload round-trip failed.');
assert(bytesEqual(parsedInner.expectedHash, await api.sha256(payload)), 'BKFC SHA-256 mismatch.');

const legacyInner = inner.slice();
legacyInner[4] = 0;
assert(bytesEqual(api.parseInner(legacyInner).fileBytes, payload), 'BKFC version 0 compatibility failed.');

const futureInner = inner.slice();
futureInner[4] = 2;
expectThrow(() => api.parseInner(futureInner), 'CORRUPT', 'future BKFC version');

const reservedInner = inner.slice();
reservedInner[5] = 1;
expectThrow(() => api.parseInner(reservedInner), 'CORRUPT', 'BKFC reserved byte');

const placementSalt = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
const stableHeader = api.buildOuter(inner.length, { mode: 1, placementSalt });
assert(stableHeader[4] === 1, 'New BKFI output must use version 1.');
assert(stableHeader[5] === 1, 'New BKFI output must use adaptive mode 1.');

const parsedStable = api.parseOuter(stableHeader);
assert(parsedStable.version === 1 && parsedStable.mode === 1, 'BKFI version 1 parse failed.');

const legacyAdaptive = stableHeader.slice();
legacyAdaptive[4] = 0;
assert(api.parseOuter(legacyAdaptive).version === 0, 'BKFI version 0 adaptive compatibility failed.');

const legacySequential = stableHeader.slice();
legacySequential[4] = 0;
legacySequential[5] = 0;
legacySequential.fill(0, 48, 64);
assert(api.parseOuter(legacySequential).mode === 0, 'BKFI version 0 sequential compatibility failed.');

const stableSequential = stableHeader.slice();
stableSequential[5] = 0;
expectThrow(() => api.parseOuter(stableSequential), 'CORRUPT', 'stable mode 0 rejection');

const futureHeader = stableHeader.slice();
futureHeader[4] = 2;
expectThrow(() => api.parseOuter(futureHeader), 'UNSUPPORTED_FORMAT', 'future BKFI version');

const unknownFlags = stableHeader.slice();
unknownFlags[6] |= 0x80;
expectThrow(() => api.parseOuter(unknownFlags), 'CORRUPT', 'unknown BKFI flags');

const reserved16 = stableHeader.slice();
reserved16[10] = 1;
expectThrow(() => api.parseOuter(reserved16), 'CORRUPT', 'BKFI reserved16');

const reservedTail = stableHeader.slice();
reservedTail[64] = 1;
expectThrow(() => api.parseOuter(reservedTail), 'CORRUPT', 'BKFI reserved tail');

const unexpectedKdfMaterial = stableHeader.slice();
unexpectedKdfMaterial[20] = 1;
expectThrow(() => api.parseOuter(unexpectedKdfMaterial), 'CORRUPT', 'unencrypted KDF material');

const salt = Uint8Array.from({ length: 16 }, (_, i) => (i * 11 + 7) & 255);
const iv = Uint8Array.from({ length: 12 }, (_, i) => (i * 17 + 5) & 255);
const encryptedHeader = api.buildOuter(64, {
  mode: 1,
  encrypted: true,
  iterations: 600_000,
  salt,
  iv,
  placementSalt
});
const parsedEncrypted = api.parseOuter(encryptedHeader);
assert(parsedEncrypted.encrypted && parsedEncrypted.iterations === 600_000, 'Stable encrypted BKFI parse failed.');

const badIterations = encryptedHeader.slice();
new DataView(badIterations.buffer).setUint32(16, 99_999, false);
expectThrow(() => api.parseOuter(badIterations), 'CORRUPT', 'PBKDF2 lower bound');

expectThrow(
  () => api.buildOuter(inner.length, { mode: 1 }),
  'CRYPTO_UNAVAILABLE',
  'missing placement salt'
);

// Exercise the actual Worker implementation for adaptive mode 1 and legacy mode 0.
const workerSource = sliceBetween('function imageWorkerMain()', 'function getImageWorkerUrl()').trim();
const messages = [];
const selfMock = {
  onmessage: null,
  postMessage(message) { messages.push(message); }
};
new Function('self', `${workerSource}; imageWorkerMain();`)(selfMock);
assert(typeof selfMock.onmessage === 'function', 'Worker handler was not initialized.');

const width = 256;
const height = 256;
const original = new Uint8ClampedArray(width * height * 4);
for (let pixel = 0, offset = 0; pixel < width * height; pixel += 1, offset += 4) {
  const x = pixel % width;
  const y = Math.floor(pixel / width);
  original[offset] = (x * 13 + y * 7 + (x * y) % 251) & 255;
  original[offset + 1] = (x * 3 + y * 17 + (x ^ y)) & 255;
  original[offset + 2] = (x * 19 + y * 5 + ((x * 11) ^ y)) & 255;
  original[offset + 3] = (x > 20 && x < 28 && y > 20 && y < 28) ? 180 : 255;
}

const body = new Uint8Array(4096);
for (let i = 0; i < body.length; i += 1) body[i] = (i * 47 + 13) & 255;
const seed = new Uint8Array(32);
for (let i = 0; i < seed.length; i += 1) seed[i] = (i * 29 + 7) & 255;
const workerHeader = api.buildOuter(body.length, { mode: 1, placementSalt });

messages.length = 0;
selfMock.onmessage({ data: {
  operation: 'embed',
  width,
  height,
  imageBuffer: new Uint8ClampedArray(original).buffer,
  headerBuffer: new Uint8Array(workerHeader).buffer,
  bodyBuffer: new Uint8Array(body).buffer,
  seedBuffer: new Uint8Array(seed).buffer
}});
const embedResult = messages.find(message => message.type === 'result');
assert(embedResult?.imageBuffer instanceof ArrayBuffer, 'Adaptive Worker embed did not return an image buffer.');

messages.length = 0;
selfMock.onmessage({ data: {
  operation: 'extract',
  width,
  height,
  imageBuffer: embedResult.imageBuffer.slice(0),
  mode: 1,
  bodyLength: body.length,
  seedBuffer: new Uint8Array(seed).buffer
}});
const adaptiveExtract = messages.find(message => message.type === 'result');
assert(adaptiveExtract?.bodyBuffer instanceof ArrayBuffer, 'Adaptive Worker extract did not return a body buffer.');
assert(bytesEqual(new Uint8Array(adaptiveExtract.bodyBuffer), body), 'Adaptive Worker round-trip failed.');

const legacyPixels = new Uint8ClampedArray(original);
const HEADER_PIXELS = 214;
let opaqueIndex = 0;
let bodyBit = 0;
for (let offset = 0; offset < legacyPixels.length && bodyBit < body.length * 8; offset += 4) {
  if (legacyPixels[offset + 3] !== 255) continue;
  if (opaqueIndex >= HEADER_PIXELS) {
    for (let channel = 0; channel < 3 && bodyBit < body.length * 8; channel += 1) {
      const bit = (body[bodyBit >> 3] >> (7 - (bodyBit & 7))) & 1;
      legacyPixels[offset + channel] = (legacyPixels[offset + channel] & 0xfe) | bit;
      bodyBit += 1;
    }
  }
  opaqueIndex += 1;
}
assert(bodyBit === body.length * 8, 'Legacy fixture did not fit in the carrier.');

messages.length = 0;
selfMock.onmessage({ data: {
  operation: 'extract',
  width,
  height,
  imageBuffer: legacyPixels.buffer,
  mode: 0,
  bodyLength: body.length,
  seedBuffer: new ArrayBuffer(0)
}});
const legacyExtract = messages.find(message => message.type === 'result');
assert(legacyExtract?.bodyBuffer instanceof ArrayBuffer, 'Legacy Worker extract did not return a body buffer.');
assert(bytesEqual(new Uint8Array(legacyExtract.bodyBuffer), body), 'Legacy mode 0 Worker decode failed.');

console.log('[OK] File in Image format regression passed.');
console.log('[OK] BKFI: write v1, read v0/v1, reject unsupported/reserved combinations.');
console.log('[OK] BKFC: write v1, read v0/v1, reject unsupported/reserved combinations.');
console.log('[OK] Worker: adaptive mode 1 round-trip and legacy mode 0 decode passed.');
