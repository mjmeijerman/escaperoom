# Murdoku — the rulebook

A house is a level, and the file holds several of them. This is the book they are built from, so that the next one
is a table of data and an afternoon, not a new game.

Read this with `MURDOKU.md` open: that file is the story of the houses that ship, this one is the specification every
house has to satisfy.

## 0. Working from a spec

The level data **as it was given is the spec**. Never change a square, a piece of furniture, a column, a name or a
clue to make the puzzle fit, and never drop a piece because it is inconvenient: a plant that is not in the engine's
list is still in the room. Write the spec down exactly, run the checker, and if it does not close, **say so and ask**
— the answer is often that a piece was misread, not that the spec is wrong. Two examples from the garden house: the
missing plant in C3R2 was the only thing that made the puzzle have ten answers instead of one, and the fix was to put
the plant back, not to rewrite Ellie's and Dafne's statements.

**Looks are not part of the spec.** Hair, glasses, skin, beard and coat colour are the house's own choice and should be
mixed so the cast is told apart; only when a clue names somebody ("was next to the woman with grey hair") do those
details become spec and have to be written down. The hairstyles on offer are short, shoulder-long, long, updo, bob,
cropped, balding and bald — enough to make eight people look like eight people.

### The spec sheet

The quickest way to hand a level over is four lines in this shape — ranges, not every square, and no prose:

```
house   7x7, no window                       (or: window 6,4)
rooms   backyard 1-3,1-3 | terrace 4,1-4 7,1-4 5,1 5,4 6,1 6,4 | jacuzzi 5-6,2-3
        bedroom 1-2,6-7 | kitchen 6-7,5-7 | living =
pieces  table 2,1 3,1 | plant 1,3 2,4 3,2 4,6 5,4 | bed 1-2,7 | chair 3,6 5,6 6,1 7,3
        rug 4,7 | tv 5,5 | jacuzzi 5-6,2-3
clues   A next to a table | B column 5 | C on a chair | D on a bed | E not beside a plant
        F in the backyard + not next to a plant | V leftover
answer  A6,6 B5,2 C7,3 D2,7 E3,5 F1,1 V4,4
```

- `1-3,1-3` is a block, `4,1-4` is a column of four, `5-6,2-3` is two by two; `=` means the rest room.
- a piece is written once per group: `2,1 3,1` is the two-square table the house will draw as one.
- `+` in a clue is the comma in the sentence: every part has to be true.
- the answer uses the ids from the clues.

---

## 1. What a level is

A square floor ruled *N* × *N* — six by six in the house that shipped first, seven by seven in the garden house,
and any size a level declares — divided into rooms, with furniture standing on some of the squares. *N* people on the
floor:

- one person per **square**,
- one person per **column** and one per **row** — so the *N* of them sit in *N* different columns and *N* different
  rows, and no two ever share a line,
- every living person stands on a square where **their own statement is true**,
- one of them is the **victim** and has no statement: they take the one square the other *N* − 1 leave over,
- the victim's room must hold **exactly two people**. The other one is the murderer.

That is the whole game. Everything else — the house, the corridor, the poses, the knife — is dressing that every
level gets for free.

---

## 2. The board

Coordinates are **C**olumn then **R**ow: C1 is the west edge, R1 the north. A square is written `C3R5`.

### Rooms

The rooms are a partition of the *N*² squares: every square belongs to exactly one room, and a room is whatever
shape you like as long as it is contiguous. One room is written with no squares of its own and takes **every square
the others leave over** — that is how you avoid writing all *N*² numbers twice.

A room whose floor is `water` — a sea, a river, a pool — is water you may stand in, everywhere in the room. The
surface is **see-through**: a guest put down there is sunk so that **only the head is above the water**, and the
rest of them is seen through it — and they swim there: treading water, front crawl, backstroke, breaststroke. Only
the victim may lie under the water altogether. A cross on that square is drawn on the water, and the joints between the squares are
painted on the surface so the grid still counts. A boat moored in it **floats**; a crocodile lies with the top half
of its body above the surface.

