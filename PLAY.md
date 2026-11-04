# PC Doctor — player's manual

A repair shop at dusk, a customer's tower on the bench, and a shrink ray you should probably not be allowed to
operate. This is the manual. It has a gentle nudge section and a spoiler section, and nothing in between is
mandatory.

Run it at **http://localhost:8080/pcdoc.html**.

---

## Controls

| Key | What it does |
| --- | --- |
| `W A S D` / arrows | walk |
| `Shift` | hurry |
| `Space` | jump |
| mouse (click to capture) | look |
| `E` | use / read / pick up — only offered when it does something |
| `Q` | let go: drop a cable, stop turning a winch, back out of the padlock |
| `I` | the workshop notepad: items, fault codes, characters found |
| `H` | a hint for the next thing that is actually unsolved |
| `M` | music off / on — effects keep playing |
| `N` | all sound off / on |
| `Esc` | release the mouse back to the cursor |

The same key legend sits in the bottom-right corner the whole time, so none of this has to be remembered.

The bottom-left panel is the **tray**: it shows whatever the crosshair is on, and it is the only place text lives.
Read it — the room runs on stickers, notes and manuals.

---

## How the room thinks

1. **Everything is a sticker.** Gerrit writes the procedure on the machine he is fixing. If something will not
   move, look for the note stuck to it.
2. **Order matters.** Power, then the board, then the parts. The room will tell you so, out loud or in writing.
3. **Two scales.** At 1.6 m tall the tower is a box on a bench. At 17 mm it is a building and you are inside it.
   Nothing inside the case can be touched while you are full size.
4. **Nothing is fatal.** Not one thing in this room can be ruined, lost, or done in an unrecoverable order.
5. **The screen is a display, not a menu.** The only overlays are the tray, the notepad, the timer and the key
   legend. If you see text, it belongs to an object.

---

## The five stages

### 1. Dark shop

The meter is dead. There is one thing in here with its own power: a torch on the counter in front of you, blinking
green. Take it (`E`), then find the way out — the green **EXIT** sign, back right.

### 2. The generator

Old, red, bad-tempered, in the yard. The sticker on it is the cold-start procedure. Do it in that order. If you get
it wrong it floods, and a flooded generator needs the rubber primer bulb squeezed three times before it will think
about starting again.

Once it runs: lights, a relay, and the tower on the bench starts complaining immediately.

### 3. The shrink ray

A tripod with a big red handle and a painted line on the floor that says **SHRINK RAY · STAND IN THE RING**. Stand
on the ring, look at the tripod, pull the handle. The tray under the tripod tells you whether you are standing in
the right place.

### 4. Inside the case

You are 17 mm tall on a workbench the size of a country. Walk into the open front of the tower.

The **two-digit red display** on the right-hand wall cycles through every fault the board knows about, one every two
seconds. The **manual** lying open on the bench names them. Your job is to make each code stop appearing.

| Code | Means |
| --- | --- |
| `C1` | memory not detected / module faulty |
| `d4` | no display adapter found |
| `A2` | no monitor detected |
| `F1` | thermal fault — fans |
| `b7` | storage fault — boot sector |
| `--` | clear |

They can be fixed in any order, with one exception: a board with no 12 V says nothing useful, so power comes first
if you want the display to make sense of itself.

### 5. Now what is left

Four of the five faults are in the room right now: `C1`, `F1`, `d4`, and the power underneath them. `A2` (the
monitor cable) and `b7` (the thing living in the SSD) are the next two slices of the build, and the login screen
after that. The room ends, for now, with two codes still on the display.

---

## Nudges, in order of how stuck you are

**Nothing is lit.**
The shop has no power. There is a torch, and there is a generator, and the generator is outside.

**The generator will not start.**
Read the sticker. Fuel OPEN, choke CLOSED, then three pulls. The cord is grabbed with `E` and pulled by dragging
the mouse backwards. If the tray says it is flooded, the primer bulb is your friend, three times.

