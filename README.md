# Escape rooms in a browser

Two first-person 3D escape rooms, no build step, no CDN, no network calls — three.js is vendored.

- `/` — **the Founders' Chamber**, a wizarding room where every lock is a *spell you draw with the mouse*. Four charms, four digits.
- `/edo.html` — **the Edo Room**, a Japanese room of the Edo period. Four puzzles, four digits, two of them reading kanji.
- `/index.html` — **the Locked Study**, the original room. Three digits.
- `/pcdoc.html` — **PC Doctor**, a repair shop with a shrink ray. Work in progress: the generator, the shrink, the
  case interior and the memory chain are playable (see `PC-DOCTOR.md`).

## Run

```sh
docker compose up --build -d
```

Open http://localhost:8080 (the Founders' Chamber), /edo.html, /index.html (the Locked Study) or /classic.html (the point-and-click version of the study).

Stop with `docker compose down`.

Without compose:

```sh
docker build -t escaperoom .
docker run -d -p 8080:80 --name escaperoom escaperoom
```

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows | Walk (`Shift` to hurry) |
| Mouse | Look (click to capture, `Esc` to release) |
| `Ctrl` (hold) | Raise the wand: four charms, a pad to trace on |
| `1` – `4` | Pick a charm while the wand is up |
| Mouse | Trace the charm's movement on the pad, then release Ctrl |
| `E` | Act on what you are looking at: set the dial, turn the door wheels |
| `↑` `↓` `←` `→` | The dial and the wheels (they no longer walk you around) |
| `E` | Act on what you are looking at |
| `Space` | Jump (needed once you are 17 mm tall) |
| `I` | The workshop notepad: items, fault codes, found characters |
| `Q` / right mouse button | Let go: drop a cable, stop turning a winch, back out of the padlock (`Esc` belongs to the browser) |
| `M` | Music off / on — effects keep playing |
| `N` | All sound off / on |
| `H` | A hint for the next unsolved thing |
| `M` | Music only: off / on, effects untouched |
| `N` | Everything: off / on |
| `R` | Walk it again, once you are out |
| Esc | Release the mouse / lower the wand |

Every charm is cast the same way: **hold `Ctrl`, pick a charm, trace its movement with the mouse, release**. The
movement is what counts, not the speed, and the charm lands on whatever the crosshair is pointing at. Any charm can
be tried on anything — the wrong one just does nothing. There are no dialogs: the clue you are looking at lives in a
corner tray, so the room, and whatever a charm just moved in it, stays on screen.

Touch devices get a d-pad, a USE button and drag-to-look.

## The Founders' Chamber

Four sealed things, four charms, four digits, and a door with four brass wheels. The tapestry on the west wall gives
the order the door wants them in.

Any charm can be tried on any object; each object answers to exactly one of them. The order the door wants is woven
into the tapestry on the west wall.

| Charm | Movement | Opens | The deduction |
| --- | --- | --- | --- |
| Alohomora | a closed loop | the glass cabinet | a balance: nine stones against five, moved one at a time |
| Flipendo | a zigzag | the cracked arch | the plaque counts the letters of the charm that broke the stone |
| Lumos | one stroke upward | the blind niche | a numeral cut backwards into a mirror |
| Wingardium Leviosa | a swish, then a flick up | the glass cloche | the founders' banners, added up |

<details>
<summary>Spoiler: solution</summary>

1. Balance: 9 against 5, moving one stone changes both pans → **2**.
2. FLIPENDO has eight letters → **8**.
3. The mirror cuts a 5 backwards → **5**.
4. 3 + 2 + 4 + 0 banners → **9**.
5. Tapestry order — *the lock, the stone, the light, the feather* — so the wheels read `2859`.

</details>

## The Edo room

Four objects each hide one digit; the north door wants them in the order the sidebar lists them.

| Object | Kanji | The deduction |
| --- | --- | --- |
| Folding screen | 屏風 | stroke count of 東 |
| Soroban on the low table | 算盤 | beads pushed against the bar |
| Two hanging scrolls | 掛軸 | 四 + 五 |
| Votive plaque | 絵馬 | position of 寅 in the 十二支 chart |

The sidebar keeps every digit found, so nothing relies on memory. `H` gives a hint for the next unsolved object.

<details>
<summary>Spoiler: solution</summary>

