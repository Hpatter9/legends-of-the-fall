# Hero arrival showcase

The owner approved the larger illustrated arrival concept, then asked for the character's sprite in front, performing a small attack and then idling.

Implemented on `design/hero-arrival-showcase` in `/workspace/legends-of-the-fall`. The chamber now charges for 1.4 seconds, releases a beam and arrival flash, and reveals the existing full hero illustration with the real battle sprite in front. The sprite performs its own attack once over 650 ms, then loops its idle frames. A ground impact, drifting embers, slow rays and the ceremonial nameplate complete the arrival. Existing rise, arrival and impact audio cues follow the beats; skip and acknowledgement hush the show bus.

`src/render/revealSprite.ts` uses a fixed crop across every idle and attack frame, preserving feet and weapon reach. It only redraws when the frame changes, starts when the hero arrives and cancels its animation frame on acknowledgement. Reduced motion uses a static idle pose, a calm fade and no charge, beam, shake, sparks or impact flash. Skipping the charge directly to the final view starts idle immediately.

The existing first-reveal queue, double-tap guard, seen/save acknowledgement, reward rules, shard cards and battle simulation are retained. Illustrations already ship in the offline manifest; sprites and chamber effects are bundled. No new assets or credit entries were needed. No version bump, merge or deployment.

Validation: typecheck, web build and the four affected test files (`heroes-seen`, `summon-fx`, `summon-skip`, `no-flicker`) passed. `tools/summoner/arrival-check.mjs` passed at 393×852, 360×780 and 412×915, plus reduced motion at 393×852, with no page errors. It checks attack frame progression into idle, continued idle animation, the skip/double-tap guard, seen-save acknowledgement, loaded art, sprite/nameplate/continue bounds, varied body and weapon shapes, a real lucky stone through the queue and an offline reload. Captures and results are under `docs/samples/summon-arrival/`. Browser screenshots were visually reviewed at all three phone sizes and in reduced motion. No separate real-device check.
