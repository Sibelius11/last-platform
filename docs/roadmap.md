# MVP roadmap

The MVP has one job: to find out whether people notice the open train. Build the smallest night that tests that; polish after five people have played it.

## Station
- [x] Clocks: fixed night base time (23:38) that slips while unwatched; the waiting-room clock is wrong on a second look
- [x] Summer night sky, computed for 25 June 02:00: Summer Triangle overhead, Plough in the north-west (30–45° up, as low as it gets in June), soft Milky Way with the Cygnus rift, northern glow
- [x] Valley opening to the north-east (+x down the line) so the glow and sunrise are in view
- [x] Placeholder announcements: original three-note chime and a synthetic French voice (the browser's own); loud on the platforms, quieter and muffled indoors, faint on the bridge

## Trains and paths (`src/night.js`), revised 25 October
- [x] Timeline about five to six minutes from entering (constants at the top of `night.js`)
- [x] Through train on voie 1, beside the starting platform: board "Train sans arrêt", announced at 0:45, passes at 0:58
- [x] Passenger train on voie 2 (island platform): board "Bruxelles-Schuman 23:47", announced at 1:40, at rest 2:04, doors 2:07, leaves 3:06 (or 7 s after you board)
- [x] Open train on voie 3: board "Train sans arrêt" like voie 1, never announced by voice; at rest 26 s after the passenger train has left; waits 60 s, holds while someone is aboard
- [x] Board rows clear as each train goes; the same departures on both boards
- [x] Waiting on the open train: he appears after 15 s aboard; stepping off resets the wait; no spoken greeting, a raised hand
- [x] The glimpse as an overtake: the passenger train stops at a signal a minute out; the open train passes on voie 3 with him on it
- [x] Rails: step down off any platform edge; climb back only where you stepped down; a standing train is solid
- [x] A train coming while you are on its track (any train), or at the edge as the through train comes: its light fills the view, wake in the dark. No impact shown
- [x] Jump (Space; a short tap on the right on touch). Over the footbridge railing: wake before landing
- [x] Platform 1 ends: a low barrier with a gap at the back; walking off takes a deliberate push through the gap
- [x] Exits: the street door (unchanged)

## Waking
- [x] One bedroom for every ending; only light and time differ
- [x] Dark with a ticking clock (exit, reckless, stayed) · flat morning (passenger) · first light (open train)
- [x] After waking: the station sign fades back; a click or key reloads the night

## Publishing
- [x] GitHub Pages
- [ ] Custom domain (CNAME) once chosen
- [ ] GoatCounter events wired through `src/stats.js` (events already fire; full list at the top of that file)

## To replace before anyone else plays
- All French announcement text: native speaker check
- The stranger's toast line (English, native check); `SAY` in `night.js`
- The board wording for a train in transit ("Train sans arrêt" is a placeholder)
- The synthetic voice: record a human voice. Without a French voice on the device, only the chime plays

## Open
- How long the open train waits (default 60 s with nobody aboard) and the wait before he appears (default 15 s)
- Whether the voie 3 row goes blank before the train arrives
- Whether the passenger train should hold its doors longer, or leave sooner
- Which three or four easter eggs

## Testing aids (only with `?dev`)
- `?dev&t=110` starts the night at 110 s; `T` skips 10 s; `R` reloads
- The area label shows the night time and the path taken
- `?lo` renders at low resolution (for slow headless browsers)