A wall is **two-sided**. Each face takes the material of the room behind it — `grass` rooms get a hedge, `stone` and
`water` rooms a stone parapet, everything else plaster — so one wall can be green on the garden side and beige on the
living-room side. The house's own outer wall works the same way: the garden side is hedged, the corridor side plain.

Colour is per room (`tint`, a hex number), and each room also names its **floor** in `style`, one of `grass`,
`stone`, `wood`, `carpet`, `tile` or `water`. The house draws that surface under every square of the room and the
grid's joints between them, so the garden is lawn and the kitchen is tiled without the puzzle becoming invisible.
The walls between two rooms take their material from what they stand between: a hedge along the garden, a stone
parapet where the terrace meets the house, plaster between two indoor rooms.

### Furniture

A piece covers one or more squares. Six kinds exist, and the house knows how to draw all of them:

| kind | squares | what it does |
| --- | --- | --- |
| `bed` | any run, with `axis: 'x'` or `'z'` | a body is laid along it, head at the pillow; in a `dirt` or `jungle` room it is a camp bed — crossed poles, canvas, a sleeping bag, built to the same height as any other bed |
| `chair` | one | somebody sits on it, in one of six ways |
| `rug` | any run | carpet; it changes nothing but what a cross is drawn on |
| `table` | any run, with `axis` | **nobody stands on it** |
| `plant` | one | **nobody stands on it** |
| `tv` | one | **nobody stands on it** |
| `jacuzzi` | a rectangular block | water you **may** stand in: the guest stands on the bottom of the tub, seen through the surface, head clear |
| `shelf` | one or a run, with `axis` | a bookcase, wardrobe, dresser or display cabinet; **nobody stands on it** and it turns its back to a wall |
| `crate` | one | a crate; **nobody stands on it** |
| `tree` | one | a jungle tree; **nobody stands on it** |
| `bush` | one or a run | bushes; **nobody stands on it**, and touching ones are one bigger bush |
| `rubble` | one or a run | a collapsed wall; **nobody stands on it**, and touching ones are one bigger pile |
| `boat` | one or a run | a hollow rowing boat you **may** stand in, with an inner face on its planking, thwarts and an oar; everything sits inside the hull, nothing pokes through it; it floats on water and rests on the ground otherwise; two side by side are one longer boat |
| `crocodile` | one | **nobody stands on it** |

A square may carry only one piece. Tables, plants and the television are the squares nobody may stand on, and they
take no cross either: a cross marks a square you have ruled out for a person, and you cannot rule out a square
nobody could stand on in the first place. That is a house rule, not a level choice. A jacuzzi is the exception the
other way: it is water, not a surface, so a person may stand in it and a cross on it is drawn on the water.

Three more house rules the engine applies without being asked, because a room has to look like a room:

- **touching pieces are one piece.** Tables, shelves and carpets: two in a row, three in a row, three with a corner —
  one continuous top, one bookcase, one carpet, drawn run by run so an L is an L. A level writes the squares; the
  house joins them.
- **a bed is always two squares long.** A bed group of any other length is an error. The corner of the bedroom that
  says "a bed" twice is one bed.
- **a television never faces a wall, and neither does a chair or a shelf.** Each turns its back to a wall and looks
  at the open side of its room, and a guest sitting on a chair faces the way the chair does. A chair may face a
  window — and a chair and a television beside each other face each other, because that is what they are for. A shelf
  faces across its run, never along it.
- the joints between squares are drawn **on the water too**, so a jacuzzi is still a countable 2 × 2 (or whatever
  shape it is) and not one blue rectangle.
- **every kind has more than one look** — four chairs (a panel back, three rails, an armchair, a rocking chair), four
  plants (a bushy pot, a palm, a cactus, a topiary), four televisions (a set on a cabinet, a flat panel on a stand, an
  old set on legs, a console with rabbit ears), three beds (plain, framed, four-poster), three tables (long, round on
  a pedestal, a desk with drawers) and four shelves (bookcase, wardrobe, dresser, display cabinet); the jacuzzi comes
  tiled or in wood. The house takes turns through them, and each room starts the round at its own place so two houses
  do not show the same furniture.
