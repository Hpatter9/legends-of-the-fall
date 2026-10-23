# Audio redo: music, cues, focus, wake lock, text

The owner's notes: redo the music and effects with audiorective, keep the screen on, let other apps' audio play over the
game, and check the game's flavour text. (The `audiorective` skills named in the brief were not available in this session,
so the code follows the existing engine in `audio-engine.md` and `audio-beds.md`.)

## The music is synthesised, baked offline, and played as buffers

The three `.ogg` tracks are gone (`src/audio/`, the `AUDIO` list in `build.mjs`, their credit). In their place:

- `src/render/musicScore.ts` (pure): each track is eight bars of four beats in four **stems** (pad, bass, lead, drums), written
  as notes. Town: D major, 76 bpm, a soft bell tune over warm chords. Battle: D minor, 132 bpm, eighth-note bass, arpeggios and a
  backbeat. Boss: E phrygian, 148 bpm, a galloping bass, off-beat stabs and double kick with tom fills. `stemLevels(track,
  tension)` says how loud each stem is; `STEM_TRIM` and `TRACK_RMS` set the balance and the loudness.
- `src/render/musicBake.ts`: renders each stem once through an `OfflineAudioContext` (24 kHz; about 0.7 s a track in desktop
  Chromium), folds the 2.5 s tail (echoes, cymbals, pad releases) back onto the loop's start so it joins cleanly (seam jumps
  measured under 0.05), and scales the track to its loudness. Noise comes from a fixed stream, so every bake is the same.
- `MusicPlayer` (`audioProcessors.ts`) keeps its API (`setTrack`, `setTension`, `setAct`, `hush`, `wake`, `current`) and adds
  `warm(track)` and `setEnabled(on)`. A track's stems start together on looping `AudioBufferSourceNode`s behind one fade; the
  tension now **mixes the stems** (the battle's lead and drums come in as the fight thins out) as well as opening the low-pass,
  the swell, the 8 % pace-up and the rumble layer, exactly as before. Tower acts still colour the music (filter, pace, drone).
  The battle track is baked 4 s after the first tap, while the town plays, so a fight's music starts at once; a track not yet baked
  starts when its bake finishes. Baked tracks stay cached (about 7 MB each).
- Cost on a phone: during play only the buffer sources, a few gains and one low-pass run (no oscillators). Hiding the page
  suspends the context, which holds the loops where they are, so `hush`/`wake` do nothing more.
- Music volume at **Off** now stops everything: `setEnabled(false)` lets the loops go and nothing is baked. The effects carry on
  (this is the "music off, keep effects" setting; the row's hint says so).

## The effects

`CueSynth` keeps every cue and its event mapping. The primitives are richer: a longer tone gets a second voice a few cents
off and a share in a small shared room (an 0.8 s generated convolution reverb, low-passed), pads get more of the room, and
`ring` has a third, inharmonic partial. Short ticks and clicks stay dry and cost nothing extra.

## Audio focus: other apps' sound keeps playing

What takes focus on a phone is a media element (`<audio>`, which audiorective's `FilePlayer` uses) or a media session. The
old music was streamed through `FilePlayer`, so it was a media element: that is what stopped a music app. Now:

- No media element anywhere (the music is `AudioBufferSourceNode`s; checked: `document.querySelectorAll('audio,video')` is empty).
- No media session is registered (checked: `navigator.mediaSession.metadata` is null).
- `navigator.audioSession.type = 'ambient'` is set at start where the browser has it (Safari), so the game mixes with other
  apps. **On iOS "ambient" also follows the ringer switch**: with the phone on silent, the game is silent too.

Checked in Chromium only. **Only the phone can say** whether Spotify keeps playing on iOS Safari and Android Chrome (and as an
installed PWA), whether the silent switch behaves as above, and whether the first-tap unlock still works.

## Screen wake lock

`src/render/awake.ts` now holds the lock **whenever the game is visible** (it used to hold it only in a fight): `startAwake()`
(from `main.ts`) takes it, takes it again on `visibilitychange` to visible, on `pageshow` and on a tap if it was dropped, and
releases it when the page is hidden. The existing **Keep screen awake** setting (on by default) turns it off. No API, or a
refusal, is ignored quietly. Checked in Chromium: requested on load; released on hidden; requested again on visible
(`test/awake.test.ts` covers the rules).

## Samples

`docs/samples/audio/`: `music-town.wav`, `music-battle.wav`, `music-boss.wav` (two loops each, every stem at full level) and
`cue-*.wav` (nineteen cues). Screenshots at 393x852, 360x780 and 412x915: `docs/samples/audio-settings-*.png` (the Music row),
`audio-deploy-*.png` and `audio-fight-*.png`. A full fight played at each size with no page errors: the music went town,
battle, town; both `?seed=1` (a test page) and a fresh page start. Saves and settings are unchanged.

I cannot hear any of it, so **how it sounds is by design and measured levels, not by ear.** Tunes, tempos, stem balance
(`STEM_TRIM`) and loudness (`TRACK_RMS`) are first guesses: please listen to the WAVs, and tell me what to retune.

## Text review: what changed

Read: hero quips and banter, Duchess's lines, loading tips, foe grumbles, recap and result lines, achievement asides, event
and mystery cards, the cutscene scripts, the codex lore and the castle and army blurbs. Checked against the game's rules and the
heroes' kits. Changed:

- Samurai "hired": "One blade, one bow" (the Samurai has no bow) is now "One blade, and no small talk."
- Tyrant "lost": "I shall have someone executed. Possibly a goat." was too dark for Duchess's game; now "sent to bed without supper".
- Loading tip "a hero in a good mood fights a little better": there is no mood rule. Now a true one about spells running on the
  king's mana. The tip "Duchess loves the bar tent" made no sense; now "prefers a full trough".
- Achievement asides: `daily1000` said "A thousand" but the achievement is five dailies; `stage30` "hiring goats" now "hiring temps".
- Foe grumble "We were three more last week" is now "There were three more of us last week"; a recap loss line reads better.
- Black altar offering: "has no use for gold, but takes it: +20 gold back" contradicted itself; the abandoned forge's "nothing to
  work" is now "no gear to work on".
- Cutscene: "THEN I SHALL BURN THEM MYSELF" (them?) is now "YOU"; "His ribbon is on its way" meant nothing, now a staffing joke;
  Gorvak's blurb no longer promises a toll road the scene does not have.
- Codex: "try and take it back" is now "try to take it back". Daily prize text now says what the bonus stars are.

Checked and left alone: all the other quips (each matches its hero's kit: the Dread Pirate's "dead before" is his rise from
death, the Wanderer mends the hurt, the Karasu flies), banter (every trait id exists), Duchess's lines, the other tips, the
events, and the tower and Calamity blurbs.

## For the owner

- The old Tiny RPG Music tracks are removed from the build (they are in git history, and CREDITS.md says so). If you would rather
  keep them as an option, say so.
- iOS "ambient" follows the silent switch; the alternative (`playback`) would not mix, so I kept ambient.
- Music volume Off is the "music off, effects on" setting; I did not add a second switch.
