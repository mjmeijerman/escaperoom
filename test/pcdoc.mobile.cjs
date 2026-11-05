/* Mobile pass for pcdoc.html — a phone has no pointer lock and no WASD, so the
   room has to be drivable with a stick, one finger and four buttons.

   docker run --rm --network host -v "$PWD":/work -w /work \
     -e NODE_PATH=/home/pptruser/node_modules \
     ghcr.io/puppeteer/puppeteer:latest node test/pcdoc.mobile.cjs */
const puppeteer = require('puppeteer');

const URL = process.env.PCDOC_URL || 'http://localhost:8080/pcdoc.html?test';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  (' + detail + ')' : ''));
};

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
  page.on('pageerror', e => logs.push(String(e)));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(1000);

  const ui = await page.evaluate(() => ({
    touch: document.body.classList.contains('touch'),
    layer: !document.getElementById('touch').hidden
      && getComputedStyle(document.getElementById('touch')).display !== 'none',
    legend: document.getElementById('legend').hidden,
    pad: document.getElementById('pad').hidden,
    btns: [...document.querySelectorAll('#tbtns button')].map(b => b.dataset.act).join(','),
    stick: !!document.getElementById('stickKnob'),
  }));
  check('a touch screen gets the touch controls', ui.touch === true && ui.layer === true, JSON.stringify(ui));
  check('the keyboard legend makes way for them', ui.legend === true);
  check('the notepad starts out of the way', ui.pad === true);
  check('the stick and the four buttons are there',
    ui.stick === true && ['use', 'jump', 'pad', 'hint'].every(k => ui.btns.includes(k)), ui.btns);

  await page.tap('#startBtn').catch(async () => {
    await page.evaluate(() => document.getElementById('startBtn').click());
  });
  await sleep(800);
  check('the start card starts the shift on a tap',
    await page.evaluate(() => window.__doctor.state.started === true));

  const walked = await page.evaluate(async () => {
    const d = window.__doctor;
    const el = document.getElementById('stick');
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type,
      { pointerId: 7, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
    const z0 = d.camera.position.z, x0 = d.camera.position.x;
    fire('pointerdown', cx, cy - 44);              // pushed forward
    const stick = { ...d.state.stick };
    await new Promise(r2 => setTimeout(r2, 900));
    fire('pointerup', cx, cy - 44);
    await new Promise(r2 => setTimeout(r2, 120));
    return { stick, z0, x0, z1: d.camera.position.z, rest: { ...d.state.stick } };
  });
  check('the stick walks you forward', walked.stick.y < -.5 && walked.z1 < walked.z0 - .05,
    JSON.stringify({ stick: walked.stick, z0: walked.z0, z1: walked.z1 }));
  check('and letting go stops you', Math.abs(walked.rest.y) < .01, JSON.stringify(walked.rest));

  const looked = await page.evaluate(async () => {
    const d = window.__doctor;
    d.look(0, 0);
    const canvas = document.getElementById('scene');
    const fire = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type,
      { pointerId: 9, clientX: x, clientY: y, bubbles: true, isPrimary: true, pointerType: 'touch' }));
    fire('pointerdown', 200, 420);
    fire('pointermove', 260, 420);
    await new Promise(r => setTimeout(r, 150));
    fire('pointerup', 260, 420);
    return +d.camera.rotation.y.toFixed(3);
  });
  check('one finger on the scene looks around', Math.abs(looked) > .1, String(looked));

  const used = await page.evaluate(async () => {
    const d = window.__doctor;
    const hit = d.aimAt('torch', 1.0);
    document.querySelector('#tbtns button[data-act="use"]')
      .dispatchEvent(new PointerEvent('pointerdown', { pointerId: 11, bubbles: true, isPrimary: true }));
    await new Promise(r => setTimeout(r, 220));
    return { hit, torch: d.state.torch };
  });
  check('the E button does what E does', used.hit === 'torch' && used.torch === true, JSON.stringify(used));

  const jumped = await page.evaluate(async () => {
    const d = window.__doctor;
    const y0 = d.camera.position.y;
    document.querySelector('#tbtns button[data-act="jump"]')
      .dispatchEvent(new PointerEvent('pointerdown', { pointerId: 12, bubbles: true, isPrimary: true }));
    await new Promise(r => setTimeout(r, 100));
    return d.camera.position.y > y0 + .002;
  });
  check('the jump button hops', jumped === true);

  const padOpen = await page.evaluate(async () => {
    document.querySelector('#tbtns button[data-act="pad"]')
      .dispatchEvent(new PointerEvent('pointerdown', { pointerId: 13, bubbles: true, isPrimary: true }));
    await new Promise(r => setTimeout(r, 200));
    return !document.getElementById('pad').hidden;
  });
  check('the notepad button opens the notepad', padOpen === true);

  const hinted = await page.evaluate(async () => {
    const before = document.querySelectorAll('#toasts .toast').length;
    document.querySelector('#tbtns button[data-act="hint"]')
      .dispatchEvent(new PointerEvent('pointerdown', { pointerId: 14, bubbles: true, isPrimary: true }));
    await new Promise(r => setTimeout(r, 200));
    const list = document.querySelectorAll('#toasts .toast');
    return { grew: list.length > before, last: list.length ? list[list.length - 1].textContent : '' };
  });
  check('the hint button asks for a hint', hinted.grew === true && /hint/i.test(hinted.last), hinted.last);

  check('no console errors', logs.length === 0, logs.join(' | '));

  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log(failed.length ? failed.length + ' of ' + results.length + ' failed' : 'all ' + results.length + ' passed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