- **a rug is carpet** — a slab with a short or a deep pile, a woven edge and a fringe, in four patterns (bordered,
  round, striped, checkered). It is drawn as fabric, never as a painted square, and touching carpets are one carpet. The level names the kind and the squares; which variant stands
  there is not level data, and no clue may depend on it, so every variant keeps the kind's footprint, seat height,
  pillow, pot and screen where the others have them.

### The window

`window: [c, r]` is one square of the grid. The house opens the wall beside it: the wall runs below the window and
over it, and the thin glass sits in the gap — see-through, so the room and the corridor on the other side are visible
through it, whichever side you stand on. It is a rule in the vocabulary (`{ at: 'window' }`), and because it is one square it is worth exactly one
placement. **A level may have no window at all** (`window: null`): then the east wall is one unbroken run, no glass is
built, and the `at` statement cannot be used.

### The corridor

Outside the house runs a corridor with the grid's lines carried out to the wall and a number on each band. It is
where guests are parked off the grid as a note to yourself (`ROW 4`, `COLUMN 2`, …). It is never part of the puzzle:
the notes, the rows, the columns and the case all ignore anyone standing there.

---

## 3. The case

*N* people, one for every column of the grid. Exactly one is the victim.

The victim's statement is always `leftover`: *lay in the last square left over*. With one person per row and per
column, five placements leave exactly one column and one row free, so the victim's square is forced — and the house
checks that their room holds exactly one other person, which is the murderer. A level where the victim could share
their room with two people, or none, is unsolved as far as the case is concerned: the game will not close.

*N* − 1 statements have to pin the other *N* − 1 people. That is the whole design problem.

---

## 4. The rule vocabulary

A statement is one entry from this table. The engine compiles it into a test on a square.

| verb | argument | true when | example clue |
| --- | --- | --- | --- |
| `in` | a room name, or a list of names | the square is in that room (or in one of them) | *Was in the kitchen* / *Was in either the east or the south jungle* |
| `on` | a furniture kind | that piece of furniture covers the square | *Sat on a bed* |
| `on` | a furniture kind | that piece covers the square | *Sat on a chair* |
| `notOn` | a furniture kind | the opposite of `on` | *Was on the terrace, not sitting* |
| `beside` | a furniture kind | an **orthogonally** adjacent square, **in the same room**, is covered by a piece of that kind | *Stood next to a table* |
| `notBeside` | a furniture kind | the opposite of `beside` | *Was not next to a plant* |
| `column` | a number 1 … *N* | the square is in that column | *Was in the fifth column* |
| `row` | a number 1 … *N* | the square is in that row | *Was in the third row* |
| `at` | `'window'` | the square is the window square | *Stood in front of the window* |
| `northOf` | a person id | that person is in a lower row (R1 is north) | *Was north of Dina* |
| `southOf` | a person id | that person is in a higher row | *Was south of Dina* |
| `westOf` / `eastOf` | a person id | the same, along the columns | *Stood west of Fabrice* |
| `withPerson` | a person id | the square is in **the same room** as that person | *Was together in a room with Bianca* |
| `onlyOn` | a furniture kind | the square is on that piece **and nobody else is** | *Was the only person on a tapestry* |
| `leftover` | — | always true; the victim's rule, and only theirs | *Lay in the last square left over* |

`beside` is deliberately strict: the four squares up, down, left and right — never a corner — and the piece must be
in the same room as the person, so a wall is never seen through. *Next to* in a clue always means this.

A statement may be **two rules at once**, and then a square has to make all of them true:
`{ on: 'bed', notBeside: 'table' }` is *lay on a bed, not next to a table*, and `{ in: 'backyard', notBeside: 'plant' }`
is *was in the backyard, not next to a plant*. That is how a clue with a comma in it is written; it also sharpens a
level that would otherwise have two answers.

