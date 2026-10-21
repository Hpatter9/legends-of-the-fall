#!/bin/bash
# usage: gen.sh endpoint out.png 'json'
for i in 1 2 3; do
  code=$(curl -s -m 180 -X POST https://api.pixellab.ai/v2$1 -H 'Content-Type: application/json' -d "$3" -o $2.json -w "%{http_code}")
  if [ "$code" = 200 ]; then python3 -c "
import json,base64,sys
j=json.load(open('$2.json'))
open('$2','wb').write(base64.b64decode(j['image']['base64']))
print('ok',j['usage'])"; exit 0; fi
  echo "try $i: $code $(head -c 150 $2.json)"; sleep 5
done
