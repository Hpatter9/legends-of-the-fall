#!/bin/sh
# STATUS-FX: the balance numbers before and after (docs/notes/status-fx.md, "Balance"). Run from a checkout after `npm install`:
#   sh tools/status-fx/measure.sh <out dir> [parts...]      parts: parity1 parity30 stand daily fresh calamity army stars (all by default)
# Every number is the game's own measuring tool, seeded, so a rerun on the same code prints the same.
OUT=${1:-out/status-fx-measure}
shift
PARTS=${*:-parity1 parity30 stand daily fresh calamity army stars}
mkdir -p "$OUT"
echo '{}' > "$OUT/empty.json"
for p in $PARTS; do
  echo "== $p $(date +%T)"
  case $p in
    parity1) node tools/kits/tune.mjs "$OUT/empty.json" 1 5 12000 > "$OUT/parity1.txt" 2>&1 ;;
    parity30) node tools/kits/tune.mjs "$OUT/empty.json" 30 78 12000 > "$OUT/parity30.txt" 2>&1 ;;
    stand) node tools/stand-balance.mjs --levels 1,10,20,30,60,100 --attempts 16 > "$OUT/stand.txt" 2>&1 ;;
    daily) SAVES=15 node tools/ult-charge/run.mjs 15 --only daily > "$OUT/daily.txt" 2>&1 ;;
    fresh) node tools/dailyRate.mjs --days 60 > "$OUT/fresh.txt" 2>&1 ;;
    calamity) node tools/balance.mjs --no-tables --calamity --attempts 100 > "$OUT/calamity.txt" 2>&1 ;;
    army) SAVES=8 node tools/army-pace/run.mjs normal 45,55,65,75 > "$OUT/army.txt" 2>&1 ;;
    stars) SAVES=8 node tools/army-pace/run.mjs stars 55,65 > "$OUT/stars.txt" 2>&1 ;;
  esac
done
echo "== done $(date +%T)"
