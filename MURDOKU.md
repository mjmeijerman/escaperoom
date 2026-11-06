# Murdoku — the garden house

A murdoku in a room you can walk through. `murdoku.html`, single file, three.js vendored, no build step, no network.

Seven people, forty-nine squares, six rooms and a body on the terrace. The floor *is* the puzzle: every guest has to
be put where their statement says they were, and the grid is checked as you go.

Run: `docker compose up --build -d`, then <http://localhost:8080/murdoku.html>. The start card lists the rooms —
**the garden house** (7 × 7), **the country house** (6 × 6, the first one), **the restaurant at sea** (9 × 9, with
shelves and a sea) and **the lost ruins** (9 × 9, in the jungle) — and `?level=<id>` opens any of them directly. In the house, the **rooms** button in the top bar opens the same list at any time, with a tick on
every case you have closed. After the murderer is revealed, **next room** appears in the banner and takes you to the
first room you have not finished.

A room is a file: `murdoku/levels/garden.js`, `country.js`, `restaurant.js`, listed in `murdoku/levels/index.js`. The engine and the
rules are all in `murdoku.html`; adding a room is dropping a file next to the others and one line in the manifest, so
the file never grows the way one room per page would.

How a level is written — the rules, the vocabulary, the file format and the checklist for a new house — is in
[`MURDOKU-RULEBOOK.md`](MURDOKU-RULEBOOK.md). The level itself is one `LEVEL` object in `murdoku.html`, and
`node test/murdoku.level.mjs` solves it by brute force and refuses anything that does not have exactly one answer.

---

## The house

Coordinates are **C**olumn then **R**ow. C1 is the west edge, R1 the north.

```
        C1        C2        C3        C4        C5        C6        C7
  R1 │ back  │ back  │ back  │ ter   │ ter   │ ter   │ ter   │
  R2 │ back  │ back  │ back  │ ter   │ jac   │ jac   │ ter   │
  R3 │ back  │ back  │ back  │ ter   │ jac   │ jac   │ ter   │
  R4 │ liv   │ liv   │ liv   │ ter   │ ter   │ ter   │ ter   │
  R5 │ liv   │ liv   │ liv   │ liv   │ liv   │ kit   │ kit   │
  R6 │ bed   │ bed   │ liv   │ liv   │ liv   │ kit   │ kit   │
  R7 │ bed   │ bed   │ liv   │ liv   │ liv   │ kit   │ kit   │
```

- **backyard** — C1R1 … C3R3, the three-by-three in the top left corner (9 squares)
- **terrace** — the top four rows of C4 and C7, plus C5R1, C5R4, C6R1, C6R4: a ring round the jacuzzi (12)
- **jacuzzi** — C5R2, C5R3, C6R2, C6R3 (4), the water cut out of the middle of the terrace
- **bedroom** — C1R6, C2R6, C1R7, C2R7 (4)
- **kitchen** — C6R5, C7R5, C6R6, C7R6, C6R7, C7R7 (6)
- **living room** — the other fourteen squares

The house is exactly the grid: its own walls stand on the grid's edge on the west, north and east, and the hall is
a strip behind its own wall on the south, so no room bleeds into a margin of bare floor.

**No doors. No windows.** The walls are closed runs and the east wall is unbroken — there is no window square in this
level at all, so the `at: window` statement is not in play and the house builds no glass. Every room is closed in by
a knee-high part-wall that runs unbroken along its boundary, and **every wall carries the name of the room behind
it**, so each room is named wherever you stand. The walls are scenery — all of them — so you walk straight through
them, and from the hall into the corridor. Nothing in the house is allowed to make a square unreachable.

**Each face of a wall wears the colour of the room behind it.** One wall is a green hedge on the garden side and
beige plaster on the living-room side, and the house's own outer wall is hedged on the garden stretch and plain
toward the corridor. The material follows the floor of the room: **grass → hedge**, **stone or water → a stone
parapet**, everything else → **plaster**. All of them are the same knee-high height, so from the corridor you look
straight into the garden and can see what you are doing while you park someone.

