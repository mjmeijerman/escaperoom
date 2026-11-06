/* Checks every Murdoku level without a browser.
   Run: node test/murdoku.level.mjs [path/to/murdoku.html] [--unique]

   It reads the level block and the rule vocabulary straight out of
   murdoku.html (between the `==== LEVEL ====` and `==== RULES ====` markers), so
   a new level is checked the moment it is written. There is more than one house
   in the file now, and every one of them is checked. It then solves the case by
   brute force and insists that exactly one layout fits — a level with two
   answers is a broken level, and you want to hear that here, not from a player. */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--')) || join(here, '..', 'murdoku.html');
const html = readFileSync(file, 'utf8');

function block(start, end) {
  const i = html.indexOf(start);
  const j = html.indexOf(end, i);
  if (i < 0 || j < 0) throw new Error(`marker not found: ${start} … ${end}`);
  const from = html.indexOf('\n', i) + 1;
  return html.slice(from, j);
}

/* The rooms are one file each next to the page; the manifest imports them all. */
const levelsDir = join(dirname(file), 'murdoku', 'levels');
const { LEVELS } = await import(pathToFileURL(join(levelsDir, 'index.js')).href);
const RULES = new Function(`${block('==== RULES START ==== */', '/* ==== RULES END ==== */')}\nreturn RULES;`)();

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS  ' : 'FAIL  '}${name}${detail ? `  (${detail})` : ''}`);
};

/* --- the house rules that hold for every level --------------------------- */
const KINDS = ['bed', 'chair', 'rug', 'table', 'plant', 'tv', 'jacuzzi', 'shelf',
  'crate', 'tree', 'bush', 'rubble', 'boat', 'crocodile'];   // what the engine can build
const NO_STAND_KINDS = ['table', 'plant', 'tv', 'shelf', 'crate', 'tree', 'bush', 'rubble', 'crocodile'];
const RULE_ARGS = { in: 'room', on: 'furniture', notOn: 'furniture', beside: 'furniture',
  notBeside: 'furniture', column: 'line', row: 'line', at: 'window', leftover: null,
  northOf: 'person', southOf: 'person', westOf: 'person', eastOf: 'person',
  withPerson: 'person', onlyOn: 'furniture' };
/* the rules that look at the rest of the board: they get the placement as a third
   argument, so they can only be judged once everyone is down */
const BOARD_RULES = new Set(['northOf', 'southOf', 'westOf', 'eastOf', 'withPerson', 'onlyOn']);

const UNIQUE = process.argv.includes('--unique');
const lines = N => Array.from({ length: N }, (_, i) => i + 1);

function* permutations(a) {
  if (a.length <= 1) { yield a.slice(); return; }
  for (let i = 0; i < a.length; i++) {
    for (const p of permutations(a.slice(0, i).concat(a.slice(i + 1)))) yield [a[i], ...p];
  }
}

