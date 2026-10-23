#!/bin/sh
# Builds a foe's sheet from the chosen takes: build.sh <id> <sheet name> walk=3 attack=7 ...  (rows=seed, as gen.py use), run from the repo root.
i=$1;s=$2;shift 2
python3 tools/pixellab/foes/gen.py use $i "$@"
python3 tools/pixellab/cut.py $i walk,attack,idle,hurt,dead >/dev/null
python3 tools/pixellab/foes/finish.py $i $s | tail -1
