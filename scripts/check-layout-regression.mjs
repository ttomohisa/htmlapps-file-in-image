// Source/CSS contracts for the Help/header layout. These do not measure browser
// geometry, native dialog focus, wheel/touch scrolling, or loaded file flows.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

let html = readFileSync(process.argv[2] || new URL('../src/index.template.html', import.meta.url), 'utf8');
if (html.includes('id="self-extract-payload"')) {
  const payload = html.match(/id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(payload, 'self-extract wrapper contains a payload');
  html = gunzipSync(Buffer.from(payload[1].replace(/\s/g, ''), 'base64')).toString('utf8');
}
const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
assert.ok(css, 'application styles exist');

function block(start, source = css) {
  const index = source.indexOf(start);
  assert.ok(index >= 0, `Missing CSS block: ${start}`);
  const open = source.indexOf('{', index);
  let depth = 1, end = open + 1;
  while (end < source.length && depth) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  }
  assert.equal(depth, 0, `Balanced CSS block: ${start}`);
  return source.slice(open + 1, end - 1);
}
function rule(selector, source = css) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const found = source.match(new RegExp(`(?:^|[{}])\\s*${escaped}\\s*\\{([^{}]*)\\}`));
  assert.ok(found, `Missing CSS rule: ${selector}`);
  return Object.fromEntries(found[1].split(';').filter(x => x.trim()).map(declaration => {
    const colon = declaration.indexOf(':');
    return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()];
  }));
}

test('only a modal Help dialog locks both document scrolling elements', () => {
  const lock = rule('html:has(#helpDialog:modal),body:has(#helpDialog:modal)');
  assert.equal(lock.overflow, 'hidden');
  assert.doesNotMatch(css, /(?:html|body):has\(#helpDialog\[open\]\)/, 'non-modal Help must not lock the document');
  assert.notEqual(rule('html').overflow, 'hidden');
  assert.notEqual(rule('body').overflow, 'hidden');
});

test('at 420px and below title/version wrap without clipping or shrinking the actions', () => {
  const narrow = block('@media (max-width: 420px)');
  const name = rule('.brand-name', narrow);
  assert.equal(name.display, 'flex');
  assert.equal(name['flex-wrap'], 'wrap');
  assert.equal(name['white-space'], 'normal');
  assert.equal(name.overflow, 'visible');
  const title = rule('#brandName', narrow);
  assert.equal(title['min-width'], '0');
  assert.equal(title['overflow-wrap'], 'anywhere');
  const version = rule('.version-badge', narrow);
  assert.equal(version.flex, '0 0 auto');
  assert.equal(version['margin-left'], '0');
  assert.equal(version['white-space'], 'nowrap');
  assert.equal(rule('.header-actions', narrow).flex, '0 0 auto');
  assert.equal(rule('.header-actions > button', narrow).flex, '0 0 auto');
  // The existing wider-screen presentation remains unchanged.
  assert.equal(rule('.brand-name')['white-space'], 'nowrap');
  assert.equal(rule('.brand-name').overflow, 'hidden');
});

test('Help retains its bounded flex shell, sibling header, and internal scroll owner', () => {
  const shell = rule('#helpDialog[open]');
  assert.equal(shell.display, 'flex');
  assert.equal(shell['flex-direction'], 'column');
  assert.match(shell['max-height'], /100dvh.*safe-area-inset-top.*safe-area-inset-bottom/);
  assert.equal(rule('.dialog-header').flex, '0 0 auto');
  const body = rule('.dialog-body');
  assert.equal(body['min-height'], '0');
  assert.equal(body.flex, '1 1 auto');
  assert.equal(body.overflow, 'auto');
  assert.equal(body['overscroll-behavior'], 'contain');
  assert.match(body.padding, /safe-area-inset-bottom/);
  const mobile = block('@media (max-width: 520px)');
  assert.match(rule('#helpDialog', mobile)['max-height'], /100dvh.*safe-area-inset-top.*safe-area-inset-bottom/);
  assert.match(rule('#helpDialog .dialog-body', mobile).padding, /safe-area-inset-bottom/);
  assert.match(html, /<dialog id="helpDialog"[^>]*>\s*<div class="dialog-header">[\s\S]*?<\/button><\/div>\s*<div class="dialog-body">/);
  assert.match(html, /data-i18n="helpOffline"[^>]*>[\s\S]*?<!-- APP:HELP:END -->\s*<\/div>\s*<\/dialog>/);
});

test('existing 44px language, Help, and close targets are preserved', () => {
  assert.equal(rule('.language-button')['min-width'], '44px');
  assert.equal(rule('.language-button')['min-height'], '44px');
  assert.equal(rule('.icon-button').width, '44px');
  assert.equal(rule('.icon-button').height, '44px');
  assert.equal(rule('.header-icon-button').width, '44px');
  assert.equal(rule('.header-icon-button').height, '44px');
  assert.match(html, /class="icon-button" id="closeHelpButton"/);
});

test('local-only privacy badge keeps its shield/check artwork and network policy', () => {
  const badge = html.match(/<div class="local-badge">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(badge);
  assert.match(badge, /M12 3 5 6v5c0 4\.6 2\.8 8 7 10 4\.2-2 7-5\.4 7-10V6z/);
  assert.match(badge, /m9 12 2 2 4-5/);
  assert.match(badge, /data-i18n="localBadge"/);
  assert.match(html, /connect-src 'none'/);
});