Round that house runs a **corridor, 1.8 m wide**, closed in by the building's outer shell. Its floor carries the
grid's own lines out to the outer wall — painted pale, so they read as chalk marks and not as more grid — and each
band between two of them is numbered at the far end: `ROW 1` … `ROW 7` down the west and east sides, `COLUMN 1` …
`COLUMN 7` across the north and through the hall. Stand a guest in a band and they are beside that line of the grid.

### Floors

Every room is painted in the stuff it is made of: the garden is **grass** (blades, patches, bare earth in the
corners), the terrace is **flagstone**, the jacuzzi is **water**, the bedroom is **carpet**, the kitchen is **tile**
and the living room is **floorboards**. One canvas per kind, one material per kind, and the grid's own joints run
between the squares so the puzzle stays legible from above.

### Furniture

| Piece | Squares |
| --- | --- |
| table | C2R1 + C3R1 (one long garden table) |
| table | C1R6 (the bedroom) |
| table | C6R7 + C7R7 (one long kitchen table) |
| plant | C1R3, C2R4, C3R2, C4R6, C5R4 |
| bed | C1R7 + C2R7 (one bed, two squares long) |
| chair | C3R6, C5R6 (living room), C6R1, C7R3 (terrace) |
| rug | C4R7 |
| television | C5R5 |
| jacuzzi | C5R2, C5R3, C6R2, C6R3 — a basin of water 0.72 m deep, with the rim at 0.78 |

A chair seat stands 0.39 m up and a bed's surface 0.60 m: both are where a rigged guest can actually reach, so nobody
is left sitting with their feet in the air (see the poses below).

Three things the house decides itself, whatever the level data says:

- **touching tables are one table** — two in a row, three in a row, or three with a corner: one continuous top, with a
  leg at every outside end;
- **a bed is always two squares long** — the engine refuses a level that says otherwise;
- **a television never faces a wall, and neither does a chair** — both turn their back to the nearest wall and look at
  the open side of their room, and the guest sitting down faces the way the chair does. A chair may face a window.

Everything in the house can be jumped onto: the floor query takes whatever is under you, and the jump clears the
tallest thing in the room (the television at 1.35 m). The ceiling is a ceiling — your head stops under it, so you can
jump onto the furniture but not through the roof.

### Water

A jacuzzi is furniture you may stand in; a room whose floor is `water` — the sea in the restaurant, the rivers in the
ruins — is the same thing everywhere in the room. The surface is see-through: a guest put down there is sunk so that
only their head is above the water, and the rest of them is visible through it. A victim found there is the one
exception — a body may lie under the water altogether. A cross is drawn on the water and the joints between the
squares are painted on it. The camera can still walk through it (the sea floor is the floor).

### The jacuzzi

The jacuzzi is furniture you may stand in. A guest placed on one of its four squares stands on the bottom of the tub,
0.66 m up, with the water at 0.72 — so their feet are just under the surface and the rest of them is seen through the
clear water, as if they were standing in a hot tub. The name plate floats above the water, the crosshair can still
pick them up, and a cross on that square is drawn on the water.

---

## Poses

A guest is not a marker. Each is a rig — hips, a torso, a head, two arms with
elbows, two legs with knees — and the square decides how they hold themselves:

- **on a chair** they sit: hands on their knees, leaning back with their legs out,
  knees wide with their elbows on them, knees up with their arms round them,
  cross-legged, turned sideways, elbows on the knees, hands behind the head, or
  with their legs crossed at the knee. The hips are pinned to the seat and the coat
  rides up, so the hem sits well above the seat instead of hanging through it; the
  chair is low-backed and set back, so a leaning back never puts a shoulder or a
  coat through the wood. There is no "sat backwards" pose: with a solid backrest
  the thighs would have to pass through it.
- **on a bed** they lie: on their back with their hands behind their head, curled
  on their side, starfished, on their stomach propped up on their elbows, kneeling,
  or cross-legged on the cover. A lying pose is turned along the bed — head at the
  pillow — and dropped onto the mattress.
- **in the water** they swim: treading water with their arms sculling, or flat out
  on the surface doing the front crawl, the backstroke or the breaststroke. Only the
  head is left above the surface (a victim may lie under it altogether), and the
  see-through water shows the rest of them. Nothing is clipped.
