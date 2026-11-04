/* Browser test for edo.html — the four puzzles, the wrong-answer path and the door.
   Needs puppeteer, so it runs inside the puppeteer image:

   docker run --rm --network host -v "$PWD":/work -w /work \
     -e NODE_PATH=/home/pptruser/node_modules \
     ghcr.io/puppeteer/puppeteer:latest node test/edo.browser.cjs

   Exits 1 on any failed check. Screenshot lands in test/.shots/solved.png. */
const puppeteer = require('puppeteer');
const { mkdirSync } = require('node:fs');

const URL = process.env.EDO_URL || 'http://localhost:8080/edo.html?test';
const ORDER = ['byobu', 'soroban', 'kakemono', 'ema'];
const ANSWERS = { byobu: 8, soroban: 7, kakemono: 9, ema: 3 };
const WRONG = 3;

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const logs = [];
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader',
           '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1000,640'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 640, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') logs.push('[console.error] ' + m.text()); });
  page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  page.on('requestfailed', r => logs.push('[reqfail] ' + r.url() + ' ' + r.failure()?.errorText));

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1500);

  /* ---------------------------------------------------------- the shell */
  check('title is the Edo room', (await page.title()).includes('Edo'));
  check('webgl2 context exists', await page.evaluate(() => !!document.querySelector('canvas')?.getContext('webgl2')));
  check('test hook is exposed', await page.evaluate(() => !!window.__edo));
  await page.click('#startBtn');
  await sleep(400);
  check('start card is gone', await page.evaluate(() => document.getElementById('start').hidden));
  check('four locks listed', await page.evaluate(() => document.querySelectorAll('#lockList li').length) === 4);

  /* --------------------------------------------- one wrong answer changes nothing */
  await page.evaluate(k => window.__edo.openPanel(k), 'byobu');
  for (let i = 0; i < WRONG; i++) await page.click('#panelBody [data-dir="1"]');
  await page.click('#panelBody [data-act="set"]');
  await sleep(500);
  check('wrong answer is rejected', await page.evaluate(() => !window.__edo.state.solved.byobu));
  check('wrong answer records no digit', await page.evaluate(() => window.__edo.state.digits.byobu == null));
  check('lock still shows ?', (await page.$eval('#lockList li[data-k="byobu"] b', el => el.textContent)) === '?');
  await page.evaluate(() => window.__edo.closePanel());

  /* -------------------------------------------------- each puzzle, as a player */
  for (const k of ORDER) {
    const want = ANSWERS[k];
    await page.evaluate(key => window.__edo.openPanel(key), k);
    const shown = await page.$eval('#panelTitle', el => el.textContent.trim());
    check(`${k}: panel opens with a title`, shown.length > 0, shown);
    for (let i = 0; i < want; i++) await page.click('#panelBody [data-dir="1"]');
    check(`${k}: dial reads ${want}`, (await page.$eval('#dialVal', el => el.textContent)) === String(want));
    await page.click('#panelBody [data-act="set"]');
    await sleep(350);
    check(`${k}: recorded as solved`, await page.evaluate(key => !!window.__edo.state.solved[key], k));
    check(`${k}: digit is ${want}`, await page.evaluate(key => window.__edo.state.digits[key], k) === want);
    check(`${k}: hud shows ${want}`, (await page.$eval(`#lockList li[data-k="${k}"] b`, el => el.textContent)) === String(want));
    await page.evaluate(() => window.__edo.closePanel());
  }
  check('objective says all four known',
    (await page.$eval('#objective', el => el.textContent)).includes('All four digits'));

  /* ------------------------------------------------------------------ the door */
  await page.evaluate(() => window.__edo.openPanel('door'));
  const CODE = await page.evaluate(() => window.__edo.CODE);
  for (let i = 0; i < CODE.length; i++) {
    for (let n = 0; n < CODE[i]; n++) await page.click(`#panelBody .wheel[data-i="${i}"] button[data-dir="1"]`);
    const shownDigit = await page.$eval(`#panelBody .wheel[data-i="${i}"] b`, el => el.textContent);
    check(`wheel ${i} set to ${CODE[i]}`, shownDigit === String(CODE[i]), shownDigit);
  }
  await page.click('#panelActions [data-act="try"]');
  await sleep(3000);
  check('door opens and the win card shows', await page.evaluate(() => !document.getElementById('win').hidden));
  check('escape time is printed', /Escaped in \d\d:\d\d/.test(await page.$eval('#winStats', el => el.textContent)));

  check('no console errors', logs.length === 0, logs.join(' | '));

  for (const r of results) console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  (' + r.detail + ')' : ''));

  mkdirSync('test/.shots', { recursive: true });
  await page.screenshot({ path: 'test/.shots/solved.png' });
  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log(failed.length ? failed.length + ' of ' + results.length + ' failed' : 'all ' + results.length + ' passed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
