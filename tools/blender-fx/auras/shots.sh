#!/bin/sh
# AURAS-BLENDER: each class's aura on a hero in a real fight, at 393x852 and twice the size, at the light step (combat grade 2)
# and the strong one (grade 3): tools/blender-fx/auras/shots.sh <build's folder> <out folder> [port]
# One hero of each class fights its wave alone, so nothing else's aura is in its picture. strips.py beside this lays a "before"
# folder and an "after" one side by side.
ROOT=${1:-out/web}; OUT=${2:-out/auras-shots}; PORT=${3:-11990}
for g in 2 3; do
  for hero in knight kraken samurai archer rifleBot wizard astrax priestess werewolf mercenary kitsune cleric lancer; do
    ROOT=$ROOT OUT=$OUT DSF=2 WATCH=1 AURA=1 GRADE=$g PORT=$PORT node tools/blender-fx/ult-shots.mjs --picks $hero --size 393x852 2>&1 | tail -1
  done
done
