/* One room, one file: the garden. This is only data — rooms,
   furniture, people and the answer. The engine and the rules live in
   murdoku.html; the list of rooms is in ./index.js. */
export default {
  id: 'garden',
  title: 'the garden house',
  size: 7,                               // the grid is size × size, and there are `size` people
  window: null,                          // no doors and no windows in this house

  /* Rooms, in any order. Exactly one of them lists no squares: it takes every
     square the others leave over. `tint` is the room's colour and `floor` says
     what its floor is made of — grass, stone, wood, carpet, tile or water. */
  rooms: [
    { name: 'backyard', tint: 0x3f5a34, floor: 'grass',
      cells: [[1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3], [3, 3]] },
    { name: 'terrace', tint: 0x6a5a48, floor: 'stone',
      cells: [[4, 1], [5, 1], [6, 1], [7, 1], [4, 2], [7, 2], [4, 3], [7, 3], [4, 4], [5, 4], [6, 4], [7, 4]] },
    { name: 'jacuzzi', tint: 0x2f5a63, floor: 'water',
      cells: [[5, 2], [6, 2], [5, 3], [6, 3]] },
    { name: 'bedroom', tint: 0x4a3a52, floor: 'carpet',
      cells: [[1, 6], [2, 6], [1, 7], [2, 7]] },
    { name: 'kitchen', tint: 0x4a4227, floor: 'tile',
      cells: [[6, 5], [7, 5], [6, 6], [7, 6], [6, 7], [7, 7]] },
    { name: 'living room', tint: 0x4a3527, floor: 'wood', cells: [] },
  ],

  /* Furniture. A piece may cover several squares; `axis` says which way it runs.
     Tables, plants and the television are the kinds nobody may stand on — a
     house rule, not a level choice. A jacuzzi is water you may stand in. Two
     touching tables are drawn as one table, and a bed is always two squares. */
  furniture: [
    { kind: 'table', cells: [[2, 1]] },
    { kind: 'table', cells: [[3, 1]] },
    { kind: 'plant', cells: [[1, 3]] },
    { kind: 'plant', cells: [[2, 4]] },
    { kind: 'plant', cells: [[3, 2]] },
    { kind: 'plant', cells: [[4, 6]] },
    { kind: 'plant', cells: [[5, 4]] },
    { kind: 'bed', cells: [[1, 7], [2, 7]], axis: 'x' },
    { kind: 'table', cells: [[1, 6]] },
    { kind: 'chair', cells: [[3, 6]] },
    { kind: 'chair', cells: [[5, 6]] },
    { kind: 'chair', cells: [[6, 1]] },
    { kind: 'chair', cells: [[7, 3]] },
    { kind: 'rug', cells: [[4, 7]], axis: 'x' },
    { kind: 'tv', cells: [[5, 5]] },
    { kind: 'table', cells: [[6, 7]] },
    { kind: 'table', cells: [[7, 7]] },
    { kind: 'jacuzzi', cells: [[5, 2], [6, 2], [5, 3], [6, 3]] },
  ],

  /* The one answer, square by square. The checker tests it against every
     statement in the level (node test/murdoku.level.mjs); add --unique if you
     want the machine to prove no other layout fits. */
  solution: { A: [6, 6], B: [5, 2], C: [7, 3], D: [2, 7], E: [3, 5], F: [1, 1], V: [4, 4] },

  /* The seven. `rule` is one statement from the vocabulary — or several, and
     then all of them have to hold — see RULES below. Colours are the coat, skin
     and hair; `style` is short, halflong, long or updo. Exactly one person is
     the victim, and their rule is `leftover`. */
  people: [
    { id: 'A', name: 'Alain', colour: 0x9a7346, skin: 0xd8b49a, hair: 0xb8b4ab, style: 'short', glasses: true,
      clue: 'Was next to a table', hint: 'hij stond naast een tafel', rule: { beside: 'table' } },
    { id: 'B', name: 'Ben', colour: 0x4c7f68, skin: 0xdfc0a2, hair: 0x5a3a24, style: 'short', beard: true,
      clue: 'Was in the fifth column', hint: 'hij was in de vijfde kolom', rule: { column: 5 } },
    { id: 'C', name: 'Caroline', colour: 0x86557a, skin: 0xd9b193, hair: 0xd8bd7a, style: 'halflong',
      clue: 'Was on a chair', hint: 'zij zat op een stoel', rule: { on: 'chair' } },
    { id: 'D', name: 'Dafne', colour: 0xb5713a, skin: 0xb07a52, hair: 0xc26a28, style: 'halflong', glasses: true,
      clue: 'Lay on a bed', hint: 'zij lag op een bed', rule: { on: 'bed' } },
    { id: 'E', name: 'Ellie', colour: 0x5f6a90, skin: 0x8a5a3c, hair: 0x4a2c1a, style: 'long', glasses: true,
      clue: 'Was not beside a plant', hint: 'zij stond niet naast een plant', rule: { notBeside: 'plant' } },
    { id: 'F', name: 'Falco', colour: 0x7a4a44, skin: 0xc9a27f, hair: 0x3b2a1e, style: 'short', glasses: true,
      clue: 'Was in the backyard, not next to a plant', hint: 'hij was in de achtertuin, niet naast een plant',
      rule: { in: 'backyard', notBeside: 'plant' } },
    { id: 'V', name: 'Violet', colour: 0x8c3a34, skin: 0xc9a27f, hair: 0xb0aca4, style: 'halflong', glasses: true, victim: true,
      clue: 'Lay in the last cell left over, with one other person in that room',
      hint: 'zij lag in het laatst overgebleven vak', rule: { leftover: true } },
  ],
};
