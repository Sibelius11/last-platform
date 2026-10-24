# MVP roadmap

The MVP has one job: to find out whether people notice the open train. Build the smallest night that tests that; polish after five people have played it.

## Station
- [x] Clocks: fixed night base time (23:38) that slips while unwatched; the waiting-room clock is wrong on a second look
- [x] Summer night sky, computed for 25 June 02:00: Summer Triangle overhead, Plough in the north-west (30–45° up, as low as it gets in June), soft Milky Way with the Cygnus rift, northern glow
- [x] Valley opening to the north-east (+x down the line) so the glow and sunrise are in view
- [x] Placeholder announcements: original three-note chime and a synthetic French voice (the browser's own); loud on the platforms, quieter and muffled indoors, faint on the bridge

## Trains and paths (`src/night.js`)
- [x] The night's timeline, about four and a half minutes from entering (constants at the top of `night.js`)
- [x] Through train on voie 2: announced at 0:45, passes at 0:58 from the north-east, nearly silent
- [x] Passenger train on voie 1: announced at 1:40, at rest at 2:04, doors open 2:07, leaves 3:06
- [x] Open train on voie 3: never announced, no sound, at rest at 1:58, a few seconds before the passenger train closes the view from platform 1
- [x] Waiting on the open train: he appears after 4 s aboard; leaving the deck resets the wait; it only leaves with you once he has sat down and you are still on it
- [x] The stranger walks in along the riverside edge (never across the rails), lifts a hand, climbs on, sits at the open edge
- [x] The ride: the train moves off north-east, the toast (a clink; the line is a silent placeholder), the sky lifts to morning, fade to warm light
- [x] The glimpse: on the passenger path only, he sits on the open train as it leaves, alone, a lamp beside him, glass raised toward the empty place beside him
- [x] Exits: the street door; the end of platform 1 into the dark; walking into the through train's light from the island platform's edge
- [ ] Footbridge railing: left out of the first test build

## Waking
- [x] One bedroom for every ending; only light and time differ
- [x] Dark with a ticking clock (exit, reckless, stayed) · flat morning (passenger) · first light (open train, clock showing the time the open train left)
- [ ] After waking: it just ends (black). Restart or not is still open

## Publishing
- [x] GitHub Pages
- [ ] Custom domain (CNAME) once chosen
- [ ] GoatCounter events wired through `src/stats.js` (events already fire: `start`, `end-exit`, `end-reckless`, `end-passenger`, `end-unlisted`, `end-stayed`, `saw-glimpse`)

## To replace before anyone else plays
- All French announcement text: native speaker check
- The stranger's greeting and toast line (English, native check); `SAY` in `night.js`
- The synthetic voice (browser text-to-speech varies by device and may be missing)

## Open
- How long the open train waits (default: it leaves with the passenger train, about 68 s after stopping)
- Whether the passenger train should hold its doors longer, or leave sooner
- Restart after waking, or just end
- Which three or four easter eggs

## Testing aids (only with `?dev`)
- `?dev&t=110` starts the night at 110 s; `T` skips 10 s; `R` reloads
- The area label shows the night time and the path taken
- `?lo` renders at low resolution (for slow headless browsers)
