# PC Dokter — design bible

Single-file three.js room (`pcdoc.html`), same shell as `hogwarts.html`. No assets, no network, no build step.
Target playtime **45–75 min**. Password is the last thing found; six fault chains run in parallel.

---

## 1. The story, and how it is told without overlays

You are a *PC dokter* (repair tech) doing a shift for **Gerrit**, who owns a one-man repair shop. He is at the
wholesaler. A customer's tower is on the bench, half-repaired, and it is in a bad way. Gerrit left instructions.

Every piece of story is a **physical object in the room**. Nothing is narrated by text on screen.

| # | Object | Where | What it delivers |
| --- | --- | --- | --- |
| 1 | **Answering machine** (blinking LED, plays on `E`) | shelf above the bench | Gerrit's voice: the job, the krimpstraal, the generator. `speechSynthesis` in Dutch + subtitle lines on its tiny LCD (readable via the corner tray) |
| 2 | **Intake form** (`werkbon`, paper) | counter | the customer's complaint in her own words: *"hij valt uit, hij piept, geen beeld, en de muis doet raar"* — four of the six faults, in layman's language. The player learns to translate complaints into faults |
| 3 | **Service log book** (A5, handwritten) | counter | three previous visits on this same tower. Last line: *"derde keer terug = nieuwe voeding, niet weer prutsen"*. The twist lives here (see 8) |
| 4 | **The manual**, lying open, laminated | front-left of the bench | the **POST code table** and the **wiring diagram**. Shrunk, you walk across it: the letters are fields, the code table is a wall you read by walking backwards |
| 5 | **Sticky notes** in Gerrit's handwriting | generator, hoist, PSU, mousepad | operating procedures and one bad joke each. These are the room's voice |

The story beats land in this order: *confusion (dark shop) → a job to do (voicemail + werkbon) → competence (codes
decoded) → discovery (inside the machine) → comedy (jumping on a keyboard) → payoff (his sign flickers on)*.

Optional flourish: the voicemail is spoken by the browser (`speechSynthesis`, `nl-NL`, `rate 0.95`). Subtitles always
show in the tray so the room works muted, in any browser, and for deaf players.

---

## 2. Two scales, one scene

One world, one geometry, no second level file. The workshop is built at **real size**. Shrinking changes four
numbers on the player:

```js
const SCALES = {
  human:  { eye: 1.65, speed: 3.2,  jump: 4.4, near: 0.05 },
  shrunk: { eye: 0.017, speed: 0.034, jump: 0.05, near: 0.0006 },
};
```

Consequences, all free:
- the workbench becomes a **plain** you walk across, grain like dunes;
- the tower becomes a **building** with an open side panel you climb into;
- a screwdriver on the bench is a fallen **pillar**; the mug is a **cistern**; dust bunnies are **boulders**;
- the open manual is a **landscape** — the code table is legible *by walking on it*;
- the keyboard is a **plaza** of 3 m keys; the mouse is a **boulder you push**;
- the monitor is a **glowing cliff** you climb to reach the login screen.

Precision is fine: worst case world extent ~20 m at eye height 17 mm → relative float error ~1e-6. Fog, shadow bias and
contact-shadow size scale with `SCALES[k]`. Do not scale the *scene*; scale the *player*.

---

## 3. The bench (map)

```
   back wall ───────────────────────────────────────────────────────────
     generator      shrink ray        TOWER (side panel off)     monitor
     (outside,      on tripod,        │ interior = playfield │     on stand,
      through the   aimed at pad      │   LED POST display   │     screen faces
      back door)                     │   on the far wall    │     the bench
                                   ──┴──────────────────────┴──
     manual       parts bin      keyboard plaza        mouse + pad     mug
   (front-left)   (tub, left)                        (+ mousepad)   (right)
   ─────────────────────── bench edge ─────────────────────────────────
```

