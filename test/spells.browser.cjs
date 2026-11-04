/* Browser test for hogwarts.html — no overlays, traced charms cast at whatever you look at,
   the four digits and the door.

   docker run --rm --network host -v "$PWD":/work -w /work \
     -e NODE_PATH=/home/pptruser/node_modules \
     ghcr.io/puppeteer/puppeteer:latest node test/spells.browser.cjs

   Exits 1 on any failed check. Screenshot lands in test/.shots/spells.png. */
const puppeteer = require('puppeteer');
const { mkdirSync } = require('node:fs');

const URL = process.env.SPELLS_URL || 'http://localhost:8080/?test';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  (' + detail + ')' : ''));
};

/* where to stand to look at each prop: [x, z, yaw] */
const VIEWS = {
  cabinet: [3.3, 1.5, -Math.PI / 2],
  stone: [-3.2, -1.4, Math.PI / 2],
  niche: [-1.9, 2.7, Math.PI],
  dome: [2.7, 2.05, 0],
  door: [0, -2.7, 0],
  tapestry: [-3.5, 1.9, Math.PI / 2],
};

const aim = (page, id) => page.evaluate(v => window.__wizard.aim(v[0], v[1], v[2]), VIEWS[id]);

/* draws a charm's template on #tracepad with the real mouse, with a little hand jitter */
async function traceShape(page, shapeKey, jitter = 3) {
  const info = await page.evaluate(k => {
    const t = window.__wizard.SHAPES[k];
    const r = document.getElementById('tracepad').getBoundingClientRect();
    const scale = Math.min(r.width, r.height) * 0.36;
    return {
      closed: t.closed,
      pts: t.points.map(([x, y]) => [r.left + r.width / 2 + x * scale, r.top + r.height / 2 + y * scale]),
    };
  }, shapeKey);
  const j = () => (Math.random() - .5) * jitter;
  const [first, ...rest] = info.pts;
  await page.mouse.move(first[0] + j(), first[1] + j());
  await page.mouse.down();
  for (const [x, y] of rest) await page.mouse.move(x + j(), y + j());
  if (info.closed) await page.mouse.move(first[0], first[1]);
  await page.mouse.up();
  await sleep(150);
}

/* hold Ctrl, pick a charm, trace it, let go of Ctrl */
async function cast(page, charmIndex, shape) {
  await page.keyboard.down('Control');
  await sleep(150);
  await page.keyboard.press('Digit' + charmIndex);
  await page.click(`#sigils button[data-charm="${['alohomora', 'flipendo', 'lumos', 'wingardium'][charmIndex - 1]}"]`);
  await sleep(80);
  await traceShape(page, shape);
  await page.keyboard.up('Control');
  await sleep(150);
}

