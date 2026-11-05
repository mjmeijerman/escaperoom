# PC Doctor — player's manual

A repair shop at dusk, a customer's tower on the bench, and a shrink ray you should probably not be allowed to
operate. This is the manual. It has a gentle nudge section and a spoiler section, and nothing in between is
mandatory.

Run it at **http://localhost:8080/pcdoc.html**.

---

## Starting

Click **Start the shift**. The timer starts, the shop wakes up, and Gerrit's answering machine plays — he left the
message before he drove off, and the transcript appears in the bottom-left tray while he talks.

## Controls

| Key | What it does |
| --- | --- |
| `W A S D` / arrows | walk |
| `Shift` | hurry |
| `Space` | jump |
| mouse (click to capture) | look |
| `E` | use / read / pick up / ride the cable — only offered when it does something |
| `Q` or **right mouse button** | let go: drop a cable, stop turning a winch, back out of the padlock |
| `I` | inventory and notepad: what you are carrying (click an item to use it), the fault codes, the characters |
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
   The desk is a separate country with no stairs: the monitor cable is the only way across it.
4. **You carry things in your hands.** A cable end you pick up sits in front of you; the inventory on `I` shows
   everything else, and clicking an item there uses it.
5. **Nothing is fatal.** Not one thing in this room can be ruined, lost, or done in an unrecoverable order.
6. **The screen is a display, not a menu.** The only overlays are the tray, the notepad, the timer and the key
   legend. If you see text, it belongs to an object.

---

## The stages

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
monitor cable) is one cable away, and `b7` (the thing living in the SSD) is the next slice of the build.

### 6. The desk, and the two devices

With the monitor cable plugged in at both ends it is a taut span from the bench lip to the desk, and Gerrit has
taped a grip at each end. At 17 mm that is a rope: `E` the grip and ride it, hand over hand, both ways.

On the desk, at the end of their own cables, lie the keyboard's and the mouse's USB connectors — Gerrit pulled both
out of the case and left them by the monitor. The ports are on the rear panel, across the gap, so each connector
has to go over on the cable: pick it up, ride the zipline back to the bench with it in your hands (the cable follows
you), and plug it into either blue port. One hand, one connector, two trips.

The keyboard's backlight comes up. The mouse lights up too, and then proves the intake form right: its sensor glows
red and reads nothing, because there is a hair across the optical window. Tip it onto its side, take the can of air
from the bench (left of the case) into the notepad, then `E` the window — the notepad opens and you click the can.
Then put it back on its pad.

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
Gerrit left for exactly this job is in a sealed bag on the bench **in front of the case**, labelled with the slot it
belongs in. Pull the burnt one out — it leaves the machine — then take the spare and seat it in the empty slot.

**The display still says C1 after I pushed the loose module home.**
Then the loose module was not the fault. Read the label on the spare bag again — it names a slot, and it is not the
one you just fixed.

**The fans say F1.**
Three separate mistakes: a plug lying loose by the back wall, a cable in the wrong header, and a tool jammed in a
fan. The manual underlines one of those headers for you.

**The display still says A2.**
"No monitor detected" is not about the monitor, it is about the cable. The monitor's HDMI cable is coiled on the
bench in front of the case — Gerrit dumped it there when he moved the desk. Pick up the loose end, walk around the
side and behind the tower, and plug it into the rear panel.

**The card is padlocked.**
Three digits, and the tag hanging on the bracket says where they come from: the end of the shop number. That number is
printed on the side panel of the case. Do not use `Esc` to back out of the lock — that also releases your mouse. Use
`Q`.

**I have the card but nothing happens.**
It has to come down to the rail before it will seat. The winch drum is at the right-hand end of the machine: grab it,
drag back, then push the card in. Then it wants its own power cable — and there are two identical 8-pin plugs in
this room that are not interchangeable.

**The monitor cable is plugged in and I still cannot get to the desk.**
Look along the cable from the bench lip. Gerrit taped a grip on it, right where it leaves the bench. `E` that and you
ride it down. Ride the far grip to come back. If you step off an edge instead, the lip catches you and puts you back
on top — nothing is lost.

**The USB ports do nothing.**
They are 12 V ports like everything else in there: the mains switch, the 24-pin and the CPU 8-pin have to be in first.
Both connectors are on the **desk**, by the monitor, at the end of their own cables — pale tops, blue collars, with a
note beside them. Click the connector, or the cable near it, then ride the zipline back over with it in your hands.
The cable follows you; that is the only way it is getting across.

