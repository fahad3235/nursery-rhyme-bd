// Headless-Chrome smoke test for Nursery Rhyme BD.
// Drives the Playwright-cached headless_shell over CDP with Node's built-in
// WebSocket (no npm deps). Run from the project root:
//   node tests/smoke.mjs [1280|390]
// Exits 0 only if every check passes.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = path.join(process.env.HOME, '.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell');
const PORT = 9228;
const WIDTH = parseInt(process.argv[2] || '1280', 10);
const HEIGHT = WIDTH <= 480 ? 844 : 800;
const URL = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeout = 15000, label = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (await fn()) return true; } catch { /* retry */ }
    await sleep(150);
  }
  throw new Error('timeout waiting for ' + label);
}

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT,
  '--window-size=' + WIDTH + ',' + HEIGHT,
  'about:blank',
], { stdio: 'ignore' });

let ws;
try {
  let targets = null;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      targets = await res.json();
      break;
    } catch { await sleep(250); }
  }
  if (!targets) throw new Error('DevTools endpoint never came up');

  const pageTarget = targets.find((t) => t.type === 'page');
  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  const failedReqs = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value || a.description || '').join(' '));
    }
    if (msg.method === 'Network.loadingFailed') {
      failedReqs.push(msg.params.errorText);
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error('page JS error: ' + JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };
  const setVal = async (elId, value) => {
    await evalJs(`document.getElementById("${elId}").value = ${JSON.stringify(value)}`);
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH <= 480 });
  await send('Page.navigate', { url: URL });
  await waitFor(async () => (await evalJs('document.readyState')) === 'complete', 15000, 'page load');
  await sleep(500);

  console.log(`smoke @ ${WIDTH}x${HEIGHT}: ${URL}`);
  check('page title', (await evalJs('document.title')).includes('Chhora BD'));
  check('app heading rendered', (await evalJs('document.getElementById("appTitle").textContent')) === 'Chhora BD');
  check('10 rhyme cards', (await evalJs('document.querySelectorAll("#rhymeGrid .card").length')) === 10);
  check('rhyme of the day card visible', (await evalJs('document.getElementById("rhymeOfDayCard").offsetParent !== null')));
  check('rhyme of the day is sokale (2026-11-22)',
    (await evalJs('document.getElementById("rhymeOfDayCard").textContent')).includes('Sokale Uthiya Ami'),
    await evalJs('document.getElementById("rhymeOfDayCard").textContent'));
  check('progress 0 of 10', (await evalJs('document.getElementById("progressText").textContent')) === '0 of 10 rhymes learned');
  check('6 category chips', (await evalJs('document.querySelectorAll("#catChips .chip").length')) === 6);
  check('no console errors on load', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('no failed requests on load', failedReqs.length === 0, failedReqs.join(' | '));

  // Search: Tagore -> 2 cards.
  await setVal('search', 'Tagore');
  await evalJs('document.getElementById("search").dispatchEvent(new Event("input"))');
  await sleep(250);
  check('search Tagore -> 2 cards', (await evalJs('document.querySelectorAll("#rhymeGrid .card").length')) === 2);
  await setVal('search', 'zzz-no-match');
  await evalJs('document.getElementById("search").dispatchEvent(new Event("input"))');
  await sleep(250);
  check('search miss shows empty state', /No rhyme matches/.test(await evalJs('document.getElementById("emptyState").textContent')));
  await setVal('search', '');
  await evalJs('document.getElementById("search").dispatchEvent(new Event("input"))');
  await sleep(250);
  check('search cleared restores 10 cards', (await evalJs('document.querySelectorAll("#rhymeGrid .card").length')) === 10);

  // Category filter: birds -> 2.
  await evalJs('[...document.querySelectorAll("#catChips .chip")].find(b => b.textContent.includes("Birds")).click()');
  await sleep(250);
  check('filter Birds -> 2 cards', (await evalJs('document.querySelectorAll("#rhymeGrid .card").length')) === 2);
  await evalJs('[...document.querySelectorAll("#catChips .chip")].find(b => b.textContent === "All").click()');
  await sleep(250);
  check('filter All restores 10 cards', (await evalJs('document.querySelectorAll("#rhymeGrid .card").length')) === 10);

  // Open the first card (chand-mama, 7 lines) in the reader.
  await evalJs('document.querySelector("#rhymeGrid .card").click()');
  await sleep(300);
  check('reader view shown', (await evalJs('document.getElementById("readerView").style.display')) !== 'none');
  check('reader title Aay Aay Chand Mama', (await evalJs('document.getElementById("readerTitle").textContent')) === 'Aay Aay Chand Mama');
  check('reader shows 7 Bengali lines', (await evalJs('document.querySelectorAll("#readerLines li").length')) === 7);
  check('first line is the chand-mama opening',
    (await evalJs('document.querySelector("#readerLines li").textContent')).includes('আয় আয় চাঁদ মামা'),
    await evalJs('document.querySelector("#readerLines li").textContent'));
  check('meaning shown', (await evalJs('document.getElementById("meaningText").textContent')).length > 20);
  check('roman lines hidden by default', (await evalJs('document.getElementById("romanLines").style.display')) === 'none');

  // Romanised toggle.
  await evalJs('document.getElementById("romanToggle").click()');
  await sleep(250);
  check('roman lines shown after toggle', (await evalJs('document.querySelectorAll("#romanLines li").length')) === 7);
  check('roman first line', (await evalJs('document.querySelector("#romanLines li").textContent')).includes('Aay aay chand mama'));

  // Read-aloud click must not throw (headless has no Bangla voice).
  await evalJs('document.getElementById("speakBtn").click()');
  await sleep(400);
  check('read-aloud click throws no console error', consoleErrors.length === 0, consoleErrors.join(' | '));

  // Favourite + learned, then persistence across reload.
  await evalJs('document.getElementById("favBtn").click()');
  await sleep(200);
  check('favourite star set', (await evalJs('document.getElementById("favBtn").textContent')).startsWith('\u2605'));
  await evalJs('document.getElementById("learnedBtn").click()');
  await sleep(250);
  check('learned button shows Learned', (await evalJs('document.getElementById("learnedBtn").textContent')).includes('Learned'));
  check('toast shows 1 of 10 learned', (await evalJs('document.getElementById("toast").textContent')) === '1 of 10 rhymes learned');

  // Font size buttons.
  await evalJs('document.getElementById("fontPlus").click()');
  await sleep(200);
  check('font+ switches to large', (await evalJs('document.getElementById("readerLines").className')).includes('fs-l'));
  await evalJs('document.getElementById("fontMinus").click()');
  await sleep(200);
  check('font- back to medium', (await evalJs('document.getElementById("readerLines").className')).includes('fs-m'));

  // Next navigation: chand-mama -> hattimatim.
  await evalJs('document.getElementById("nextBtn").click()');
  await sleep(250);
  check('next goes to Hattimatim Tim', (await evalJs('document.getElementById("readerTitle").textContent')) === 'Hattimatim Tim');
  check('hattimatim has 4 lines', (await evalJs('document.querySelectorAll("#readerLines li").length')) === 4);

  // Back home, favourite filter shows 1.
  await evalJs('document.getElementById("backBtn").click()');
  await sleep(250);
  check('back home shows grid', (await evalJs('document.getElementById("homeView").style.display')) !== 'none');
  check('progress now 1 of 10', (await evalJs('document.getElementById("progressText").textContent')) === '1 of 10 rhymes learned');
  await evalJs('document.getElementById("favOnlyBtn").click()');
  await sleep(250);
  check('favourites filter shows 1 card', (await evalJs('document.querySelectorAll("#rhymeGrid .card").length')) === 1);
  await evalJs('document.getElementById("favOnlyBtn").click()');
  await sleep(250);

  // Surprise button opens a reader.
  await evalJs('document.getElementById("surpriseBtn").click()');
  await sleep(250);
  check('surprise opens reader', (await evalJs('document.getElementById("readerView").style.display')) !== 'none');
  await evalJs('document.getElementById("backBtn").click()');
  await sleep(250);

  // Persistence across reload.
  await send('Page.navigate', { url: URL });
  await waitFor(async () => (await evalJs('document.readyState')) === 'complete', 15000, 'reload');
  await sleep(500);
  check('favourite persists across reload', (await evalJs('document.querySelectorAll("#rhymeGrid .card .star.on").length')) === 1);
  check('learned persists across reload', (await evalJs('document.getElementById("progressText").textContent')) === '1 of 10 rhymes learned');

  // Language toggle to Bangla.
  await evalJs('document.getElementById("langBtn").click()');
  await sleep(300);
  const bnTitle = await evalJs('document.getElementById("appTitle").textContent');
  check('BN title after toggle', bnTitle === 'ছড়া বিডি', bnTitle);
  check('BN progress uses Bengali digits', /১/.test(await evalJs('document.getElementById("progressText").textContent')),
    await evalJs('document.getElementById("progressText").textContent'));
  check('BN card title', (await evalJs('document.querySelector("#rhymeGrid .card .card-title").textContent')).includes('আয় আয় চাঁদ মামা'));
  await evalJs('document.getElementById("langBtn").click()');
  await sleep(300);
  check('back to EN title', (await evalJs('document.getElementById("appTitle").textContent')) === 'Chhora BD');

  // No horizontal overflow at this viewport.
  const overflow = await evalJs('document.documentElement.scrollWidth - document.documentElement.clientWidth');
  check('no horizontal overflow', overflow === 0, 'overflow=' + overflow);

  check('no console errors during whole run', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('no failed requests during whole run', failedReqs.length === 0, failedReqs.join(' | '));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) {
    fs.writeFileSync(path.join(ROOT, `tests/smoke-${WIDTH}.png`), Buffer.from(shot.result.data, 'base64'));
    console.log(`  screenshot: tests/smoke-${WIDTH}.png`);
  }
} catch (e) {
  fail++;
  console.log('  FAIL harness error: ' + (e && e.message));
} finally {
  if (ws) ws.close();
  chrome.kill();
}

console.log(`\n${pass} passed, ${fail} failed (viewport ${WIDTH}x${HEIGHT})`);
process.exit(fail === 0 ? 0 : 1);