- **anywhere else** they stand, or do something while standing: hands out, waving,
  one leg up, a handstand, arms up, leaning, a hand at their chin, pointing,
  crouching, arms crossed, hands behind the back, hands on the hips, stretching,
  hands behind the head, sitting cross-legged on the floor, kneeling, curled up,
  flat out — eighteen in all, and nine for sitting and nine for lying down.

Every joint is a hinge that only closes one way: a knee folds back, an elbow folds
forward, and no shoulder or hip is asked for more than it can reach. No pose can
put a limb where a body cannot.

In the hall every guest simply stands up straight, and someone in your arms holds
that same posture — the fancy poses are for the house.

The pose is picked from the guest and the square (a stable hash, so the same square
always gives the same pose), and then the figure is *settled*: its own bounding box
is dropped until the lowest point rests on the floor, the seat or the mattress.
Nothing sinks into a bed and nothing hangs through a chair; a seated guest whose
feet would go through the floor is lifted until they don't.

The body is the exception: she is dead, so she never stands, and she has a set of
poses of her own — flat on her back, on her side with her knees drawn up, face
down, or sprawled with one arm above her head; slumped forward over her knees or
thrown back against the backrest if she is on a chair (and then her head is on the
floor beside it); lying on the bed if she is on the bed. Like everyone else she is
settled onto whatever is under her, so a body never floats: an arm that would hold
her up is tucked in instead.

In the hall every guest faces the house — which is to say, you, when you turn
round to look at them — while inside the grid they simply face the room.

---

## The case

| | Statement |
| --- | --- |
| **Alain** | was next to a table |
| **Ben** | was in the fifth column |
| **Caroline** | was on a chair |
| **Dafne** | lay on a bed |
| **Ellie** | was not beside a plant |
| **Falco** | was in the backyard, not next to a plant |
| **Violet** | lay in the last square left over |

Rules, as implemented:

1. one person per square;
2. one person per **column** and one person per **row** — a line can never hold two of them;
3. nobody stands on a square that has been crossed out, on a **table**, on a **plant** or on the **television**;
4. every statement has to be true of the person it belongs to (a statement may be two clauses, and then both hold);
5. the victim has no statement of her own — she takes whichever square the rest leave free, which with rows and
   columns both in play is exactly one square;
6. nobody is the murderer until the grid is full: **the killer is the one who shared the body's room**, and the
   body's room has to hold exactly two people.

Furniture you cannot stand on: the five tables (C2R1, C3R1, C1R6, C6R7, C7R7), the five plants (C1R3, C2R4, C3R2,
C4R6, C5R4) and the television (C5R5). Beds, chairs, carpets and the jacuzzi are fair game — the case itself puts Dafne on
a bed and Ben in the water. Those ten squares take no cross either: a cross marks a square you have ruled out for a
person, and you cannot rule out a square nobody could stand on in the first place. A cross that *is* allowed is drawn
on top of whatever is there — on the bed, on the carpet, on the water, on the bare floor — so it can be seen.

"Next to" counts the four squares beside it — never a corner, and never through a wall: the neighbour has to be in
the same room. So Ellie standing in C3R5 is beside the chair in C3R6, and Falco in C1R1 is beside the garden table in
C2R1 but *not* beside the plant in C1R3 (it is one square further, and out of his row).

### The cast

Everyone in the house is a person, not a marker: a body, a head, eyes, a mouth, and hair that says who they are.

| | Who | Hair | Face |
| --- | --- | --- | --- |
| **Alain** | man | short, grey | sunglasses |
| **Ben** | man | brown | brown beard and moustache |
| **Caroline** | woman | shoulder-long, blond | — |
| **Dafne** | woman | shoulder-long, orange | glasses |
| **Ellie** | woman | long, brown | sunglasses |
| **Falco** | man | short, neat, brown | sunglasses |
| **Violet** | woman (the body) | shoulder-long, grey | glasses, eyes shut, flat on the terrace in her own blood, her head a little away from her shoulders — all of it inside one square |