**The mouse lights up but does not work — "the mouse is doing weird things".**
The sensor reads the pad through a glass window in the base, and there is a hair across it. `E` the mouse to tip it
onto its side, `E` the window (the notepad opens), then click the **compressed air** in the notepad. `E` the mouse
again to put it back on its pad.

---

<details>
<summary><b>Full solution (spoilers)</b></summary>

1. **Torch** — on the counter, bottom centre of your view at spawn.
2. **Generator** — through the EXIT door, back right. Fuel cock → open. Choke stays closed. Grab the cord, drag
   back three times. It runs; the lights come on.
3. **Shrink ray** — stand on the painted ring, `E` the tripod.
4. **Power inside the case** (gives the board 12 V and clears the way for everything else):
   - `E` the rocker switch on the PSU block in the front corner.
   - The four cable ends lie beside the PSU, each on a stencilled label: **24-PIN**, **EPS 8-PIN**, **PCIe 8-PIN**,
     **SATA**. Pick one up — it appears in your hands — then look at its socket and press `E`. The cable draws itself
     from the PSU to the socket.
   - **24-PIN** → the big socket on the board.
   - **EPS 8-PIN** → the CPU socket near the heatsink. (The **PCIe 8-PIN** is refused there — that is the trap.)
   - **SATA** → the fan hub.
   - The rail label gives up the character **K**.
5. **`C1` — memory**
   - Slot **A2**: `E` the leaning module. It slides home. C1 stays up.
   - Slot **B2**: `E` the scorched module. It comes out.
   - The bag beside the slots says **SPARE > B2**. Take the module.
   - Slot **B2** again: `E`, then click the module in the inventory that opens. `C1` clears, and the module gives
     up **N**.
6. **`F1` — fans**
   - Pick up the loose 4-pin lying by the back wall, plug it into **CHA_FAN1**.
   - `E` **SYS_FAN3** to pull the CPU fan cable out, then `E` **CPU_FAN** to plug it in there.
   - `E` the screwdriver jammed in the intake fan.
   - All three spin, `F1` clears, and the hub gives up **O**.
7. **`A2` — the monitor**
   - The monitor's HDMI cable is coiled on the bench in front of the case (stencil: **HDMI**). Pick up its end.
   - Walk out of the case, around the side, behind it. The rear panel has HDMI and two USB-A ports.
   - `E` the HDMI port. `A2` clears, the monitor on the desk lights up, and the panel gives up **R**. Now the cable
     is a span: the taped grip sits where it leaves the bench lip.
9. **The way down** — `E` the taped grip on the cable at the bench lip and ride it, hand over hand, to the desk.
   `E` the grip at the desk end to ride back. No other route exists, in either direction. The desk is walkable;
   a step off its edge drops you to the bench lip rather than the shop floor.
10. **The keyboard and the mouse** (the connectors are on the desk by the monitor):
   - Before you go down, `E` the can of air standing on the bench, left of the case — it goes into the notepad.
   - Ride down. `E` the keyboard's connector, then `E` the desk grip to ride back up with it in your arms.
     `E` either blue USB port. The keyboard's backlight comes up.
   - Ride down again for the mouse's connector, ride back, `E` the other port. Its sensor glows red and the cursor
     is still a mess.
   - Ride down once more, to the mouse. `E` it to tip it onto its side. Underneath: a hair across the optical window.
   - `E` the window: the notepad opens. Click **compressed air**. The hair goes.
   - `E` the mouse again to put it back on its pad.
11. **`d4` — the card**
   - Padlock: dial **4 5 6** (`↑↓` digit, `←→` next wheel, `E` try). The shop number ends in 123456.
   - Grab the winch drum (`E`, then drag the mouse back) until the card is at the rail.
   - `E` the card to seat it.
   - Pick up the **PCIe** 8-pin, plug it into the socket hanging near the bottom of the card.
   - `d4` clears and the serial plate gives up **E**.

Codes left on the display afterwards: `b7` — the SSD, slice 4.

The letters you collect are **N** (memory), **K** (power), **O** (fans), **E** (card) and **R** (monitor), in the
order you fix them. That order is *not* the password order — the notepad says so at the bottom of the list. The
order lives on the login screen, as a row of six pictograms, one per part.

</details>

---

## If something is wrong

- **No sound** — the browser will not make a noise until you click the page once. `M` only silences the music; `N`
  silences everything, so if the room is silent, check both.
- **The mouse is stuck / the camera spins** — click the canvas to capture the pointer, `Esc` to let it go.
- **Text is too fast** — it is not going anywhere: the tray keeps the current line, and the notepad keeps what you
  have found.
- **Something looks like it is floating** — tell me, that is a bug, not a puzzle.
