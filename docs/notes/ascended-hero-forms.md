# ART-ASCEND — Permanent upgraded forms

Branch: `art/ascended-hero-forms`.

The owner approved permanent evolved hero designs for ascension, with the existing class auras reused for combat tier progression on either form. In the game, the permanent hero system is called Awakening; Calamity Ascension is a different system and is outside this task.

## Visual proposal

[Generated concept sheet](../samples/ascended-heroes/concept.png).

A generated concept sheet compares Knight, Archer and Fire Wizard: base costume, awakened costume without aura, then the same awakened costume with light and strong combat effects. This is concept artwork, not an implemented screenshot. Specific costume direction awaits owner review as required by AGENTS.md before substantial visual implementation.

Preserve each hero's face, palette, weapon type and identity. Upgrades must change equipment and silhouette, not just recolour the original. Knight gains ornate silver-and-gold armour and blue heraldic equipment; Archer richer crimson lamellar and a more elaborate yumi; Fire Wizard layered scarlet/charcoal robes and an upgraded crystal staff. Actual in-game effects will reuse the existing class aura atlas, including the caster's violet runes.

Proposed combat mapping: grade 1 no class aura, grade 2 current light aura, grade 3 current strong aura. This is independent of permanent awakening, and applies to both original and upgraded designs. First Awakening would unlock the evolved design; the second keeps that design unless the owner requests a second distinct evolution. No balance or progression cost changes are proposed.

## Stronger evolution revision

[Revised powerful forms concept](../samples/ascended-heroes/concept-powerful.png).

Owner feedback on the first sheet: “I want them to feel even more powerful in their awaked form”. The next concept pushes equipment and silhouette much further: champion Knight with broad sculpted plate, enormous heraldic shield and broad sword; war-general Archer with sweeping kabuto crest, imposing crimson lamellar, war mantle and grand yumi; archmage Fire Wizard with high layered mantle, dramatic flame-shaped robes and large branching crystal staff. The awakened-only column remains free of aura so the permanent design must communicate power by itself. Faces and core palettes stay recognisable. Revision awaits visual review; no production integration yet.

## Distinct legendary gear and mage eyes

[Legendary equipment concept](../samples/ascended-heroes/concept-legendary-gear.png). This presentation enlarges the awakened figures for equipment detail and crops the lower Archer/Wizard bodies; production sheets must show complete bodies at consistent gameplay scale.

Further owner direction: the awakened form needs new upgraded gear, and mages should have glowing eyes. The next comparison isolates base versus awakened forms without combat auras. Equipment must change visibly in shape and construction, rather than just size or ornament: Knight gets a crystal-core broad sword and lion-relief tower shield, Archer a dragon-limbed yumi and new dragon-scale lamellar, Fire Wizard an elaborate suspended-crystal staff and runic archmage coat. The Fire Wizard has clearly glowing molten-gold eyes with restrained local light. Mage eye glow is intrinsic to the permanent form, separate from the class aura used for combat tiers. Non-mage pilot heroes retain natural eyes. Full-roster glow colours should suit each mage's identity; exact roster mapping remains to be specified during implementation. This remains a concept revision, with no production code changes.

## Approved gear, compact proportions

The owner accepted the legendary equipment direction: “Yes, this is more of what I'm looking for. The characters don't have to end up so wide though. But I like the upgraded gear”. Preserve the new equipment designs and mage eye glow. Bring body widths and shoulder proportions close to current production sprites; fold capes down behind the body, keep shields close, and use vertical bow/staff idle poses. The [compact design reference](../samples/ascended-heroes/concept-compact.png) captures this correction, with full bodies, narrower shoulder armour and vertical bow/staff idle poses. The approved gear direction does not require another approval of the same design choice; this latest concept is a proportion refinement. Production animation sheets and runtime integration remain outstanding.

## Implementation findings

- `src/render/awakenLook.ts`: `lookSheet` currently ignores permanent rank and selects only the combat-grade form.
- `src/render/unitView.ts`: class aura currently depends on `unit.awaken`; combat grade already controls size, tint and promotion effects.
- `src/render/awakenRig.ts`: shared menu/canvas rig resolves through `lookSheet`; aura is separately selected from permanent rank.
- `src/render/auraStyles.ts`: all thirteen class styles have light and strong variants ready for reuse.
- Current production roster has 45 heroes with paired front/rear sheets, action poses and eight-frame walk cycles. Upgraded production forms must preserve that coverage, transformation aliases, offline availability and reduced motion.
- Anime gallery artwork is a separate presentation asset set; whether its full-art scenes also evolve remains unspecified. This proposal focuses on battle/canvas hero forms first.

## Handoff and validation

Concept phase only. No runtime code, simulation rules, saves, production artwork or aura selectors changed. Runtime checks not run because executable code is unchanged. Review the generated concept and confirm the costume direction before full-roster generation and integration. No merge, release or deployment performed.
