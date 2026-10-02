import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const root = resolve(import.meta.dirname, '..');
const appPath = resolve(root, 'dist', 'index.html');
const outputDir = resolve(root, 'artifacts', 'release-screenshots');
if (!existsSync(appPath)) throw new Error('dist/index.html is missing.');
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));
const appUrl = pathToFileURL(appPath).href;

function findBrowser() {
  const candidates = [
    join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ];
  const browser = candidates.find(existsSync);
  if (!browser) throw new Error('Chrome or Edge was not found.');
  return browser;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('DevTools HTTP ' + response.status);
  return await response.json();
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.ready = new Promise((resolveReady, rejectReady) => {
      this.ws.addEventListener('open', resolveReady, { once: true });
      this.ws.addEventListener('error', rejectReady, { once: true });
    });
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result || {});
    });
  }

  async command(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const promise = new Promise((resolveCommand, rejectCommand) => {
      this.pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
      setTimeout(() => {
        if (this.pending.delete(id)) rejectCommand(new Error('CDP timeout: ' + method));
      }, 30000);
    });
    this.ws.send(JSON.stringify({ id, method, params }));
    return await promise;
  }

  async evaluate(expression) {
    const result = await this.command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed.');
    return result.result?.value;
  }

  async waitFor(expression, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        if (await this.evaluate(expression)) return;
      } catch {}
      await delay(100);
    }
    throw new Error('Timed out waiting for: ' + expression);
  }

  close() {
    try { this.ws.close(); } catch {}
  }
}

async function launch(port, width, height, mobile) {
  const profile = join(os.tmpdir(), 'file-in-image-shot-' + port);
  rmSync(profile, { recursive: true, force: true });
  const child = spawn(findBrowser(), [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--allow-file-access-from-files',
    '--remote-allow-origins=*',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + profile,
    'about:blank'
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 100 && !target; i += 1) {
    try {
      const targets = await getJson('http://127.0.0.1:' + port + '/json');
      target = targets.find(item => item.type === 'page') || null;
    } catch {}
    if (!target) await delay(100);
  }
  if (!target) {
    child.kill();
    throw new Error('DevTools endpoint did not become ready.');
  }

  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.command('Page.enable');
  await cdp.command('Runtime.enable');
  await cdp.command('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height
  });
  await cdp.command('Page.navigate', { url: appUrl });
  await cdp.waitFor("document.readyState==='complete' && !!document.querySelector('#languageButton')");
  return { cdp, child, profile };
}

async function closeBrowser(browser) {
  browser.cdp.close();
  browser.child.kill();
  await delay(250);
  rmSync(browser.profile, { recursive: true, force: true });
}

async function capture({ name, language, width, height, mobile, port }) {
  const browser = await launch(port, width, height, mobile);
  try {
    const currentLanguage = await browser.cdp.evaluate('document.documentElement.lang');
    if (currentLanguage !== language) {
      await browser.cdp.evaluate("document.querySelector('#languageButton').click()");
      await browser.cdp.waitFor('document.documentElement.lang===' + JSON.stringify(language));
    }
    await browser.cdp.evaluate('scrollTo(0,0)');
    await delay(150);

    const metrics = await browser.cdp.evaluate("({innerWidth,innerHeight,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,language:document.documentElement.lang,version:document.querySelector('#versionBadge')?.textContent||''})");
    if (metrics.innerWidth !== width) {
      throw new Error(name + ': expected CSS viewport ' + width + ', got ' + metrics.innerWidth);
    }
    if (metrics.scrollWidth > metrics.clientWidth + 1 || metrics.bodyScrollWidth > metrics.clientWidth + 1) {
      throw new Error(name + ': horizontal overflow: client=' + metrics.clientWidth + ', html=' + metrics.scrollWidth + ', body=' + metrics.bodyScrollWidth);
    }
    if (metrics.version.trim() !== 'v1.0.0') {
      throw new Error(name + ': unexpected version badge ' + metrics.version);
    }

    const screenshot = await browser.cdp.command('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });
    const output = resolve(outputDir, name);
    writeFileSync(output, Buffer.from(screenshot.data, 'base64'));
    return { name, ...metrics };
  } finally {
    await closeBrowser(browser);
  }
}

const cases = [
  { name: 'screenshot.png', language: 'ja', width: 1440, height: 1000, mobile: false, port: 9341 },
  { name: 'screenshot-en.png', language: 'en', width: 1440, height: 1000, mobile: false, port: 9342 },
  { name: 'screenshot-mobile.png', language: 'ja', width: 390, height: 844, mobile: true, port: 9343 },
  { name: 'screenshot-mobile-en.png', language: 'en', width: 390, height: 844, mobile: true, port: 9344 }
];

const report = [];
for (const item of cases) report.push(await capture(item));
writeFileSync(resolve(outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log('[OK] Release screenshots captured with explicit CSS viewport metrics.');
