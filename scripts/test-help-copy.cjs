'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const argument = process.argv.indexOf('--html');
const file = argument >= 0 ? process.argv[argument + 1] : path.join(__dirname, '../src/index.template.html');
let html = fs.readFileSync(file, 'utf8');
const payload = html.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\s]+)<\/script>/);
if (payload) html = gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8');
const excluded = [
  "ヘルプを開いている間、背景ページはスクロールしません。内容が長い場合はヘルプ内をスクロールしてください。",
  "While Help is open, the background page stays still. Scroll inside Help to read the rest. ",
  "v1.0.2の埋め込み形式は開発途中です。v1の正式互換形式はまだ固定していません。"
];
for (const text of excluded) {
  assert.equal(html.includes(text), false, `User-facing help must exclude obsolete audit/implementation copy: ${text}`);
}
console.log('User-facing help copy regression passed.');
