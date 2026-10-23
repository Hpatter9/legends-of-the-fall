# The turning road: finished sections drawn behind or in front

Changes "The renderer" in `long-map.md` and `long-map-turns.md`. The owner: on the winding road, the new section often ended
up "under" the last ones, hiding the heroes. Every finished section was drawn in front of the host (the section being
fought), which was right while the road only climbed up the screen. Once it could turn, sections further from the screen
than the host were still drawn over it.

- `liesBehind(rot, ou, ov, hostRot)` in `src/sim/turn.ts` (pure): a section is behind the host when it lies wholly on the
  host's -U or -V side. Footprints never overlap, so it lies to one side along U, along V, or both. When both, the same
  sign on each decides; opposite signs (straight left or right of the host, never over it on the screen) go by U, so of any
  two sections exactly one is behind the other.
- `BoardView` (`src/render/boardView.ts`) keeps two layers: `sceneryBack` (z -100000, under the host's tiles and the
  fighters) and `scenery` (z 5000, over them, under the effects). Each baked section goes in the one `liesBehind` picks;
  within a layer the sections sort by the depth of their middles.
- Test in `test/long-map.test.ts`: each side of the host, and on 100 real roads, of any two sections exactly one lies
  behind the other.
