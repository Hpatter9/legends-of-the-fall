#!/usr/bin/env bash
# Slice the approved paintings; no artwork is procedurally drawn here.
set -euo pipefail
cd "$(dirname "$0")/../.."
source_dir=art-source/ui/painted-combat
output_dir=src/art/ui
magick "$source_dir/panel-source.png" -resize 768x512 "$output_dir/combat-panel.png"
control_names=(orb heart portrait skill)
for i in 0 1 2 3; do
  x=$((i % 2 * 627)); y=$((i / 2 * 627))
  size=192; if [ "$i" -eq 1 ]; then size=96; fi
  magick "$source_dir/controls-source.png" -crop "627x627+$x+$y" +repage -trim +repage -resize "${size}x${size}" "$output_dir/combat-${control_names[$i]}.png"
done
skill_names=(shield rush slash parry volley aim fireball firewall bolt prayer arcane heal)
for i in {0..11}; do
  x=$((i % 4 * 362)); y=$((i / 4 * 362))
  magick "$source_dir/skills-source.png" -crop "362x362+$x+$y" +repage -trim +repage -resize 56x56 -gravity center -background none -extent 64x64 "$output_dir/combat-icon-${skill_names[$i]}.png"
done
magick "$source_dir/crimson-source.png" -resize 768x512 "$output_dir/combat-crimson.png"
node tools/painted-combat/icons.mjs
node tools/painted-combat/skills.mjs
