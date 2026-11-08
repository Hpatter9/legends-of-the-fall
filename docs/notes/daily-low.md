## The Daily set low (DAILY-LOW)

The owner found the Daily's icon "floating in a weird spot" on the battle camp: it hung 68 px above the scene's foot, halfway up the
cliff and well above the "Enemy below" banner beside it. It now sits in the scene's bottom-right corner, 12 px from the foot
(`DAILY_FOOT` in `src/render/overlookLayout.ts`), its foot level with the banner's. It stays clear of the banner at 393, 360 and 412
wide (before and after in `docs/samples/daily-low/`). `test/overlook.test.ts` keeps it low in the corner.