The colours are in the data (`PEOPLE` carries `skin`, `hair`, `style`, `glasses`, `beard`), so a new cast is a new
table. The styles are short, shoulder-long, long, updo, bob, cropped, balding and bald. **The looks are the house's, not the spec's**: the seven are mixed so they can be told apart at a glance, and
only a clue that names somebody ("the woman with grey hair") makes a hairstyle part of the puzzle.

### The solution

```
A Alain      C6R6   kitchen      (next to the table in C6R7)
B Ben        C5R2   jacuzzi      (fifth column, in the water)
C Caroline   C7R3   terrace      (on the chair there)
D Dafne      C2R7   bedroom      (on the bed that is not next to the table)
E Ellie      C3R5   living room  (beside the chair in C3R6, no plant next to her)
F Falco      C1R1   backyard     (no plant next to him)
V Violet     C4R4   terrace      (the last square left over)
```

It is the only layout that fits. Put one person per row and per column over the forty-nine squares and exactly one
survives: the plant in C3R2 takes the squares beside a plant out of play, which is what pins Ellie and Falco; Ben is
in the water in column 5, Dafne on the one bed, Caroline on the terrace chair in C7R3, Alain in the kitchen beside
C6R7. That leaves row 4 and column 4 for the body: **C4R4**.

**The murderer is Caroline.** The terrace holds exactly two people — Caroline in C7R3 and Violet in C4R4 — so nobody
else was out there with the body. When the grid is full the camera steps onto C7R4, the square beside her toward the
body, and turns to face her: a knife appears in her hand — steel with a bright edge, a brass guard and a dark
handle, the blade still wet — held upright in the fist, so it can never end up through a wall — and the banner says
so. The deduction is kept out of the placement puzzle on purpose: the grid tells you where everyone was, and the
murderer is the *reading* of that answer, not another square to fill.

---

## Playing it

| Input | Action |
| --- | --- |
| `W A S D` / arrows | walk (`Shift` to hurry) |
| `Space` | jump — high enough to land on anything in the house, the television included |
| mouse | look (click to capture, `Esc` to release) — yaw first, so turning never rolls the room |
| `E` | pick a guest up, put them down on the square you are looking at, read the case file |
| `F` | cross a square out (or clear it again); a cross goes on the bed, the carpet or the water if there is one, and a square nobody could stand on refuses one |
| `Q` | put the guest in your arms back in the hall |
| `I` | the notes: every statement, ticked or crossed as you place people, and whether rows and columns are still clean. Each guest gets a colour of their own (the colour of their coat) and a line for where they are now, so the seven are told apart at a glance — no description of how they look, you are standing in the same room as them |
| `H` | een hint in het Nederlands: wie er nog staat, welke verklaring niet klopt, of dat Violet met precies één ander in een kamer moet |
| `R` | everyone back to the hall, every mark gone (after the case closes: play again) |

### On a phone

The house opens on a phone too. There is no pointer lock and no keyboard, so the same actions move to the screen:

- a **stick** in the bottom left corner to walk; push it further to walk faster,
- **one finger on the scene** to look — drag to turn, and a *tap* uses whatever the crosshair is on, so picking
  someone up is a tap, not a tap-then-tap-someone-else,
- **six buttons** bottom right: `E` use, `↑` jump, `▤` notes, `↩` put back, `✗` mark a square, `?` hint.
- the notes open as one solid sheet that stops above the buttons, and they carry their own reset at the bottom,
  because a phone has no `R`.

The keyboard legend disappears, toasts are capped at two so they cannot crawl over the buttons, and the crosshair
prompt says `tap` instead of `E`. Reaching into the notes does not steal the screen: picking someone up redraws them
but never throws them open.

Room plaques read like the case file: look at one and the tray names the room and lists its squares, so the grid is
always legible even when a rug is over the floor paint.

### The hall and the corridor are scratch paper

The hall floor and the corridor round the house are free space, and they are not part of the puzzle. Carry a guest
out there, look at the floor and put them down anywhere it is not already occupied: they stand where you left them,
face the house, the notes say *set down outside the grid*, and the row rule, the column rule and the case all ignore
them. All four sides of the grid are fair — park a row's worth against the north wall, a column's worth down the
west corridor, or a pair in the hall — so if you have worked out that a column belongs to two people, line them up
beside it and let the notes keep the rest. Pick one up and drop them on a square to make it a real placement; `R`
puts everyone back on their plinth. A spot in the grid, in a wall, on a plinth, or closer than a body's width to
another guest is refused.

