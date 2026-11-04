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
      return !el.hidden && r.width > innerWidth * .6 && r.height > innerHeight * .6 && el.id !== 'scene' && el.id !== 'hud' && el.id !== 'bloom' && el.className !== 'vignette';
    }).map(el => el.id || el.className),
  }));
  check('no overlays: tray and notepad start hidden', bare.tray && bare.pad);
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
  check('and the case gets standby power', gen.powered === true);

  /* --- the POST display cycles every fault -------------------------------- */
  const codeA = await page.evaluate(() => window.__doctor.state.codeIndex);
  await sleep(2300);
  const codeB = await page.evaluate(() => window.__doctor.state.codeIndex);
  check('the debug display cycles through the faults', codeB !== codeA, `${codeA} -> ${codeB}`);
  const ledText = await page.evaluate(() => window.__doctor.state.codes[window.__doctor.state.codeIndex]);
  check('a fault is on the display', /^(C1|d4|A2|F1|b7)$/.test(ledText), ledText);

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
  check('the PSU block stops you', intoPsu > -2.17, String(intoPsu));

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
  const ram = await page.evaluate(() => ({
    seated: window.__doctor.state.ram.seated,
    codes: window.__doctor.state.codes.slice(),
    note: window.__doctor.state.notes.RAM,
  }));
  check('the good module seats', ram.seated === true);
  check('C1 clears off the display', !ram.codes.includes('C1'), ram.codes.join(','));
  check('the module gives up its character', ram.note === 'B', String(ram.note));

  /* --- the notepad holds it ---------------------------------------------- */
  await page.keyboard.press('KeyI');
  await sleep(200);
  const pad = await page.evaluate(() => ({
    open: !document.getElementById('pad').hidden,
    text: document.getElementById('pad').textContent,
  }));
  check('I opens the notepad', pad.open);
  check('the notepad has the character and the fault list',
    pad.text.includes('B') && pad.text.includes('d4') && pad.text.includes('torch'));
  await page.keyboard.press('KeyI');
  await sleep(120);

  /* --- slice 2: power, fans, the card ------------------------------------ */
  const at = (id, d = 0.035) => page.evaluate(([id, d]) => window.__doctor.aimAt(id, d, 0.95), [id, d]);
  const press = async (k = 'KeyE') => { await page.keyboard.press(k); await sleep(140); };
  const st = () => page.evaluate(() => {
    const d = window.__doctor;
    return { psu: { ...d.state.psu }, fans: { ...d.state.fans }, gpu: { ...d.state.gpu },
      held: d.state.held, notes: { ...d.state.notes }, codes: d.state.codes.slice() };
  });

  check('the PSU rocker is reachable', (await at('psuRocker')) === 'psuRocker', String(await at('psuRocker')));
  await press();
  check('the rocker wakes the PSU', (await st()).psu.rocker === true);

  check('a cable end can be picked up', (await at('cable_atx')) === 'cable_atx');
  await press();
  check('the 24-pin is in your hand', (await st()).held === 'atx');
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
  check('12 V on the board gives the PSU its character', rail.notes.PSU === 'R', String(rail.notes.PSU));

  check('the loose 4-pin can be picked up', (await at('plugRear')) === 'plugRear');
  await press();
  check('CHA_FAN1 is reachable', (await at('chaFan1')) === 'chaFan1');
  await press();
  check('the rear fan is connected', (await st()).fans.rear === true);

  check('SYS_FAN3 holds the CPU fan cable', (await at('sysFan3')) === 'sysFan3');
  await press();
  check('the CPU cable comes out', (await st()).held === 'fan4');
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
  check('the card gives up its character', fin.notes.GPU === 'K', String(fin.notes.GPU));
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
