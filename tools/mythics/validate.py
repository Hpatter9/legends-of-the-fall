#!/usr/bin/env python3
"""Validate all ten Mythic pixel sheets, their bounds, motion and paired views."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
layout=json.loads((ROOT/'src/art/units/sheets.json').read_text())
frames=0
for kind in ['vael','astrax','ilyra','orrun','nyxara']:
 hashes=[]
 for suffix in ['','_back']:
  name=f'mythic_{kind}{suffix}';l=layout[name];p=ROOT/f'src/art/units/{name}.png';im=Image.open(p).convert('RGBA')
  assert im.size==(l['w']*4,l['h']*7),(name,im.size)
  assert set(np.unique(np.array(im)[:,:,3])).issubset({0,255}),name
  walk=[]
  for row in range(7):
   for col in range(4):
    cell=im.crop((col*l['w'],row*l['h'],(col+1)*l['w'],(row+1)*l['h']));box=cell.getbbox();assert box,(name,row,col)
    assert box[0]>1 and box[1]>1 and box[2]<l['w']-1 and box[3]<l['h']-1,(name,row,col,box)
    if row in [1,2]:walk.append(hashlib.sha256(cell.tobytes()).hexdigest())
    if row==5 and col==3:assert box[2]-box[0]>box[3]-box[1],(name,'final death must lie down',box)
    frames+=1
  assert len(set(walk))==8,(name,'eight drawn strides')
  hashes.append(hashlib.sha256(p.read_bytes()).hexdigest())
 assert hashes[0]!=hashes[1],(kind,'front and rear must differ')
 for direction in ['left','right']:
  im=Image.open(ROOT/f'src/art/tavern/guests/{kind}-{direction}.webp');assert im.size==(384,440)
  assert im.getchannel('A').getextrema()==(0,255),(kind,direction)
print(f'10 pixel sheets / {frames} complete frames, all eight strides, paired rear views, final death poses and 10 tavern cutouts passed')