Rules are statements, so they are tested per square and never against each other. A rule may not say *was the only
one*, *was with X*, or anything else about the rest of the board: the victim's room rule is the only interaction,
and it belongs to the engine.

---

## 5. The level block

**One room, one file**: `murdoku/levels/garden.js`, `murdoku/levels/country.js`, … Each exports one object:

```js
export default { id, title, size, window, rooms, furniture, people, solution };
```

and `murdoku/levels/index.js` lists them:

```js
import garden from './garden.js';
import country from './country.js';
export const LEVELS = [garden, country];
```

That manifest is the whole registry: the first entry is the room that opens without a parameter, the rest are the
buttons on the start card, the **rooms** overlay in the top bar, and `?level=<id>` in the URL. A new house is a new
file plus one import line — never a replacement for an old one, and never a reason for `murdoku.html` to grow.

Nothing outside these files is level data. It is JavaScript, not JSON, so colours can be written `0x4a3a52` and any
line may carry a comment. `test/murdoku.level.mjs` imports the manifest and checks **every** level in it.

### Fields

| field | meaning |
| --- | --- |
| `id` | the house's name in the URL: `?level=garden`, `?level=country` |
| `title` | the house's name; the start card and the browser title use it |
| `size` | *N*: the grid is *N* × *N* and there are *N* people. Defaults to 6 if absent |
| `window` | `[c, r]` — the square the window is beside (the wall opens there), or `null` for a house with no window |
| `rooms[]` | `{ name, tint, floor, cells }`; `floor` is `grass`, `stone`, `wood`, `carpet`, `tile` or `water`; `cells: []` on exactly one room means "every square the others leave" |
| `furniture[]` | `{ kind, cells, axis? }`; `axis` is `'x'` or `'z'` and only matters for beds and tables. A bed is two squares; touching tables are drawn as one |
| `people[]` | exactly *N*, exactly one with `victim: true` |
| `solution` | `{ id: [c, r] }` for all of them — the one answer, which the checker tests |

A person is:

| field | meaning |
| --- | --- |
| `id` | one character, used to name the plate and the visuals |
| `name` | as it appears on their plate and in the notes |
| `colour`, `skin`, `hair` | hex numbers: coat, skin, hair |
| `style` | `short`, `halflong`, `long`, `updo`, `bob`, `crop`, `balding` or `bald` |
| `glasses`, `beard` | booleans, optional |
| `clue` | the English statement, as the case file prints it; a capital and a full stop |
| `hint` | the Dutch hint `H` gives, lowercase, no full stop |
| `rule` | one entry from the vocabulary, e.g. `{ on: 'bed' }` — or several, and then all must hold |
| `victim` | `true` on exactly one of them; their rule is `{ leftover: true }` |

The six colours should be told apart at a glance — they are also the colours of the coat and the entry in the notes.

---

## 6. Making a new level

1. **Draw *N* by *N* on paper.** Mark the columns and rows; the puzzle lives on those lines.
2. **Cut the rooms.** Two to five rooms, each contiguous, plus the rest room. Rooms are weak statements (a
   fourteen-square room allows fourteen squares), so back each one up with furniture or a second clause.
3. **Name each room's floor.** Grass for the garden, stone for the terrace, boards, carpet, tiles, water. It costs one
   word per room and the house looks like a place instead of a diagram. A hedge or a parapet follows from it.
4. **Stand the furniture.** It is what makes statements sharp: `on` pins a square to a bed or a chair, `beside` gives
   a ring of at most four squares around a piece. Remember a table, a plant and the television take their square out
   of play entirely; a jacuzzi does not, and is a square you may stand in.
5. **Choose the window, or choose none.** One square is worth one placement and reads beautifully in a clue; a house
   with no window is a house with one statement fewer.
6. **Write the statements** — aiming for one very sharp (`on`/`at`), two or three medium (`beside`, `in` a small
   room, a `column`) and one that mostly shapes the remainders. A clue with a comma in it is two rules in one object.
