'use strict';
// Real Chromium integration checks for the generated standalone artifacts.
// Exercises native PNG/Canvas, File, Blob, Worker, WebCrypto, GZIP, and download APIs.
// No fixture files, external data, or network dependencies at application runtime.
const assert = require('node:assert/strict');
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { randomBytes } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-results', 'real-file-flow');
mkdirSync(out, { recursive: true });
const artifacts = ['dist/index.html', 'dist/index.self-extract.html', 'file-in-image.html'];
const payload = Buffer.from(Array.from({ length: 18_437 }, (_, i) => (i * 73 + (i >> 3) * 37 + (i >> 7) * 11) & 255));
const password = 'Päßword-秘密-🔐';

async function makeCarrier(page, { transparent = false, width = 768, height = 512, mimeType = 'image/png' } = {}) {
  const base64 = await page.evaluate(({transparent, width, height, mimeType}) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    const pixels = context.createImageData(width, height);
    for (let p = 0, off = 0; p < width * height; p++, off += 4) {
      pixels.data[off] = (p * 31 + (p >> 5) * 13) & 255;
      pixels.data[off + 1] = (p * 71 + (p >> 8) * 53) & 255;
      pixels.data[off + 2] = (p * 17 + (p >> 4) * 97) & 255;
      pixels.data[off + 3] = transparent ? 0 : 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL(mimeType).split(',')[1];
  }, { transparent, width, height, mimeType });
  return Buffer.from(base64, 'base64');
}
async function selectFile(page, selector, name, mimeType, buffer) {
  await page.locator(selector).setInputFiles({ name, mimeType, buffer });
}
async function waitReady(page, selector, timeout = 90_000) {
  await page.waitForFunction(sel => {
    const el = document.querySelector(sel);
    return el && !el.disabled;
  }, selector, { timeout });
}
async function save(page, buttonId) {
  const event = page.waitForEvent('download', { timeout: 45_000 });
  await page.locator(buttonId).click();
  const download = await event;
  const location = await download.path();
  assert.ok(location, 'browser download path must exist');
  return { name: download.suggestedFilename(), data: readFileSync(location) };
}
async function putExtract(page, png, { mimeLess = false } = {}) {
  await page.locator('#extractTab').click();
  if (mimeLess) {
    await page.evaluate(bytes => {
      const file = new File([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))], 'embedded.png', { type: '' });
      const transfer = new DataTransfer(); transfer.items.add(file);
      const input = document.querySelector('#extractInput');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, png.toString('base64'));
  } else await selectFile(page, '#extractInput', 'embedded.png', 'image/png', png);
  await page.locator('#extractSummary').waitFor({ state: 'visible', timeout: 30_000 });
  // A protected image intentionally keeps Extract disabled until a password is entered.
  if (!(await page.locator('#extractPasswordBox').isVisible())) {
    await waitReady(page, '#extractButton', 30_000);
  } else {
    assert.equal(await page.locator('#extractButton').isEnabled(), false);
  }
}
async function tamperedPng(page, png, kind) {
  const array = await page.evaluate(async ({base64, kind}) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type:'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0); bitmap.close();
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (kind === 'header') {
      for (let bit = 96; bit < 128; bit++) {
        const pixel = Math.floor(bit / 3), channel = bit % 3;
        image.data[pixel * 4 + channel] |= 1;
      }
    } else {
      for (let pixel = 214; pixel < canvas.width * canvas.height; pixel++)
        image.data[pixel * 4] ^= 1;
    }
    ctx.putImageData(image, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    return [...new Uint8Array(await blob.arrayBuffer())];
  }, {base64: png.toString('base64'), kind});
  return Buffer.from(array);
}
async function realRoundTrip(browser, file, { encrypted = false, phone = false, mimeLess = false, carrierMime = 'image/png', fileBytes = payload, compression = null } = {}) {
  const context = await browser.newContext({
    acceptDownloads: true, locale: 'ja-JP',
    viewport: phone ? { width: 360, height: 740 } : { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const failures = [], requests = [];
  page.on('pageerror', e => failures.push(e.message));
  page.on('request', request => { if (/^https?:/i.test(request.url())) requests.push(request.url()); });
  const label = [file, carrierMime, fileBytes.length + 'B', encrypted ? 'encrypted' : 'plain', phone ? 'phone' : 'desktop', mimeLess ? 'no-mime' : 'normal'].join(' ');
  try {
    await page.goto(pathToFileURL(path.join(root, file)).href);
    const image = await makeCarrier(page, { mimeType: carrierMime });
    const ext = carrierMime === 'image/jpeg' ? 'jpg' : carrierMime === 'image/webp' ? 'webp' : 'png';
    await selectFile(page, '#carrierInput', '写真.' + ext, carrierMime, image);
    await selectFile(page, '#payloadInput', '日本語 データ.bin', 'application/octet-stream', fileBytes);
    await waitReady(page, '#embedButton');
    if (compression === 'gzip') assert.match(await page.locator('#payloadCompression').innerText(), /GZIP/i);
    if (compression === 'none') assert.match(await page.locator('#payloadCompression').innerText(), /圧縮なし|no compression/i);
    if (phone) {
      assert.equal(await page.locator('.local-badge').isVisible(), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    } else assert.equal(await page.locator('.local-badge').isVisible(), true);
    if (encrypted) {
      await page.locator('#passwordProtectToggle').check();
      await page.locator('#embedPassword').fill(password);
      await page.locator('#embedPasswordConfirm').fill(password);
    }
    await page.locator('#embedButton').click();
    await page.locator('#embedResult').waitFor({ state: 'visible', timeout: 120_000 });
    assert.match(await page.locator('#selfVerifyResult').innerText(), /SHA-256/);
    await page.locator('#outputFilename').fill('画像にファイル');
    const png = await save(page, '#savePngButton');
    assert.equal(png.name, '画像にファイル.png');
    assert.equal(png.data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'native PNG signature');
    await putExtract(page, png.data, { mimeLess });
    if (encrypted) {
      await page.locator('#extractPassword').fill('incorrect');
      await page.locator('#extractButton').click();
      await page.locator('#extractError').waitFor({ state: 'visible', timeout: 90_000 });
      assert.equal(await page.locator('#extractResult').isVisible(), false, 'wrong password must never release data');
      await page.locator('#extractPassword').fill(password);
    }
    await page.locator('#extractButton').click();
    await page.locator('#extractResult').waitFor({ state: 'visible', timeout: 120_000 });
    assert.equal(await page.locator('#recoveredOriginalName').innerText(), '日本語 データ.bin');
    const recovered = await save(page, '#saveRecoveredButton');
    assert.equal(recovered.name, '日本語 データ.bin');
    assert.deepEqual(recovered.data, fileBytes, 'native downloaded payload is byte-exact');
    if (encrypted) {
      await page.locator('#recoveredFilename').fill('CON.txt');
      const renamed = await save(page, '#saveRecoveredButton');
      assert.equal(renamed.name, 'file-CON.txt', 'reserved Windows basename must be prefixed');
      assert.deepEqual(renamed.data, fileBytes, 'renaming must not alter recovered bytes');
    }
    assert.deepEqual(failures, [], 'browser page errors');
    assert.deepEqual(requests, [], 'unexpected application network requests');
    console.log('PASS native round trip: ' + label);
    return png.data;
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'failure-' + file.replace(/[^a-z0-9]/ig, '-') + '-' + (encrypted?'protected':'plain') + '-' + (phone?'phone':'desktop') + '.png'), fullPage: true }).catch(() => {});
    throw new Error(label + ': ' + error.stack);
  } finally {
    await context.close();
  }
}
async function negativeCases(browser) {
  const context = await browser.newContext({ acceptDownloads: true, viewport:{ width:393, height:800 }, locale:'en-US' });
  const page = await context.newPage();
  const failures = [], requests = [];
  page.on('pageerror', e => failures.push(e.message));
  page.on('request', request => { if (/^https?:/i.test(request.url())) requests.push(request.url()); });
  try {
    await page.goto(pathToFileURL(path.join(root,'dist/index.html')).href);
    assert.equal(await page.locator('.local-badge').isVisible(), false);
    await selectFile(page, '#carrierInput','transparent.png','image/png',await makeCarrier(page,{transparent:true}));
    await page.locator('#embedError').waitFor({state:'visible',timeout:30_000});
    assert.equal(await page.locator('#embedButton').isEnabled(),false);
    await selectFile(page, '#carrierInput','carrier.png','image/png',await makeCarrier(page));
    await selectFile(page, '#payloadInput','too-large.bin','application/octet-stream',Buffer.alloc(32*1024*1024+1));
    await page.locator('#embedError').waitFor({state:'visible',timeout:30_000});
    assert.equal(await page.locator('#embedButton').isEnabled(),false);
    await selectFile(page, '#payloadInput','ok.bin','application/octet-stream',payload);
    await waitReady(page,'#embedButton');
    await page.evaluate(() => { document.querySelector('#embedButton').click(); document.querySelector('#cancelEmbedButton').click(); });
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#embedResult').isVisible(),false,'cancel invalidates output');
    assert.equal(await page.locator('#savePngButton').isEnabled(),false,'cancel disables save');
    await page.locator('#embedButton').click();
    await page.locator('#embedResult').waitFor({state:'visible',timeout:120_000});
    const png=(await save(page,'#savePngButton')).data;
    const brokenHeader=await tamperedPng(page,png,'header');
    await page.locator('#extractTab').click();
    await selectFile(page,'#extractInput','bad.png','image/png',brokenHeader);
    await page.locator('#extractError').waitFor({state:'visible',timeout:30_000});
    assert.equal(await page.locator('#extractButton').isEnabled(),false);
    const brokenBody=await tamperedPng(page,png,'body');
    await selectFile(page,'#extractInput','damaged.png','image/png',brokenBody);
    await waitReady(page,'#extractButton');
    await page.locator('#extractButton').click();
    await page.locator('#extractError').waitFor({state:'visible',timeout:120_000});
    assert.equal(await page.locator('#extractResult').isVisible(),false,'corruption cannot be downloaded');
    assert.deepEqual(failures,[], 'negative-flow page errors');
    assert.deepEqual(requests,[], 'negative-flow network requests');
    console.log('PASS native invalid input, cancel, corrupt header, corrupt body, mobile');
  } catch (error) {
    await page.screenshot({path:path.join(out,'failure-negative.png'),fullPage:true}).catch(()=>{});
    throw error;
  } finally { await context.close(); }
}
(async()=>{
  const browser=await chromium.launch();
  try {
    for(const artifact of artifacts) await realRoundTrip(browser,artifact,{mimeLess:artifact===artifacts[0]});
    await realRoundTrip(browser,artifacts[0],{encrypted:true,phone:true});
    await realRoundTrip(browser,artifacts[0],{carrierMime:'image/jpeg',fileBytes:Buffer.alloc(8192,65),compression:'gzip'});
    await realRoundTrip(browser,artifacts[0],{carrierMime:'image/webp',fileBytes:randomBytes(8192),compression:'none'});
    await realRoundTrip(browser,artifacts[0],{fileBytes:Buffer.alloc(0)});
    await negativeCases(browser);
    writeFileSync(path.join(out,'results.txt'),'PASS: three standalone variants, encrypted mobile recovery, JPEG/WebP carriers, gzip/incompressible/empty payloads, wrong password, invalid inputs, cancellation, corrupted images, byte equality and offline runtime.\n');
  } finally { await browser.close(); }
})().catch(err=>{console.error(err);process.exitCode=1;});
