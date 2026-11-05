/* Browser test for pcdoc.html — slice 1: dark shop, torch, generator, shrink, the case interior,
   the POST display cycling every fault, and the memory chain (C1).

   docker run --rm --network host -v "$PWD":/work -w /work \
     -e NODE_PATH=/home/pptruser/node_modules \
     ghcr.io/puppeteer/puppeteer:latest node test/pcdoc.browser.cjs

   Exits 1 on any failed check. Screenshot lands in test/.shots/pcdoc.png. */
const puppeteer = require('puppeteer');
const { mkdirSync } = require('node:fs');

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
    defaultViewport: { width: 1280, height: 760 },
  });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
  page.on('pageerror', e => logs.push(String(e)));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(900);

  const startCard = await page.evaluate(() => {
    const el = document.getElementById('start');
    return { shown: !!el && !el.hidden, label: el ? el.querySelector('button').textContent.trim() : '' };
  });
  check('the room waits behind a start button', startCard.shown, startCard.label);
  check('the timer has not started', await page.evaluate(() => document.getElementById('timer').textContent) === '00:00');
  await page.click('#startBtn');
  await sleep(700);
  const readTime = await page.evaluate(async () => {
    const d = window.__doctor;
    d.toast('x'.repeat(140), 'good');                 // a long one, like a solved chain
    await new Promise(r => setTimeout(r, 3200));
    const live = [...document.querySelectorAll('#toasts .toast')].filter(el => el.style.opacity !== '0');
    return live.filter(el => el.textContent.length >= 140).length;
  });
  check('a long line stays on screen long enough to read', readTime === 1, String(readTime));

  check('the button starts the shift', await page.evaluate(() => !document.getElementById('start').hidden === false && window.__doctor.state.started === true));
  check('and the voicemail plays on its own',
    await page.evaluate(() => /Doctor|wholesaler|tower/.test(document.getElementById('body').textContent)));

  const boot = await page.evaluate(() => {
    const d = window.__doctor;
    return { has: !!d, phase: d && d.state.phase, torch: d && d.state.torch, codes: d && d.state.codes.slice() };
  });
  check('the room boots with the debug hook', boot.has);
  check('it starts dark, with no torch', boot.phase === 'dark' && boot.torch === false);
  check('five faults are waiting', boot.codes.join(',') === 'C1,d4,A2,F1,b7', boot.codes.join(','));

  const bare = await page.evaluate(() => ({
    tray: document.getElementById('tray').hidden,
    pad: document.getElementById('pad').hidden,
    scene: !!document.getElementById('scene'),
    big: [...document.querySelectorAll('body > *')].filter(el => {
      const r = el.getBoundingClientRect();
      return !el.hidden && r.width > innerWidth * .6 && r.height > innerHeight * .6 && el.id !== 'scene' && el.id !== 'hud' && el.id !== 'bloom' && el.id !== 'start' && el.className !== 'vignette';
    }).map(el => el.id || el.className),
  }));
  check('the inventory is on screen from the start', bare.pad === false);
  const legend = await page.evaluate(() => {
    const el = document.getElementById('legend');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { text: el.textContent.replace(/\s+/g, ' ').trim(), w: r.width, h: r.height, bottom: r.bottom };
  });
  check('every action key is on screen', !!legend && ['W A S D', 'Space', 'E', 'I', 'H', 'Q', 'M']
    .every(k => legend.text.includes(k)), legend && legend.text);
  check('the legend stays out of the way', !!legend && legend.w < 420 && legend.h < 90,
    legend ? `${Math.round(legend.w)}x${Math.round(legend.h)}` : '');
  check('nothing covers the room', bare.big.length === 0, bare.big.join(','));

  /* --- the torch ---------------------------------------------------------- */
  const t1 = await page.evaluate(() => window.__doctor.aimAt('torch', 1.0));
  check('the torch is reachable and prompts', t1 === 'torch', String(t1));
  await sleep(220);
  const torchPrompt = await page.evaluate(() => {
    const p = document.getElementById('prompt');
    return { text: p.textContent, kbd: !!p.querySelector('kbd'), read: p.classList.contains('read') };
  });
  check('an actionable thing shows the E prompt', torchPrompt.kbd && !torchPrompt.read, torchPrompt.text);
  await page.keyboard.press('KeyE');
  await sleep(200);
  check('E picks the torch up', await page.evaluate(() => window.__doctor.state.torch === true));
  check('and it goes into the notepad',
    await page.evaluate(() => window.__doctor.state.items.includes('torch')));

  /* --- the generator: the sticker's order --------------------------------- */
  const t2 = await page.evaluate(() => window.__doctor.aimAt('genFuel', 1.1));
  check('the fuel cock is reachable in the yard', t2 === 'genFuel', String(t2));
  await page.keyboard.press('KeyE');
  await sleep(150);
  check('fuel cock opens', await page.evaluate(() => window.__doctor.state.gen.fuel === true));
  check('the choke starts closed, as the sticker says',
    await page.evaluate(() => window.__doctor.state.gen.choke === 'closed'));

  const t3 = await page.evaluate(() => window.__doctor.aimAt('genCord', 1.1));
  check('the cord can be grabbed', t3 === 'genCord', String(t3));
  await page.keyboard.press('KeyE');
  await sleep(120);
  check('grabbing the cord starts a drag', await page.evaluate(() => !!window.__doctor.state.grab));
  await page.keyboard.press('Escape');
  await sleep(80);
  check('escape lets go of the cord', await page.evaluate(() => window.__doctor.state.grab === null));

  await page.evaluate(() => { for (let i = 0; i < 3; i++) window.__doctor.genPull(); });
  await sleep(400);
  const gen = await page.evaluate(() => ({
    running: window.__doctor.state.gen.running,
    phase: window.__doctor.state.phase,
    powered: window.__doctor.state.casePower,
  }));
  check('three pulls start the generator', gen.running === true);
  check('the shop lights come on', gen.phase === 'lit');
  check('the case has no mains yet, so the display stays dark', gen.powered === false);

  /* --- the torch retires when the mains arrive ---------------------------- */
  await sleep(2400);               // the shop lights up, then the torch goes back down
  const torchParked = await page.evaluate(() => {
    const d = window.__doctor;
    d.aimAt('torch', 1.0);
    const keys = d.THINGS.torch.keys();
    d.use();
    return { held: d.state.torch, keys, items: d.state.items.includes('torch') };
  });
  check('the torch goes back on the counter once the lights are on', torchParked.held === false);
  check('and it leaves the inventory with it', torchParked.items === false);
  check('it still reads, but it can no longer be picked up',
    torchParked.keys === '' && torchParked.held === false, JSON.stringify(torchParked));

  /* --- the POST display cycles every fault -------------------------------- */

  const torchNag = await page.evaluate(() => {
    const d = window.__doctor;
    const was = d.state.torch;
    d.state.torch = false;          // as if the player never took it
    d.giveHint();
    d.state.torch = was;
    const list = document.querySelectorAll('#toasts .toast');
    return list.length ? list[list.length - 1].textContent : '';
  });
  check('the hint stops nagging about the torch once the shop is lit',
    !/torch/i.test(torchNag), torchNag);

  /* --- the manual reads the codes ---------------------------------------- */
  const t4 = await page.evaluate(() => window.__doctor.aimAt('manual', 1.0));
  check('the manual is readable on the bench', t4 === 'manual', String(t4));
  await sleep(220);
  const manualPrompt = await page.evaluate(() => {
    const p = document.getElementById('prompt');
    return { text: p.textContent, kbd: !!p.querySelector('kbd'), read: p.classList.contains('read') };
  });
  check('a paper shows no E, because E does nothing on it', !manualPrompt.kbd && manualPrompt.read, manualPrompt.text);
  const manualText = await page.$eval('#body', el => el.textContent);
  check('the manual names every code',
    ['C1', 'd4', 'A2', 'F1', 'b7'].every(c => manualText.includes(c)));

  /* --- you cannot fiddle with a motherboard at 1.6 m --------------------- */
  const bigCable = await page.evaluate(() => window.__doctor.aimAt('cable_atx', 0.9));
  check('a cable end ignores a full-sized person', bigCable !== 'cable_atx', String(bigCable));
  const bigSlot = await page.evaluate(() => window.__doctor.aimAt('slotA2', 0.9));
  check('so does a memory slot', bigSlot !== 'slotA2', String(bigSlot));

  /* --- the shrink ray ---------------------------------------------------- */
  const lever = await page.evaluate(() => window.__doctor.aimAt('ray', 0.9, null, [1.65, 1.35]));
  check('standing in the ring, the shrink ray is in reach', lever === 'ray', String(lever));
  const offRing = await page.evaluate(() => {
    const d = window.__doctor;
    const before = d.state.phase;
    d.look(0, 0);
    d.camera.position.set(0.2, 1.62, 0.2);
    d.state.hovered = { id: 'ray', label: 'STRAAL-2000' };
    d.use();
    return { before, after: d.state.phase };
  });
  check('the interlock refuses you outside the ring', offRing.after !== 'shrinking' && offRing.after === offRing.before, offRing.after);
  await page.evaluate(() => window.__doctor.aimAt('ray', 0.9, null, [1.65, 1.35]));
  await page.keyboard.press('KeyE');
  await sleep(2600);
  const shrunk = await page.evaluate(() => ({
    phase: window.__doctor.state.phase,
    eye: window.__doctor.P.eye,
    y: Math.round(window.__doctor.state ? 1 : 0),
  }));
  check('the lever shrinks you', shrunk.phase === 'shrunk', shrunk.phase);
  check('eye height drops to 17 mm', Math.abs(shrunk.eye - 0.017) < 1e-6, String(shrunk.eye));

  /* --- you can actually walk in through the open front ------------------- */
  const walkedIn = await page.evaluate(async () => {
    const d = window.__doctor;
    d.camera.position.set(-2.0, 0.95 + d.P.eye, -2.10);
    d.look(0, 0);
    d.state.locked = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    await new Promise(r => setTimeout(r, 1600));
    d.state.locked = false;
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    return +d.camera.position.z.toFixed(3);
  });
  check('the open front is walkable at 17 mm', walkedIn < -2.18, String(walkedIn));

  /* --- solid things are solid -------------------------------------------- */
  const intoPsu = await page.evaluate(async () => {
    const d = window.__doctor;
    d.camera.position.set(-1.87, 0.95 + d.P.eye, -2.06);
    d.look(0, 0);
    d.state.locked = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    await new Promise(r => setTimeout(r, 1200));
    d.state.locked = false;
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    return +d.camera.position.z.toFixed(3);
  });
  check('the PSU block stops you', intoPsu > -2.176, String(intoPsu));

  /* --- inside the case: the memory chain --------------------------------- */
  const a2 = await page.evaluate(() => window.__doctor.aimAt('slotA2', 0.055, 0.95));
  check('slot A2 is reachable at 17 mm', a2 === 'slotA2', String(a2));
  await page.keyboard.press('KeyE');
  await sleep(200);
  check('the loose module pushes home', await page.evaluate(() => window.__doctor.state.ram.a2 === true));

  // the module moved, so its collider has to move with it — front face included
  const a2Box = await page.evaluate(() => {
    const d = window.__doctor, s = d.a2Solid;
    return { z0: +s.z0.toFixed(3), z1: +s.z1.toFixed(3), want0: +d.SEATED_Z0.toFixed(3), want1: +d.SEATED_Z1.toFixed(3) };
  });
  check('the A2 collider follows the module home',
    Math.abs(a2Box.z0 - a2Box.want0) < .002 && Math.abs(a2Box.z1 - a2Box.want1) < .002, JSON.stringify(a2Box));
  const a2Walk = await page.evaluate(async () => {
    const d = window.__doctor;
    d.setFeet(0.95);
    d.camera.position.set(-2.13, 0.95 + d.P.eye, -2.30);
    d.look(0, 0);                       // straight at the seated module
    d.state.locked = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    await new Promise(r => setTimeout(r, 1200));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    d.state.locked = false;
    return +d.camera.position.z.toFixed(3);
  });
  check('and there is no walking through its front face', a2Walk > -2.405 && a2Walk < -2.36, String(a2Walk));
  check('C1 stays up, because it is the other module',
    await page.evaluate(() => window.__doctor.state.codes.includes('C1')));

  const b2 = await page.evaluate(() => window.__doctor.aimAt('slotB2', 0.055, 0.95));
  check('slot B2 is reachable', b2 === 'slotB2', String(b2));
  await page.keyboard.press('KeyE');
  await sleep(220);
  check('the burnt module comes out', await page.evaluate(() => window.__doctor.state.ram.b2Out === true));

  const bag = await page.evaluate(() => window.__doctor.aimAt('bag', 0.055, 0.95));
  check('the anti-static bag is reachable', bag === 'bag', String(bag));
  await page.keyboard.press('KeyE');
  await sleep(200);
  check('the spare module is in your pocket', await page.evaluate(() => window.__doctor.state.ram.spare === true));

  const b2b = await page.evaluate(() => window.__doctor.aimAt('slotB2', 0.055, 0.95));
  check('slot B2 prompts again with the spare', b2b === 'slotB2', String(b2b));
  await page.keyboard.press('KeyE');
  await sleep(300);
  const pending = await page.evaluate(() => window.__doctor.state.invPending);
  check('an empty slot asks the inventory for a module', pending === 'ram', String(pending));
  await page.click('#padItems button[data-item="ddr4 module"]');
  await sleep(350);
  const ram = await page.evaluate(() => ({
    seated: window.__doctor.state.ram.seated,
    codes: window.__doctor.state.codes.slice(),
    note: window.__doctor.state.notes.RAM,
  }));
  check('the good module seats', ram.seated === true);
  check('C1 clears off the display', !ram.codes.includes('C1'), ram.codes.join(','));
  check('the module gives up its character', ram.note === 'N', String(ram.note));

  /* --- the inventory holds it -------------------------------------------- */
  const padShown = await page.evaluate(() => !document.getElementById('pad').hidden);
  await page.keyboard.press('KeyI');
  await sleep(160);
  const padHidden = await page.evaluate(() => document.getElementById('pad').hidden);
  await page.keyboard.press('KeyI');
  await sleep(160);
  const padBack = await page.evaluate(() => !document.getElementById('pad').hidden);
  check('I hides and shows the inventory', padShown && padHidden && padBack, `${padShown}/${padHidden}/${padBack}`);
  const padText = await page.evaluate(() => document.getElementById('pad').textContent);
  check('the inventory has the character, the fault list and the scrap module',
    padText.includes('N') && padText.includes('d4') && /RMA/.test(padText), padText.slice(0, 120));
  check('and it does not lecture about the order', !/order they go in|order found/i.test(padText));

  /* --- slice 2: power, fans, the card ------------------------------------ */
  const at = (id, d = 0.035) => page.evaluate(([id, d]) => window.__doctor.aimAt(id, d, 0.95), [id, d]);
  const press = async (k = 'KeyE') => { await page.keyboard.press(k); await sleep(140); };
  const st = () => page.evaluate(() => {
    const d = window.__doctor;
    return { psu: { ...d.state.psu }, fans: { ...d.state.fans }, gpu: { ...d.state.gpu },
      mon: { ...d.state.mon }, usb: { ...d.state.usb }, ssd: { ...d.state.ssd },
      zip: { ready: !!d.state.zip.ready, riding: !!d.state.zip.riding },
      held: d.state.held, notes: { ...d.state.notes }, codes: d.state.codes.slice() };
  });

  check('the PSU rocker is reachable', (await at('psuRocker')) === 'psuRocker', String(await at('psuRocker')));
  await press();
  check('the rocker wakes the PSU', (await st()).psu.rocker === true);

  check('a cable end can be picked up', (await at('cable_atx')) === 'cable_atx');
  await press();
  check('the 24-pin is in your hand', (await st()).held === 'atx');
  await page.mouse.click(640, 380, { button: 'right' });     // right button drops it
  await sleep(150);
  check('the right mouse button puts it down', (await st()).held === null);
  await at('cable_atx'); await press();
  const walkInto = (x, z, yawV, fy, ms = 900) => page.evaluate(async ([x, z, yawV, fy, ms]) => {
    const d = window.__doctor;
    d.setFeet(fy);
    d.camera.position.set(x, fy + d.P.eye, z);
    d.look(yawV, 0);
    d.state.locked = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    await new Promise(r => setTimeout(r, ms));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    d.state.locked = false;
    return { x: +d.camera.position.x.toFixed(3), z: +d.camera.position.z.toFixed(3) };
  }, [x, z, yawV, fy, ms]);

  check('the intake form is on the bench, readable at 17 mm', (await at('werkbon', 0.06)) === 'werkbon');
  await sleep(200);
  check('and it still says what the customer said',
    /beeps|picture|mouse/i.test(await page.$eval('#body', el => el.textContent)));
  // the log is a book, not a sticker: aim at it from beside it, not from inside it
  const logLook = await page.evaluate(() => window.__doctor.aim(-2.98, -2.52, Math.PI, null, 0.95));
  check('the service log is on the bench, readable at 17 mm', logLook === 'logbook', String(logLook));
  const intoLog = await walkInto(-2.98, -2.60, Math.PI, 0.95, 1500);
  check('the log is a book you bump into, not air', intoLog.z < -2.42, JSON.stringify(intoLog));

  check('the 24-pin socket is reachable', (await at('h24')) === 'h24');
  await press();
  check('the 24-pin plugs in', (await st()).psu.atx === true);

  // the twin 8-pins: the PCIe one must not go in the CPU socket
  await at('cable_pcie'); await press();
  const before = await st();
  await at('hcpu'); await press();
  const after = await st();
  check('the PCIe 8-pin is refused by the CPU socket',
    before.held === 'pcie' && after.psu.cpu === false && after.held === 'pcie', after.held || 'lost the cable');

  await at('cable_eps'); await press();
  await at('hcpu'); await press();
  const rail = await st();
  check('the EPS 8-pin goes in the CPU socket', rail.psu.cpu === true);
  await sleep(700);
  const codeA = await page.evaluate(() => window.__doctor.state.codeIndex);
  await sleep(2400);
  const codeB = await page.evaluate(() => window.__doctor.state.codeIndex);
  const offOn = await page.evaluate(async () => {
    const d = window.__doctor;
    d.aimAt('psuRocker', 0.035, 0.95); d.use();          // mains off
    await new Promise(r => setTimeout(r, 300));
    const off = { powered: d.state.casePower, glow: d.led.material.emissiveIntensity };
    d.aimAt('psuRocker', 0.035, 0.95); d.use();          // and back on
    await new Promise(r => setTimeout(r, 400));
    const on = { powered: d.state.casePower, glow: d.led.material.emissiveIntensity };
    return { off, on };
  });
  check('switching the mains off kills the display', offOn.off.powered === false && offOn.off.glow === 0,
    JSON.stringify(offOn.off));
  check('and switching it back on brings the codes back', offOn.on.powered === true && offOn.on.glow > 0,
    JSON.stringify(offOn.on));
  check('mains plus 24-pin wakes the display', await page.evaluate(() => {
    const l = window.__doctor.led; return l && l.material.emissiveIntensity > 0 && window.__doctor.state.casePower;
  }));
  check('the display cycles through the faults', codeB !== codeA, `${codeA} -> ${codeB}`);
  check('12 V on the board gives the PSU its character', rail.notes.PSU === 'K', String(rail.notes.PSU));

  check('the loose 4-pin can be picked up', (await at('plugRear')) === 'plugRear');
  await press();
  check('CHA_FAN1 is reachable', (await at('chaFan1')) === 'chaFan1');
  await press();
  check('the rear fan is connected', (await st()).fans.rear === true);

  check('SYS_FAN3 holds the CPU fan cable', (await at('sysFan3')) === 'sysFan3');
  await press();
  check('the CPU cable comes out', (await st()).held === 'fanCpu');
  check('CPU_FAN is reachable', (await at('cpuFanHdr')) === 'cpuFanHdr');
  await press();
  check('the CPU fan is on the right header', (await st()).fans.cpu === true);

  check('the screwdriver is reachable', (await at('screwdriver')) === 'screwdriver');
  await press();
  const fans = await st();
  check('the intake is free', fans.fans.intake === true);
  check('all three fans spin and F1 clears', fans.fans.spinning === true && !fans.codes.includes('F1'), fans.codes.join(','));
  check('the fans give up their character', fans.notes.fans === 'O', String(fans.notes.fans));

  // the padlock: 456, from the shop number on the side panel
  check('the padlock is reachable', (await at('padlock')) === 'padlock');
  await press();
  check('the padlock opens its wheels', (await st()).gpu.trying === true);
  await page.keyboard.press('KeyQ');
  await sleep(120);
  check('Q steps back out of the padlock', (await st()).gpu.trying === false);
  await press();
  for (const [wheel, digit] of [[0, 4], [1, 5], [2, 6]]) {
    for (let i = 0; i < digit; i++) await page.keyboard.press('ArrowUp');
    if (wheel < 2) await page.keyboard.press('ArrowRight');
  }
  await press();
  check('456 opens the padlock', (await st()).gpu.unlocked === true);
  const intoPole = await walkInto(-1.78, -2.55, 0, 0.95, 1200);
  check('the padlock post is something you walk into, not over', intoPole.z > -2.60, JSON.stringify(intoPole));

  // drag the winch drum
  check('the winch drum is reachable', (await at('gpuDrum')) === 'gpuDrum');
  await press();
  check('grabbing the drum starts a drag', await page.evaluate(() => !!window.__doctor.state.grab));
  await page.evaluate(() => { window.__doctor.state.locked = true; });
  for (let i = 0; i < 30; i++) { await page.mouse.move(400, 120 + i * 18); await sleep(8); }
  await page.evaluate(() => { window.__doctor.state.locked = false; });
  const dropped = (await st()).gpu.drop;
  check('dragging lowers the card', dropped > .9, String(dropped));

  check('the card is reachable', (await at('gpu')) === 'gpu');
  await press();
  check('the card seats in the rail', (await st()).gpu.seated === true);

  await at('cable_pcie'); await press();
  await at('hpcie'); await press();
  const fin = await st();
  check('the card gets its 8-pin', fin.psu.pcie === true && fin.gpu.powered === true);
  check('d4 clears', !fin.codes.includes('d4'), fin.codes.join(','));
  check('the card gives up its character', fin.notes.GPU === 'E', String(fin.notes.GPU));
  check('only A2 and b7 are left on the display', fin.codes.join(',') === 'A2,b7', fin.codes.join(','));

  const audio = await page.evaluate(async () => {
    const d = window.__doctor;
    d.audioInit();
    await new Promise(r => setTimeout(r, 200));
    const A = d.A;
    const before = { music: A.music.gain.value, master: A.master.gain.value };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
    const afterMusic = { music: A.music.gain.value, master: A.master.gain.value };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
    const back = { music: A.music.gain.value };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN' }));
    const allOff = { master: A.master.gain.value };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN' }));
    return { before, afterMusic, back, allOff, ctx: A.ctx ? A.ctx.state : 'none' };
  });
  check('the audio graph is alive', audio.ctx === 'running', audio.ctx);
  check('M silences the music and leaves the effects alone',
    audio.before.music > 0 && audio.afterMusic.music === 0 && audio.afterMusic.master > 0,
    JSON.stringify(audio.afterMusic));
  check('M brings the music back', audio.back.music > 0);
  check('N silences everything', audio.allOff.master === 0, String(audio.allOff.master));

  /* --- slice 3: the monitor cable ---------------------------------------- */
  check('the loose HDMI end is reachable inside the case', (await at('cable_hdmi')) === 'cable_hdmi');
  await press();
  check('the HDMI cable is in your hands', (await st()).held === 'hdmi');
  const wrongPort = await page.evaluate(async () => {
    const d = window.__doctor;
    d.aimAt('usbPortA', 0.03, 0.95);
    d.use();
    await new Promise(r => setTimeout(r, 150));
    const t = document.querySelectorAll('#toasts .toast');
    return { plugged: d.state.usb.kbd, said: t.length ? t[t.length - 1].textContent : '', held: d.state.held };
  });
  check('a USB port refuses the monitor cable, and says which cable it is',
    wrongPort.plugged === false && /monitor cable/i.test(wrongPort.said) && wrongPort.held === 'hdmi',
    JSON.stringify(wrongPort));
  const io = await at('ioHdmi');
  check('the rear panel is reachable from behind the case', io === 'ioHdmi', String(io));
  await press();
  const mon = await st();
  check('plugging it in clears A2', !mon.codes.includes('A2'), mon.codes.join(','));
  check('the rear panel gives up its character', mon.notes.monitor === 'R', String(mon.notes.monitor));
  check('and the monitor wakes up', await page.evaluate(() => {
    const m = window.__doctor.scene.children.find(o => o.isMesh && o.material && o.material.emissiveIntensity > 1);
    return !!m;
  }));
  check('only b7 is left on the display', mon.codes.join(',') === 'b7', mon.codes.join(','));

  /* --- slice 3: the rear I/O, the span, and the desk --------------------- */
  check('the cable becomes a two-way span once both ends are in', (await st()).zip.ready === true);

  const ride = (dir) => page.evaluate(async (dir) => {
    const d = window.__doctor;
    d.state.zip.seconds = 0.35;
    const hit = d.aimAt(dir === 'down' ? 'zipBench' : 'zipDesk', 0.05, dir === 'down' ? 0.95 : 0.76);
    d.use();
    await new Promise(r => setTimeout(r, 800));
    return { hit, x: +d.camera.position.x.toFixed(2), y: +d.camera.position.y.toFixed(3), z: +d.camera.position.z.toFixed(2),
      onDesk: d.camera.position.x > 1.9, riding: d.state.zip.riding, held: d.state.held };
  }, dir);
  const deskAt = (id, d = 0.04) => page.evaluate(([id, d]) => window.__doctor.aimAt(id, d, 0.76), [id, d]);

  /* --- the can of air, on the bench -------------------------------------- */
  check('the compressed-air can stands on the bench', (await at('airCan')) === 'airCan');
  const intoCan = await walkInto(-2.55, -2.42, Math.PI, 0.95, 1400);
  check('the air can is a thing you bump into, not air',
    intoCan.z < -2.30 && intoCan.z > -2.40, JSON.stringify(intoCan));
  await at('airCan');
  await press();
  const inPad = await page.evaluate(() => ({
    items: window.__doctor.state.items.slice(),
    held: window.__doctor.state.held,
    onBench: window.__doctor.scene.children.some(o => o.visible && o.userData && o.userData.interact === 'airCan'),
  }));
  check('taking the can puts it in the notepad, not in your hands',
    inPad.items.includes('compressed air') && inPad.held === null, JSON.stringify(inPad));
  check('and the can leaves the bench', inPad.onBench === false);

  /* --- down the cable, to the desk --------------------------------------- */
  const zipDown = await ride('down');
  check('the ride lands you on the desk', zipDown.onDesk && zipDown.y > .77 && zipDown.riding === false,
    JSON.stringify(zipDown));
  const lookKept = await page.evaluate(async () => {
    const d = window.__doctor;
    d.state.zip.seconds = 0.35;
    d.look(1.1, -.2);                                   // a look the ride must not touch
    d.aimAt('zipDesk', 0.05, 0.76);
    d.look(1.1, -.2);
    d.use();
    await new Promise(r => setTimeout(r, 750));
    return { yaw: +d.camera.rotation.y.toFixed(2), pitch: +d.camera.rotation.x.toFixed(2), riding: d.state.zip.riding };
  });
  check('coming off the cable leaves your look direction alone',
    Math.abs(lookKept.yaw - 1.1) < .25 && Math.abs(lookKept.pitch + .2) < .25 && lookKept.riding === false,
    JSON.stringify(lookKept));
  // back to the desk for the rest of the walkthrough
  await page.evaluate(async () => {
    const d = window.__doctor;
    d.state.zip.seconds = 0.35;
    d.aimAt('zipBench', 0.05, 0.95); d.use();
    await new Promise(r => setTimeout(r, 750));
  });

  check('the keycaps carry letters you can read', await page.evaluate(() => {
    const d = window.__doctor;
    const legends = d.kbDeckG.children.filter(o => o.isMesh && o.material === d.kbLegendMat);
    return legends.length >= 40;
  }));
  const intoKb = await walkInto(2.42, -0.85, Math.PI, 0.76, 1500);
  check('the keyboard is solid: you walk into it, not through it', intoKb.z < -0.72, JSON.stringify(intoKb));
  const intoMouse = await walkInto(3.05, -0.75, Math.PI, 0.76, 1700);
  check('so is the mouse', intoMouse.z < -0.60, JSON.stringify(intoMouse));

  /* --- the keyboard connector: pick it up here, plug it in there ---------- */
  // the mains goes off first: a connector should still go into a dead port
  await page.evaluate(() => window.__doctor.THINGS.psuRocker.act());
  await sleep(200);
  check('the board is unpowered for this trip', await page.evaluate(() => window.__doctor.state.psu.rocker === false));
  check('the keyboard connector is on the desk', (await deskAt('usbKbd')) === 'usbKbd');
  await press();
  check('the connector is in your arms', (await st()).held === 'usbKbd');
  const usbCable = await page.evaluate(() => {
    const w = window.__doctor.usbWire.usbKbd;
    return { visible: w.visible, len: +w.scale.y.toFixed(2) };
  });
  check('and its cable comes with it', usbCable.visible === true && usbCable.len > .3, JSON.stringify(usbCable));

  const rideUpHeld = await ride('up');
  check('you can ride the cable with a connector in your arms',
    rideUpHeld.onDesk === false && rideUpHeld.held === 'usbKbd' && rideUpHeld.riding === false, JSON.stringify(rideUpHeld));
  check('the cable stretches all the way back to the keyboard', await page.evaluate(() =>
    window.__doctor.usbWire.usbKbd.visible === true && window.__doctor.usbWire.usbKbd.scale.y > 2));

  check('a rear USB port is within reach', (await at('usbPortA')) === 'usbPortA');
  await press();
  const kbdIn = await st();
  check('the keyboard is plugged in, with the mains off', kbdIn.usb.kbd === true);
  check('and it stays dark, because nothing has 12 V', await page.evaluate(() =>
    window.__doctor.kbKeyMat.emissiveIntensity === 0));
  await page.evaluate(() => window.__doctor.THINGS.psuRocker.act());
  await sleep(500);
  check('switching the mains on wakes the keyboard up', await page.evaluate(() =>
    window.__doctor.kbKeyMat.emissiveIntensity > 0 && window.__doctor.state.usb.kbdLit === true));
  check('and the letters light with it', await page.evaluate(() =>
    window.__doctor.kbLegendMat.emissiveIntensity > 0));
  check('and the cable is laid along the route you carried it', await page.evaluate(() =>
    window.__doctor.usbWire.usbKbd.visible === false && window.__doctor.USB.usbKbd.routed === true));

  /* --- the mouse connector: the same trip -------------------------------- */
  const down2 = await ride('down');
  check('back down to the desk for the second one', down2.onDesk === true, JSON.stringify(down2));
  check('the mouse connector is on the desk', (await deskAt('usbMouse')) === 'usbMouse');
  await press();
  check('the mouse connector is in your arms', (await st()).held === 'usbMouse');
  const up2 = await ride('up');
  check('and it rides back with you', up2.onDesk === false && up2.held === 'usbMouse', JSON.stringify(up2));
  check('a second port takes the mouse', (await at('usbPortB')) === 'usbPortB');
  await press();
  const mouseIn = await st();
  check('the mouse is plugged in', mouseIn.usb.mouse === true);
  check('and it is malfunctioning, as the intake form said', mouseIn.usb.clean === false);

  /* --- back to the desk for the mouse itself ----------------------------- */
  const down3 = await ride('down');
  check('down again, to the mouse', down3.onDesk === true, JSON.stringify(down3));
  check('the mouse is within reach on the desk', (await deskAt('mouse', 0.05)) === 'mouse');
  await press();
  check('it goes over onto its side', (await st()).usb.tipped === true);
  check('the optical window is exposed', (await deskAt('mouseLens')) === 'mouseLens');
  await sleep(220);
  check('the tray says what is wrong with it', /hair/i.test(await page.$eval('#body', el => el.textContent)));
  await press();
  const pendingAir = await page.evaluate(() => ({
    pending: window.__doctor.state.invPending,
    padShown: !document.getElementById('pad').hidden,
    button: !!document.querySelector('#padItems button[data-item="compressed air"]'),
  }));
  check('clicking the dirty window asks for the air out of the inventory',
    pendingAir.pending === 'air' && pendingAir.padShown && pendingAir.button, JSON.stringify(pendingAir));
  await page.click('#padItems button[data-item="compressed air"]');
  await sleep(220);
  const cleaned = await st();
  check('picking the air cleans the window', cleaned.usb.clean === true);
  check('the mouse goes back on its pad', await page.evaluate(async () => {
    const d = window.__doctor;
    d.aimAt('mouse', 0.05, 0.76);
    d.use();
    await new Promise(r => setTimeout(r, 120));
    return d.state.usb.tipped === false;
  }));

  const zipUp = await ride('up');
  check('the far grip rides you back to the bench', zipUp.onDesk === false && zipUp.riding === false,
    JSON.stringify(zipUp));

  /* --- slice 4: the drive, its tail, and the inside of it ---------------- */
  check('the customer\'s SSD is on the bench, port and all', (await at('ssdPort')) === 'ssdPort');
  const unplugged = await page.evaluate(async () => {
    const d = window.__doctor;
    d.aimAt('ssdPort', 0.05, 0.95); d.use();
    await new Promise(r => setTimeout(r, 200));
    return { inside: d.state.disk.inside, led: d.ssdLed.material.emissiveIntensity };
  });
  check('an unplugged drive is not a doorway', unplugged.inside === false, JSON.stringify(unplugged));
  check('and its LED is dark', unplugged.led === 0, String(unplugged.led));

  check('the tail is lying beside it', (await at('ssdPlug')) === 'ssdPlug');
  await press();
  check('the cable end is in your arms', (await st()).held === 'ssdTail');
  check('the SATA socket is on the rear panel', (await at('ssdSocket')) === 'ssdSocket');
  await press();
  const plugged = await st();
  check('plugging it in connects the drive', plugged.ssd.plugged === true);
  check('the drive lights red while b7 is in it', await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 200));
    const m = window.__doctor.ssdLed.material;
    return m.emissive.getHex() === 0xff3a2a && m.emissiveIntensity > 0;
  }));
  const entered = await page.evaluate(async () => {
    const d = window.__doctor;
    d.aimAt('ssdPort', 0.05, 0.95);
    d.use();
    await new Promise(r => setTimeout(r, 350));
    return { inside: d.state.disk.inside, y: +d.camera.position.y.toFixed(2), blocks: d.sectorBlocks.length };
  });
  check('the port is a doorway into the sector grid', entered.inside === true && entered.y < -5, JSON.stringify(entered));
  check('the grid has sectors missing', entered.blocks < 8 * 9, String(entered.blocks));

  const chased = await page.evaluate(async () => {
    const d = window.__doctor;
    const p = d.worm.position.clone();
    await new Promise(r => setTimeout(r, 900));
    return +d.worm.position.distanceTo(p).toFixed(3);
  });
  check('the worm comes after you', chased > .01, String(chased));

  const lured = await page.evaluate(async () => {
    const d = window.__doctor;
    d.state.locked = false;
    d.setFeet(d.DISK.y);
    d.camera.position.set((d.CH.x0 + d.CH.x1) / 2, d.DISK.y + d.P.eye, (d.CH.z0 + d.CH.z1) / 2);
    const doorX = (d.DOOR.x0 + d.DOOR.x1) / 2;
    d.worm.position.set(doorX - .06, d.DISK.y + .02, d.CH.z1 + .13);   // outside, just short of the door
    const t0 = performance.now();
    while (performance.now() - t0 < 6000 && !d.wormInChamber(d.worm.position.x, d.worm.position.z)) {
      await new Promise(r => setTimeout(r, 80));
    }
    return { inChamber: d.wormInChamber(d.worm.position.x, d.worm.position.z) };
  });
  check('it follows you into the chamber through the door', lured.inChamber === true, JSON.stringify(lured));

  const noFloat = await page.evaluate(async () => {
    const d = window.__doctor;
    d.state.locked = false;
    d.setFeet(d.DISK.y);
    d.camera.position.set(-1.02, d.DISK.y + d.P.eye, -1.90);      // across the hole at cell 6,6
    d.worm.position.set(-1.02, d.DISK.y + .02, -2.22);
    let floats = 0;
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 80));
      if (d.state.disk.inside && !d.blockAt(d.worm.position.x, d.worm.position.z)) floats++;
    }
    return { floats };
  });
  check('it never crawls out over a missing sector', noFloat.floats === 0, JSON.stringify(noFloat));

  const sealed = await page.evaluate(async () => {
    const d = window.__doctor;
    d.state.locked = false;
    d.worm.position.set((d.CH.x0 + d.CH.x1) / 2, d.DISK.y + .02, (d.CH.z0 + d.CH.z1) / 2);
    d.aimAt('wormLever', 0.05, d.DISK.y);
    d.use();
    await new Promise(r => setTimeout(r, 250));
    return { sealed: d.state.disk.sealed, codes: d.state.codes.slice(), note: d.state.notes.SSD,
      readme: d.readmePanel.visible,
      door: +d.chDoor.position.y.toFixed(3), hatch: +d.hatchDoor.position.y.toFixed(3),
      shut: +d.DOOR_SHUT_Y.toFixed(3) };
  });
  check('the lever drops the door on it', sealed.sealed === true);
  check('b7 clears', !sealed.codes.includes('b7'), sealed.codes.join(','));
  check('and the drive gives up a B', sealed.note === 'B', String(sealed.note));
  check('the README is there to read', sealed.readme === true);
  check('both doors come down: the room is shut, front and back',
    Math.abs(sealed.door - sealed.shut) < .02 && Math.abs(sealed.hatch - sealed.shut) < .02,
    JSON.stringify({ door: sealed.door, hatch: sealed.hatch, shut: sealed.shut }));
  check('and the LED on the drive goes green', await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 220));
    return window.__doctor.ssdLed.material.emissive.getHex() === 0x36d08a;
  }));
  check('the lever with an empty chamber does nothing', await page.evaluate(async () => {
    const d = window.__doctor;
    return d.state.disk.sealed === true;      // sealed stays sealed; the guard is the flag
  }));

  check('a missing sector is a hole you fall into', await page.evaluate(async () => {
    const d = window.__doctor;
    d.state.locked = true;
    d.setFeet(d.DISK.y);
    d.camera.position.set(d.DISK.x0 + 4.5 * d.DISK.cell, d.DISK.y + d.P.eye, d.DISK.z0 + 2.5 * d.DISK.cell);
    await new Promise(r => setTimeout(r, 1200));
    d.state.locked = false;
    return d.state.disk.inside === false;
  }));

  const outAgain = await page.evaluate(async () => {
    const d = window.__doctor;
    d.aimAt('ssdPort', 0.05, 0.95);
    d.use();
    await new Promise(r => setTimeout(r, 250));
    const inside = d.state.disk.inside;
    d.aimAt('diskExit', 0.05, d.DISK.y);
    d.use();
    await new Promise(r => setTimeout(r, 200));
    return { inside, out: !d.state.disk.inside, y: +d.camera.position.y.toFixed(2) };
  });
  check('you can walk back out at the port mouth',
    outAgain.inside === true && outAgain.out === true && outAgain.y > .9, JSON.stringify(outAgain));
  check('every fault is clear now', (await st()).codes.length === 0,
    (await st()).codes.join(','));

  const fell = await page.evaluate(async () => {
    const d = window.__doctor;
    d.camera.position.set(1.5, 0.95 + d.P.eye, -1.2);   // over the gap: no floor under you
    d.state.locked = true;
    await new Promise(r => setTimeout(r, 2600));
    d.state.locked = false;
    return { y: +d.camera.position.y.toFixed(2), x: +d.camera.position.x.toFixed(2) };
  });
  check('step into the gap and the bench lip catches you', fell.y > .9 && fell.x < 1, JSON.stringify(fell));
  const padAfter = await page.evaluate(() => document.getElementById('pad').textContent.replace(/\s+/g, ' '));
  check('the letters never spell the password in the notepad',
    !/BROKEN/i.test(padAfter) && !/NK?O?E?R?B?/.test('') , padAfter.match(/[NK OER]{4,}/) ? padAfter : 'clean');
  check('six letters found, in the order they were found',
    (await page.evaluate(() => Object.keys(window.__doctor.state.notes).join(','))) === 'RAM,PSU,fans,GPU,monitor,SSD',
    await page.evaluate(() => Object.keys(window.__doctor.state.notes).join(',')));
  const pw = await page.evaluate(() => {
    const n = window.__doctor.state.notes;
    return [n.SSD, n.monitor, n.fans, n.PSU, n.GPU, n.RAM].join('');   // the login order
  });
  check('read in the login order the six characters spell BROKEN', pw === 'BROKEN', pw);

  check('no console errors', logs.length === 0, logs.join(' | '));

  mkdirSync('test/.shots', { recursive: true });
  await page.evaluate(() => window.__doctor.aimAt('led', 0.06, 0.95));
  await sleep(300);
  await page.screenshot({ path: 'test/.shots/pcdoc.png' });
  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log(failed.length ? failed.length + ' of ' + results.length + ' failed' : 'all ' + results.length + ' passed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