1. 東 is eight strokes → **8**.
2. One upper bead (5) and two lower beads (2) → **7**.
3. 四 (4) + 五 (5) → **9**.
4. 寅 (tiger) is third of the twelve → **3**.
5. Door wheels, 屏風 first, 絵馬 last → `8793`.

</details>

## The Locked Study

Six things to inspect: painting, clock, rug, desk, bookshelf, door. The sidebar keeps every clue and found number, so nothing relies on memory. The crosshair turns gold when something is in reach. `H` gives a hint, `C` lists the controls.

Each number is a deduction, not a label on a wall:

- the painting states the room's rule;
- the clock must be read upside down;
- the tin box opens in the painter's order;
- the desk sums the clock and the canvas;
- the wall safe hides behind a number sequence, and holds the door's order.

The door keypad wants three digits in the order *time · shelf · wood*.

<details>
<summary>Spoiler: solution</summary>

1. Painting → scratched rule: *"Time is upside down in this room."* Also points you at the rug.
2. Rug → move it, take the brass key.
3. Clock → remove the cloth. Hands at 10:10. Upside down that reads 4:50 → **4**.
4. Bookshelf → note: the box opens in the painter's order, highest in the picture first (moon → sky → hill). Press **amber, blue, green**. The slip inside says to count the books with a red ribbon → **2**.
5. Desk → key opens the lower drawer. Note: the hour on the clock less the colours on the canvas → 10 − 3 → **7**. The blotter has a strip of numbers: 1, 2, 4, 7, 11, ? — gaps of 1, 2, 3, 4, so the next is **16**.
6. Wall safe (south wall) → `16`. Inside: the door's order, *time, shelf, wood*.
7. Door keypad → `427`.

</details>

## PC Doctor

A one-man repair shop at dusk. The full player's manual is `PLAY.md` — controls, staged nudges, and a collapsible
solution.

A one-man repair shop at dusk. Gerrit is at the wholesaler, his answering machine has a message for you, and the
customer's tower on the bench is in a bad way.

Slice 1, playable now:

0. **Start the shift** — the button starts the timer, wakes the shop, and plays Gerrit's voicemail.
1. The shop starts dark. The torch lies on the counter in front of you, its battery LED blinking green.
2. The generator is in the back yard. Its sticker gives the cold-start order: fuel cock **open**, choke **closed**,
   three pulls on the cord (grab it with `E` and drag back). Get the order wrong and it floods — three squeezes of the
   primer bulb to recover.
3. With the lights on, the shrink ray works: stand on the painted **SHRINK RAY · STAND IN THE RING** line, look at
   the tripod and `E` the big red handle. The tray tells you whether the interlock is happy. Nothing in the case can
   be touched while you are 1.6 m tall — the crosshair ignores hardware until you are inside it.
4. You are 17 mm tall on the workbench. The case is a building with the side panel off; the motherboard lies flat
   inside it, because Gerrit tests on an open rig.
5. The two-digit debug display cycles through every fault the board knows about. The manual on the bench names them
   (`C1 d4 A2 F1 b7`).
6. The memory chain: slot A2's module is only loose — push it home. `C1` stays up, so the fault is the other one:
   pull the scorched module out of B2, take the sealed spare labelled **SPARE > B2** from the bag beside the slots,
   seat it. `C1` drops off the display and the module gives up a character — it lands in the notepad on `I`.

Gerrit's voicemail is a real recording: six mp3s in `vendor/voicemail/` (272 KB, generated once with a neural TTS and
shipped as files), played through the game's audio bus so `N` mutes it and `M` does not.

7. **Power routing** (slice 2): the PSU lies in the case with four cable ends. Pick one up, then plug it: the
   test-rig unit has a rocker switch, and the two 8-pin plugs are identical — one says EPS, one says PCIe, and only
   the label tells you which socket it wants. The wiring diagram is on the side panel lying on the bench.
8. **Fans** (slice 2, `F1`): the rear fan's 4-pin is loose by the back wall, the CPU fan's cable is in `SYS_FAN3`
   instead of `CPU_FAN`, and a screwdriver is jammed in the intake. All three turning and `F1` drops out.
9. **The card** (slice 2, `d4`): a graphics card hangs from a hand winch, held by a padlock. The combination is the
   last three digits of the shop number on the case (456). Grab the drum and drag back to lower it, push it into the
   rail, then give it its own 8-pin.

