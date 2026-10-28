#!/usr/bin/env bash
# Mechanical sprite slicing and padding; source originals are preserved.
# Run from the repository root; override RULER_SOURCE_DIR to use another source folder.
set -euo pipefail
scratch=$(mktemp -d /tmp/ruler-atlas-XXXXXX)
trap 'rm -rf "$scratch"' EXIT
ruler_sources=${RULER_SOURCE_DIR:-/workspace/generated_images}
mkdir -p src/art/rulers
while read -r ruler_id ruler_source; do
  convert "$ruler_sources/$ruler_source" -filter point -resize '896x1792!' "$scratch/normal.png"
  convert "$scratch/normal.png" -alpha extract -scale '1x1792!' -depth 8 "gray:$scratch/alpha.raw"
  read -ra bounds <<< "$(node tools/rulers/bounds.mjs "$scratch/alpha.raw")"
  for row in {0..7}; do
    for col in {0..3}; do
      convert "$scratch/normal.png" -crop "224x$((bounds[row + 1] - bounds[row]))+$((col * 224))+${bounds[row]}" +repage -trim +repage -filter point -resize 208x208 -background none -gravity south -extent 224x224 "$scratch/cell-$row-$col.png"
    done
  done
  montage "$scratch"/cell-*.png -tile 4x8 -geometry 224x224+0+0 -background none "src/art/rulers/$ruler_id.png"
  echo "$ruler_id"
done < <(node -e "const p=require('./src/art/rulers/provenance.json'); for(const [id,source] of Object.entries(p.sources)) console.log(id,source)")
ruler_thrones=$(node -e "console.log(require('./src/art/rulers/provenance.json').thrones.source)")
convert "$ruler_sources/$ruler_thrones" -filter point -resize '896x448!' src/art/rulers/thrones.png
