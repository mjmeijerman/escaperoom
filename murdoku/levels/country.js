/* One room, one file: the country. This is only data — rooms,
   furniture, people and the answer. The engine and the rules live in
   murdoku.html; the list of rooms is in ./index.js. */
export default {
  id: 'country',
  title: 'the country house',
  size: 6,
  window: [6, 4],

  rooms: [
    { name: 'logeerkamer', tint: 0x4a3a52, cells: [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 5], [2, 6]] },
    { name: 'badkamer', tint: 0x2f4652, cells: [[2, 1], [2, 2], [3, 1], [3, 2], [4, 1], [4, 2]] },
    { name: 'grote slaapkamer', tint: 0x4a2f43, cells: [[2, 3], [2, 4], [3, 3], [3, 4], [4, 3], [4, 4]] },
    { name: 'keuken', tint: 0x4a4227, cells: [[5, 1], [5, 2], [5, 3], [6, 1], [6, 2], [6, 3]] },
    { name: 'woonkamer', tint: 0x3a2b26, cells: [] },
  ],

  furniture: [
    { kind: 'bed', cells: [[1, 1], [1, 2]], axis: 'z' },
    { kind: 'rug', cells: [[1, 3], [1, 4]], axis: 'z' },
    { kind: 'chair', cells: [[4, 2]] },
    { kind: 'table', cells: [[4, 3]] },
    { kind: 'bed', cells: [[2, 4], [3, 4]], axis: 'x' },
    { kind: 'rug', cells: [[4, 4]] },
    { kind: 'chair', cells: [[3, 5]] },
    { kind: 'tv', cells: [[3, 6]] },
    { kind: 'table', cells: [[5, 1], [6, 1]], axis: 'x' },
    { kind: 'plant', cells: [[5, 3]] },
    { kind: 'plant', cells: [[5, 4]] },
  ],

  solution: { A: [1, 1], B: [5, 2], C: [3, 3], D: [4, 6], E: [6, 4], V: [2, 5] },

  people: [
    { id: 'A', name: 'Alexander', colour: 0x9a7346, skin: 0xd8b49a, hair: 0x9c9c9c, style: 'short', glasses: true,
      clue: 'Sat on a bed', hint: 'hij zat op een bed', rule: { on: 'bed' } },
    { id: 'B', name: 'Bas', colour: 0x4c7f68, skin: 0xdfc0a2, hair: 0xd8c07a, style: 'long', beard: true,
      clue: 'Was in the kitchen', hint: 'hij was in de keuken', rule: { in: 'keuken' } },
    { id: 'C', name: 'Clarissa', colour: 0x86557a, skin: 0xd9b193, hair: 0x4a2c1a, style: 'long',
      clue: 'Stood next to a table', hint: 'zij stond naast een tafel', rule: { beside: 'table' } },
    { id: 'D', name: 'Diana', colour: 0x5f6a90, skin: 0xb07a52, hair: 0x15151a, style: 'halflong',
      clue: 'Was next to the television', hint: 'zij stond naast de televisie', rule: { beside: 'tv' } },
    { id: 'E', name: 'Elsa', colour: 0x8a8750, skin: 0x6e4a34, hair: 0xcfcfcf, style: 'updo',
      clue: 'Stood in front of the window', hint: 'zij stond voor het raam', rule: { at: 'window' } },
    { id: 'V', name: 'Vladimir', colour: 0x8c3a34, skin: 0xc9a27f, hair: 0xa88a4a, style: 'short', victim: true,
      clue: 'Lay in the last cell left over, with one other person in that room',
      hint: 'hij lag in het laatst overgebleven vak', rule: { leftover: true } },
  ],
};