/* the dial lives in the tray now: arrows adjust it, E sets it */
async function answer(page, digit) {
  for (let i = 0; i < digit; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('KeyE');
  await sleep(150);
}

(async () => {
  const logs = [];
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader',
           '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1100,720'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 720, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') logs.push('[console.error] ' + m.text()); });
  page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  page.on('requestfailed', r => logs.push('[reqfail] ' + r.url() + ' ' + r.failure()?.errorText));

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1200);

  /* no overlays at all: the room is never covered */
  check('title names the chamber', (await page.title()).includes('Founders'));
  check('webgl2 context exists', await page.evaluate(() => !!document.querySelector('canvas')?.getContext('webgl2')));
  check('test hook is exposed', await page.evaluate(() => !!window.__wizard));
  check('there is no overlay in the DOM', await page.evaluate(() => document.querySelectorAll('.overlay').length) === 0);
  check('the HUD is live on load', await page.evaluate(() => !document.getElementById('hud').hidden));
  check('nothing is shown before you look at something', await page.evaluate(() => document.getElementById('tray').hidden));
  check('the wand is put away', await page.evaluate(() => document.getElementById('wand').hidden));
  check('four charms listed', await page.evaluate(() => document.querySelectorAll('#lockList li').length) === 4);

  /* looking at a sealed prop fills the tray, and the room stays visible */
  check('aim finds the cloche', await aim(page, 'dome') === 'dome');
  await sleep(250);
  const layout = await page.evaluate(() => {
    const tray = document.getElementById('tray').getBoundingClientRect();
    const hit = document.elementFromPoint(innerWidth * 0.62, innerHeight * 0.45);
    return { trayRight: Math.round(tray.right), trayW: Math.round(tray.width), vw: innerWidth, hit: hit && hit.id };
  });
  check('the tray does not cover the view', layout.hit === 'scene', 'hit ' + layout.hit);
  check('the tray is a corner panel, not a card', layout.trayW < layout.vw * 0.4, layout.trayW + 'px of ' + layout.vw);
  check('the tray describes the sealed cloche',
    /cloche|glass/i.test(await page.$eval('#trayBody', el => el.textContent)));
  check('it does not name the charm for you',
    !/Wingardium/i.test(await page.$eval('#trayBody', el => el.textContent)));

  /* a wrong charm must never open a seal */
  await cast(page, 1, 'loop');                       // Alohomora at the cloche
  check('a wrong charm leaves the seal shut', await page.evaluate(() => !window.__wizard.state.unlocked.dome));
  check('the seal still reads as sealed',
    /cloche|glass/i.test(await page.$eval('#trayBody', el => el.textContent)));

  /* the four charms, each cast at the prop it belongs to */
  const plan = [
    ['cabinet', 1, 'loop', 2],
    ['stone', 2, 'zag', 8],
    ['niche', 3, 'rise', 5],
    ['dome', 4, 'swish', 9],
  ];
  for (const [prop, charmIndex, shape, digit] of plan) {
    check('aim finds the ' + prop, await aim(page, prop) === prop);
    await cast(page, charmIndex, shape);
    check(`${prop}: the charm opens it`, await page.evaluate(k => !!window.__wizard.state.unlocked[k], prop));
    check(`${prop}: the clue is in the tray`, await page.evaluate(() => !document.getElementById('tray').hidden));
    await answer(page, digit);
    const key = await page.evaluate(k => window.__wizard.PUZZLES[k].charm, prop);
    check(`${prop}: digit ${digit} recorded`, await page.evaluate(k => window.__wizard.state.digits[k], key) === digit);
    check(`${prop}: sidebar shows ${digit}`,
      (await page.$eval(`#lockList li[data-k="${key}"] b`, el => el.textContent)) === String(digit));
  }
  check('objective says all four answers are in',
    (await page.$eval('#objective', el => el.textContent)).includes('All four digits'));

  /* the tapestry gives the order, and the door wheels are driven from the tray */
  check('aim finds the tapestry', await aim(page, 'tapestry') === 'tapestry');
  await sleep(200);
  check('the tapestry spells out the order',
    /lock, then the stone/i.test(await page.$eval('#trayBody', el => el.textContent)));

  check('aim finds the door', await aim(page, 'door') === 'door');
  await sleep(200);
  const CODE = await page.evaluate(() => window.__wizard.CODE);
  for (let i = 0; i < CODE.length; i++) {
    for (let n = 0; n < CODE[i]; n++) await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowRight');         // next wheel
  }
  const wheels = await page.$$eval('#trayBody .wheel b', els => els.map(e => e.textContent).join(''));
  check('the wheels hold ' + CODE.join(''), wheels === CODE.join(''), wheels);
  await page.keyboard.press('KeyE');
  await sleep(3200);
  check('the door opens and the banner shows', await page.evaluate(() => !document.getElementById('banner').hidden));
  check('the escape time is in the banner', /You are out · \d\d:\d\d/i.test(await page.$eval('#banner', el => el.textContent)));
  check('the room is still on screen after the win',
    await page.evaluate(() => document.elementFromPoint(innerWidth * 0.5, innerHeight * 0.6)?.id === 'scene'));

  check('no console errors', logs.length === 0, logs.join(' | '));

  mkdirSync('test/.shots', { recursive: true });
  await page.screenshot({ path: 'test/.shots/spells.png' });
  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log(failed.length ? failed.length + ' of ' + results.length + ' failed' : 'all ' + results.length + ' passed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
