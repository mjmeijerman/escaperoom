/* One room, one file: the lost ruins, 9 × 9 in the Colombian Amazon. Data only —
   rooms, furniture, people and the answer. The engine and the rules live in
   murdoku.html; the list of rooms is in ./index.js.

   Coordinates here are the engine's: [column, row], R1 north, C1 west. The spec
   was written row-first, so every cell below is its transpose. The south jungle is
   the room written with no squares: it takes what the others leave. */
export default {
  id: 'ruins',
  title: 'the lost ruins',
  size: 9,
  window: null,

  rooms: [
    { name: 'west jungle', tint: 0x2f4a26, floor: 'jungle', cells: [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3], [2, 3], [3, 3], [1, 4], [2, 4], [3, 4], [4, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [1, 6], [3, 6], [4, 6], [5, 6], [1, 7], [4, 7], [5, 7], [4, 8]] },
    { name: 'camp', tint: 0x5a4630, floor: 'dirt', cells: [[2, 6], [2, 7], [3, 7], [1, 8], [2, 8], [3, 8], [4, 8], [1, 9], [2, 9], [3, 9], [4, 9]] },
    { name: 'main river', tint: 0x2f5a63, floor: 'water', cells: [[3, 1], [4, 1], [3, 2], [4, 2], [5, 2], [4, 3], [5, 3], [6, 3], [5, 4], [6, 4], [6, 5], [7, 5], [6, 6], [7, 6], [6, 7], [7, 7], [6, 8], [7, 8], [6, 9], [7, 9], [5, 8], [5, 9]] },
    { name: 'east jungle', tint: 0x35502a, floor: 'jungle', cells: [[5, 1], [6, 1], [6, 2], [7, 2], [7, 3], [7, 4], [8, 4], [9, 4], [9, 5]] },
    { name: 'ruins', tint: 0x5a5a50, floor: 'ruins', cells: [[7, 1], [8, 1], [9, 1], [8, 2], [9, 2], [8, 3], [9, 3]] },
    { name: 'river branch', tint: 0x2a5560, floor: 'water', cells: [[8, 5], [8, 6], [9, 6], [9, 7]] },
    { name: 'south jungle', tint: 0x2b4524, floor: 'jungle', cells: [] },
  ],


  furniture: [
    { kind: 'crate', cells: [[2, 1]] },
    { kind: 'crate', cells: [[1, 8]] },
    { kind: 'tree', cells: [[5, 1]] },
    { kind: 'tree', cells: [[1, 3]] },
    { kind: 'tree', cells: [[2, 4]] },
    { kind: 'tree', cells: [[1, 6]] },
    { kind: 'tree', cells: [[5, 7]] },
    { kind: 'tree', cells: [[4, 8]] },
    { kind: 'tree', cells: [[8, 9]] },
    { kind: 'bush', cells: [[7, 2]] },
    { kind: 'bush', cells: [[2, 3]] },
    { kind: 'bush', cells: [[3, 4]] },
    { kind: 'bush', cells: [[8, 4]] },
    { kind: 'bush', cells: [[3, 6]] },
    { kind: 'rubble', cells: [[7, 1]] },
    { kind: 'rubble', cells: [[9, 1]] },
    { kind: 'rubble', cells: [[8, 2]] },
    { kind: 'rubble', cells: [[9, 3]] },
    { kind: 'boat', cells: [[3, 2]] },
    { kind: 'boat', cells: [[9, 7]] },
    { kind: 'boat', cells: [[6, 9]] },
    { kind: 'crocodile', cells: [[4, 2]] },
    { kind: 'crocodile', cells: [[5, 4]] },
    { kind: 'crocodile', cells: [[3, 5]] },
    { kind: 'crocodile', cells: [[6, 7]] },
    { kind: 'bed', cells: [[2, 7], [3, 7]], axis: 'x' },
    { kind: 'bed', cells: [[2, 9], [3, 9]], axis: 'x' },
  ],

  /* column, row */
  solution: { A: [9, 6], B: [8, 3], C: [3, 2], D: [1, 9], E: [2, 7], F: [4, 5], G: [6, 1], H: [5, 8], V: [7, 4] },

  people: [
    { id: 'A', name: 'Aitana', colour: 0x8a4a6a, skin: 0xc9a07a, hair: 0x2a1a12, style: 'long',
      clue: 'She was in the river branch', hint: 'zij was in de zijrivier', rule: { in: 'river branch' } },
    { id: 'B', name: 'Benito', colour: 0x4c7f68, skin: 0xb07a52, hair: 0x3a2a1a, style: 'balding', beard: true,
      clue: 'He was in the ruins', hint: 'hij was in de ruïnes', rule: { in: 'ruins' } },
    { id: 'C', name: 'Carmen', colour: 0x9a7346, skin: 0xd8b49a, hair: 0x15151a, style: 'bob', glasses: true,
      clue: 'She was the only person on a boat', hint: 'zij was de enige op een boot', rule: { onlyOn: 'boat' } },
    { id: 'D', name: 'Dulcinea', colour: 0x86557a, skin: 0xd9b193, hair: 0xc26a28, style: 'halflong',
      clue: 'She was beside a crate', hint: 'zij stond naast een kist', rule: { beside: 'crate' } },
    { id: 'E', name: 'Estefania', colour: 0x5f6a90, skin: 0x8a5a3c, hair: 0x4a2c1a, style: 'updo',
      clue: 'She was on a bed', hint: 'zij lag op een bed', rule: { on: 'bed' } },
    { id: 'F', name: 'Fritz', colour: 0x7a4a44, skin: 0xc9a27f, hair: 0xcfcfcf, style: 'crop', glasses: true,
      clue: 'He was beside a crocodile', hint: 'hij stond naast een krokodil', rule: { beside: 'crocodile' } },
    { id: 'G', name: 'Gonzalo', colour: 0x8a8750, skin: 0x6e4a34, hair: 0x15151a, style: 'short', beard: true,
      clue: 'He was in either the east jungle or the south jungle, beside a tree',
      hint: 'hij was in de oost- of zuidjungle, naast een boom',
      rule: { in: ['east jungle', 'south jungle'], beside: 'tree' } },
    { id: 'H', name: 'Hernan', colour: 0x5a6a7a, skin: 0x9a6a4a, hair: 0x5a3a24, style: 'crop',
      clue: 'He was south of Victoria', hint: 'hij was ten zuiden van Victoria', rule: { southOf: 'V' } },
    { id: 'V', name: 'Victoria', colour: 0x8c3a34, skin: 0xc9a27f, hair: 0xb0aca4, style: 'bob', glasses: true, victim: true,
      clue: 'Lay in the last cell left over, with one other person in that room',
      hint: 'zij lag in het laatst overgebleven vak', rule: { leftover: true } },
  ],
};