Carrying a guest: `E` on them, walk to the square, look at the floor and `E` again — or just click. The person
in your arms floats between you and the floor, so the crosshair looks straight past them; and if it finds nothing at
all, a click puts them down on the square they are floating above, which the prompt names before you do it. While you
carry someone the tray at the bottom left repeats what they said, so you do not have to open the notes to check
whether this square is the one their statement wants. The note pad on the right ticks a
statement as soon as that person stands somewhere that fits it, so the puzzle is legible while you work — a tick is
true, a cross is a lie, a dot is nobody placed yet.

The house is always honest: it tells you which room and which square you are standing in (top right), the crosshair
names whatever it is resting on, and the case file — hung on the outer wall of the corridor, where you stand while
you work — is the same text as the notes. `H` gives a hint in Dutch — who is still in the hall, which statement does
not fit, or that the body has to share her room with exactly one other person — and it never names a square outright.

---

## Building notes

- One file, `murdoku.html`, no assets: floors, room names, the case file and the name plates are all canvas textures.
- The engine is one file and the rooms are one file each: `murdoku/levels/index.js` imports them into `LEVELS`, and
  `murdoku.html` picks one by `?level=` (or the first in the list) and builds the floor, the case file and the notes
  from it. Adding a room is a new file plus one import; the engine never changes. The statements are written in a small vocabulary (`in`, `on`, `beside`, `notBeside`, `column`,
  `row`, `at`, `leftover`) rather than as functions, which is what lets `node test/murdoku.level.mjs` read the level
  without a browser and solve it: see `MURDOKU-RULEBOOK.md`.
