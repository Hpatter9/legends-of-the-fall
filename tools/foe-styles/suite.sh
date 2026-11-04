#!/bin/bash
# FOE-STYLES: every mode's yardstick on one tree, in two lanes (docs/notes/foe-styles.md, "The modes"). Run from the tree's root:
#   bash tools/foe-styles/suite.sh <out-dir> [lane]     lane a, b or both (default)
# Environment passes through (START=..., the tools' own knobs).
out=$1; lane=${2:-both}; mkdir -p "$out"
a() {
  SAVES=96 node tools/merge-two/run.mjs undead:0:8 beasts:0:15 wildwood:0:22 labyrinth:0:30 ogres:0:38 golems:0:52 orcs:3:55 > "$out/single.txt" 2>&1
  SAVES=48 node tools/spells-retune/run.mjs cell infernal:55:0:tph yokai:65:0:tph golems:65:0:tph > "$out/late.txt" 2>&1
  SAVES=12 node tools/spells-retune/run.mjs cell golems:100:4:tm yokai:100:4:tm infernal:100:4:tm > "$out/mythic.txt" 2>&1
  SAVES=96 node tools/merge-two/run.mjs spire:none spire:max > "$out/spire.txt" 2>&1
}
b() {
  CLIMB_ARMIES=4 node tools/balance.mjs --no-tables --climb --saves 120 > "$out/climb.txt" 2>&1
  node tools/dailyRate.mjs --days 120 > "$out/daily.txt" 2>&1
  node tools/stand-balance.mjs --levels 1,10,30,100 --attempts 40 > "$out/stand.txt" 2>&1
  node tools/boss-big/run.mjs calamity --seeds 100 > "$out/calamity.txt" 2>&1
}
case $lane in a) a ;; b) b ;; *) a & b; wait ;; esac
