/* Browser test for murdoku.html — the grid, the rooms, the furniture, carrying a
   guest, putting them down, crossing a square out, and the one solution.

   docker run --rm --network host -v "$PWD":/work -w /work \
     -e NODE_PATH=/home/pptruser/node_modules \
     ghcr.io/puppeteer/puppeteer:latest node test/murdoku.browser.cjs */
const puppeteer = require('puppeteer');
const { mkdirSync } = require('node:fs');

const URL = process.env.MURDOKU_URL || 'http://localhost:8080/murdoku.html?test';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  (' + detail + ')' : ''));
};

/* stand on a cell and look down at it, then report what the crosshair finds */
const aimCell = (page, c, r) => page.evaluate(([c, r]) => {
  const d = window.__murdoku;
  d.state.started = true;
  d.state.locked = false;
  d.teleport(d.cellX(c), d.cellZ(r) + 0.55, 0, -0.85);
  d.camera.position.y = 1.6;
  d.camera.updateMatrixWorld(true);
  const hit = d.target();
  d.state.hovered = hit;
  return hit ? hit.id : null;
}, [c, r]);

const aimPerson = (page, id) => page.evaluate((id) => {
  const d = window.__murdoku;
  const g = d.visuals[id].g;
  const victim = d.PEOPLE.find(p => p.id === id).victim;
  d.state.locked = false;
  const cx = g.position.x, cz = g.position.z + 1.3;
  const ty = g.position.y + (victim ? .35 : 1.15);
  const dx = g.position.x - cx, dz = g.position.z - cz;
  d.teleport(cx, cz, Math.atan2(-dx, -dz), Math.atan2(ty - 1.62, Math.hypot(dx, dz)));
  const hit = d.target();
  d.state.hovered = hit;
  return hit ? hit.id : null;
}, id);