7. **Add the victim** with `{ leftover: true }` and a clue like *lay in the last square left over, with one other
   person in that room*.
8. **Write the answer down** in `solution`, one square per id. You are the one who knows it; the level carries it so
   the checker can test every statement against the square you meant.
9. **Write the object to its own file** in `murdoku/levels/` and add it to the import list in
   `murdoku/levels/index.js`. Nothing in `murdoku.html` changes, and the houses already there keep working.
10. **Play it:** `docker compose up --build -d`, hard refresh, walk the house.

Before step 10, **run `node test/murdoku.level.mjs`**. It checks that your solution has one person per row and per
column, that every statement is true of the square you gave, that nobody stands on a table, and that the victim
shares their room with exactly one other person. Hand it a path (`node test/murdoku.level.mjs draft.html`) to try a
level before you paste it into the house.

If you ever want the machine to prove that no *other* layout fits as well — worth doing when a level feels too
easy — add `--unique`: it then brute-forces every layout with one person per row and per column (518,400 for a 6 × 6
house, 25.4 million for a 7 × 7 one) and insists yours is the only one.

### If the checker complains

| it says | it means |
| --- | --- |
| *unknown rule* | the `rule` key is not in the vocabulary — see §7 |
| *every statement is true of the square the solution gives: FAIL* | the solution and a statement disagree — fix one of them |
| *one person per column and one per row: FAIL* | two people share a line in `solution` |
| *the victim shares that room with exactly one other person: FAIL* | nobody, or two, with the body — the case does not close |
| *every rule gets an argument the level actually has: FAIL* | the room or furniture kind named in a rule does not exist in this level |
| *and no other layout fits at all: FAIL (2+ found)* | only with `--unique`: the level is under-constrained — sharpen a statement, add a second clause to one, or add furniture for a `beside` to bite on |

Two answers is the common failure, and it usually means one statement is a restatement of another. The fix is almost
never a new rule: it is one more piece of furniture for a `beside` to point at, or a room cut in two.

---

## 7. Extending the rulebook

A new level sometimes wants a sentence no existing rule can say — *sat with her back to the fire*, *was not in the
hall*, *stood at the head of the table*. Adding it is one entry and a paragraph:

1. **Write the test** in the `RULES` table in `murdoku.html`, between the RULES markers, in the same shape: it takes
   its argument and the context, and returns `(c, r) => boolean`.

   ```js
   const RULES = {
     …,
     column: (n) => (c) => c === n,
     notBeside: (kind, ctx) => (c, r) => !ctx.beside(c, r, kind),
   };
   ```

2. **Give the solver the same context.** If the rule needs something the context does not carry (the fire, a door,
   the head of a table), add it to `ruleCtx` in `murdoku.html` *and* to `ctx` in `test/murdoku.level.mjs`, from level
   data — never a constant.
3. **Declare what its argument is** in `RULE_ARGS` in `test/murdoku.level.mjs` (`'room'`, `'furniture'`, `'line'`,
   `'window'`, a new kind, or `null`), so the checker can validate a level that uses it.
4. **Document it in the table in §4**, with the example clue that goes with it.
5. **Run the checker** on the shipped level: adding a rule must not change any existing answer.

A rule may look at the other people, but only through the board the engine hands it as the third argument:
`(c, r, board)`, where `board` is `{ id: [c, r] }` for everyone placed so far. The `…Of`, `withPerson` and `onlyOn`
words are built that way, and a rule that ignores the third argument is tested on its square alone, exactly as
before. A rule may still never depend on a number the level does not declare.

---

## 8. What is never level data

The engine gives every level, free of charge, and none of it belongs in the block:

- the house shell, walls, corridor, plinths, plaques and the case-file board;
- the rigs and poses: standing on the floor, sitting on a chair, lying on a bed, the four dead poses;
- the settlement of a pose onto the seat, the mattress or the floor, so nothing floats or sinks;
- the crosses, and the rule that a table, a plant and the television take none;
- carrying a guest, parking them off the grid, the notes, the hints and the murder reveal;
- remembering the grid between visits (placements, crosses, guests set down in the hall) **and the square you stood
  on**, so a refresh drops you back into the room instead of the menu;