Rear of the tower is the **achterkant**: PSU rocker switch, rear I/O (USB), HDMI grommet. One expedition covers four
tasks, so travelling is worth it.

---

## 4. The POST codes (the room's backbone)

A two-digit 7-segment LED on the inside of the case. It **cycles through every unsatisfied code**, one per 2 s. This
single decision is what makes the room asynchronous: the player always sees the whole fault list and picks a fight.

| Code | Manual says | Real fault | Chain |
| --- | --- | --- | --- |
| `C1` | *geheugen niet herkend / defect* | one stick half out, one stick scorched | RAM |
| `d4` | *geen beeld-adapter gevonden* | GPU hangs in a hoist above the slot, 8-pin unplugged | GPU |
| `A2` | *geen monitor gedetecteerd* | HDMI cable coiled in the case basement | monitor |
| `F1` | *thermische fout — ventilatoren* | jammed intake, unplugged exhaust, CPU fan in `SYS_FAN3` | fans |
| `b7` | *opslag fout — bootsector* | the worm in the SSD | virus |
| `--` | *systeem OK* | all five cleared → monitor wakes | finale |

From inside the case the LED panel is **mirrored** (it faces outward). The shiny side-panel interior opposite it acts
as the mirror — the callback to the study's clock puzzle, and it teaches the player to think in reflections early.

Power is not a code: with no 12 V the LED display is dark, so **power routing is the first thing the case demands**.
That is deliberate — the manual's first page is the wiring diagram.

---

## 5. The chains

Each chain ends with `E` on the fixed part: a sticker is read in the tray, and **one character is written into the
shop notepad automatically** (no memory burden). Six chains → six characters → password.

### 5.1 Generator (pre-shrink, story gate)

Dark shop. A torch is in the toolbox (inventory). Through the back door: a generator with a sticker.

> **KOUDE START** — 1. kraan OPEN 2. choke DICHT 3. drie keer trekken 4. choke OPEN

The pull cord is a **drag gesture** (reuse the wand-trace gesture code). Wrong order does not fail the room — it
*coughs*, floods, and needs three squeezes of the primer bulb to reset. Lights come on, the shrink ray console wakes,
the room's sound bed becomes a generator hum. **No character here** — this is the tutorial for "read the sticker,
follow the procedure", which is the whole room in one sentence.

### 5.2 Shrink ray (commit beat)

Console: a scale dial (worn off), a big lever, and a marked pad on the floor. Stand on the pad, pull the lever.
White bloom, thud, you are 17 mm tall on the bench. **No puzzle** — this is the doorway, not the lock. Later the same
console is unreachable (it is 60 storeys up), which is why un-shrinking has to happen from the monitor.

### 5.3 Power routing (enables everything)

Schematic is printed on the **inside of the side panel**, like a real case.