const st = page => page.evaluate(() => ({
  placed: { ...window.__murdoku.state.placed },
  carry: window.__murdoku.state.carry,
  marks: [...window.__murdoku.state.marks],
  won: window.__murdoku.state.won,
}));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--enable-unsafe-swiftshader'],
    defaultViewport: { width: 1280, height: 860 },
  });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
  page.on('pageerror', e => logs.push(String(e)));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(1100);

  const boot = await page.evaluate(() => {
    const d = window.__murdoku;
    return { has: !!d, people: d && d.PEOPLE.length, cells: d && Object.keys(d.ROOM_AT).length,
      start: !document.getElementById('start').hidden };
  });
  check('the house boots with the debug hook', boot.has === true);
  check('six people and thirty-six squares', boot.people === 6 && boot.cells === 36,
    `${boot.people}/${boot.cells}`);
  check('it waits behind a start card', boot.start === true);

  await page.click('#startBtn');
  await sleep(700);
  check('the card lets you in', await page.evaluate(() => window.__murdoku.state.started === true));

  const rooms = await page.evaluate(() => {
    const d = window.__murdoku;
    return {
      c1r1: d.roomAt(1, 1), c1r6: d.roomAt(1, 6), c2r5: d.roomAt(2, 5),
      c2r1: d.roomAt(2, 1), c4r2: d.roomAt(4, 2),
      c3r3: d.roomAt(3, 3), c2r4: d.roomAt(2, 4),
      c5r1: d.roomAt(5, 1), c6r3: d.roomAt(6, 3),
      c4r5: d.roomAt(4, 5), c3r6: d.roomAt(3, 6), c6r4: d.roomAt(6, 4),
    };
  });
  check('the west column is the logeerkamer',
    ['c1r1', 'c1r6', 'c2r5'].every(k => rooms[k] === 'logeerkamer'), JSON.stringify(rooms));
  check('the badkamer is the two-by-three at the top',
    rooms.c2r1 === 'badkamer' && rooms.c4r2 === 'badkamer');
  check('the big bedroom sits under it', rooms.c3r3 === 'grote slaapkamer' && rooms.c2r4 === 'grote slaapkamer');
  check('the kitchen is the top right', rooms.c5r1 === 'keuken' && rooms.c6r3 === 'keuken');
  check('everything else is the living room',
    ['c4r5', 'c3r6', 'c6r4'].every(k => rooms[k] === 'woonkamer'));

  const furniture = await page.evaluate(() => {
    const d = window.__murdoku;
    const k = (c, r) => c + ',' + r;
    return {
      beds: [...d.BEDS].sort().join(' '), tables: [...d.TABLES].sort().join(' '),
      tvs: [...d.TVS].join(' '), window: d.WINDOW.join(','),
      chairs: [...d.CHAIRS].sort().join(' '),
    };
  });
  check('two beds, on the cells the layout gives them',
    furniture.beds === '1,1 1,2 2,4 3,4', furniture.beds);
  check('two tables, the kitchen one along the top of C5 and C6',
    furniture.tables === '4,3 5,1 6,1', furniture.tables);
  check('two chairs', furniture.chairs === '3,5 4,2', furniture.chairs);
  check('the television is in C3R6', furniture.tvs === '3,6', furniture.tvs);
  check('the window is the right-hand side of C6R4', furniture.window === '6,4', furniture.window);

  // the case file on the wall
  const plaque = await page.evaluate(() => {
    const d = window.__murdoku;
    d.state.locked = false;
    d.teleport(-6.2, 1.6, Math.PI / 2, 0.05);
    d.camera.position.y = 1.6;
    d.camera.updateMatrixWorld(true);
    const hit = d.target();
    d.state.hovered = hit;
    d.use();
    return { id: hit && hit.id, text: document.getElementById('body').textContent.replace(/\s+/g, ' ') };
  });
  check('the case file can be read', plaque.id === 'casefile'
    && /alexander/i.test(plaque.text) && /vladimir/i.test(plaque.text), plaque.id + ' · ' + plaque.text.slice(0, 60));

  // pick a guest up, put them on a square by looking at it
  check('a guest can be picked up', (await aimPerson(page, 'A')) === 'p_A');
  await page.keyboard.press('KeyE');
  await sleep(200);
  check('and is then in your arms', (await st(page)).carry === 'A');

  check('the floor squares are targets', (await aimCell(page, 1, 1)) === 'cell');
  await page.keyboard.press('KeyE');
  await sleep(220);
  const placedA = await st(page);
  check('E on a square puts them down there', placedA.placed.A && placedA.placed.A[0] === 1 && placedA.placed.A[1] === 1,
    JSON.stringify(placedA.placed));

  // crossing a square out keeps people off it
  check('a square can be crossed out', await page.evaluate(() => {
    const d = window.__murdoku;
    d.teleport(d.cellX(1) , d.cellZ(1) + .55, 0, -.85);
    d.camera.updateMatrixWorld(true);
    d.state.hovered = d.target();
    return false;
  }) === false);
  await page.evaluate(() => {
    const d = window.__murdoku;
    d.teleport(d.cellX(4), d.cellZ(2) + .55, 0, -.85);
    d.camera.updateMatrixWorld(true);
    d.state.hovered = d.target();
    d.toggleMark();
  });
  const marked = await st(page);
  check('F marks a square with a cross', marked.marks.includes('4,2'), JSON.stringify(marked.marks));
  check('and a crossed square refuses a guest', await page.evaluate(() => {
    const d = window.__murdoku;
    d.lift('B');
    return d.place('B', 4, 2) === false && d.state.carry === 'B';
  }));
  await page.evaluate(() => { const d = window.__murdoku; d.putBack('B'); d.state.marks.clear(); d.syncMarks(); });

  // the whole solution, on the real floor
  const sol = { A: [1, 1], B: [5, 2], C: [3, 3], D: [4, 5], E: [6, 4], V: [2, 5] };
  for (const [id, [c, r]] of Object.entries(sol)) {
    await aimPerson(page, id);
    await page.keyboard.press('KeyE');
    await sleep(120);
    await aimCell(page, c, r);
    await page.keyboard.press('KeyE');
    await sleep(140);
  }
  const fin = await st(page);
  check('the six of them are on the squares the case gives',
    Object.entries(sol).every(([id, [c, r]]) => fin.placed[id] && fin.placed[id][0] === c && fin.placed[id][1] === r),
    JSON.stringify(fin.placed));
  check('which closes the case', fin.won === true);
  check('and the sign says so', await page.evaluate(() =>
    !document.getElementById('banner').hidden && /CASE CLOSED/i.test(document.getElementById('banner').textContent)));
  check('every statement is ticked in the notes', await page.evaluate(() =>
    (document.getElementById('padPeople').textContent.match(/✓/g) || []).length === 5));

  check('no console errors', logs.length === 0, logs.join(' | '));

  mkdirSync('test/.shots', { recursive: true });
  await page.screenshot({ path: 'test/.shots/murdoku.png' });
  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log(failed.length ? failed.length + ' of ' + results.length + ' failed' : 'all ' + results.length + ' passed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
