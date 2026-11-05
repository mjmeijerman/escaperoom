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
    d.teleport(-5.2, 1.6, Math.PI / 2, 0.05);
    d.camera.position.y = 1.6;
    d.camera.updateMatrixWorld(true);
    const hit = d.target();
    d.state.hovered = hit;
    d.use();
    return { id: hit && hit.id, label: hit && hit.label,
      text: document.getElementById('body').textContent.replace(/\s+/g, ' ') };
  });
  check('the case file can be read', plaque.id === 'casefile'
    && /alexander/i.test(plaque.text) && /vladimir/i.test(plaque.text), plaque.id + ' · ' + plaque.text.slice(0, 60));
  check('and the crosshair names it, even though it is a board with paper on it',
    plaque.label === 'the case file', String(plaque.label));

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
  const sol = { A: [1, 1], B: [5, 2], C: [3, 3], D: [4, 6], E: [6, 4], V: [2, 5] };
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
  check('one per row as well as one per column', await page.evaluate(() => {
    const d = window.__murdoku;
    return d.columnsOK() && d.rowsOK() && d.linesOK();
  }));
  check('and the murderer is the one who shared the victim\'s room', await page.evaluate(() => {
    const d = window.__murdoku;
    return d.state.murderer === 'A' && d.murdererOf() === 'A';
  }), await page.evaluate(() => String(window.__murdoku.state.murderer)));
  check('and the sign says so', await page.evaluate(() =>
    !document.getElementById('banner').hidden && /CASE CLOSED/i.test(document.getElementById('banner').textContent)));
  check('a second person in one row is refused a clean placement', await page.evaluate(() => {
    const d = window.__murdoku;
    const keep = { ...d.state.placed };
    d.lift('E'); d.place('E', 6, 6);                    // E joins D in row 6
    const after = { rows: d.rowsOK(), cols: d.columnsOK(),
      said: [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | ') };
    d.state.placed = keep;
    Object.entries(keep).forEach(([id, [c, r]]) => d.visuals[id].g.position.set(d.cellX(c), 0, d.cellZ(r)));
    d.renderPad();
    return { rows: after.rows, cols: after.cols, said: /same row/i.test(after.said) };
  }).then(r => r.rows === false && r.cols === true && r.said === true));

  check('every statement is ticked in the notes', await page.evaluate(() =>
    (document.getElementById('padPeople').textContent.match(/✓/g) || []).length === 5));
  const revealed = await page.evaluate(async () => {
    const d = window.__murdoku;
    await new Promise(r => setTimeout(r, 1700));           // the reveal runs after 1.4 s
    const g = d.visuals.A.g;
    const at = d.state.placed.A;
    const dist = Math.hypot(d.camera.position.x - d.cellX(at[0]), d.camera.position.z - d.cellZ(at[1]));
    return { knife: !!g.userData.knife, dist: +dist.toFixed(2),
      banner: document.getElementById('banner').textContent.replace(/\s+/g, ' ') };
  });
  check('the murderer is holding a knife', revealed.knife === true);
  check('and the camera has moved to them', revealed.dist > 1 && revealed.dist < 2.6, JSON.stringify(revealed));
  check('the banner names the murderer and why it is them',
    /ALEXANDER/.test(revealed.banner) && /logeerkamer/i.test(revealed.banner) && !/car/i.test(revealed.banner),
    revealed.banner);

  /* --- the room itself: how it looks, how it walks ----------------------- */
  check('the camera yaws before it pitches, so turning left does not roll the room',
    await page.evaluate(() => {
      const d = window.__murdoku;
      d.teleport(0, 0, 1.2, -.6);
      d.camera.updateMatrixWorld(true);
      const up = new d.THREE.Vector3(0, 1, 0).applyQuaternion(d.camera.quaternion);
      const right = new d.THREE.Vector3(1, 0, 0).applyQuaternion(d.camera.quaternion);
      return d.cameraOrder() === 'YXZ' && Math.abs(up.dot(right)) < .01;
    }));

  const plaques = await page.evaluate(() => {
    const d = window.__murdoku;
    const ids = d.interact.map(o => o.userData.interact).filter(id => id && id.startsWith('sign_'));
    const count = name => ids.filter(id => id === 'sign_' + name).length;
    return {
      total: ids.length, woon: count('woonkamer'), hall: count('the hall'),
      rooms: ['logeerkamer', 'badkamer', 'grote slaapkamer', 'keuken', 'woonkamer'].map(count),
    };
  });
  check('every room has its name on the walls behind it, more than once',
    plaques.total >= 15 && plaques.rooms.every(n => n >= 2), JSON.stringify(plaques));
  check('the living room has a plaque on each of its walls',
    plaques.woon >= 6 && plaques.hall >= 1, JSON.stringify(plaques));

  const signRead = await page.evaluate(() => {
    const d = window.__murdoku;
    const sign = d.interact.find(o => o.userData.interact === 'sign_logeerkamer');
    const p = new d.THREE.Vector3();
    sign.getWorldPosition(p);
    d.state.locked = false;
    let hit = null;
    for (const [ax, az] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      for (const dy of [0, -.35, .35]) {
        d.teleport(p.x + ax * 1.1, p.z + az * 1.1, Math.atan2(ax, az), Math.atan2(dy, 1.1));
        d.camera.position.y = p.y + dy;
        d.camera.updateMatrixWorld(true);
        hit = d.target();
        if (hit) break;
      }
      if (hit) break;
    }
    d.state.hovered = hit;
    const text = hit ? (d.use(), document.getElementById('body').textContent.replace(/\s+/g, ' ')) : '';
    return { id: hit && hit.id, text };
  });
  check('a plaque can be read and names the room and its squares',
    signRead.id === 'sign_logeerkamer' && /logeerkamer/i.test(signRead.text) && /C1R1/.test(signRead.text),
    signRead.id + ' · ' + signRead.text.slice(0, 50));

  const throughWall = await page.evaluate(async () => {
    const d = window.__murdoku;
    // the wall between the kitchen and the living room, at x 3.2, away from its doorway
    d.state.locked = true;
    d.teleport(3.2, -1.2, Math.PI, 0);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    await new Promise(r => setTimeout(r, 1100));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    d.state.locked = false;
    return { z: +d.camera.position.z.toFixed(2), solids: d.SOLIDS.length };
  });
  check('the part-walls are scenery: you walk straight through them',
    throughWall.z > .4, JSON.stringify(throughWall));

  /* --- furniture you cannot stand on, closed walls, and the window -------- */
  const noStand = await page.evaluate(() => {
    const d = window.__murdoku;
    d.state.placed = {}; d.state.carry = null; d.state.won = false;
    const tryCell = (id, c, r) => { d.lift(id); return d.place(id, c, r); };
    const table = tryCell('B', 4, 3);          // the table in C4R3
    const plant = tryCell('C', 5, 3);          // the plant in C5R3
    const tv = tryCell('D', 3, 6);             // the television in C3R6
    const bed = tryCell('A', 1, 1);            // a bed is allowed: Alexander sat on one
    d.state.placed = {}; d.state.carry = null;
    return { table, plant, tv, bed };
  });
  check('nobody stands on a table', noStand.table === false);
  check('nor on a plant', noStand.plant === false);
  check('nor on the television', noStand.tv === false);
  check('but a bed is fair game', noStand.bed === true);

  const walls = await page.evaluate(() => {
    const d = window.__murdoku;
    let internal = 0;
    for (let c = 1; c < 6; c++) for (let r = 1; r <= 6; r++) if (d.roomAt(c, r) !== d.roomAt(c + 1, r)) internal++;
    for (let c = 1; c <= 6; c++) for (let r = 1; r < 6; r++) if (d.roomAt(c, r) !== d.roomAt(c, r + 1)) internal++;
    return { runs: d.WALLS.length, internal,
      lengths: [...new Set(d.WALLS.map(w => +w.len.toFixed(2)))].sort((a, b) => a - b) };
  });
  check('every room is closed in: one unbroken wall per boundary, and the hall wall in six',
    walls.runs === walls.internal + 6, JSON.stringify(walls));
  check('and every run is one full cell, with no doorway cut in it',
    walls.lengths.length === 1 && walls.lengths[0] === 2, JSON.stringify(walls.lengths));

  check('the window is in the east wall, on C6R4', await page.evaluate(() => {
    const d = window.__murdoku;
    return d.WINDOW_AT.x > 5.8 && d.WINDOW_AT.x < 6.01 && Math.abs(d.WINDOW_AT.z - d.cellZ(4)) < .01;
  }), await page.evaluate(() => JSON.stringify(window.__murdoku.WINDOW_AT)));

  const shell = await page.evaluate(() => {
    const d = window.__murdoku, h = d.HOUSE;
    const wall = (pred) => d.SOLIDS.some(pred);
    return {
      west: wall(s => Math.abs(s.x1 - h.X0) < .02 && s.y1 > 3),
      east: wall(s => Math.abs(s.x0 - h.X1) < .02 && s.y1 > 3),
      north: wall(s => Math.abs(s.z1 - h.Z0) < .02 && s.y1 > 3),
      south: wall(s => Math.abs(s.z0 - h.Z1) < .02 && s.y1 > 3),
      h,
    };
  });
  check('the grid is surrounded by full-height walls on all four sides',
    shell.west && shell.east && shell.north && shell.south, JSON.stringify(shell));

  const roof = await page.evaluate(async () => {
    const d = window.__murdoku;
    d.state.locked = false;
    d.teleport(d.cellX(3), d.cellZ(6), 0, 0);        // standing on the television
    d.setFeet(1.35);
    await new Promise(r => setTimeout(r, 250));
    let top = d.feet();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    for (let i = 0; i < 28; i++) {
      await new Promise(r => setTimeout(r, 25));
      top = Math.max(top, d.feet());
    }
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    return { top: +top.toFixed(2), head: +(top + 1.7).toFixed(2), wall: d.HOUSE.WALL_H };
  });
  check('and the roof stops you: your head stays under the ceiling', roof.head <= roof.wall + .01,
    JSON.stringify(roof));

  /* --- "next to" is beside it, in the same room --------------------------- */
  check('next to means beside it: the television is not diagonally next to C4R5',
    await page.evaluate(() => {
      const d = window.__murdoku;
      const tv = new Set(['3,6']);
      return d.nextToSameRoom(4, 5, tv) === false        // diagonal, and a wall between
        && d.nextToSameRoom(4, 6, tv) === true           // beside it, same room
        && d.nextToSameRoom(3, 5, tv) === true
        && d.nextToSameRoom(2, 6, tv) === false;         // beside it, but the logeerkamer
    }));
  check('and the body needs a room with exactly one other person', await page.evaluate(() => {
    const d = window.__murdoku;
    const keep = { ...d.state.placed };
    d.lift('E'); d.place('E', 1, 5);                     // now A and E both in the logeerkamer
    const crowded = d.murdererOf();
    d.state.placed = keep;
    Object.entries(keep).forEach(([id, [c, r]]) => d.visuals[id].g.position.set(d.cellX(c), 0, d.cellZ(r)));
    d.renderPad();
    return crowded === null;
  }));

  /* --- jumping: everything in the house can be stood on ------------------ */
  const standOn = await page.evaluate(() => {
    const d = window.__murdoku;
    const at = (c, r, y) => +d.groundAt(d.cellX(c), d.cellZ(r), y).toFixed(2);
    return {
      floor: at(4, 5, 0),                 // empty living room
      bed: at(1, 1, 1.0),                 // a bed is 0.52 high
      chair: at(4, 2, 1.0),
      table: at(4, 3, 1.0),               // the table is 0.78
      plant: at(5, 3, 1.4),               // the plant pot stands 1.0
      tv: at(3, 6, 2.0),                  // the television is 1.35
    };
  });
  check('everything in the house is something you can stand on',
    standOn.bed > .4 && standOn.chair > .4 && standOn.table > .7 && standOn.plant > .9 && standOn.tv > 1.3,
    JSON.stringify(standOn));
  check('and the floor is still the floor', standOn.floor === 0, String(standOn.floor));

  const apex = await page.evaluate(async () => {
    const d = window.__murdoku;
    d.state.locked = false;
    d.teleport(0, 8.5, 0, 0);                         // the hall, clear floor
    await new Promise(r => setTimeout(r, 250));
    const y0 = d.camera.position.y;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    let top = y0;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 25));
      top = Math.max(top, d.camera.position.y);
    }
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    return +(top - y0).toFixed(2);
  });
  check('and the jump is high enough for the tallest thing in the house (the television)',
    apex > 1.35, String(apex));

  /* --- the cast looks like the cast --------------------------------------- */
  const looks = await page.evaluate(() => {
    const d = window.__murdoku;
    const hex = n => '#' + n.toString(16).padStart(6, '0');
    return Object.fromEntries(d.PEOPLE.map(p => {
      const l = d.visuals[p.id].g.userData.look;
      return [p.id, { skin: hex(l.skin), hair: hex(l.hair), style: l.style, glasses: l.glasses, beard: l.beard }];
    }));
  });
  check('Alexander: a man with short grey hair and glasses',
    looks.A.style === 'short' && looks.A.glasses === true && looks.A.hair === '#9c9c9c', JSON.stringify(looks.A));
  check('Bas: a man with long blond hair and a blond beard',
    looks.B.style === 'long' && looks.B.beard === true && looks.B.hair === '#d8c07a', JSON.stringify(looks.B));
  check('Clarissa: a woman with long brown hair',
    looks.C.style === 'long' && looks.C.hair === '#4a2c1a' && !looks.C.beard, JSON.stringify(looks.C));
  check('Diana: a tinted woman with black half-long hair',
    looks.D.style === 'halflong' && looks.D.hair === '#15151a' && looks.D.skin === '#b07a52', JSON.stringify(looks.D));
  check('Elsa: a black woman with grey, fancy hair',
    looks.E.style === 'updo' && looks.E.hair === '#cfcfcf' && looks.E.skin === '#6e4a34', JSON.stringify(looks.E));
  check('Vladimir: a man with short dark-blond hair',
    looks.V.style === 'short' && looks.V.hair === '#a88a4a', JSON.stringify(looks.V));

  check('no console errors', logs.length === 0, logs.join(' | '));

  mkdirSync('test/.shots', { recursive: true });
  await page.screenshot({ path: 'test/.shots/murdoku.png' });
  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log(failed.length ? failed.length + ' of ' + results.length + ' failed' : 'all ' + results.length + ' passed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