**The shrink ray does nothing.**
Two reasons, and the tray tells you which. Either the shop has no power, or you are not standing on the painted
ring.

**I am inside the case and the display says C1.**
Two memory modules. One is leaning out of its slot; one has a burnt chip and the word RMA on it. The good one that
Gerrit left for exactly this job is in a bag on the board, labelled with the slot it belongs in.

**The display still says C1 after I pushed the loose module home.**
Then the loose module was not the fault. Read the label on the spare bag again — it names a slot, and it is not the
one you just fixed.

**The fans say F1.**
Three separate mistakes: a plug lying loose by the back wall, a cable in the wrong header, and a tool jammed in a
fan. The manual underlines one of those headers for you.

**The card is padlocked.**
Three digits. The shop number is printed on the side panel of the case, and Gerrit's note says the lock uses the end
of it. Do not use `Esc` to back out of the lock — that also releases your mouse. Use `Q`.

**I have the card but nothing happens.**
It has to come down to the rail before it will seat. The winch drum is at the right-hand end of the machine: grab it,
drag back, then push the card in. Then it wants its own power cable — and there are two identical 8-pin plugs in
this room that are not interchangeable.

---

<details>
<summary><b>Full solution (spoilers)</b></summary>

1. **Torch** — on the counter, bottom centre of your view at spawn.
2. **Generator** — through the EXIT door, back right. Fuel cock → open. Choke stays closed. Grab the cord, drag
   back three times. It runs; the lights come on.
3. **Shrink ray** — stand on the painted ring, `E` the tripod.
4. **Power inside the case** (gives the board 12 V and clears the way for everything else):
   - `E` the rocker switch on the PSU block in the front corner.
   - Pick up the **24-pin** cable end, plug it into the big socket on the board.
   - Pick up the 8-pin labelled **EPS**, plug it into the CPU socket near the heatsink. (The 8-pin labelled
     **PCIe** is refused there — that is the trap.)
   - Pick up the **SATA** connector, plug it into the fan hub.
   - The rail label gives up the character **R**.
5. **`C1` — memory**
   - Slot **A2**: `E` the leaning module. It slides home. C1 stays up.
   - Slot **B2**: `E` the scorched module. It comes out.
   - The bag beside the slots says **SPARE > B2**. Take the module.
   - Slot **B2** again: `E` to seat it. `C1` clears, and the module gives up **B**.
6. **`F1` — fans**
   - Pick up the loose 4-pin lying by the back wall, plug it into **CHA_FAN1**.
   - `E` **SYS_FAN3** to pull the CPU fan cable out, then `E` **CPU_FAN** to plug it in there.
   - `E` the screwdriver jammed in the intake fan.
   - All three spin, `F1` clears, and the hub gives up **O**.
7. **`d4` — the card**
   - Padlock: dial **4 5 6** (`↑↓` digit, `←→` next wheel, `E` try). The shop number ends in 123456.
   - Grab the winch drum (`E`, then drag the mouse back) until the card is at the rail.
   - `E` the card to seat it.
   - Pick up the **PCIe** 8-pin, plug it into the socket hanging near the bottom of the card.
   - `d4` clears and the serial plate gives up **K**.

Codes left on the display afterwards: `A2` and `b7` — the monitor and the SSD, still to be built. The characters
you have collected (**B**, **R**, **O**, **K**) are the first four of the password, and the notepad on `I` is holding
them for you.

</details>

---

## If something is wrong

- **No sound** — the browser will not make a noise until you click the page once. `M` only silences the music; `N`
  silences everything, so if the room is silent, check both.
- **The mouse is stuck / the camera spins** — click the canvas to capture the pointer, `Esc` to let it go.
- **Text is too fast** — it is not going anywhere: the tray keeps the current line, and the notepad keeps what you
  have found.
- **Something looks like it is floating** — tell me, that is a bug, not a puzzle.
