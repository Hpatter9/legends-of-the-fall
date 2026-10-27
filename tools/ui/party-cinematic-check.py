from playwright.sync_api import sync_playwright
from pathlib import Path
import argparse
import re

# Run after npm run web, with out/web served locally:
# python tools/ui/party-cinematic-check.py [--url http://127.0.0.1:8000] [--chromium /usr/bin/chromium]
parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:8000')
parser.add_argument('--chromium',default='/usr/bin/chromium')
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
unit_source=(root/'src/sim/units.ts').read_text()
heroes=re.findall(r"'([^']+)'", unit_source.split('export const HEROES')[1].split(';')[0])+re.findall(r"'([^']+)'", unit_source.split('export const ALL_HEROES:')[1].split(';')[0])
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=args.chromium,args=['--no-sandbox','--no-proxy-server','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for w,h in [(393,852),(360,780),(412,915)]:
  page=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(args.url.rstrip('/')+'/?seed=7',wait_until='domcontentloaded')
  page.wait_for_function('!!window.__game',timeout=60000)
  page.evaluate('''() => {const g=window.__game;g.meta.unlocked=['knight','archer','wizard','cleric','samurai','paladin','kunoichi','ninjaMonk','peasant','priestess','lightningMage'];g.meta.party=g.meta.unlocked.slice(0,5);g.party.open('start',()=>{});document.getElementById('tip').hidden=true;}''')
  page.screenshot(path=str(root/f'docs/samples/party-cinematic-{w}.png'))
  print(w,page.locator('#ptScene').bounding_box(), 'errors',errors,flush=True)
  assert not errors
  assert page.locator('#ptGo').is_enabled()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert page.locator('#ptSlots canvas').count()==0
  assert page.locator('#ptSlots .ptSlotNumber').count()==5
  if w==393:
   selected=page.locator('#ptSlots button').first
   selected.dispatch_event('pointerdown')
   page.wait_for_timeout(500)
   assert page.locator('#ptSheet').is_visible()
   selected.dispatch_event('pointerup')
   selected.dispatch_event('click')
   assert page.locator('#ptSlots button').count()==5
   page.evaluate('window.__game.party.closeSheet()')
  # A stable freeze frame, even as ambient embers move around it.
  frozen=page.locator('#ptTableau canvas').evaluate('(c)=>c.toDataURL()')
  page.wait_for_timeout(250)
  assert frozen==page.locator('#ptTableau canvas').evaluate('(c)=>c.toDataURL()')
  page.locator('#ptSlots button').first.click()
  assert page.locator('#ptGo').is_disabled()
  assert page.locator('#ptCount').inner_text()=='4 / 5 ready'
  assert frozen!=page.locator('#ptTableau canvas').evaluate('(c)=>c.toDataURL()')
  page.locator('#ptSearch').fill('Knight')
  assert page.locator('#ptGrid .ptCard').count()==1
  page.locator('#ptGrid .ptCard').click()
  assert page.locator('#ptGo').is_enabled()
  page.locator('#ptSearch').fill('no such hero')
  assert page.locator('#ptNoResults').is_visible()
  page.locator('#ptSearch').fill('')
  page.locator('#ptFilters button').last.click()
  assert page.locator('#ptGrid .ptCard').count()>0
  assert all(t=='Support' for t in page.locator('#ptGrid .ptCardRole').all_text_contents())
  page.locator('#ptFilters button').first.click()
  page.locator('#ptSuggest').click()
  assert page.locator('#ptGo').is_enabled()
  page.locator('#ptBonds summary').click()
  assert page.locator('#ptTraits').is_visible()
  page.locator('#ptBody').evaluate("e=>{e.scrollTop+=document.getElementById('ptSearch').getBoundingClientRect().top-e.getBoundingClientRect().top}")
  page.screenshot(path=str(root/f'docs/samples/party-cinematic-roster-{w}.png'))
  assert not errors,errors
  # Back discards, save commits the draft and runs its callback exactly once.
  page.locator('#ptBack').click()
  assert page.locator('#party').is_hidden()
  assert page.evaluate("window.__game.meta.party.join(',')")=='knight,archer,wizard,cleric,samurai'
  page.evaluate("window.__game.party.open('edit',()=>{window.partySaved=(window.partySaved||0)+1})")
  assert page.locator('#ptGo').inner_text()=='Save company'
  assert page.locator('#ptBody').evaluate('(e)=>e.scrollTop')==0
  page.locator('#ptSuggest').click()
  page.locator('#ptGo').click()
  assert page.evaluate('window.partySaved')==1
  assert page.evaluate("JSON.parse(localStorage.getItem('legends.meta')).party.join(',')===window.__game.meta.party.join(',')")
  # Three-hero starter and empty party states remain valid.
  page.evaluate("window.__game.meta.unlocked=['knight','archer','wizard'];window.__game.meta.party=['knight','archer','wizard'];window.__game.party.open('start',()=>{})")
  assert page.locator('#ptSlots button').count()==3
  assert page.locator('#ptGo').is_enabled()
  for _ in range(3):page.locator('#ptSlots button').first.click()
  assert page.locator('#ptGo').is_disabled()
  assert page.locator('#ptSceneTitle').inner_text()=='Your legend begins here.'
  page.emulate_media(reduced_motion='reduce')
  assert page.locator('.ptEmbers i').first.evaluate("e=>getComputedStyle(e).animationName")=='none'
  print(w,'interaction, draft/save, starter, stable texture, reduced-motion checks passed',flush=True)
  if w==393:
   # Locked dossiers still open, and every available hero can join the tableau.
   page.locator('#ptGrid .locked').first.locator('.ptInfo').click()
   assert page.locator('#ptSheet').is_visible()
   page.evaluate('window.__game.party.closeSheet()')
   page.evaluate('(heroes)=>{window.__game.meta.unlocked=heroes}',heroes)
   for offset in range(0,len(heroes),5):
    draft=heroes[offset:offset+5]
    page.evaluate('(draft)=>{window.__game.meta.party=draft;window.__game.party.open("edit",()=>{})}',draft)
    assert page.locator('#ptSlots button').count()==len(draft)
    assert page.locator('#ptTableau canvas').evaluate('(c)=>c.getContext("2d").getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)')
   print('All',len(heroes),'heroes rendered in party tableaux without page errors',flush=True)
   assert not errors,errors
   # Every scene URL is part of the existing offline cache list.
   sw=(root/'out/web/sw.js').read_text()
   for resource in ['ui/hero-brass-frame.png','areas/ruins/bg4.png','areas/warcamp/bg1.png','areas/warcamp/bg2.png']:
    assert resource in sw,resource
  page.close()
 b.close()
