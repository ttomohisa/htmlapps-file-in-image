import { createRequire } from 'node:module';
const sharedUI=createRequire(import.meta.url)('../components/ui-conventions.js');
// Execute the complete production application script with a small DOM boundary.
// This verifies header state, real click handlers, and persistence, not browser layout.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { webcrypto } from 'node:crypto';

const root = new URL('../', import.meta.url);
const config = JSON.parse(readFileSync(new URL('app.config.json', root), 'utf8'));
let source = readFileSync(process.argv[2] || new URL('src/index.template.html', root), 'utf8');
if (source.includes('id="self-extract-payload"')) {
  source = gunzipSync(Buffer.from(source.match(/id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/)[1].replace(/\s/g, ''), 'base64')).toString('utf8');
}
let script = source.match(/<script>\s*\(\(\)\s*=>\s*\{([\s\S]*?)\}\)\(\);\s*<\/script>/)[1]
  .replace('__APP_CONFIG_JSON__', JSON.stringify(config))
  .replace('__BUILD_MANIFEST_JSON__', '{}').replace('__EMBEDDED_ASSET_BUNDLE_JSON__', '{}');
for (const [placeholder, file] of [['__BK_SUBSET_WORKER_CORE_BASE64__', 'vendor/subset-worker-core.js'], ['__BK_JOYO_KANJI_BASE64__', 'vendor/joyo-kanji-2010.txt']]) {
  if (script.includes(placeholder)) script = script.replace(placeholder, readFileSync(new URL(file, root)).toString('base64'));
}

