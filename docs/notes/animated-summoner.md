# Active ceremonial summoner

Owner approved an idle, a casting animation and shielding eyes from the bright hero arrival. Implemented on `art/animated-summoner` in `/workspace/legends-of-the-fall`.

The summoner is separate from the painted room. A transparent three-pose atlas supplies idle, cast and eye-shield artwork. CSS adds restrained breathing and casting motion with feet anchored. The existing hall ritual also selects the matching pose.

The queued new-hero reveal now uses the chamber, casting summoner, a single bright arrival flash and eye-shield reaction, followed by the hero and its name. No tarot card appears in this scene. Newly joined reward tiles show a dark hero silhouette until the reveal is acknowledged; shard rewards retain their tarot cards. Existing queue, interrupted-reveal recovery, seen/save handling, summon rules and rewards are preserved. Reduced motion disables looping movement and the bright flash, using the existing calm reveal timing.

Both generated images are bundled through imports into game.js, covered by the existing service-worker cache. Credits updated. No version bump, merge or deployment.

Validation: typecheck, web build and the four affected test files (`summon-fx`, `summon-skip`, `heroes-seen`, `no-flicker`) passed. `tools/summoner/check.mjs` exercises idle, casting, flash/eye shield, hero arrival, return to idle and seen-save acknowledgement at 393×852, 360×780 and 412×915, plus reduced motion at 393×852. A real lucky stone pull also reached the new scene and restored its result tile after acknowledgement. Zero page errors. Captures and JSON are in `docs/samples/summoner/`. Ready for owner review; no separate real-device check.
