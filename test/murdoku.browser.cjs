/* Browser test for murdoku.html — the grid, the rooms, the furniture, carrying a
   guest, putting them down, crossing a square out, and the one solution.

   docker run --rm --network host -v "$PWD":/work -w /work \
     -e NODE_PATH=/home/pptruser/node_modules \
     ghcr.io/puppeteer/puppeteer:latest node test/murdoku.browser.cjs */
const puppeteer = require('puppeteer');
const { mkdirSync } = require('node:fs');

const URL = process.env.MURDOKU_URL || 'http://localhost:8080/murdoku.html?test&level=garden';
const BASE = URL.split('?')[0];
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
  check('seven people and forty-nine squares', boot.people === 7 && boot.cells === 49,
    `${boot.people}/${boot.cells}`);
  check('it waits behind a start card', boot.start === true);

  await page.click('#startBtn');
  await sleep(700);
  check('the card lets you in', await page.evaluate(() => window.__murdoku.state.started === true));

  const rooms = await page.evaluate(() => {
    const d = window.__murdoku;
    return {
      c1r1: d.roomAt(1, 1), c2r3: d.roomAt(2, 3), c3r3: d.roomAt(3, 3),
      c4r1: d.roomAt(4, 1), c7r4: d.roomAt(7, 4), c5r2: d.roomAt(5, 2),
      c1r6: d.roomAt(1, 6), c7r7: d.roomAt(7, 7), c4r5: d.roomAt(4, 5), c3r7: d.roomAt(3, 7),
    };
  });
  check('the garden is the three-by-three at the top left',
    ['c1r1', 'c2r3', 'c3r3'].every(k => rooms[k] === 'backyard'), JSON.stringify(rooms));
  check('the terrace wraps the top right', rooms.c4r1 === 'terrace' && rooms.c7r4 === 'terrace');
  check('and the jacuzzi is cut out of it', rooms.c5r2 === 'jacuzzi');
  check('the bedroom is the two-by-two at the bottom left', rooms.c1r6 === 'bedroom');
  check('the kitchen is the bottom right', rooms.c7r7 === 'kitchen');
  check('everything else is the living room', ['c4r5', 'c3r7'].every(k => rooms[k] === 'living room'));

  const furniture = await page.evaluate(() => {
    const d = window.__murdoku;
    const k = (c, r) => c + ',' + r;
    return {
      beds: [...d.BEDS].sort().join(' '), tables: [...d.TABLES].sort().join(' '),
      tvs: [...d.TVS].join(' '), window: d.WINDOW ? d.WINDOW.join(',') : null,
      chairs: [...d.CHAIRS].sort().join(' '), jacuzzis: [...d.JACUZZIS].sort().join(' '),
      plants: [...d.PLANTS].sort().join(' '),
    };
  });
  check('two beds, side by side at the bottom of the bedroom',
    furniture.beds === '1,7 2,7', furniture.beds);
  check('five tables: two in the garden, one in the bedroom, two in the kitchen',
    furniture.tables === '1,6 2,1 3,1 6,7 7,7', furniture.tables);
  check('four chairs: two indoors, two out on the terrace',
    furniture.chairs === '3,6 5,6 6,1 7,3', furniture.chairs);
  check('five plants, two of them in the garden', furniture.plants === '1,3 2,4 3,2 4,6 5,4', furniture.plants);
  check('the jacuzzi covers the two-by-two in the middle of the terrace',
    furniture.jacuzzis === '5,2 5,3 6,2 6,3', furniture.jacuzzis);
  check('the television is in C5R5', furniture.tvs === '5,5', furniture.tvs);
  check('and this house has no window', furniture.window === null, String(furniture.window));

  /* --- the house rules that do not come from the level ------------------- */
  const houseRules = await page.evaluate(() => {
    const d = window.__murdoku;
    const k = (c, r) => c + ',' + r;
    const groups = d.MERGED.map(g => g.kind + ':' + g.cells.map(([c, r]) => k(c, r)).sort().join('+'));
    const facing = Object.entries(d.LOOK).map(([cell, [dc, dr]]) => {
      const [c, r] = cell.split(',').map(Number);
      return { cell, dc, dr, same: d.roomAt(c + dc, r + dr) === d.roomAt(c, r) };
    });
    return { groups, facing,
      wall: d.sideStyle('backyard'), wallOther: d.sideStyle('living room'),
      water: d.markY(5, 2) > d.JACUZZI_Y };
  });
  check('touching tables are one table, and a bed is two squares',
    houseRules.groups.includes('table:2,1+3,1') && houseRules.groups.includes('table:6,7+7,7')
    && houseRules.groups.includes('bed:1,7+2,7'), JSON.stringify(houseRules.groups));
  check('a wall is green on the garden side and plaster on the other',
    houseRules.wall === 'hedge' && houseRules.wallOther === 'plaster', houseRules.wall + '/' + houseRules.wallOther);
  check('no chair or television looks at a wall: every one faces its own room',
    houseRules.facing.length === 5 && houseRules.facing.every(f => f.same), JSON.stringify(houseRules.facing));
  check('a cross on the water sits on the water, not under it', houseRules.water === true);
  check('a square says what stands on it, not just whether it is empty',
    await page.evaluate(() => {
      const d = window.__murdoku;
      const say = (c, r) => d.describeSquare(c, r);
      return /a rug/.test(say(4, 7)) && /a chair/.test(say(3, 6)) && /a bed/.test(say(2, 7))
        && /a table — nobody can stand/.test(say(2, 1)) && /a plant — nobody can stand/.test(say(1, 3))
        && /television — nobody can stand/.test(say(5, 5)) && /jacuzzi — you can stand in/.test(say(5, 2))
        && /empty floor/.test(say(4, 5));
    }));
  check('a chair and a television beside each other look at each other',
    houseRules.facing.some(f => f.cell === '5,6' && f.dc === 0 && f.dr === -1)
    && houseRules.facing.some(f => f.cell === '5,5' && f.dc === 0 && f.dr === 1),
    JSON.stringify(houseRules.facing));

  /* --- no pose is allowed inside the chair --------------------------------- */
  const chairFit = await page.evaluate(() => {
    const d = window.__murdoku, T = d.THREE;
    const C = 3, R = 6, SEAT_Y = .39;
    const cx = d.cellX(C), cz = d.cellZ(R);
    const ang = Math.atan2(d.LOOK[C + ',' + R][0], d.LOOK[C + ',' + R][1]);
    const fit = (id, poses) => poses.map(P => {
      d.POSES.chair = [P]; d.DEAD_POSES.chair = [P];
      d.visuals[id].g.position.set(cx, 0, cz);
      d.applyPose(id, [C, R]);
      d.visuals[id].g.updateMatrixWorld(true);
      let bad = 0, v = new T.Vector3();
      d.visuals[id].body.traverse(o => {
        if (!o.isMesh) return;
        const pos = o.geometry.attributes.position;
        for (let k = 0; k < pos.count; k++) {
          v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
          const dx = v.x - cx, dz = v.z - cz;
          const lx = dx * Math.cos(-ang) + dz * Math.sin(-ang);
          const lz = -dx * Math.sin(-ang) + dz * Math.cos(-ang);
          if (Math.abs(lx) <= .26 && Math.abs(lz) <= .26 && v.y > .325 && v.y < SEAT_Y - .005) bad++;
          if (Math.abs(lx) <= .26 && lz > -.315 && lz < -.245 && v.y > .38 && v.y < .88) bad++;
        }
      });
      return bad;
    });
    const savedPoses = d.POSES.chair.slice(), savedDead = d.DEAD_POSES.chair.slice();
    const normal = fit('A', savedPoses);
    const dead = fit('V', savedDead);
    d.POSES.chair = savedPoses; d.DEAD_POSES.chair = savedDead;
    d.visuals.A.g.position.copy(d.visuals.A.home); d.applyPose('A', null);
    d.visuals.V.g.position.copy(d.visuals.V.home); d.applyPose('V', null);
    return { normal, dead };
  });
  check('no sitting pose puts a limb or the coat through the chair',
    chairFit.normal.every(n => n === 0), JSON.stringify(chairFit.normal));
  check('and the body on a chair does not go through it either',
    chairFit.dead.every(n => n === 0), JSON.stringify(chairFit.dead));
  check("the suspects wait against the hall\'s south wall",
    await page.evaluate(() => {
      const d = window.__murdoku;
      return d.PLINTH_Z > d.HOUSE.Z1 - 1.2 && d.PLINTH_Z < d.HOUSE.Z1;
    }));

  // the case file on the wall
  const plaque = await page.evaluate(() => {
    const d = window.__murdoku;
    d.state.locked = false;
    d.teleport(-6.6, 6.4, Math.PI / 2, 0.05);          // out in the corridor, in front of the board
    d.camera.position.y = 1.6;
    d.camera.updateMatrixWorld(true);
    const hit = d.target();
    d.state.hovered = hit;
    d.use();
    return { id: hit && hit.id, label: hit && hit.label,
      text: document.getElementById('body').textContent.replace(/\s+/g, ' ') };
  });
  check('the case file can be read', plaque.id === 'casefile'
    && /alain/i.test(plaque.text) && /violet/i.test(plaque.text), plaque.id + ' · ' + plaque.text.slice(0, 60));
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

  /* --- a cross lands on the furniture, and only where someone could stand --- */
  const crossWhere = await page.evaluate(() => {
    const d = window.__murdoku;
    d.putBack('A');
    const mark = (c, r) => {
      d.teleport(d.cellX(c), d.cellZ(r), 0, -1.2); d.camera.updateMatrixWorld(true);
      d.state.hovered = d.target(); d.toggleMark();
      return d.state.marks.has(c + ',' + r);
    };
    const out = {
      bed: mark(1, 7), rug: mark(4, 7), chair: mark(3, 6), floor: mark(4, 5),
      table: mark(2, 1), plant: mark(1, 3), tv: mark(5, 5),
    };
    const y = k => d.markObjs[k] ? +d.markObjs[k].position.y.toFixed(2) : null;
    out.bedY = y('1,7'); out.rugY = y('4,7'); out.floorY = y('4,5');
    out.said = [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | ');
    d.state.marks.clear(); d.syncMarks();
    return out;
  });
  check('a cross on a bed is drawn on the bed, where it can be seen',
    crossWhere.bed && crossWhere.bedY >= 0.56, JSON.stringify(crossWhere));
  check('a cross on a carpet stays on the carpet, not under it',
    crossWhere.rug && crossWhere.rugY > .02 && crossWhere.rugY < .1, String(crossWhere.rugY));
  check('a chair and a bare square are still crossed on the floor',
    crossWhere.chair && crossWhere.floor && crossWhere.floorY < .1, JSON.stringify(crossWhere));
  check('a table, a plant and a television take no cross at all',
    !crossWhere.table && !crossWhere.plant && !crossWhere.tv && /table/i.test(crossWhere.said),
    crossWhere.said);

  /* --- everyone is posed by the square they stand on ---------------------- */
  const posed = await page.evaluate(() => {
    const d = window.__murdoku;
    const box = id => {
      d.visuals[id].g.updateMatrixWorld(true);
      const b = new d.THREE.Box3().setFromObject(d.visuals[id].body);
      return { min: +b.min.y.toFixed(2), max: +b.max.y.toFixed(2) };
    };
    d.state.placed = {}; d.state.carry = null;
    const put = (id, c, r) => {
      d.lift(id); d.place(id, c, r);
      return { box: box(id), kind: d.visuals[id].kind,
        hip: +(d.visuals[id].body.position.y + .70).toFixed(2) };
    };
    const chair = put('B', 3, 6);
    const bed = put('C', 1, 7);
    const floor = put('D', 4, 5);
    d.state.placed = {}; d.state.carry = null; d.state.won = false;
    d.PEOPLE.forEach(p => { d.visuals[p.id].g.position.copy(d.visuals[p.id].home); d.applyPose(p.id, null); });
    d.renderPad();
    return { chair, bed, floor };
  });
  check('a guest on a chair sits on it — hips at the seat, feet on the floor',
    posed.chair.kind === 'chair' && posed.chair.hip > .4 && posed.chair.hip < .7
    && posed.chair.box.min > -.03, JSON.stringify(posed.chair));
  check('a guest on a bed is put down on the bed, not in it',
    posed.bed.kind === 'bed' && posed.bed.box.min >= .55 && posed.bed.box.min <= .63,
    JSON.stringify(posed.bed));
  check('a guest on a bare square rests on the floor, whichever pose they take',
    posed.floor.kind === 'floor' && posed.floor.box.min > -.03 && posed.floor.box.min < .08,
    JSON.stringify(posed.floor));
  check('there is more than one way to stand, to sit and to lie',
    await page.evaluate(() => {
      const d = window.__murdoku;
      return d.POSES.floor.length >= 8 && d.POSES.chair.length >= 6 && d.POSES.bed.length >= 5;
    }));
  check('a carried guest can be put down by looking at the floor, even though they are in the way',
    await page.evaluate(async () => {
      const d = window.__murdoku;
      const home = () => {
        d.state.placed = {}; d.state.carry = null; d.state.won = false;
        d.PEOPLE.forEach(p => { d.visuals[p.id].g.position.copy(d.visuals[p.id].home); d.applyPose(p.id, null); });
        d.renderPad();
      };
      home();
      d.state.started = true; d.state.locked = false;
      d.teleport(d.cellX(2), d.cellZ(5) + 1.5, 0, -.75);
      d.lift('V');
      await new Promise(r => setTimeout(r, 150));            // a couple of frames: he floats in front of you
      d.state.hovered = d.target();
      const seen = d.state.hovered && d.state.hovered.id;
      d.use();
      const there = d.state.placed.V;
      home();
      return seen === 'cell' && !!there;
    }));
  check('and even a blind click drops them on the square they are floating above',
    await page.evaluate(async () => {
      const d = window.__murdoku;
      const home = () => {
        d.state.placed = {}; d.state.carry = null; d.state.won = false;
        d.PEOPLE.forEach(p => { d.visuals[p.id].g.position.copy(d.visuals[p.id].home); d.applyPose(p.id, null); });
        d.renderPad();
      };
      home();
      d.state.started = true; d.state.locked = false;
      d.teleport(d.cellX(4), d.cellZ(5) + 1.2, 0, .55);      // nose in the air, nothing under the crosshair
      d.lift('V');
      await new Promise(r => setTimeout(r, 150));
      d.state.hovered = d.target();
      const seen = d.state.hovered && d.state.hovered.id;
      d.use();
      const there = d.state.placed.V;
      home();
      return seen === null && !!there && there[0] === 4;
    }));
  /* --- the hall is a scratch floor, not the grid -------------------------- */
  const free = await page.evaluate(() => {
    const d = window.__murdoku;
    d.state.placed = {}; d.state.parked = {}; d.state.carry = null; d.state.won = false;
    d.PEOPLE.forEach(p => { d.visuals[p.id].g.position.copy(d.visuals[p.id].home); d.applyPose(p.id, null); });
    d.lift('A');
    const ok = d.park('A', d.cellX(3), 7.8);
    const g = d.visuals.A.g;
    return { ok, parked: !!d.state.parked.A, placed: !!d.state.placed.A,
      x: +g.position.x.toFixed(2), z: +g.position.z.toFixed(2), kind: d.visuals.A.kind,
      cols: d.columnsOK(), rows: d.rowsOK(), pad: d.renderPad(),
      notes: /set down outside the grid/i.test(document.getElementById('padPeople').textContent) };
  });
  check('a guest can be set down free in the hall, off the grid',
    free.ok && free.parked && !free.placed && free.kind === 'hall' && free.z > 7.5, JSON.stringify(free));
  check('that is a note to yourself: it moves neither a row nor a column',
    free.cols && free.rows && free.notes, JSON.stringify(free));
  check('and it cannot win the case for you: the grid still needs all six', await page.evaluate(() => {
    const d = window.__murdoku;
    const sol = { B: [5, 2], C: [3, 3], D: [4, 6], E: [6, 4], V: [2, 5] };
    for (const [id, [c, r]] of Object.entries(sol)) {
      d.state.placed[id] = [c, r];
      d.visuals[id].g.position.set(d.cellX(c), 0, d.cellZ(r));
      d.applyPose(id, [c, r]);
    }
    d.state.won = false;
    d.checkWin();
    const won = d.state.won;
    d.state.placed = {}; d.state.parked = {}; d.state.won = false;
    d.PEOPLE.forEach(p => { d.visuals[p.id].g.position.copy(d.visuals[p.id].home); d.applyPose(p.id, null); });
    d.renderPad();
    return won === false;
  }));
  check('a guest parked in the hall can be picked up again where they stand', await page.evaluate(() => {
    const d = window.__murdoku;
    d.lift('A'); d.park('A', 0, 7.8);                  // in the hall, in front of the plinths
    const g = d.visuals.A.g;
    d.teleport(g.position.x, g.position.z + 1.2, 0, -.15);
    d.camera.updateMatrixWorld(true);
    const hit = d.target();
    d.state.hovered = hit;
    const id = hit && hit.id;
    d.lift('A');
    const carrying = d.state.carry === 'A' && !d.state.parked.A;
    d.putBack('A');
    return id === 'p_A' && carrying;
  }));
  check('a click in the hall sets them down there, off the grid', await page.evaluate(async () => {
    const d = window.__murdoku;
    d.state.placed = {}; d.state.parked = {}; d.state.carry = null;
    d.state.started = true; d.state.locked = false;
    d.teleport(1, -7.0, 0, .9);                       // nose in the air, nothing under the crosshair
    d.lift('B');
    await new Promise(r => setTimeout(r, 150));
    d.state.hovered = d.target();
    const seen = d.state.hovered && d.state.hovered.id;
    d.use();
    const parked = !!d.state.parked.B && !d.state.placed.B;
    d.putBack('B');
    return seen === null && parked;
  }));

  check('a guest can be set down free on any of the four sides of the grid',
    await page.evaluate(() => {
      const d = window.__murdoku;
      const home = () => {
        d.state.placed = {}; d.state.parked = {}; d.state.carry = null;
        d.PEOPLE.forEach(p => { d.visuals[p.id].g.position.copy(d.visuals[p.id].home); d.applyPose(p.id, null); });
        d.renderPad();
      };
      home();
      const spots = [[-7.9, 0], [0, -7.9], [7.9, 0], [1.5, 7.8]];      // west, north, east, hall
      const parked = spots.map(([x, z]) => { d.lift('B'); return d.park('B', x, z); });
      const inGrid = d.hallSpot(1, 1);                                  // never inside the grid
      const inWall = d.hallSpot(d.HOUSE.X0 - .2, 0);                     // nor inside the house wall
      home();
      return parked.every(Boolean) && !inGrid && !inWall;
    }));
  check('the corridor floor carries the grid lines out to the wall, and a number for every row and column',
    await page.evaluate(() => window.__murdoku.marks() === 60),
    await page.evaluate(() => String(window.__murdoku.marks())));
  check('and the corridor round the house is somewhere you can walk', await page.evaluate(async () => {
    const d = window.__murdoku;
    d.state.locked = true;
    d.teleport(-5.3, 8.4, Math.PI / 2, 0);          // in the hall, looking west at the doorway
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    const until = performance.now() + 4000;
    while (d.camera.position.x > d.HOUSE.X0 - .2 && performance.now() < until) {
      await new Promise(r => setTimeout(r, 60));
    }
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    d.state.locked = false;
    return d.camera.position.x < d.HOUSE.X0 - .2;
  }));
  check('no joint is bent the wrong way: knees fold back, elbows fold forward',
    await page.evaluate(() => {
      const d = window.__murdoku;
      const all = [].concat(...Object.values(d.POSES), ...Object.values(d.DEAD_POSES));
      const bad = all.filter(P => P.sl[0] > .02 || P.sr[0] > .02                 // knee hyperextension
        || P.fl[0] < -.02 || P.fr[0] < -.02                                        // elbow hyperextension
        || P.tl[0] < -.7 || P.tr[0] < -.7 || P.tl[0] > 2.6 || P.tr[0] > 2.6        // hip out of range
        || Math.abs(P.al[2]) > 1.75 || Math.abs(P.ar[2]) > 1.75                    // shoulder out of range
        || P.fl[0] > 3 || P.fr[0] > 3);
      return bad.length === 0;
    }));
  check('in the hall they face the house, not the wall', await page.evaluate(() => {
    const d = window.__murdoku;
    d.PEOPLE.forEach(p => { delete d.state.placed[p.id]; d.state.parked = {};
      d.visuals[p.id].g.position.copy(d.visuals[p.id].home); d.applyPose(p.id, null); });
    // the face looks down local −z, so it should point at the middle of the grid
    return d.PEOPLE.every(p => {
      const g = d.visuals[p.id].g;
      const y = g.rotation.y;
      const fx = -Math.sin(y), fz = -Math.cos(y);
      const len = Math.hypot(g.position.x, g.position.z);
      return (fx * -g.position.x / len + fz * -g.position.z / len) > .95;
    });
  }));
  check('the body lies on whatever it is lying on, and never floats above it',
    await page.evaluate(() => {
      const d = window.__murdoku, T = d.THREE;
      const out = {};
      for (const [kind, cell] of [['floor', [4, 5]], ['bed', [1, 7]], ['chair', [3, 6]]]) {
        const saved = d.DEAD_POSES[kind];
        let min = 9, max = -9;
        for (let i = 0; i < saved.length; i++) {
          d.DEAD_POSES[kind] = [saved[i]];
          d.visuals.V.g.position.set(d.cellX(cell[0]), 0, d.cellZ(cell[1]));
          d.applyPose('V', cell);
          d.visuals.V.g.updateMatrixWorld(true);
          const bb = new T.Box3().setFromObject(d.visuals.V.body);
          min = Math.min(min, bb.min.y); max = Math.max(max, bb.max.y);
        }
        d.DEAD_POSES[kind] = saved;
        out[kind] = [+min.toFixed(2), +max.toFixed(2)];
      }
      d.visuals.V.g.position.copy(d.visuals.V.home);
      d.applyPose('V', null);
      return out.floor[0] < .12 && out.bed[0] >= .58 && out.bed[0] < .66
        && out.chair[0] > -.02 && out.chair[0] < .2
        && out.floor[1] < 1.0 && out.bed[1] < 1.6;
    }));
  check('someone lying on a bed is still easy to pick up', await page.evaluate(() => {
    const d = window.__murdoku;
    d.lift('A'); d.place('A', 1, 1);
    const g = d.visuals.A.g;
    const cx = g.position.x, cz = g.position.z + 1.3;
    d.teleport(cx, cz, 0, Math.atan2((g.position.y + 1.1) - 1.62, 1.3));
    const hit = d.target();
    d.state.hovered = hit;
    const id = hit && hit.id;
    d.putBack('A');
    return id === 'p_A';
  }));
  check('everyone waiting in the hall stands up straight, and only the body does not',
    await page.evaluate(() => {
      const d = window.__murdoku;
      d.PEOPLE.forEach(p => { delete d.state.placed[p.id];
        d.visuals[p.id].g.position.copy(d.visuals[p.id].home); d.applyPose(p.id, null); });
      const hall = d.POSES.hall[0];
      return d.POSES.hall.length === 1 && !!hall
        && d.PEOPLE.every(p => p.victim ? d.visuals[p.id].pose !== hall : d.visuals[p.id].pose === hall);
    }));
  check('and they hang in your arms the same way', await page.evaluate(() => {
    const d = window.__murdoku;
    d.lift('A');
    const same = d.visuals.A.kind === 'carry' && d.visuals.A.pose === d.POSES.hall[0];
    d.putBack('A');
    return same;
  }));
  await page.evaluate(() => {
    const d = window.__murdoku;
    d.state.marked = null;
    d.teleport(d.cellX(4), d.cellZ(5) + .55, 0, -.85);     // look at a square, so the tray redraws
    d.camera.updateMatrixWorld(true);
    d.lift('C');
    d.state.trayId = 'stale';
  });
  await sleep(260);
  const carryingTray = await page.evaluate(() =>
    document.getElementById('tray').textContent.replace(/\s+/g, ' '));
  check('while you carry someone, the tray repeats what they said',
    /Carrying Caroline/i.test(carryingTray) && /was on a chair/i.test(carryingTray),
    carryingTray.slice(0, 90));
  await page.evaluate(() => window.__murdoku.putBack('C'));
  check('nobody sinks into the seat of a chair', await page.evaluate(() => {
    const d = window.__murdoku, T = d.THREE;
    const cx = d.cellX(3), cz = d.cellZ(6), top = d.SEAT_Y;
    const v3 = new T.Vector3();
    const saved = d.POSES.chair.slice();
    let clean = true;
    d.state.placed = {}; d.state.carry = null;
    for (let i = 0; i < saved.length; i++) {
      d.POSES.chair = [saved[i]];
      d.visuals.A.g.position.set(cx, 0, cz);
      d.applyPose('A', [3, 6]);
      d.visuals.A.g.updateMatrixWorld(true);
      d.visuals.A.body.traverse(o => {
        if (!o.isMesh) return;
        const pos = o.geometry.attributes.position;
        for (let k = 0; k < pos.count; k++) {
          v3.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
          if (Math.abs(v3.x - cx) > .26 || Math.abs(v3.z - cz) > .26) continue;
          if (v3.y > .12 && v3.y < top - .005) clean = false;   // through the seat, not under it
        }
      });
    }
    d.POSES.chair = saved;
    d.visuals.A.g.position.copy(d.visuals.A.home);
    d.applyPose('A', null);
    return clean;
  }));

  // the whole solution, on the real floor
  const sol = { A: [6, 6], B: [5, 2], C: [7, 3], D: [2, 7], E: [3, 5], F: [1, 1], V: [4, 4] };
  for (const [id, [c, r]] of Object.entries(sol)) {
    await aimPerson(page, id);
    await page.keyboard.press('KeyE');
    await sleep(120);
    await aimCell(page, c, r);
    await page.keyboard.press('KeyE');
    await sleep(140);
  }
  const fin = await st(page);
  check('the seven of them are on the squares the case gives',
    Object.entries(sol).every(([id, [c, r]]) => fin.placed[id] && fin.placed[id][0] === c && fin.placed[id][1] === r),
    JSON.stringify(fin.placed));
  check('which closes the case', fin.won === true);
  check('one per row as well as one per column', await page.evaluate(() => {
    const d = window.__murdoku;
    return d.columnsOK() && d.rowsOK() && d.linesOK();
  }));
  check('and the murderer is the one who shared the victim\'s room', await page.evaluate(() => {
    const d = window.__murdoku;
    return d.state.murderer === 'C' && d.murdererOf() === 'C';
  }), await page.evaluate(() => String(window.__murdoku.state.murderer)));
  check('and the sign says so', await page.evaluate(() =>
    !document.getElementById('banner').hidden && /CASE CLOSED/i.test(document.getElementById('banner').textContent)));
  check('a second person in one row is refused a clean placement', await page.evaluate(() => {
    const d = window.__murdoku;
    const keep = { ...d.state.placed };
    d.lift('E'); d.place('E', 3, 7);                    // E joins D in row 7, in her own column
    const after = { rows: d.rowsOK(), cols: d.columnsOK(),
      said: [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | ') };
    d.state.placed = keep;
    Object.entries(keep).forEach(([id, [c, r]]) => d.visuals[id].g.position.set(d.cellX(c), 0, d.cellZ(r)));
    d.renderPad();
    return { rows: after.rows, cols: after.cols, said: /same row/i.test(after.said) };
  }).then(r => r.rows === false && r.cols === true && r.said === true));

  check('every statement is ticked in the notes', await page.evaluate(() =>
    (document.getElementById('padPeople').textContent.match(/✓/g) || []).length === 6));
  check('each of them is told apart in the notes by a colour of their own', await page.evaluate(() => {
    const people = [...document.querySelectorAll('#padPeople li.person')];
    return people.length === 7
      && people.every(li => li.querySelector('.chip') && li.querySelector('.clue').textContent.trim())
      && new Set(people.map(li => li.querySelector('.chip').style.background)).size === 7
      && !document.querySelector('#padPeople .look');       // you can see them, no need to describe them
  }));
  check('I hides and shows the notes, and Tab does the same', await page.evaluate(() => {
    const pad = document.querySelector('#pad');
    const before = pad.hidden;
    dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', bubbles: true }));
    const afterI = pad.hidden;
    dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', bubbles: true }));
    const back = pad.hidden;
    dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', bubbles: true }));
    const afterTab = pad.hidden;
    dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', bubbles: true }));
    return before === back && afterI === !before && afterTab === !before;
  }));
  check('the notes label where each of them is standing', await page.evaluate(() => {
    const t = document.getElementById('padPeople').textContent.replace(/\s+/g, ' ');
    return (t.match(/Current location:/g) || []).length >= 5 && /Current location: C1R1/.test(t);
  }));
  const revealed = await page.evaluate(async () => {
    const d = window.__murdoku;
    await new Promise(r => setTimeout(r, 1700));           // the reveal runs after 1.4 s
    const g = d.visuals[d.state.murderer].g;
    const at = d.state.placed[d.state.murderer];
    const dist = Math.hypot(d.camera.position.x - d.cellX(at[0]), d.camera.position.z - d.cellZ(at[1]));
    return { knife: !!g.userData.knife, dist: +dist.toFixed(2),
      banner: document.getElementById('banner').textContent.replace(/\s+/g, ' ') };
  });
  check('the murderer is holding a knife', revealed.knife === true);
  check('and the camera has moved onto the square in front of them',
    revealed.dist > .8 && revealed.dist < 2.6, JSON.stringify(revealed));
  check('and the knife stands up in the hand instead of through a wall', await page.evaluate(() => {
    const d = window.__murdoku;
    const k = d.visuals[d.state.murderer].g.userData.knife;
    const at = d.state.placed[d.state.murderer];
    const bb = new d.THREE.Box3().setFromObject(k);
    return bb.min.x > d.cellX(at[0]) - 1 && bb.max.x < d.cellX(at[0]) + 1
      && bb.min.z > d.cellZ(at[1]) - 1 && bb.max.z < d.cellZ(at[1]) + 1
      && bb.min.y > 0 && (bb.max.y - bb.min.y) > (bb.max.x - bb.min.x);
  }));
  /* --- rooms: separate files, a picker, and what is finished -------------- */
  check('the rooms are separate files, reached through one manifest',
    await page.evaluate(() => {
      const d = window.__murdoku;
      return d.LEVELS.length >= 2 && d.LEVELS.every(l => l && l.id && l.title && l.size)
        && d.LEVELS.map(l => l.id).includes('garden') && d.LEVELS.map(l => l.id).includes('country');
    }));
  check('closing the case marks that room as done', await page.evaluate(() =>
    window.__murdoku.doneRooms().has(window.__murdoku.LEVEL.id)));
  check('and the case banner offers the next unfinished room', await page.evaluate(() => {
    const a = document.querySelector('#banner a');
    return !!a && a.getAttribute('href') === '?level=country';
  }), await page.evaluate(() => (document.querySelector('#banner a') || {}).outerHTML || 'none'));
  const roomsPanel = await page.evaluate(() => {
    const d = window.__murdoku;
    d.openRooms();
    const open = !document.getElementById('rooms').hidden;
    const text = document.getElementById('roomsList').textContent.replace(/\s+/g, ' ');
    const links = [...document.querySelectorAll('#roomsList a')].map(a => a.getAttribute('href'));
    d.closeRooms();
    return { open, closed: document.getElementById('rooms').hidden, text, links };
  });
  check('a rooms button lists every room and ticks the closed one',
    roomsPanel.open && roomsPanel.closed && /garden/i.test(roomsPanel.text)
    && /country/i.test(roomsPanel.text) && /closed/.test(roomsPanel.text)
    && roomsPanel.links.includes('?level=country'), JSON.stringify(roomsPanel));

  /* --- more than one of everything, and still legible --------------------- */
  const variety = await page.evaluate(() => {
    const d = window.__murdoku;
    const by = {};
    for (const g of d.MERGED) (by[g.kind] = by[g.kind] || []).push(g.variant);
    const seen = {};
    for (const [kind, list] of Object.entries(by)) seen[kind] = [...new Set(list)].length;
    return { seen, counts: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length])) };
  });
  check('the house shows more than one chair, plant and table type',
    variety.seen.chair >= 2 && variety.seen.plant >= 2 && variety.seen.table >= 2,
    JSON.stringify(variety));
  check('every variant stays inside its kind',
    await page.evaluate(() => {
      const d = window.__murdoku;
      return d.MERGED.every(g => Number.isInteger(g.variant) && g.variant >= 0
        && g.variant < (d.VARIANTS[g.kind] || 1));
    }));

  check('the banner names the murderer and why it is them',
    /CAROLINE/.test(revealed.banner) && /terrace/i.test(revealed.banner),
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
      total: ids.length, woon: count('living room'), hall: count('the hall'),
      rooms: ['backyard', 'terrace', 'jacuzzi', 'bedroom', 'kitchen', 'living room'].map(count),
    };
  });
  check('every room has its name on the walls behind it, more than once',
    plaques.total >= 20 && plaques.rooms.every(n => n >= 2), JSON.stringify(plaques));
  check('the living room has a plaque on each of its walls',
    plaques.woon >= 8 && plaques.hall >= 1, JSON.stringify(plaques));

  const signRead = await page.evaluate(() => {
    const d = window.__murdoku;
    // the plaque on the west wall, with nothing standing in front of it
    const signs = d.interact.filter(o => o.userData.interact === 'sign_backyard');
    const p0 = new d.THREE.Vector3();
    const sign = signs.reduce((best, o) => {
      o.getWorldPosition(p0);
      return (!best || p0.x < best.x) ? { o, x: p0.x } : best;
    }, null).o;
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
        if (hit && String(hit.id).startsWith('sign_')) break;
        hit = null;
      }
      if (hit) break;
    }
    d.state.hovered = hit;
    const text = hit ? (d.use(), document.getElementById('body').textContent.replace(/\s+/g, ' ')) : '';
    return { id: hit && hit.id, text };
  });
  check('a plaque can be read and names the room and its squares',
    signRead.id === 'sign_backyard' && /backyard/i.test(signRead.text) && /C1R1/.test(signRead.text),
    signRead.id + ' · ' + signRead.text.slice(0, 50));

  const throughWall = await page.evaluate(async () => {
    const d = window.__murdoku;
    // the wall between the terrace and the living room, at x 0, away from its doorway
    d.state.locked = true;
    d.teleport(0, -.2, Math.PI, 0);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    const until = performance.now() + 3000;                  // a slow software renderer, so wait for it
    while (d.camera.position.z < 1.6 && performance.now() < until) await new Promise(r => setTimeout(r, 60));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    d.state.locked = false;
    return { z: +d.camera.position.z.toFixed(2), solids: d.SOLIDS.length };
  });
  check('the part-walls are scenery: you walk straight through them',
    throughWall.z > 1.4, JSON.stringify(throughWall));

  /* --- furniture you cannot stand on, closed walls, and the window -------- */
  const noStand = await page.evaluate(() => {
    const d = window.__murdoku;
    d.state.placed = {}; d.state.carry = null; d.state.won = false;
    const tryCell = (id, c, r) => { d.lift(id); return d.place(id, c, r); };
    const table = tryCell('B', 2, 1);          // a table in the garden
    const plant = tryCell('C', 1, 3);          // the plant in C1R3
    const tv = tryCell('D', 5, 5);             // the television in C5R5
    const bed = tryCell('A', 1, 7);            // a bed is allowed: Dafne lay on one
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
    for (let c = 1; c < d.N; c++) for (let r = 1; r <= d.N; r++) if (d.roomAt(c, r) !== d.roomAt(c + 1, r)) internal++;
    for (let c = 1; c <= d.N; c++) for (let r = 1; r < d.N; r++) if (d.roomAt(c, r) !== d.roomAt(c, r + 1)) internal++;
    return { runs: d.WALLS.length, internal,
      lengths: [...new Set(d.WALLS.map(w => +w.len.toFixed(2)))].sort((a, b) => a - b) };
  });
  check('every room is closed in: one unbroken wall per boundary, and the hall wall in six',
    walls.runs === walls.internal + 7, JSON.stringify(walls));
  check('and every run is one full cell, with no doorway cut in it',
    walls.lengths.length === 1 && walls.lengths[0] === 2, JSON.stringify(walls.lengths));

  check('this house has no window, and no glass, and no window light',
    await page.evaluate(() => {
      const d = window.__murdoku;
      return d.WINDOW === null && !d.WINDOW_AT.open && !d.WINDOW_AT.pane;
    }));
  check('so the east wall is one unbroken knee-high run, with no gap let into it',
    await page.evaluate(() => {
      const d = window.__murdoku, h = d.HOUSE;
      return !d.SOLIDS.some(s => Math.abs(s.x0 - h.X1) < .02 && s.y0 > .05 && s.y1 < 1.5)
        && !d.SOLIDS.some(s => Math.abs(s.x0 - h.X1) < .02 && s.y1 > 1.5);
    }));

  const shell = await page.evaluate(() => {
    const d = window.__murdoku, h = d.HOUSE;
    const wall = (pred) => d.SOLIDS.some(pred);
    return {
      west: wall(s => Math.abs(s.x1 - d.OUTER.OX0) < .02 && s.y1 > 3),
      east: wall(s => Math.abs(s.x0 - d.OUTER.OX1) < .02 && s.y1 > 3),
      north: wall(s => Math.abs(s.z1 - d.OUTER.OZ0) < .02 && s.y1 > 3),
      south: wall(s => Math.abs(s.z0 - h.Z1) < .02 && s.y1 > 3),
      h,
    };
  });
  check('the shell round the corridor is full height on all four sides',
    shell.west && shell.east && shell.north && shell.south, JSON.stringify(shell));
  check('but the house\'s own walls are knee-high, so the rooms are open to the corridor',
    await page.evaluate(() => {
      const d = window.__murdoku, h = d.HOUSE, o = d.OUTER;
      const tallAt = (pred) => d.SOLIDS.some(s => pred(s) && s.y1 > 1.5);
      return !tallAt(s => Math.abs(s.x1 - h.X0) < .02) && !tallAt(s => Math.abs(s.x0 - h.X1) < .02)
        && !tallAt(s => Math.abs(s.z1 - h.Z0) < .02)
        && o.OX0 < h.X0 - 1 && o.OX1 > h.X1 + 1 && o.OZ0 < h.Z0 - 1;
    }));

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
  check('next to means beside it, in the same room',
    await page.evaluate(() => {
      const d = window.__murdoku;
      const tv = new Set(['5,5']);
      return d.nextToSameRoom(4, 5, tv) === true         // beside it, same room
        && d.nextToSameRoom(5, 6, tv) === true           // beside it, the other way
        && d.nextToSameRoom(4, 6, tv) === false          // diagonal
        && d.nextToSameRoom(6, 5, tv) === false;         // beside it, but in the kitchen
    }));
  check('and the body needs a room with exactly one other person', await page.evaluate(() => {
    const d = window.__murdoku;
    const keep = { ...d.state.placed };
    d.lift('E'); d.place('E', 4, 3);                     // now C, E and the body are all on the terrace
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
      bed: at(1, 7, 1.0),                 // a bed is 0.52 high
      chair: at(3, 6, 1.0),
      table: at(2, 1, 1.0),               // the table is 0.78
      plant: at(1, 3, 1.4),               // the plant pot stands 1.0
      tv: at(5, 5, 2.0),                  // the television is 1.35
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

  /* --- hints, in Dutch ---------------------------------------------------- */
  const hint = await page.evaluate(async () => {
    const d = window.__murdoku;
    const keep = { ...d.state.placed };
    d.state.placed = {}; d.state.carry = null; d.state.won = false;
    d.giveHint();
    const first = [...document.querySelectorAll('#toasts .toast')].pop().textContent;
    d.state.placed = keep;
    d.renderPad();
    return first;
  });
  check('H gives a Dutch hint', /^Hint · /.test(hint) && /pak een gast op/i.test(hint), hint);

  /* --- the cast looks like the cast --------------------------------------- */
  const looks = await page.evaluate(() => {
    const d = window.__murdoku;
    const hex = n => '#' + n.toString(16).padStart(6, '0');
    return Object.fromEntries(d.PEOPLE.map(p => {
      const l = d.visuals[p.id].g.userData.look;
      return [p.id, { skin: hex(l.skin), hair: hex(l.hair), style: l.style, glasses: l.glasses, beard: l.beard }];
    }));
  });
  check('Alain: a man with short grey hair and sunglasses',
    looks.A.style === 'short' && looks.A.glasses === true && looks.A.hair === '#b8b4ab', JSON.stringify(looks.A));
  check('Ben: a man with a brown beard',
    looks.B.beard === true && looks.B.hair === '#5a3a24' && !looks.B.glasses, JSON.stringify(looks.B));
  check('Caroline: a woman with shoulder-long blond hair',
    looks.C.style === 'halflong' && looks.C.hair === '#d8bd7a' && !looks.C.beard, JSON.stringify(looks.C));
  check('Dafne: a woman with orange hair above the shoulder, and glasses',
    looks.D.style === 'halflong' && looks.D.hair === '#c26a28' && looks.D.glasses === true, JSON.stringify(looks.D));
  check('Ellie: a woman with long brown hair and sunglasses',
    looks.E.style === 'long' && looks.E.hair === '#4a2c1a' && looks.E.glasses === true, JSON.stringify(looks.E));
  check('Falco: a man with short neat brown hair and sunglasses',
    looks.F.style === 'short' && looks.F.hair === '#3b2a1e' && looks.F.glasses === true, JSON.stringify(looks.F));
  check('Violet: a woman with grey hair above the shoulder, and glasses',
    looks.V.style === 'halflong' && looks.V.hair === '#b0aca4' && looks.V.glasses === true, JSON.stringify(looks.V));
  check('and his head is not on his shoulders', await page.evaluate(() => {
    const d = window.__murdoku;
    return d.visuals.V.g.userData.look.beheaded === true
      && d.visuals.A.g.userData.look.beheaded === false;
  }));

  /* --- a refresh keeps the grid ------------------------------------------ */
  await page.evaluate(() => {
    const d = window.__murdoku;
    d.state.placed = {}; d.state.marks.clear(); d.state.parked = {};
    d.place('A', 6, 6);
    d.state.marks.add('4,5');
    d.syncMarks();
    d.saveState();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1500);
  const kept = await page.evaluate(() => {
    const d = window.__murdoku;
    return { placed: { ...d.state.placed }, marks: [...d.state.marks],
      x: +d.visuals.A.g.position.x.toFixed(1), z: +d.visuals.A.g.position.z.toFixed(1) };
  });
  check('a refresh keeps the grid where it was left',
    !!kept.placed.A && kept.placed.A[0] === 6 && kept.placed.A[1] === 6
    && kept.marks.includes('4,5') && kept.x === 4 && kept.z === 4, JSON.stringify(kept));
  check('and a refresh drops you back into the room, not the menu', await page.evaluate(() =>
    document.getElementById('start').hidden === true && window.__murdoku.state.started === true));
  check('the four outer walls carry the compass', await page.evaluate(() => {
    const d = window.__murdoku;
    const ids = d.interact.map(o => o.userData.interact);
    return ['compass_north', 'compass_south', 'compass_east', 'compass_west'].every(id => ids.includes(id));
  }));

  /* --- the first house is still here, on its own address ------------------ */
  await page.goto(BASE + '?test&level=country', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(1300);
  const country = await page.evaluate(() => {
    const d = window.__murdoku;
    return { level: d.LEVEL.id, people: d.PEOPLE.length, cells: Object.keys(d.ROOM_AT).length,
      title: document.title, plinth: d.PLINTH_Z, z1: d.HOUSE.Z1,
      beds: [...d.BEDS].sort().join(' '), window: d.WINDOW && d.WINDOW.join(',') };
  });
  check('the first house is still there, and not replaced by the new one',
    country.level === 'country' && country.people === 6 && country.cells === 36
    && /country house/i.test(country.title), JSON.stringify(country));
  check('with its own furniture, its window, and its guests against the hall wall',
    country.beds === '1,1 1,2 2,4 3,4' && country.window === '6,4'
    && country.plinth > country.z1 - 1.2, JSON.stringify(country));
  check('and you can still see through its window into the corridor', await page.evaluate(() => {
    const d = window.__murdoku, T = d.THREE;
    const z = d.cellZ(4) + .45;                       // between the mullion and the stile
    const ray = new T.Raycaster(new T.Vector3(d.HOUSE.X1 - 2.2, 1.0, z), new T.Vector3(1, 0, 0));
    const hit = ray.intersectObjects(d.scene.children, true).filter(h => h.object.visible && h.object.material)[0];
    return d.WINDOW_AT.open === true && !!hit
      && hit.object.material.transparent === true && hit.object.material.opacity < .5;
  }));
  check('and its own answer still closes the case', await page.evaluate(() => {
    const d = window.__murdoku;
    const sol = { A: [1, 1], B: [5, 2], C: [3, 3], D: [4, 6], E: [6, 4], V: [2, 5] };
    for (const [id, [c, r]] of Object.entries(sol)) d.place(id, c, r);
    return d.state.won === true && d.state.murderer === 'A';
  }));

  /* --- the restaurant at sea: nine people, shelves, and water ---------- */
  await page.goto(BASE + '?test&level=restaurant', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(1600);
  const sea = await page.evaluate(() => {
    const d = window.__murdoku;
    d.state.placed = {}; d.state.marks.clear();
    d.place('E', 9, 9);                       // a square of the sea
    d.visuals.E.g.updateMatrixWorld(true);
    const bb = new d.THREE.Box3().setFromObject(d.visuals.E.body);
    return { people: d.PEOPLE.length, cells: Object.keys(d.ROOM_AT).length,
      shelves: d.MERGED.filter(g => g.kind === 'shelf').map(g => g.cells.length).sort().join(','),
      room: d.roomAt(9, 9), kind: d.visuals.E.kind, clipped: d.visuals.E.clipped,
      top: +bb.max.y.toFixed(2), bottom: +bb.min.y.toFixed(2), water: d.isWater(9, 9) };
  });
  check('the restaurant at sea is a 9 × 9 room of nine people',
    sea.people === 9 && sea.cells === 81, JSON.stringify(sea));
  check('two touching shelves are one shelf', sea.shelves === '1,2', sea.shelves);
  check('every shelf has its back to a wall, or is open at the back', await page.evaluate(() => {
    const d = window.__murdoku;
    const shelves = d.scene.children.filter(o => o.userData && o.userData.shelf);
    return shelves.length >= 2 && shelves.every(o => {
      const { face, freestanding, variant, cells } = o.userData.shelf;
      const wall = cells.every(([c, r]) => {
        const a = c - face[0], b = r - face[1];
        return a < 1 || a > d.N || b < 1 || b > d.N || d.roomAt(a, b) !== d.roomAt(c, r);
      });
      return wall || freestanding && (variant === 0 || variant === 3);
    });
  }));
  check('the corner of an L-shaped table is not an invisible block', await page.evaluate(() => {
    const d = window.__murdoku;
    const x = d.cellX(8), z = d.cellZ(3);
    return !d.SOLIDS.some(s => s.y1 > .7 && s.y1 < .8
      && x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1);
  }));
  check('the sea is water you stand in: only the head above it, the body seen through it',
    sea.water && sea.room === 'sea' && sea.kind === 'jacuzzi' && sea.clipped === false
    && sea.bottom < .3, JSON.stringify(sea));
  check('its own answer still closes the case', await page.evaluate(() => {
    const d = window.__murdoku;
    const sol = { A: [9, 7], B: [7, 2], C: [5, 4], D: [4, 8], E: [2, 1], F: [1, 9], G: [8, 3], H: [6, 6], V: [3, 5] };
    for (const [id, [c, r]] of Object.entries(sol)) d.place(id, c, r);
    return d.state.won === true && d.state.murderer === 'C';
  }));

  check('no console errors', logs.length === 0, logs.join(' | '));

  mkdirSync('test/.shots', { recursive: true });
  await page.screenshot({ path: 'test/.shots/murdoku.png' });
  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log(failed.length ? failed.length + ' of ' + results.length + ' failed' : 'all ' + results.length + ' passed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