10. **The monitor** (slice 3, `A2`): the monitor's own HDMI cable is coiled on the bench in front of the case. Take
    the loose end, walk around the side and behind the tower, and plug it into the rear panel's HDMI port. The
    monitor on the desk lights up with `PC DOKTER / HDMI 1`, `A2` drops out, and the rear panel gives up an `E`.

Still a stub: the SSD virus (`b7`, slice 4), and the login/finale after it (slice 5).

## Files

- `hogwarts.html` — the Founders' Chamber, with the traced-charm system (served at `/`)
- `edo.html` — the Edo Room (served at `/edo.html`)
- `index.html` — the Locked Study, 3D (HTML, CSS, ES module inline)
- `classic.html` — the original 2D point-and-click room
- `pcdoc.html` — PC Doctor, slice 1 (dark shop, generator, shrink ray, the case interior, the memory chain)
- `PC-DOCTOR.md` — the design bible: story, every fault chain, the finale, the sound design, the decisions
- `test/rooms.mjs` — shell + collision checks for the study, no browser needed (`node test/rooms.mjs`)
- `test/spells.browser.cjs` — headless browser test of the Founders' Chamber: no overlays in the DOM, every charm
  traced with a real mouse at the right target, a wrong charm rejected, all four digits, the door wheels, console errors
- `test/edo.browser.cjs` — headless browser test of the Edo Room: all four puzzles, a rejected answer, the door, console errors

  Both need puppeteer, so they run in the puppeteer image against the running container:

  ```sh
  docker run --rm --network host -v "$PWD":/work -w /work \
    -e NODE_PATH=/home/pptruser/node_modules \
    ghcr.io/puppeteer/puppeteer:latest node test/spells.browser.cjs
  ```

  Swap the last argument for `test/edo.browser.cjs` to test the Edo Room, or `test/pcdoc.browser.cjs` for PC Doctor
  (100 checks: torch, generator order, the flood, the shrink, the display cycling, the memory chain, power routing,
  the twin 8-pins refusing each other, the three fans, the padlock, the winch, the card, the notepad, hardware
  ignoring a full-sized person, the HDMI run to the rear panel, and read-only paper not offering a lie of an `E`). They write
  `test/.shots/spells.png` and `test/.shots/solved.png`; make that directory writable (`mkdir -p test/.shots && chmod 777 test/.shots`) or Puppeteer cannot save it as `pptruser`.
- `vendor/three.module.min.js` — three.js r160 (MIT, license in `vendor/THREE-LICENSE.txt`)
- `vendor/voicemail/*.mp3` — Gerrit's six recorded lines, generated once and shipped as files
- `Dockerfile` / `nginx.conf` — nginx:alpine static serving, gzip, healthcheck
- `docker-compose.yml` — port 8080

Add `?debug=1` to the URL to expose internals for testing: `window.__room` in the study (`state`, camera, actions,
`ROOMS`, `blocked`), `window.__edo` in the Edo Room (`state`, `PUZZLES`, `CODE`, the panel functions), and
`window.__wizard` in the Founders' Chamber (`state`, `CHARMS`, `SHAPES`, `matchScore`, `openWand`, `castCharm`,
`unlockProp`, the tray functions, and `aim(x, z, yaw)` to stand somewhere and look until something is in reach).

## Adding a room

The room shell is data. Declare a rectangle and it gets a floor, ceiling, walls,
baseboards, picture rail and collision, and doorways are cut automatically:

```js
const library = room({
  id: 'library', name: 'The Library',
  x0: -5, x1: 0, z0: -10, z1: -4,
  doors: [{ side: 'north', at: -2.5, width: 1.4 }],   // matches the study's door
  obstacles: [new THREE.Box3(new THREE.Vector3(...), new THREE.Vector3(...))],
  props: (scene, r) => { /* meshes, then interactive(mesh, 'id', 'the thing') */ }
});
```

`side` is `north` / `south` / `east` / `west`; `at` is the centre of the opening
on that wall's own axis. Two rooms that share a wall each need the matching
doorway at the same `at`, or you get a wall with a hole behind it.

Adding a prop needs no wiring past `interactive()`: the prompt label comes from
the third argument, and a new `ACTIONS.<id>` function handles the interaction.
Obstacles are plain `THREE.Box3` in world space. Run `node test/rooms.mjs`
after touching either, then reload the page to check it visually.
