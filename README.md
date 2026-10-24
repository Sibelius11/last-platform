# Last Platform

A walkable dream: a small Walloon railway station at night, Fond-des-Prés, and the trains that pass through it.

Plain HTML, CSS and JavaScript with three.js from a CDN. No build step.

## Run locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Layout

- `index.html` — page shell and intro screen
- `src/station.js` — the station scene (geometry, lighting, clocks, boards, movement)
- `src/station.css` — interface styles
- `src/stats.js` — path counts (inactive until GoatCounter is set up; never shown to players)
- `docs/roadmap.md` — what the MVP still needs

## Rules for the work

All signage, boards and announcements are in French and get checked by a native speaker. The stranger speaks English. Nothing in the piece explains itself: no labels, scores, counters or ending titles.