function boot({ browser = 'en-US', storage = new Map(), blocked = false,url='',languages=[browser] } = {}) {
  const writes=[],elements = new Map(), attributed = [];
  function element(key) {
    if (elements.has(key)) return elements.get(key);
    const attrs = new Map(), classes = new Set(), listeners = new Map();
    const el = { id: key.startsWith('#') ? key.slice(1) : '', dataset: {}, value: '', checked: false, disabled: false, hidden: false, textContent: '', title: '', style: {}, children: [],
      classList: { add(...xs) { xs.forEach(x => classes.add(x)); }, remove(...xs) { xs.forEach(x => classes.delete(x)); }, contains: x => classes.has(x), toggle(x, force) { if (force ?? !classes.has(x)) classes.add(x); else classes.delete(x); } },
      setAttribute(k, v) { attrs.set(k, String(v)); }, getAttribute: k => attrs.get(k), removeAttribute(k) { attrs.delete(k); },
      addEventListener(k, fn) { const a = listeners.get(k) || []; a.push(fn); listeners.set(k, a); },
      click() { if (!this.disabled) for (const fn of listeners.get('click') || []) fn({ target: el, preventDefault() {}, stopPropagation() {} }); },
      append(...xs) { this.children.push(...xs); }, replaceChildren(...xs) { this.children = xs; },
      querySelector: s => element(`${key} ${s}`), querySelectorAll: () => [], focus() {}, showModal() {}, close() {}, scrollIntoView() {},
    };
    elements.set(key, el);
    return el;
  }
  const markup = source.split(/<script>/)[0];
  for (const match of markup.matchAll(/<[^!][^>]*>/g)) {
    const tag = match[0], id = tag.match(/\bid="([^"]+)"/)?.[1];
    if (!id && !tag.includes('data-')) continue;
    const el = element(id ? `#${id}` : `tag-${attributed.length}`);
    for (const m of tag.matchAll(/\b([\w-]+)="([^"]*)"/g)) {
      el.setAttribute(m[1], m[2]);
      if (m[1].startsWith('data-')) el.dataset[m[1].slice(5).replace(/-([a-z])/g, (_, x) => x.toUpperCase())] = m[2];
      if (['value', 'title', 'type'].includes(m[1])) el[m[1]] = m[2];
    }
    el.hidden = /\shidden(?:\s|>)/.test(tag); el.disabled = /\sdisabled(?:\s|>)/.test(tag);
    attributed.push(el);
  }
  const document = { documentElement: { lang: '' }, querySelector: element,
    querySelectorAll(selector) {
      const key = selector.match(/^\[data-([a-z0-9-]+)\]$/)?.[1]?.replace(/-([a-z])/g, (_, x) => x.toUpperCase());
      return key ? attributed.filter(el => Object.hasOwn(el.dataset, key)) : [];
    }, createElement: name => element(`created-${name}-${elements.size}`), createDocumentFragment: () => element(`fragment-${elements.size}`),
  };
  const localStorage = { getItem(key) { if (blocked) throw Error('Storage denied'); return storage.get(key) ?? null; }, setItem(key, value) {writes.push([key,value]); if (blocked) throw Error('Storage denied'); storage.set(key, value); } };
  new Function('BrowserKittyUI','document', 'window', 'navigator', 'localStorage', 'crypto', 'matchMedia', script)({...sharedUI,resolveLanguage:o=>sharedUI.resolveLanguage({...o,storage:localStorage,languages,url}),chooseLanguage:lang=>sharedUI.chooseLanguage(lang,{storage:localStorage})},document, { addEventListener() {} }, { language: browser }, localStorage, webcrypto, () => ({ matches: false, addEventListener() {} }));
  return { writes,document, element, attributed };
}
function checkHeader(app, language) {
  const button = app.element('#languageButton');
  assert.equal(app.document.documentElement.lang, language);
  assert.equal(button.textContent, language === 'ja' ? 'EN' : 'JA');
  const label = language === 'ja' ? '英語に切り替え' : 'Switch to Japanese';
  assert.equal(button.getAttribute('aria-label'), label);
  assert.equal(button.title, label);
  assert.equal(app.element('#versionBadge').textContent, `v${config.version}`);
  assert.match(app.element('#versionBadge').textContent, /^v\d+\.\d+\.\d+$/);
  const badge = app.attributed.find(el => el.dataset.i18n === 'localBadge');
  assert.ok(badge, 'local-processing badge exists');
  assert.equal(badge.textContent, language === 'ja' ? '完全ローカル処理' : 'Fully local processing');
  const help = app.attributed.find(el => el.dataset.i18n === 'helpReading');
  assert.ok(help, 'Help explains how to close it');
  assert.equal(help.textContent, language === 'ja'
    ? '閉じるボタン、Escキー、または背景のクリックで閉じます。'
    : 'Close it with the close button, Esc, or a click on the backdrop.');
}
for (const language of ['ja', 'en']) {
  test(`${language} fresh load, repeated real clicks, and saved-language reload`, () => {
    const storage = new Map(), app = boot({ browser: `${language}-XX`, storage });
    checkHeader(app, language);
    for (let n = 1; n <= 5; n++) {
      app.element('#languageButton').click();
      const expected = n % 2 ? (language === 'ja' ? 'en' : 'ja') : language;
      checkHeader(app, expected);
      assert.equal(storage.get(sharedUI.languageKey), expected);
      checkHeader(boot({ browser: expected === 'ja' ? 'en-US' : 'ja-JP', storage }), expected);
    }
  });
  test(`${language} language switching survives unavailable storage`, () => {
    const app = boot({ browser: language, blocked: true });
    checkHeader(app, language);
    app.element('#languageButton').click();
    checkHeader(app, language === 'ja' ? 'en' : 'ja');
  });
}
test('header and release config use the requested one-step patch version', () => {
  assert.equal(config.version, '1.0.3');
  assert.match(source, /id="versionBadge">v1\.0\.3<\/span>/);
});

test('shared language startup priority is read-only and explicit failure remains screen-only',()=>{
 const legacy=config.slug+':language',storage=new Map([[legacy,'ja'],[sharedUI.languageKey,'en']]);const url=boot({storage,url:'https://example.test/app?lang=ja'});checkHeader(url,'ja');assert.equal(url.writes.length,0);checkHeader(boot({storage,browser:'ja'}),'en');storage.delete(sharedUI.languageKey);checkHeader(boot({storage,browser:'en'}),'ja');storage.clear();checkHeader(boot({storage,languages:['fr-FR','ja-JP','en-US']}),'ja');
 const denied=boot({blocked:true});denied.element('#languageButton').click();assert.match(denied.element('#languageStatus').textContent,/この画面/);
});
