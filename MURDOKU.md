# Murdoku — the country house

A murdoku in a room you can walk through. `murdoku.html`, single file, three.js vendored, no build step, no network.

Six people, thirty-six squares, five rooms and a body in the hall. The floor *is* the puzzle: every guest has to be
put where their statement says they were, and the grid is checked as you go.

Run: `docker compose up --build -d`, then <http://localhost:8080/murdoku.html>.

---

## The house

Coordinates are **C**olumn then **R**ow. C1 is the west edge, R1 the north.

```
        C1      C2      C3      C4      C5      C6
  R1 │ logeer │  bad   │  bad   │  bad   │ keuken │ keuken │
  R2 │ logeer │  bad   │  bad   │  bad   │ keuken │ keuken │
  R3 │ logeer │ groot  │ groot  │ groot  │ keuken │ keuken │
  R4 │ logeer │ groot  │ groot  │ groot  │ woon   │ woon   │
  R5 │ logeer │ logeer │ woon   │ woon   │ woon   │ woon   │
  R6 │ logeer │ logeer │ woon   │ woon   │ woon   │ woon   │
```

- **logeerkamer** — C1R1 … C1R6, C2R5, C2R6 (8 squares)
- **badkamer** — C2R1, C2R2, C3R1, C3R2, C4R1, C4R2 (6)
- **grote slaapkamer** — C2R3, C2R4, C3R3, C3R4, C4R3, C4R4 (6)
- **keuken** — C5R1, C5R2, C5R3, C6R1, C6R2, C6R3 (6)
- **woonkamer** — the other ten

The house is exactly the grid: the outer walls stand on the grid's edge on the west, north and east, and the hall is
a strip behind its own wall on the south, so no room bleeds into a margin of bare floor. The window is let into the
east wall at C6R4.

No doors. Every room is closed in by a knee-high part-wall (1.3 m, the height of the television) that runs unbroken
along its boundary, and **every wall carries the name of the room behind it** — so the living room alone has a
`WOONKAMER` plaque on each of its seven partitions plus one facing the hall, and each of the other rooms is likewise
named wherever you stand, and the outer walls carry the name of the room behind them as well. A plaque is hung as
low as the wall allows and rides *above* the furniture when there is a table, a plant or a bed against that wall, so
nothing is left unlabelled.
The walls are scenery: they have no colliders, so you walk straight through them. The grid is the puzzle, not the
masonry, and nothing in the house is allowed to make a square unreachable.

Everything in the house can be jumped onto: the floor query takes whatever is under you, and the jump clears the
tallest thing in the room (the television at 1.35 m). The ceiling is a ceiling — your head stops under it, so you can
jump onto the furniture but not through the roof.

### Furniture

| Piece | Squares |
| --- | --- |
| bed | C1R1, C1R2 |
| rug | C1R3, C1R4 |
| chair | C4R2 |
| table | C4R3 |
| bed | C2R4, C3R4 |
| rug | C4R4 |
| chair | C3R5 |
| television | C3R6 |
| table | C5R1, C6R1 |
| plant | C5R3 |
| plant | C5R4 |
| window | the east wall, at C6R4 — a casing, four panes and a sill, let into the wall |

---

## The case

| | Statement |
| --- | --- |
| **Alexander** | sat on a bed |
| **Bas** | was in the kitchen |
| **Clarissa** | stood next to a table |
| **Diana** | was next to the television |
| **Elsa** | stood in front of the window |
| **Vladimir** | lay in the last square left over |

Rules, as implemented:

1. one person per square;
2. one person per **column**;
3. nobody stands on a square that has been crossed out, on a **table**, on a **plant** or on the **television**;
4. every statement has to be true of the person it belongs to;
5. the victim has no statement of his own — he takes whichever square the rest leave free.

Furniture you cannot stand on: both tables (C4R3, and C5R1 + C6R1), both plants (C5R3, C5R4) and the television
(C3R6). Beds, chairs and carpets are fair game — the case itself puts Alexander on a bed.

"Next to" counts the eight surrounding squares (so Diana in C4R5 is next to the television in C3R6).

### The solution

```
A Alexander  C1R1   (on the bed)
B Bas        C5R2   (kitchen)
C Clarissa   C3R3   (next to the table in C4R3)
D Diana      C4R5   (next to the television in C3R6)
E Elsa       C6R4   (at the window)
V Vladimir   C2R5   (the last column, and the last square in it)
```

A note on the rules, because it is the one place this room argues with itself. With only clues + *one per column*, a
lot of layouts fit, and the victim could sit anywhere in the leftover column. Add the classic murdoku rule *one per
row as well* and the leftover square becomes exactly **C2R6** — the victim is then forced, which is what "lay in the
last square left over" is supposed to mean. This build implements clues + one per column and accepts the layout
above; if the row rule is turned on later, the victim moves to C2R6 and nothing else changes.

---

## Playing it

| Input | Action |
| --- | --- |
| `W A S D` / arrows | walk (`Shift` to hurry) |
| `Space` | jump — high enough to land on anything in the house, the television included |
| mouse | look (click to capture, `Esc` to release) — yaw first, so turning never rolls the room |
| `E` | pick a guest up, put them down on the square you are looking at, read the case file |
| `F` | cross a square out (or clear it again) |
| `Q` | put the guest in your arms back in the hall |
| `I` | the notes: every statement, ticked or crossed as you place people |
| `R` | everyone back to the hall, every mark gone (after the case closes: play again) |

Room plaques read like the case file: look at one and the tray names the room and lists its squares, so the grid is
always legible even when a rug is over the floor paint.

Carrying a guest: `E` on them, walk to the square, look at the floor and `E` again. The note pad on the right ticks a
statement as soon as that person stands somewhere that fits it, so the puzzle is legible while you work — a tick is
true, a cross is a lie, a dot is nobody placed yet.

The house is always honest: it tells you which room and which square you are standing in (top right), the crosshair
names whatever it is resting on, and the case file on the west wall is the same text as the notes.

---

## Building notes

- One file, `murdoku.html`, no assets: floors, room names, the case file and the name plates are all canvas textures.
- The grid is data (`ROOM_AT`, `FURN`, `PEOPLE` with a `test(c, r)` per statement) and the geometry is generated from
  it, so a new case is a new table and a new set of predicates — not new scenes.
- `?test` exposes `window.__murdoku` (place, lift, checkWin, the sets of furniture squares) for
  `test/murdoku.browser.cjs`, which walks the whole case: the rooms, the furniture, carrying a guest, crossing a
  square out, the solution that closes it, a plaque read off the wall, a walk straight through a part-wall to prove
  it is scenery, the furniture nobody may stand on, the closed wall count, the window's place in the east wall, a
  plaque on every wall face, the outer shell standing on the grid's edge, and that every piece of furniture is
  something you can stand on — plus a jump that clears the television, a head that stops at the ceiling, and a
  crosshair that names what it is on even when the thing is made of several parts (45 checks).
- Known gap, deliberate for a first case: the checker accepts the layout above but not a *unique* one — see the note
  on the row rule. A second case should either turn the row rule on or drop the "leftover square" statement.
