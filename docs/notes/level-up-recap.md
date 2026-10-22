## The level-up in the after-wave recap

Each XP row on the result screen (`showXp` in `main.ts`, CSS under `#xp .xprow` in `index.html`) has:

- the hero's face, with a level badge on its corner;
- the name and the XP earned;
- the bar.

A level-up is played once, with nothing looping:

- a red "Level up!" stamp lands beside the name;
- the badge ticks over to the new level with a bump;
- the gains pop in as gold chips ("+22% HP", "+18% Atk");
- a sweep of light crosses the row, which takes a gold edge and glow;
- ten gold sparks burst out from the face.

The light pillar and the chime stay as before. Under prefers-reduced-motion it shows the same end state with no motion.
