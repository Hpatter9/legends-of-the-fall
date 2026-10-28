# Complete Game Audio Overhaul & SFX Polish

## Summary
Upgraded all 23 music tracks across the game to studio-grade CC0 / CC-BY symphonic metal, dark fantasy orchestrations, tavern folk, and atmospheric ambient loops, replacing bare mathematical oscillator synthesis with high-fidelity acoustic, metal, and orchestral instrumentation. In addition, modernized the procedural Web Audio sound synthesis engine with dynamic impact thump, metallic clang, and acoustic transient snap processors.

## Music Suite (23 Tracks)
All tracks are mastered and encoded in Opus format, strictly conforming to the 6.1 MB total footprint limit (measured at 6.05 MB / 6,339,646 bytes):
- **Core Combat & Stings**:
  - `battle.opus` (Speed boosted to 172 BPM for auto-battler fight pacing)
  - `battle2.opus` & `battle3.opus` (Escalating heavy symphonic metal)
  - `calbattle.opus` (High-octane metal for Calamity encounters)
  - `boss.opus` (Colossal dark orchestral battle with brass and choir)
  - `victory.opus` & `defeat.opus` (Orchestral stingers)
- **Hubs & Atmosphere**:
  - `camp.opus` (Woodland fantasy harp and acoustic ensemble)
  - `deploy.opus` (War council briefing theme)
  - `tavern.opus` (Rustic tavern folk waltz)
  - `tower.opus` (Mysterious crystalline cavern ambience)
  - `calmap.opus` (Dark wasteland exploration)
- **Heralds & Cinematics**:
  - `gorvak.opus` (Heavy martial drum cadence)
  - `herald2.opus` through `herald6.opus` (Dynamic herald boss encounters)
  - `opening.opus` (Haunting music box waltz)
  - `triumph.opus` (Regal victory theme)
  - `solemn.opus` (Expressive emotive piano loop)
  - `spire.opus` (Ethereal soliloquy)
  - `comic.opus` (Enchanted festival comedy)

## SFX Synthesis Engine Polish
Overhauled procedural sound generation in `src/render/audioProcessors.ts`:
- Added `thump`: Sub-bass pitch swoop for punchy physical combat weight.
- Added `clang`: Resonant inharmonic overtone synthesis for blade clashes, armour deflection, and shield parries.
- Added `snap`: High-speed acoustic attack transient for bow releases, gunshots, and bone snaps.
- Re-tuned 60+ cues in `SOUNDS` (weapons, crits, magic elements, ultimates, UI rewards).

## Verification
- Audio footprint: 6,339,646 bytes (budget threshold: 6,396,314 bytes).
- Seamless loop window: verified with 1.5s wrap tails and metadata in `src/render/epicManifest.ts`.
- Full test suite: 1,105 / 1,105 tests passing (`npm test`).
- Typecheck: 0 errors (`npm run typecheck`).
- Web build: verified with offline caching in `out/web/sw.js`.
