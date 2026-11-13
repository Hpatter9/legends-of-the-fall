# Legends of the Last Keep

A King God Castle style auto-battler on an FF Tactics height grid, made for the phone (a web app you can add to the
home screen). Place your heroes, press **Fight!**, and watch them fight on their own.

## How to play

- Drag a hero from the bench onto a blue tile (your three near rows). Or tap the hero, then tap a tile.
- Drag a placed hero to move it, or back onto the bench to take it off. Tapping a chosen hero also sends it back.
- Press **Fight!** once at least one hero is placed. The fight plays itself; **×1 / ×2** sets the speed.
- Afterwards, **Restart** replays the same board with your heroes where you put them; **New board** rolls a new one.
- `?seed=123` in the address opens a given board.

The ground matters. A blow from higher ground hits harder (+15% a step, up to three), and so does one from the side
(x1.25) or behind (x1.5). Archers and the wizard shoot further from high ground, and a ridge or boulder can block their
shot. Swords and spears can't reach a foe more than a couple of steps above or below them.

## Building

```bash
npm install
npm run typecheck
npm test            # npm test -- battle   runs only the matching test files
npm run web         # builds the phone version into out/web
npm run dev         # serves out/web on http://localhost:8000 and rebuilds on changes
```

`out/web` is published to GitHub Pages once a day (10:17 UTC), when `main` has changed since the last publish
(`.github/workflows/pages.yml`; in the repo's Settings → Pages, set Source to "GitHub Actions"). To publish at once, run
**Publish the phone version** by hand from the Actions tab. The Android app is built the same way, once a day, and
attached to a release (`.github/workflows/android.yml`; download it from the repo's Releases page; see
`docs/notes/android-app.md`).
