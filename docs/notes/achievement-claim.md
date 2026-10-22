## Achievements are claimed

An achievement no longer pays its crowns the moment it is earned: it waits on the achievements page with a Claim button.

- `checkAchievements` only marks it earned. `claimAchievement(m, id)` pays its crowns once and keeps the id in
  `Meta.claimed`. `claimable` and `unclaimed` tell which are waiting (`src/sim/achievements.ts`).
- The page lists the waiting ones first, with a green-edged row and "Claim +N". When more than one is waiting there is a
  "Claim all" button. A claim saves, plays the coin sound and redraws the page.
- The trophy badge shows while any are waiting. The toast now reads "claim N crowns".
- Saves: `Meta.claimed` is optional. An older save's earned achievements were already paid, so on load they count as claimed.
- The version line is hidden behind the menu pages (not the armies page), as it is behind the hero sheet.

Tests: `test/achievements.test.ts`.