1. Extension strip → PSU (already plugged in — the strip's LED is the only light in the case at first).
2. **PSU rocker** at the rear → the case's standby LED goes amber, a relay *clicks*.
3. **24-pin ATX** → the board (a fat trunk cable you drag; both ends clip).
4. **CPU 8-pin** at the top of the board — the top of the board is a cliff you climb.
5. **PCIe 8-pin** → GPU (only after 5.4), **SATA** → SSD (gate for 5.6).

Wrong header → nothing happens, no penalty, the manual's diagram shows why. Character `A` on the PSU's rail sticker.

### 5.4 RAM — `C1`

Four slots, blue ones first (the manual says so, the board silkscreen repeats it in 20 cm letters). Slot A2 holds a
stick **half out**, its clip open. Slot B2 holds a **scorched** stick with an RMA sticker and a burn mark — the
voicemail's *"hij piept"*.

Do: kick both clips down, drag the half-out stick out (it is a girder), install the **spare from the anti-static bag**
hung on the case rail, then **jump on the stick** to seat it. Both clips snap shut with a click. Wrong (scorched)
stick → `C1` stays and the fans stutter: the manual's margin note covers it (*"C1 blijft? → RMA, andere reep"*).
Character `K`.

### 5.5 GPU — `d4`

The GPU hangs in a **bicycle hoist** bolted to the case ceiling, above the PCIe slot, in an anti-sag harness. The
winch drum is padlocked (`hangslot`, 3 digits). Gerrit's sticky note:

> hangslot = laatste 3 van het zaaknummer (niet vergeten!)

The case's branding sticker on the tower's front says `PC DOKTER GERRIT — 0545-123456`. So `456`.

Do: unclip the padlock, then **walk on the winch drum** to take up slack (a treadmill — walking rotates it, no key
needed), then guide the GPU down the rail with your shoulder while it hangs, into the slot, and it seats with a
*chunk*. Plug the 8-pin. Character `3` on the serial plate.
If the player drops it into the slot before the 8-pin, `d4` clears but a fan whines — fine, no penalty, the manual
says the 8-pin is required for the card to post.

### 5.6 Monitor — `A2`

The top of the case rear has a **grommet**. The HDMI cable lies coiled in the basement. Carry it out the grommet,
across the desk (a long, quiet, vertiginous walk — the floor is 8 storeys down), up the monitor's stand, and into the
HDMI port at the back of the monitor. Plug it and the monitor's standby LED turns blue. Character `7` on the cable
sleeve. This walk is where the player first sees the keyboard and mouse properly, and starts planning the finale.

### 5.7 Fans — `F1`

Three fans, three different mistakes (three separate "aha"s, not one repeated chore):

- **Rear exhaust**: header simply unplugged, 4-pin lying loose. Plug into `CHA_FAN1`.
- **Front intake**: blades jammed by a **fallen screwdriver**. Push it out (it becomes inventory: `schroevendraaier`)
  and the fan free-spins. Gerrit's note: *"nooit met je tengels in een draaiende fan"*.
- **CPU cooler**: a tower heatsink you must climb. Its 4-pin is in `SYS_FAN3`; the board refuses to spin anything
  while `CPU_FAN` is empty. Swap it. The manual: *"F1 blijft? → CPU_FAN moet bezet zijn."*

All three spinning → airflow sound, dust motes drift, `F1` clears. Character `P` on the fan hub.
(The screwdriver is used nowhere else. It is a red herring that *feels* like a tool, which is the joke.)

### 5.8 Virus — `b7`

Power the SSD (SATA from 5.3), then enter it through the **SATA port** like a doorway. Inside: a lattice of glowing
blocks (the sector grid) over a black void, missing sectors = holes to jump.

The worm is a physical creature. It **follows the player** and eats the block you just left. Touching you = the screen
glitches, you are ejected back out of the port, and you climb back in. No other penalty, no timer.

Goal: lure it into the **quarantaine** chamber in the middle of the grid, leave through the small hatch, then pull the
big lever outside. Door slams. The lattice turns green.

Inside the chamber, once sealed: a `LEESMIJ.txt` tablet — the twist (see 8) — and the SSD's label. Character `9`.
Second reason the block grid exists: it teaches platforming on a *safe* surface before the keyboard finale.

### 5.9 Input devices (both required, both must actually work)

Rear I/O, two USB-A plugs taller than you are.

- **Keyboard**: plug in → RGB backlight comes on, a satisfying *whirr*. Its keys are the finale.
- **Mouse**: plug in → its logo LED lights, and the on-screen cursor **jitters wildly**. Cause: the intake form was
  right — *"de muis doet raar"*. The mouse sits on the mousepad; its optical window has a hair and dust in it.
  Take the **compressed air** can from the parts bin, blast the lens, and the cursor becomes smooth. Gerrit's note:
  *"eerst schoonmaken, dan pas zeuren dat het ding stuk is"*. Cheapest real fix in the trade, and the player who has
  ever owned a mouse will laugh.

---

## 6. Finale — the last thing you find

All five codes clear → LED shows `--` → the monitor wakes with a login window:

```
   PC DOKTER — KLANTLOGIN
   ┌────┬────┬────┬────┬────┬────┐
   │ ▤  │ ▮  │ ✳  │ ⬛ │ ▣  │ ▤  │     <- pictogrammen: RAM, PSU, fan, GPU, monitor, SSD
   └────┴────┴────┴────┴────┴────┘
   [________________]                    <- 6 tekens
```

The pictogram row is the **order**. The characters are on the parts:



**Mouse.** The cursor starts top-left of the monitor. Stand against the giant mouse, hold `E`, and drag — the same
drag gesture as the generator cord and the wand. Push the mouse right/forward and the cursor slides across the
monitor; you must watch the far wall while you push. Then jump onto the physical **left button** (a 40 cm plateau) to
click. Cursor over the password field → the field takes focus. Wrong spot → the click lands on the desktop, nothing
breaks.

**Keyboard.** Run up the keyboard's tilt and **jump on the keys**. Each key depresses ~10 cm, clacks, and its
character appears on the monitor. `Backspace` is a wide key at the far end (deliberate: mistakes cost a jog).
`Enter` is the big one on the right. Six jumps: K, A, P, O, T, 9.

Login succeeds → a window: *"WACHTWOORD HERSTELD — KLANT START OP"* with one big button: **KRMSTRAAL TERUGZETTEN**.
Jump on it. White bloom, you are standing on the pad at human scale, next to a working PC and a shop that is now lit.

End banner (in-world, the neon sign): `PC DOKTER — wij maken het weer heel` and Gerrit's voice: *"Keurig werk.
Koffie staat in de keuken."*

---

## 7. Inventory + notepad (the only overlay)

`I` toggles one corner panel styled as **graph paper**, pointer-events free, never covers the centre of the screen.
It is both inventory and notebook, because the room asks the player to hold six characters and no one should hold six
characters.

```
┌ PC DOKTER — werkbon ─────────────┐
│  [zaklamp] [luchtspuit] [schroef]│   <- items, glyph + name, max 6
│  [HDMI]    [wisselgeld]          │
├ AANTEKENINGEN ───────────────────┤
│  RAM ▤   K                       │
│  PSU ▮   A                       │
│  fan ✳   P                       │
│  GPU ⬛  O                       │
│  mon ▣   T                       │
│  SSD ▤   9                       │
│  FOUTCODES: C1 d4 A2 F1 b7       │
└──────────────────────────────────┘
```

Notes are written automatically the moment a character is found. `H` gives a hint for the next *unsolved* thing (repo
convention), and it points at the code the LED is showing, not at a fixed order — so hints respect the async design.

---

## 8. The twist (pure story, no mechanic)

In the SSD's quarantine chamber, `LEESMIJ.txt`:

> **FIXMASTER PRO 2019 — GRATIS VERSIE**
> "Bedankt voor het gebruiken van onze *volledig legale* diagnosetool.
> Wij installeren alleen wat extra's om u te helpen."

And the log book's third entry: *"klant had 'm zelf al 'gerepareerd' met een gratis tool van Marktplaats. Vandaar."*
The player learns the cause two minutes before the end, which is exactly when a repair tech would learn it too.
Ending line on the desktop: *"Tip: volgende keer de dokter bellen vóór de gratis tool."*

---

## 9. Async graph

```
   [ GENERATOR ] -- [ SHRINK RAY ]
                    │
            ====== SHRUNK ======
                    │
        [ PSU ROUTING ]  (rocker, 24-pin, CPU 8-pin)
          │      │      │
      [ RAM ] [FANS] [ SSD+SATA ]        <- any order
          │      │      │
          │      │      └─ [ VIRUS / quarantaine ]
          │      │
          └──────┴── [ GPU DROP ] ── [ HDMI ] ── [ USB kbd+muis ]
                             │
              all 5 codes cleared → [ MONITOR LIVES ]
                             │
                   [ cursor: drag + click ]
                             │
                   [ keyboard: jump 6 keys ]
                             │
                        [ UN-SHRINK ]
```

Rules that keep it async and unbreakable:
- no door is locked behind a single specific chain except the LED display needing power;
- the monitor is the only hard gate, and it needs *all* codes;
- no consumables, no fail states, no timers, nothing can be done in an unrecoverable order;
- every chain's character is on the part itself, so a player who fixes in a weird order still collects everything.

---

## 10. Build notes

Reuse from `hogwarts.html` (nothing new is invented that already exists there):

| Need | Use |
| --- | --- |
| room shell, collision, doorways | `room({...})`, `blocked` |
| look-at prompt, crosshair hot state | `currentTarget()`, `interactive()` |
| gesture (cord pull, winch, mouse drag) | the wand `tracepad` gesture code, generalised |
| reading text in-world without overlays | the `tray` panel |
| textures (grain, paper, PCB, LED panels) | `tex(w,h,draw)` — everything procedural |
| debug hooks + headless test | `?debug=1` → `window.__doctor`; `test/pcdoc.browser.cjs` |

New pieces, in build order:

1. **Scale system** — `SCALES`, player eye/speed/jump/near, fog + shadow scaling, the white-bloom transition.
2. **Workshop shell, human scale** — dark, torch cone, bench, tower as a solid block, answering machine, generator.
3. **Generator** — drag-pull cord, order check with flood/reset, lights on.
4. **Shrink ray + transition**.
5. **Case interior** — board (a landscape: slot ridges, heatsink cliff, header sockets as canyons), LED POST display,
   side-panel schematic.
6. **Chains** in any order; RAM and fans first (cheap, teach the grammar), then GPU + hoist, then HDMI trek, then SSD.
7. **Rear I/O** — PSU rocker, USB, HDMI grommet (one zone).
8. **Monitor + login window** (canvas texture), **mouse drag cursor**, **keyboard plaza** with jump-to-type.
9. **Inventory/notepad**, `H` hints, end banner, sound bed.
10. **`test/pcdoc.browser.cjs`** — screenshots + a full solution run: shrink, power, five faults, cursor, six keys,
    un-shrink, zero console errors.

Estimated effort: **4–6 working sessions**. First playable slice (steps 1–5: dark shop → generator → shrink → inside
the case with the LED codes cycling) is roughly **2 hours** of work and is already fun on its own.

---

## 11. Sound

No audio files. Everything is **WebAudio synthesis** (oscillator + noise-buffer + filter), same rule as the textures:
procedural, offline, zero bytes.

### Music

Low, warm, unobtrusive bed: a 4-chord loop (~70 bpm) with two detuned saw pads through a lowpass, a soft sine kick,
a brushed noise hat, and continuous vinyl crackle (bandpassed noise, random tiny gain spikes). Filtered and quiet
under 60% — it should read as "a shop that has a radio", never as a soundtrack.

Diegetic layer: the **shop radio** on the shelf is off. Find the USB stick in the cold coffee mug, plug it into the
case's front USB, and the radio comes on with a second, brighter track (chiptune-ish, the owner's taste). Pure reward,
no puzzle value, and the only way the room gets louder.

