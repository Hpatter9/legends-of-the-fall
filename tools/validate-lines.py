import json,sys,re,collections
b=json.load(open(sys.argv[1])); a=json.load(open(sys.argv[2]))
P=[]
def bad(*m): P.append(' '.join(map(str,m)))
LIM={'quip':70,'grumble':90,'tip':130,'scene':110,'cap':24,'story':260,'lore':160}
lens=collections.Counter(); allt=[]
def chk(t,lim,where):
  if not isinstance(t,str): bad('not str',where); return
  allt.append((where,t))
  if len(t)>lim: lens[where.split('.')[0]]+=1; 
  if len(t)>lim*1.25: bad('LONG',len(t),'>',lim,where,repr(t[:90]))
  if re.search(r'[‘’“”—–]',t): lens['curly/dash']+=1
  if re.search(r'[\U0001F300-\U0001FAFF☀-➿]',t): bad('emoji',where)
  if '*' in t or '_' in t[:1]: bad('markdown?',where,t[:60])
# hero quips
kinds=['hired','placed','won','lost','levelUp','ultimate','revived','lowHp']
for h in a['hero_quips']:
  q=b['hero_quips'].get(h)
  if not q: bad('missing hero',h); continue
  for k in kinds:
    v=q.get(k)
    if not isinstance(v,list) or len(v)!=3: bad('quip shape',h,k,type(v).__name__, len(v) if v else 0)
    else:
      for i,t in enumerate(v): chk(t,70,f'quip.{h}.{k}{i}')
  extra=set(q)-set(kinds)
  if extra: bad('extra kinds',h,extra)
for tr in a['banter']:
  v=b['banter'].get(tr)
  if not v or len(v)!=5: bad('banter',tr,len(v) if v else 0)
  else:
    for i,p in enumerate(v):
      if len(p)!=2: bad('pair',tr,i)
      for t in p: chk(t,70,f'banter.{tr}.{i}')
d=b['duchess']
for k in ['tap','nibble','bigHit','boss','wipe']:
  v=d.get(k,[]); 
  if not 6<=len(v)<=8: bad('duchess count',k,len(v))
  for t in v:
    chk(t,40,f'duchess.{k}')
    if not re.fullmatch(r"\s*(M+e+h+|Nom|N+o+m+)[\w\s.!?,()'\-]*",t,re.I) : bad('duchess speaks words?',repr(t))
if len(d.get('ate',[]))!=25: bad('ate count',len(d.get('ate',[])))
for t in d.get('ate',[]): chk(t,60,'duchess.ate')
for k,n,lim in [('loading_tips',30,130),('foe_grumbles',40,90),('recap_win',12,90),('recap_loss',12,90),('result_win',12,90),('result_loss',12,90)]:
  v=b[k]
  if len(v)!=n: bad('count',k,len(v),'want',n)
  for t in v: chk(t,lim,k)
  if len(set(v))!=len(v): bad('dupes in',k)
if set(b['award_jokes'])!=set(a['award_jokes']): bad('award keys differ', set(a['award_jokes'])^set(b['award_jokes']))
for k,t in b['award_jokes'].items(): chk(t,90,'award.'+k)
for name,lim in [('hero_story',260),('foe_lore',160)]:
  if set(b[name])!=set(a[name]): bad(name,'keys differ', set(a[name])^set(b[name]))
  for k,t in b[name].items(): chk(t,lim,f'{name}.{k}')
# scenes
if set(b['scenes'])!=set(a['scenes']): bad('scene ids differ', set(a['scenes'])^set(b['scenes']))
for sid,sa in a['scenes'].items():
  sb=b['scenes'].get(sid)
  if not sb: continue
  if sb.get('cast')!=sa['cast']: bad('cast changed',sid)
  if len(sb['shots'])!=len(sa['shots']): bad('shot count',sid,len(sa['shots']),len(sb['shots'])); continue
  chk(sb.get('title',''),40,f'scenetitle.{sid}'); chk(sb.get('blurb',''),160,f'sceneblurb.{sid}')
  for i,(x,y) in enumerate(zip(sa['shots'],sb['shots'])):
    if (x['caption'] is None)!=(y.get('caption') is None): bad('caption null changed',sid,i)
    if y.get('caption'): chk(y['caption'],24,f'cap.{sid}.{i}')
    if len(x['lines'])!=len(y['lines']): bad('line count',sid,i,len(x['lines']),len(y['lines'])); continue
    for j,(l1,l2) in enumerate(zip(x['lines'],y['lines'])):
      if l1['who']!=l2.get('who'): bad('who changed',sid,i,j,l1['who'],l2.get('who'))
      chk(l2.get('text'),110,f'scene.{sid}.{i}.{j}')
      if l2.get('who')=='duchess' and not re.match(r'\s*(M+e+h|N+o+m)',l2['text'],re.I): bad('duchess line',sid,repr(l2['text']))
      if l2.get('who')=='gorvak' and l2['text']!=l2['text'].upper(): bad('gorvak not caps',sid,repr(l2['text'][:50]))
for k in ['waveStart','bossWave','hurt','lowHp','waveCleared','fallen']:
  v=b['king'].get(k,[])
  if len(v)!=6: bad('king',k,len(v))
  for t in v: chk(t,70,'king.'+k)
for k in ['waveStart','bossWave']:
  v=b['last_stand_foes'].get(k,[])
  if len(v)!=8: bad('lsfoes',k,len(v))
  for t in v: chk(t,90,'lsfoes.'+k)
# robots caps
for h in ['rifleBot','siegeBot']:
  for k,v in b['hero_quips'].get(h,{}).items():
    for t in v:
      if t!=t.upper(): bad('robot not caps',h,repr(t))
for k,v in b['hero_quips'].get('shambler',{}).items():
  for t in v:
    if 'rrng' not in t.lower(): lens['shambler no hrrngh']+=1
# american spellings
AM=r'\b(color|honor|favor|armor|realize|realiz|organiz|recogniz|apologiz|center|theater|gray|mom|neighbor|labor|valor|defense|offense|traveled|canceled|jewelry|catalog|program\b|math\b|vacation|cookie|candy|awesome|okay|gotten|fall\b)'
for w,t in allt:
  m=re.search(AM,t,re.I)
  if m: bad('american?',m.group(0),w,repr(t[:70]))
# global dupes
c=collections.Counter(t for _,t in allt)
d2=[(t,n) for t,n in c.items() if n>1 and len(t)>12]
print('total strings',len(allt)); print('over-limit (soft) by area',dict(lens)); print('repeated strings',len(d2), d2[:8])
print(len(P),'problems'); print('\n'.join(P[:80]))