- `?test` exposes `window.__murdoku` (place, lift, checkWin, the sets of furniture squares) for
  `test/murdoku.browser.cjs`, which walks the whole case: the rooms, the furniture, carrying a guest, crossing a
  square out, the solution that closes it, a plaque read off the wall, a walk straight through a part-wall to prove
  it is scenery, the furniture nobody may stand on, the closed wall count, that this house has no window and its east
  wall is unbroken, a plaque on every wall face, the outer shell standing on the grid's edge, and that every piece of
  furniture is something you can stand on — plus a jump that clears the television, a head that stops at the ceiling,
  and a crosshair that names what it is on even when the thing is made of several parts, the row rule, "next to"
  being the square beside you in the same room, the murderer's deduction, the knife in their hand, the camera
  stepping onto the square in front of them, every one of the seven looking the way the cast list says, the rooms
  being separate files behind one manifest, a closed case ticked off and the next unfinished room offered, the
  rooms list in the top bar, more than one chair, plant and table variant in the house, the victim's
  head off her shoulders, a Dutch hint from `H`, and seven guests in the notes each with their own colour — plus a
  cross landing on a bed, on a carpet and on the floor, a table refusing a cross, a guest sitting on a chair with
  their hips at the seat and their feet on the floor, a guest laid on a bed rather than in it, a guest stood on the
  floor, several poses per surface, someone lying on a bed still easy to pick up, a carried guest dropped while
  standing in the way of the floor and dropped blind on the square under them, everyone in the hall standing up
  straight while the body does not, the same posture in your arms, no chair pose that sinks into the seat, and no
  joint bent the wrong way — knees folding back and elbows forward in every pose, the dead lying on the surface they
  are on rather than floating above it, the house facing the corridor, a guest parked free on all four sides of the
  grid (off the grid, worth neither a row nor a column, unable to close the case, pickable again, and droppable there
  with a click), a corridor you can walk round the house, the house's own walls knee-high so the rooms stay visible
  from it, floor lines and numbers for all seven rows and seven columns out in the corridor, and a knife that stands
  up in the murderer's hand instead of through a wall, the merged tables and the two-square bed, a wall green on the
  garden side and plaster on the other, no chair, shelf or television looking at a wall, a chair and a television
  beside each other facing each other, not one sitting pose (the body's included) putting a limb or a coat through the
  chair, the first house still standing on `?level=country` with its own answer, and its window still see-through
  (125 checks).
- `test/murdoku.level.mjs` is the level on its own, without a browser: it reads the `LEVEL` block out of the page and
  tests the answer the level carries against every statement, the row and column rule, the squares nobody may stand
  on and the victim's room. `--unique` adds a brute force over every layout with one person per row and per column
  (25.4 million for a 7 × 7 house) and insists no other answer fits. That is the gate a new level has to pass, and the
  deployment workflow runs it. See `MURDOKU-RULEBOOK.md`.
- `test/murdoku.mobile.cjs` is the same house at 390 x 844 with a touch screen: the phone layout, the stick moving the
  camera, a dragged finger turning it, a tap picking a guest up while a drag does not, all six buttons, the notes as a
  sheet that stops above them, and their own reset (26 checks). Run it the same way, with
  `node test/murdoku.mobile.cjs`.
- The case is unique, not just solvable: with rows, columns and strict adjacency exactly one layout survives, and the
  victim's square falls out of it. `test/murdoku.level.mjs` checks that by brute force over the forty-nine squares —
  every way of putting seven people in seven columns and seven rows — and with `--unique` it insists that answer is
  the only one.
- A second case is one more file in `murdoku/levels/`, imported by its `index.js`: rooms, furniture, people and the
  answer. The engine — the grid, the walls, the plaques, the carrying, the reveal — is generic, and the size is the
  level's own (`size: 7` here, `size: 6` in the country house that came first).
- **There is more than one of everything.** A house picks a variant per piece, taking turns through its kind:
  four chairs (panel back, three rails, armchair, rocking chair), four plants (bush, palm, cactus, topiary), four
  televisions (set on a cabinet, flat panel on a stand, old set on legs, console with rabbit ears), three beds (plain,
  framed with a headboard, four-poster), three tables (long, round on a pedestal, a desk with drawers) and four
  shelves (bookcase, wardrobe, dresser, display cabinet) for the rooms to come. Each room starts the round at its own
  place, so two houses do not show the same furniture. Every variant keeps the same footprint and still reads as its
  kind: the seat height, the pillow, the pot, the screen, the books and the table top are all where they were, so a
  clue never depends on which one you are looking at.
- **Touching pieces are one piece** — tables, shelves and carpets alike: an L of three tables in a corner is one
  table with a corner, and a run of three carpet squares is one carpet with a fringe at its real ends.
- **The jungle** has its own pieces: crates, trees, bushes, rubble, crocodiles and boats. All but the boat are squares
  nobody stands on; touching bushes are one bigger bush, touching rubble one bigger pile, and two touching boats one
  longer boat. The rivers are `water` rooms, so a guest in one shows only their head.
- **A rug is carpet, not a painted square.** It is a slab with a pile on it — a short flat weave or a deep shaggy one
  — with a woven edge, a fringe at the short ends, and a texture of tens of thousands of fibres so the wool catches
  the light. Four patterns: bordered, round, striped runner, checkered; the deep ones are visibly thicker, and the
  checks stay square because the texture is drawn to the rug's own proportions.
- **The rooms you have closed are remembered** in this browser (`localStorage`), so the rooms list can tick them and
  `next room` can pick an unfinished one. Clearing site data forgets it.
- **A refresh keeps the grid and the room.** The placements, the crosses, anyone set down in the hall and the square
  you were standing on are saved the moment they change, and put back when the page loads — a refresh drops you back
  into the room, not the menu. `R` clears the saved grid with the rest of it.
- **A compass on the walls.** NORTH, SOUTH, EAST and WEST are painted high on the four tall outer walls, so "south of
  Dina" is something you can read off the room rather than guess. The hall — where the guests wait on their plinths —
  is the south side.
- **A statement may look at the rest of the board.** `northOf`, `southOf`, `westOf`, `eastOf`, `withPerson` and
  `onlyOn` are handed the placement as a third argument, so *together in a room with Bianca* or *the only person on a
  tapestry* can be said without breaking the square-by-square rules the rest of the vocabulary uses.