### Effects — one gesture, one sound

| Event | Sound |
| --- | --- |
| footstep, human | soft wood tap, slight random pitch |
| footstep, shrunk | tiny click, high, very short — the whole world gets quieter and smaller |
| key press (jumped on) | per-row filtered noise burst + low thock; pitch varies by key so typing becomes a melody |
| mouse left button | deep plasticky clack |
| mouse dragging on the pad | low continuous friction hiss, gain follows speed |
| relay / PSU rocker | double clunk, second one lower |
| 24-pin, RAM clips, HDMI, USB | one *snap* family, same sample, different pitch + length |
| padlock shackle | spring *pop* + chain jingle (3 short noise plinks) |
| winch drum | ratchet clicks tied to drum rotation |
| GPU seating | heavy metallic *chunk* + a short reverb tail |
| fan spin-up | noise sweep 200 Hz → 2 kHz over 1.2 s, then steady loop |
| screwdriver dropped | metal clang with 2.4 kHz ring |
| compressed air | broadband hiss, 0.8 s, slight pitch fall |
| generator pull | rip + cough + roar; the room's bed changes to the hum |
| generator flooded | wet cough, then silence, then the primer bulb squelch |
| shrink ray charge | rising sine 80 → 900 Hz + crackle, then *whoom* and a 4 kHz ring that fades over 8 s |
| worm | skittering ticks panned by position, plus a bitcrushed glitch on touch |
| quarantine door | slam + latch |
| login success | two-note chime, then the desktop ambience |
| neon sign | 50 Hz buzz that stutters on |

