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

  /* --- slice 2: power, fans, the card ------------------------------------ */
  const at = (id, d = 0.035) => page.evaluate(([id, d]) => window.__doctor.aimAt(id, d, 0.95), [id, d]);
  const press = async (k = 'KeyE') => { await page.keyboard.press(k); await sleep(140); };
  const st = () => page.evaluate(() => {
    const d = window.__doctor;
    return { psu: { ...d.state.psu }, fans: { ...d.state.fans }, gpu: { ...d.state.gpu },
      mon: { ...d.state.mon }, usb: { ...d.state.usb },
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

  /* --- slice 3: the rear I/O, and the way down to the desk --------------- */
  check('the cable becomes a two-way span once both ends are in', (await st()).zip.ready === true);

  check('the keyboard plug is lying behind the case', (await at('usbKbd')) === 'usbKbd');
  await press();
  check('the plug is in your arms', (await st()).held === 'usbKbd');
  check('a rear USB port is within reach', (await at('usbPortA')) === 'usbPortA');
  await press();
  check('the keyboard is plugged in', (await st()).usb.kbd === true);

  check('the mouse plug is beside it', (await at('usbMouse')) === 'usbMouse');
  await press();
  check('a second port takes the mouse', (await at('usbPortB')) === 'usbPortB');
  await press();
  check('the mouse is plugged in', (await st()).usb.mouse === true);
  check('and it is malfunctioning, as the intake form said', (await st()).usb.clean === false);

  check('the compressed-air can is in the tub', (await at('airCan')) === 'airCan');
  await press();
  check('you can carry the can', (await st()).held === 'air');

  const zipDown = await page.evaluate(async () => {
    const d = window.__doctor;
    d.state.zip.seconds = 0.4;
    const hit = d.aimAt('zipBench', 0.05, 0.95);
    d.use();
    const riding = d.state.zip.riding;
    await new Promise(r => setTimeout(r, 900));
    return { hit, riding, after: d.state.zip.riding,
      x: +d.camera.position.x.toFixed(2), y: +d.camera.position.y.toFixed(3), z: +d.camera.position.z.toFixed(2) };
  });
  check('the taped grip at the bench edge is within reach', zipDown.hit === 'zipBench', String(zipDown.hit));
  check('grabbing it starts a ride', zipDown.riding === true && zipDown.after === false,
    `${zipDown.riding}/${zipDown.after}`);
  check('the ride lands you on the desk, can and all', zipDown.x > 2.1 && zipDown.z > -1.4 && zipDown.y > .77,
    JSON.stringify(zipDown));
  check('the can came with you', (await st()).held === 'air');

  const deskAt = (id, d = 0.04) => page.evaluate(([id, d]) => window.__doctor.aimAt(id, d, 0.76), [id, d]);
  check('the mouse is within reach on the desk', (await deskAt('mouse', 0.05)) === 'mouse');
  await press();
  check('it goes over onto its side', (await st()).usb.tipped === true);
  check('the optical window is exposed', (await deskAt('mouseLens')) === 'mouseLens');
  await sleep(220);
  check('the tray says what is wrong with it', /hair/i.test(await page.$eval('#body', el => el.textContent)));
  await press();
  const cleaned = await st();
  check('the air blows the hair out of the window', cleaned.usb.clean === true);
  check('the mouse goes back on its pad', await page.evaluate(async () => {
    const d = window.__doctor;
    d.aimAt('mouse', 0.05, 0.76);
    d.use();
    await new Promise(r => setTimeout(r, 120));
    return d.state.usb.tipped === false;
  }));

  const zipUp = await page.evaluate(async () => {
    const d = window.__doctor;
    d.state.zip.seconds = 0.4;
    const hit = d.aimAt('zipDesk', 0.05, 0.76);
    d.use();
    await new Promise(r => setTimeout(r, 900));
    return { hit, after: d.state.zip.riding,
      x: +d.camera.position.x.toFixed(2), z: +d.camera.position.z.toFixed(2) };
  });
  check('the far grip rides you back to the bench',
    zipUp.hit === 'zipDesk' && zipUp.after === false && zipUp.x < 1 && zipUp.z < -1.8, JSON.stringify(zipUp));

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
  check('five letters found, in the order they were found',
    (await page.evaluate(() => Object.keys(window.__doctor.state.notes).join(','))) === 'RAM,PSU,fans,GPU,monitor',
    await page.evaluate(() => Object.keys(window.__doctor.state.notes).join(',')));

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