- the compass: NORTH, SOUTH, EAST and WEST painted high on the four outer walls, so a clue that says "south of" can be
  read off the room itself;
- the knife, which is held upright so it can never point through a wall.

A level changes the board and the six statements. If a level wants to change anything in that list, it is the
rulebook being extended, not the level — §7.

---

## 9. The houses that ship

Four, one file each in `murdoku/levels/`, listed in its `index.js`. Without a parameter you get the garden house;
`?level=country`, `?level=restaurant` and `?level=ruins` open the others.

### the garden house — `murdoku/levels/garden.js`

```js
id: 'garden'
title: 'the garden house'
size: 7
window: null

rooms     backyard     C1R1…C3R3 (the three-by-three in the corner)   floor grass
          terrace      C4R1…C4R4, C5R1, C5R4, C6R1, C6R4, C7R1…C7R4    floor stone
          jacuzzi      C5R2, C5R3, C6R2, C6R3                          floor water
          bedroom      C1R6, C2R6, C1R7, C2R7                          floor carpet
          kitchen      C6R5, C7R5, C6R6, C7R6, C6R7, C7R7              floor tile
          living room  the other fourteen                              floor wood
furniture table C2R1+C3R1 · plant C1R3 · plant C2R4 · plant C3R2 · plant C4R6 · plant C5R4
          bed C1R7+C2R7 (x) · table C1R6 · chair C3R6 · chair C5R6
          chair C6R1 · chair C7R3 · rug C4R7 · television C5R5
          table C6R7+C7R7 · jacuzzi C5R2+C6R2+C5R3+C6R3
people    Alain      beside table
          Ben        column 5
          Caroline   on chair
          Dafne      on bed
          Ellie      notBeside plant
          Falco      in backyard AND notBeside plant
          Violet     leftover
```

```
A Alain      C6R6   kitchen      (beside the table in C6R7)
B Ben        C5R2   jacuzzi      (fifth column, in the water)
C Caroline   C7R3   terrace      (on the chair there)
D Dafne      C2R7   bedroom      (on the one bed)
E Ellie      C3R5   living room  (not beside a plant)
F Falco      C1R1   backyard
V Violet     C4R4   terrace      ← the murderer is Caroline: two in that room
```

```js
solution: { A: [6, 6], B: [5, 2], C: [7, 3], D: [2, 7], E: [3, 5], F: [1, 1], V: [4, 4] }
```

That is the spec exactly as it was given: five plants, the plants in C1R3, C2R4, C3R2, C4R6 and C5R4, the clue
wording untouched. With the plant in C3R2 in place the statements give exactly one answer; leave it out and the same
statements give ten, which is the whole reason not to "fix" a clue instead.

### the country house — `murdoku/levels/country.js`

```js
id: 'country'
title: 'the country house'
size: 6
window: [6, 4]

rooms     logeerkamer   C1R1…C1R6, C2R5, C2R6
          badkamer      C2R1, C2R2, C3R1, C3R2, C4R1, C4R2
          grote slaapkamer  C2R3, C2R4, C3R3, C3R4, C4R3, C4R4
          keuken        C5R1, C5R2, C5R3, C6R1, C6R2, C6R3
          woonkamer     the other ten
furniture bed C1R1+C1R2 (z) · rug C1R3+C1R4 · chair C4R2 · table C4R3
          bed C2R4+C3R4 (x) · rug C4R4 · chair C3R5 · television C3R6
          table C5R1+C6R1 (x) · plant C5R3 · plant C5R4
people    Alexander  on bed
          Bas        in keuken
          Clarissa   beside table
          Diana      beside tv
          Elsa       at window
          Vladimir   leftover
```