Pan every one-shot by its world position (`PannerNode`, HRTF). Distance attenuation is what sells the scale change: at
17 mm the generator is a low rumble 600 m away.

Mix rules: one `masterGain`, music at −14 dB and ducked 6 dB for 250 ms under any interaction louder than a footstep;
`M` mutes; audio starts on the first click (browser autoplay rules) and the room shows a one-line in-world hint
(*"druk op de rode knop van de radio"*) until it does.

---

## 12. Decided

1. **Language** — English, in-world copy and voice alike. (Consequence: the password is no longer the Dutch joke
   `KAPOT9`; it is **`BROKEN`**, one character per fixed part. RAM `B` · PSU `R` · fans `O` · GPU `K` · monitor `E` ·
   SSD `N`.)
2. **Voice + pacing** — TTS voicemail with subtitles in the tray, and the timer strip stays on screen.
3. **Music** — procedural, zero assets.
4. **Length** — full 45–75 min.
5. **Cursor** — physical 1:1 mouse drag, no assist.

---

## 13. Slice 1 — built

`pcdoc.html` is playable up to the point where the room's grammar is proven:

- the dark shop, the torch, the answering machine, the werkbon, the service log, the pegboard, the bench lamp;
- the generator (fuel cock → choke → three pulls, floods if you get the order wrong, primer to recover);
- the shrink ray (stand in the ring, pull the lever) and the scale change itself;
- inside the case: the board as a floor, the four slots, the leaning A2 module, the scorched B2, the CPU cooler,
  the PCIe rail, the POST display cycling **every** unsatisfied fault, the wiring diagram on the side panel;
