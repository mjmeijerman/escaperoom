/* Murdoku on a phone: a stick, a look finger, six buttons, no pointer lock.
   Run:
   docker run --rm --network host -v "$PWD":/work -w /work \
     -e NODE_PATH=/home/pptruser/node_modules \
     ghcr.io/puppeteer/puppeteer:latest node test/murdoku.mobile.cjs */
const puppeteer = require('puppeteer');

const URL = process.env.URL || 'http://localhost:8080/murdoku.html?test';
let pass = 0, fail = 0;
function check(name, ok, info) {
  if (ok) { pass++; console.log('PASS  ' + name + (info !== undefined ? '  (' + JSON.stringify(info) + ')' : '')); }
  else { fail++; console.log('FAIL  ' + name + (info !== undefined ? '  (' + JSON.stringify(info) + ')' : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--mute-audio', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(1200);

  const see = sel => page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return null;
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { display: st.display, visibility: st.visibility, w: Math.round(r.width), h: Math.round(r.height),
      top: Math.round(r.top), left: Math.round(r.left), hidden: el.hidden };
  }, sel);

  /* --- the phone gets the phone layout ---------------------------------- */
  check('the page knows it is on a phone', await page.evaluate(() => document.body.classList.contains('touch')));
  const stick = await see('#stick');
  check('a stick is on screen, bottom left', stick && stick.display !== 'none' && stick.left < 60
    && stick.top + stick.h > 700, stick);
  const btns = await page.evaluate(() => [...document.querySelectorAll('#tbtns button')].map(b => {
    const r = b.getBoundingClientRect();
    return { act: b.dataset.act, w: Math.round(r.width), h: Math.round(r.height) };
  }));
  check('six buttons, all big enough for a thumb', btns.length === 6 && btns.every(b => b.w >= 44 && b.h >= 44),
    btns.map(b => b.act + ':' + b.w));
  check('the keyboard legend is gone', (await see('#legend')).display === 'none');
  check('the notes start closed, off the way', (await see('#pad')).hidden === true);
  check('the start card talks about the stick, not WASD', await page.evaluate(() => {
    const t = document.querySelector('#start .touch-only');
    return !!t && getComputedStyle(t).display !== 'none' && /stick to walk/.test(t.textContent)
      && getComputedStyle(document.querySelector('#start .desk-only')).display === 'none';
  }));
  check('nothing hangs off the side of the screen', await page.evaluate(() =>
    document.documentElement.scrollWidth <= innerWidth + 1));

  /* --- start, then walk with the stick ---------------------------------- */
  await page.tap('#startBtn');
  await sleep(500);
  check('the house is entered', await page.evaluate(() => window.__murdoku.state.started));
  const noLock = await page.evaluate(() => document.pointerLockElement === null);
  check('and no pointer lock was asked for', noLock);

  const stickGeom = await page.evaluate(() => {
    const r = document.querySelector('#stick').getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  const push = (dx, dy, type, id = 11) => page.evaluate(({ cx, cy, dx, dy, type, id }) => {
    const el = document.querySelector('#stick');
    el.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true,
      clientX: cx + dx, clientY: cy + dy,
    }));
  }, { cx: stickGeom.cx, cy: stickGeom.cy, dx, dy, type, id });

  await push(0, -42, 'pointerdown');
  await sleep(120);
  const stickState = await page.evaluate(() => ({
    y: window.__murdoku.state.stick.y,
    knob: document.querySelector('#stickKnob').style.transform,
  }));
  check('pushing the stick up is a value the walk uses', stickState.y < -.6, stickState);
  check('and the knob follows the thumb', /translate\(-?\d/.test(stickState.knob), stickState.knob);

  const z0 = await page.evaluate(() => window.__murdoku.camera.position.z);
  await sleep(600);
  const z1 = await page.evaluate(() => window.__murdoku.camera.position.z);
  check('so the camera walks forward', z1 < z0 - .2, { from: +z0.toFixed(2), to: +z1.toFixed(2) });
  await push(0, -42, 'pointerup');
  await sleep(120);
  const released = await page.evaluate(() => ({
    y: window.__murdoku.state.stick.y,
    knob: document.querySelector('#stickKnob').style.transform.replace(/0px/g, '0').replace(/\s/g, ''),
  }));
  check('and lets go when the thumb does', released.y === 0 && released.knob === 'translate(0,0)', released);

  /* --- one finger on the scene turns the head -------------------------- */
  const yaw0 = await page.evaluate(() => +window.__murdoku.where().yaw.toFixed(3));
  await page.evaluate(() => {
    const c = document.querySelector('#scene');
    const o = { pointerId: 21, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true };
    c.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: 195, clientY: 420 }));
    c.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: 115, clientY: 420 }));
    c.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: 115, clientY: 420 }));
  });
  await sleep(200);
  const turned = await page.evaluate(() => window.__murdoku.camera.rotation.y);
  check('dragging a finger turns the camera', Math.abs(turned) > .1, { yaw: +turned.toFixed(3), was: yaw0 });

  /* --- tapping the scene uses what the crosshair is on ------------------ */
  const tapUse = await page.evaluate(async () => {
    const d = window.__murdoku;
    d.state.carry = null;
    const g = d.visuals.A.g;
    d.teleport(g.position.x, g.position.z + 1.15, 0, -0.1);     // an arm's length in front, looking at him
    await new Promise(r => setTimeout(r, 260));
    const c = document.querySelector('#scene');
    const o = { pointerId: 31, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true };
    c.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: 195, clientY: 422 }));
    c.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: 195, clientY: 422 }));
    await new Promise(r => setTimeout(r, 160));
    return d.state.carry;
  });
  check('a tap picks up the guest under the crosshair', tapUse === 'A', tapUse);

  const dragNotUse = await page.evaluate(async () => {
    const d = window.__murdoku;
    const c = document.querySelector('#scene');
    const o = { pointerId: 32, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true };
    c.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: 195, clientY: 422 }));
    c.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: 260, clientY: 400 }));
    c.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: 260, clientY: 400 }));
    await new Promise(r => setTimeout(r, 160));
    return d.state.carry;
  });
  check('but a drag is only a look, it does not put him down', dragNotUse === 'A', dragNotUse);

  /* --- the six buttons -------------------------------------------------- */
  const tapBtn = act => page.evaluate(a => document.querySelector(`#tbtns button[data-act="${a}"]`)
    .dispatchEvent(new PointerEvent('pointerdown', { pointerId: 41, pointerType: 'touch', bubbles: true, cancelable: true })), act);

  await tapBtn('pad');
  await sleep(200);
  const padOpen = await see('#pad');
  const room = await page.evaluate(() => {
    const btn = document.querySelector('#tbtns button').getBoundingClientRect();
    const pad = document.querySelector('#pad').getBoundingClientRect();
    return { btnTop: Math.round(btn.top), padBottom: Math.round(pad.bottom) };
  });
  check('the notes open with ▤, fit the width, and stop above the buttons', padOpen.hidden === false
    && padOpen.left >= 0 && padOpen.left + padOpen.w <= 391 && padOpen.top >= 40
    && room.padBottom <= room.btnTop, { ...padOpen, ...room });
  const listed = await page.evaluate(() => document.querySelectorAll('#padPeople li.person').length);
  check('with all six guests in them', listed === 6, listed);
  await tapBtn('pad');
  await sleep(150);
  check('and close again', (await see('#pad')).hidden === true);

  await tapBtn('back');
  await sleep(250);
  const backToast = await page.evaluate(() => [...document.querySelectorAll('#toasts .toast')]
    .map(t => t.textContent).pop());
  check('↩ puts the carried guest back in the hall', await page.evaluate(() => window.__murdoku.state.carry === null)
    && /back to the hall/i.test(backToast), backToast);

  await tapBtn('jump');
  await sleep(110);
  const lift = await page.evaluate(() => +window.__murdoku.feet().toFixed(2));
  check('↑ jumps', lift > .1, lift);

  await tapBtn('hint');
  await sleep(250);
  const hintToast = await page.evaluate(() => [...document.querySelectorAll('#toasts .toast')]
    .map(t => t.textContent).pop());
  check('? gives a Dutch hint', /^Hint · /.test(hintToast), hintToast);

  const marked = await page.evaluate(async () => {
    const d = window.__murdoku;
    d.teleport(d.cellX(4), d.cellZ(5) - 1.2, 0, -0.5);
    await new Promise(r => setTimeout(r, 300));
    const before = d.state.marks.size;
    document.querySelector('#tbtns button[data-act="mark"]')
      .dispatchEvent(new PointerEvent('pointerdown', { pointerId: 42, pointerType: 'touch', bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 150));
    return { before, after: d.state.marks.size };
  });
  check('✗ crosses the square under the crosshair out', marked.after > marked.before, marked);

  /* --- the way back out -------------------------------------------------- */
  await tapBtn('pad');
  await sleep(200);
  const resetBtn = await page.evaluate(() => {
    const b = document.querySelector('#padReset');
    const r = b.getBoundingClientRect();
    return { shown: getComputedStyle(b.parentElement).display !== 'none', w: Math.round(r.width), h: Math.round(r.height) };
  });
  check('the notes carry their own reset, big enough to hit', resetBtn.shown && resetBtn.w > 80 && resetBtn.h >= 24, resetBtn);

  await page.evaluate(() => {
    const d = window.__murdoku;
    d.setCell('A', 1, 1); d.state.marks.add(d.key(4, 5)); d.syncMarks();
  });
  await page.tap('#padReset');
  await sleep(250);
  const afterReset = await page.evaluate(() => ({
    placed: Object.keys(window.__murdoku.state.placed).length,
    marks: window.__murdoku.state.marks.size,
    toast: [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).pop(),
  }));
  check('and tapping it puts everyone back with every mark gone',
    afterReset.placed === 0 && afterReset.marks === 0 && /back to the hall/i.test(afterReset.toast), afterReset);

  check('no console errors', errors.length === 0, errors.slice(0, 2));

  console.log(`\n${fail ? 'FAILED' : 'all'} ${pass} passed${fail ? ', ' + fail + ' failed' : ''}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