```
A Alexander  C1R1   logeerkamer        (on the bed)
B Bas        C5R2   keuken
C Clarissa   C3R3   grote slaapkamer   (beside the table in C4R3)
D Diana      C4R6   woonkamer          (beside the television in C3R6)
E Elsa       C6R4   woonkamer          (at the window)
V Vladimir   C2R5   logeerkamer        ← the murderer is Alexander: two in that room
```

```js
solution: { A: [1, 1], B: [5, 2], C: [3, 3], D: [4, 6], E: [6, 4], V: [2, 5] }
```

### the lost ruins — `murdoku/levels/ruins.js`

```js
id: 'ruins'
title: 'the lost ruins'
size: 9
window: null

rooms     west jungle  22 · camp 12 · main river 22 (water) · east jungle 9
          ruins 7 (stone) · river branch 4 (water) · south jungle 5 (the rest room)
people    Aitana     in the river branch          (in)
          Benito     in the ruins                 (in)
          Carmen     the only one on a boat        (onlyOn boat)
          Dulcinea   beside a crate                (beside crate)
          Estefania  on a bed                      (on bed)
          Fritz      beside a crocodile            (beside crocodile)
          Gonzalo    east or south jungle, beside a tree   (in [..], beside tree)
          Hernan     south of Victoria             (southOf V)
          Victoria   leftover
```

```js
solution: { A: [9, 6], B: [8, 3], C: [3, 2], D: [1, 7], E: [2, 9], F: [4, 5], G: [6, 1], H: [5, 8], V: [7, 4] }
```

The rivers are `water` rooms, so a guest put down in one shows only their head. Crates, trees, bushes, rubble and
crocodiles are squares nobody stands on; boats are squares you may stand in, and two touching boats are one longer
boat. The spec was row-first again, so every cell is stored transposed.

### the restaurant at sea — `murdoku/levels/restaurant.js`

```js
id: 'restaurant'
title: 'the restaurant at sea'
size: 9
window: null

rooms     toilet room   1,1-2,3                    floor tile     (written as the rest room)
          dining room   1,4-2,5 + 3,1-5,7           floor wood
          kitchen       1,6-2,9 + 3,8-4,9           floor tile
          terrace       5,8-5,9 + 6,1-7,9 + 8,5-8,7  floor stone
          VIP room      8,1-9,4                     floor carpet
          sea           8,8-9,9 + 9,5-9,7            floor water
people    Alain      on the terrace, not sitting   (in terrace AND notOn chair)
          Bianca     next to a shelf               (beside shelf)
          Courtney   on a chair in the dining room  (on chair AND in dining room)
          Dina       not next to a table           (notBeside table)
          Eugene     in the toilet room            (in toilet room)
          Fabrice    south of Dina                 (southOf D)
          Gianni     together in a room with Bianca (withPerson B)
          Hada       the only person on a tapestry  (onlyOn rug)
          Vera       leftover
```

The spec was written **row first**, so every cell in the file is its transpose: `1,3` in the spec is C3R1 here, and
the body's square `3,5` in the spec is C3R5. The terrace is 23 squares, the sea 7, the dining room 25.

```
A Alain      C9R7   terrace
B Bianca     C7R2   kitchen
C Courtney   C5R4   dining room
D Dina       C4R8   VIP room
E Eugene     C2R1   toilet room
F Fabrice    C1R9   VIP room
G Gianni     C8R3   kitchen
H Hada       C6R6   terrace       (the only one on a carpet)
V Vera       C3R5   dining room   ← the murderer is Courtney: two in that room
```

```js
solution: { A: [9, 7], B: [7, 2], C: [5, 4], D: [4, 8], E: [2, 1], F: [1, 9], G: [8, 3], H: [6, 6], V: [3, 5] }
```

`node test/murdoku.level.mjs` tests every answer against every statement in its level; `--unique` additionally proves
no other layout fits, for all three houses in well under a second (a backtracking search, because a rule that looks at
the board cannot be judged from a line permutation). `test/murdoku.browser.cjs` then
plays the garden house in a browser, and checks at the end that the country house is still there on `?level=country`
and still closes its own case.