function checkLevel(LEVEL) {
  const N = LEVEL.size || 6;
  const key = (c, r) => `${c},${r}`;
  const inGrid = ([c, r]) => Number.isInteger(c) && Number.isInteger(r)
    && c >= 1 && c <= N && r >= 1 && r <= N;

  /* --- the level, as the engine would build it --------------------------- */
  const ROOM_AT = {};
  const restRooms = LEVEL.rooms.filter(r => !r.cells || !r.cells.length);
  if (restRooms.length === 1) {
    for (let c = 1; c <= N; c++) for (let r = 1; r <= N; r++) ROOM_AT[key(c, r)] = restRooms[0].name;
  }
  for (const room of LEVEL.rooms) (room.cells || []).forEach(([c, r]) => { ROOM_AT[key(c, r)] = room.name; });
  const roomAt = (c, r) => ROOM_AT[key(c, r)];

  const KIND_AT = {}, KIND_CELLS = {};
  for (const f of LEVEL.furniture) {
    for (const [c, r] of f.cells) {
      KIND_AT[key(c, r)] = f.kind;
      (KIND_CELLS[f.kind] = KIND_CELLS[f.kind] || new Set()).add(key(c, r));
    }
  }
  const beside = (c, r) => [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]].filter(inGrid);
  const nextToSameRoom = (c, r, set) => {
    const home = roomAt(c, r);
    return beside(c, r).some(([a, b]) => roomAt(a, b) === home && set.has(key(a, b)));
  };
  const ctx = {
    roomAt,
    furnitureAt: (c, r) => KIND_AT[key(c, r)],
    beside: (c, r, kind) => nextToSameRoom(c, r, KIND_CELLS[kind] || new Set()),
    window: LEVEL.window || null,
  };
  const standable = (c, r) => !NO_STAND_KINDS.includes(KIND_AT[key(c, r)]);

  /* --- the level is well formed ----------------------------------------- */
  check('the level declares exactly one room for the squares the others leave',
    restRooms.length === 1, `${LEVEL.rooms.length} rooms`);
  check('every square belongs to a room',
    Array.from({ length: N * N }, (_, i) => [i % N + 1, Math.floor(i / N) + 1])
      .every(([c, r]) => !!roomAt(c, r)));
  check('the furniture is something the house can build, and it is on the grid',
    LEVEL.furniture.every(f => KINDS.includes(f.kind) && f.cells.length && f.cells.every(inGrid)),
    [...new Set(LEVEL.furniture.map(f => f.kind))].join(', '));
  /* the house merges touching beds before it draws them: a bed is two squares */
  const bedGroups = (() => {
    const seen = new Set(), groups = [];
    for (const f of LEVEL.furniture) {
      if (f.kind !== 'bed') continue;
      for (const [c0, r0] of f.cells) {
        if (seen.has(key(c0, r0))) continue;
        const group = [], stack = [[c0, r0]];
        seen.add(key(c0, r0));
        while (stack.length) {
          const [c, r] = stack.pop();
          group.push([c, r]);
          for (const [a, b] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
            if (!inGrid([a, b])) continue;
            const k = key(a, b);
            if (seen.has(k) || KIND_AT[k] !== 'bed') continue;
            seen.add(k);
            stack.push([a, b]);
          }
        }
        groups.push(group);
      }
    }
    return groups;
  })();
  check('every bed is two squares long, and no longer',
    bedGroups.every(g => g.length === 2), bedGroups.map(g => g.length).join(', '));
  check('the window, if there is one, is a square of the grid',
    !LEVEL.window || inGrid(LEVEL.window), String(LEVEL.window));
  check(`there are ${N} people on a ${N}-by-${N} grid`, LEVEL.people.length === N, String(LEVEL.people.length));
  check('their ids are unique', new Set(LEVEL.people.map(p => p.id)).size === LEVEL.people.length);
  check('there is exactly one victim, and the victim takes the leftover square',
    LEVEL.people.filter(p => p.victim).length === 1
    && LEVEL.people.find(p => p.victim)?.rule?.leftover === true);
  check('everyone else states rules from the vocabulary, and all of them count',
    LEVEL.people.filter(p => !p.victim).every(p => {
      const entry = Object.entries(p.rule || {});
      return entry.length >= 1 && entry.every(([verb]) => !!RULES[verb] && verb !== 'leftover');
    }));
  check('every rule gets an argument the level actually has', LEVEL.people.every(p =>
    Object.entries(p.rule || {}).every(([verb, arg]) => {
      if (!(verb in RULE_ARGS)) return false;
      if (RULE_ARGS[verb] === null) return true;                     // leftover takes no argument
      if (RULE_ARGS[verb] === 'room') return (Array.isArray(arg) ? arg : [arg])
        .every(n => LEVEL.rooms.some(r => r.name === n));
      if (RULE_ARGS[verb] === 'furniture') return KIND_CELLS[arg] && KIND_CELLS[arg].size > 0;
      if (RULE_ARGS[verb] === 'person') return LEVEL.people.some(p => p.id === arg);
      if (RULE_ARGS[verb] === 'line') return Number.isInteger(arg) && arg >= 1 && arg <= N;
      if (RULE_ARGS[verb] === 'window') return arg === 'window' && !!LEVEL.window;
      return true;
    })));

  /* every statement has to be possible somewhere, on a square someone can stand on */
  const squares = [];
  for (let c = 1; c <= N; c++) for (let r = 1; r <= N; r++) squares.push([c, r]);
  const movers = LEVEL.people.filter(p => !p.victim);
  const victim = LEVEL.people.find(p => p.victim);
  const tests = movers.map(p => {
    const verbs = Object.keys(p.rule);
    const parts = Object.entries(p.rule).map(([verb, arg]) => RULES[verb](arg, ctx));
    return { person: p, board: verbs.some(v => BOARD_RULES.has(v)),
      test: parts.length === 1 ? parts[0]
        : (c, r, board) => parts.every(t => t(c, r, board)) };
  });
  check('every statement is true of at least one square someone could stand on',
    tests.every(({ test, board }) => board
      || squares.some(([c, r]) => standable(c, r) && test(c, r))),
    tests.filter(({ test, board }) => !board && !squares.some(([c, r]) => standable(c, r) && test(c, r)))
      .map(t => t.person.name).join(', ') || `all ${movers.length}`);

  /* --- the solution the level gives -------------------------------------- */
  const solution = LEVEL.solution || {};
  const ids = LEVEL.people.map(p => p.id);
  const at = id => solution[id] || [0, 0];
  check('the level gives one square for every person',
    ids.length === Object.keys(solution).length && ids.every(id => inGrid(at(id))),
    JSON.stringify(solution));
  check('no two of them share a square', new Set(ids.map(id => key(...at(id)))).size === ids.length);
  check('one person per column and one per row',
    new Set(ids.map(id => at(id)[0])).size === ids.length
    && new Set(ids.map(id => at(id)[1])).size === ids.length);
  check('nobody stands on a table, a plant or the television',
    ids.every(id => standable(...at(id))), ids.filter(id => !standable(...at(id))).join(', ') || 'clear');

  const answer = Object.fromEntries(ids.map(id => [id, at(id)]));
  const wrong = tests.filter(({ person, test }) => !test(...at(person.id), answer));
  check('every statement is true of the square the solution gives',
    wrong.length === 0, wrong.map(t => t.person.name).join(', ') || `all ${movers.length}`);

  const room = roomAt(...at(victim.id));
  const together = LEVEL.people.filter(p => !p.victim && roomAt(...at(p.id)) === room);
  check('the victim shares that room with exactly one other person',
    together.length === 1, together.map(p => p.name).join(', ') || 'nobody');

  /* --- and, if you ask for it, that there is no other answer --------------- */
  if (UNIQUE) {
    /* A backtracking search, not a permutation of the lines: at nine by nine the
       permutations are 1.3e11, and a rule that looks at the board cannot be judged
       until the people it names are down anyway. People go in most-constrained
       first; the square-on-its-own part of a statement filters the candidates, the
       board part is judged when everyone is placed. */
    const localOf = (verb, arg) => {
      if (verb === 'onlyOn') return (c, r) => KIND_AT[key(c, r)] === arg;
      if (BOARD_RULES.has(verb)) return () => true;
      return RULES[verb](arg, ctx);
    };
    const cand = movers.map(p => {
      const parts = Object.entries(p.rule).map(([v, a]) => localOf(v, a));
      const local = (c, r) => parts.every(t => t(c, r));
      return squares.filter(([c, r]) => standable(c, r) && local(c, r));
    });
    const order = movers.map((_, i) => i).sort((x, y) => cand[x].length - cand[y].length);
    const usedC = new Set(), usedR = new Set(), board = {};
    let found = 0;
    const freeLine = set => { for (let i = 1; i <= N; i++) if (!set.has(i)) return i; };
    const dfs = k => {
      if (found > 1) return;
      if (k === movers.length) {
        const vc = freeLine(usedC), vr = freeLine(usedR);
        if (!standable(vc, vr)) return;
        const here = roomAt(vc, vr);
        if (movers.filter(p => roomAt(...board[p.id]) === here).length !== 1) return;
        board[victim.id] = [vc, vr];
        const good = movers.every((p, i) => tests[i].test(board[p.id][0], board[p.id][1], board));
        delete board[victim.id];
        if (good) found++;
        return;
      }
      const i = order[k], p = movers[i];
      for (const [c, r] of cand[i]) {
        if (usedC.has(c) || usedR.has(r)) continue;
        board[p.id] = [c, r];
        usedC.add(c); usedR.add(r);
        dfs(k + 1);
        usedC.delete(c); usedR.delete(r);
        delete board[p.id];
        if (found > 1) return;
      }
    };
    dfs(0);
    check('and no other layout fits at all', found === 1, `${found} found`);
  }

  /* --- what it all comes to ------------------------------------------------- */
  console.log('');
  for (const p of LEVEL.people) {
    const [c, r] = at(p.id);
    console.log(`      ${p.id}  ${p.name.padEnd(10)} C${c}R${r}  ${roomAt(c, r)}`);
  }
  console.log('');
}

for (const LEVEL of LEVELS) {
  console.log(`\n=== ${LEVEL.title} (${LEVEL.size || 6} × ${LEVEL.size || 6}) ===`);
  checkLevel(LEVEL);
}

const failed = results.filter(r => !r.ok);
console.log(failed.length ? `${failed.length} of ${results.length} failed` : `all ${results.length} passed`);
process.exit(failed.length ? 1 : 0);