- the memory chain end to end: pull A2, take the spare from the anti-static bag, seat it, `C1` drops off the display,
  the module gives up its character `B`, the notepad records it.

`test/pcdoc.browser.cjs` drives all of it in a headless browser (35 checks).

### Slice 2 — built

- power routing: a test-rig PSU lying in the case, a rocker switch, four cable ends you carry by hand, and the twin
  8-pin trap (EPS for the board, PCIe for the card — identical plugs, label only);
- the three fans: loose 4-pin → `CHA_FAN1`, the CPU cable moved out of `SYS_FAN3` into `CPU_FAN`, and a screwdriver
  jammed in the intake. `F1` clears and all three spin;
- the card: a hand winch with a three-digit padlock (456, from the shop number on the side panel), grab-and-drag to
  lower it, push it into the PCIe rail, then its own 8-pin. `d4` clears.

Deviation from §5.3: the rocker is on the test-rig PSU inside the case rather than at the rear I/O, because the rear
I/O trek is slice 3. Move it back out when that zone exists.

### Next slices

3. the HDMI trek to the monitor (`A2`), the rear I/O, the USB keyboard and mouse, the dirty lens.
4. the SSD: the sector grid and the worm (`b7`).
5. the finale: login window, cursor drag, jump-to-type, un-shrink, the end banner.
