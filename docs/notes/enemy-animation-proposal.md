# Enemy idle and hurt proposal

The gear painting completion was approved and implemented first. Next priority: nine enemy sprite sheets used by the orcs,
demons, imp and ogres. Their existing sheets have a single idle frame and no dedicated hurt row. The three treant summon
forms have animated idle frames but also lack hurt rows. Older class sheets should be checked against current roster use before
spending work on them; current upgraded hero art can supersede those older sheets.

The Orc Grunt sample is a visual concept, not integrated game art. The existing credited `hk_orc_grunt.png` was supplied as
reference to OpenAI image generation to propose four breathing poses and four recoil/recovery poses. Original proposal:
`docs/samples/enemy-animation-proposal/orc-poses.png`; animated presentation: `orc-motion.gif` in the same directory. The animation
preview crops the generated poses, scales all poses by the same amount, anchors their feet and assembles them into a looping GIF.

The sample preserves the broad palette and equipment, but it is a generated approximation. Production clips must be checked
beside the original idle and attack art for identity drift and consistent pixel size before changing shipping sheets. Existing
walk, attack and death rows should stay intact. Preserve reduced-motion handling, texture stability, sheet frame counts, and
simulation behaviour. No production sprite or manifest has been changed by this proposal.

The owner approved this visual direction and the nine-enemy expansion is now implemented; see [the handoff](enemy-motion.md).
The next art priority is portraits for the Pilgrim, Deserter and Cartographer on the Calamity campfire card.
