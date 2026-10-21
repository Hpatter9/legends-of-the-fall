# Cuts PixelLab frames into sheets; run from a scratch folder that holds w/anim/<id>_<row>_<n>.png (see docs/notes/hero-art.md).
SD='side-view pixel art, crisp single pixels, dark outlines, muted dark-fantasy palette, adult proportions'
# id: (canvas, refs, description, rows-with-attack2?)
H={}
def hero(h,descs,cast):
    for g,d in enumerate(descs,1):
        H['cls_%s_%d'%(h,g)]=dict(canvas=80,refs=['knight','wizard'],desc=d+', side view facing right, standing idle, full body',cast=cast,grade=g,hero=h)
hero('paladin',['holy knight paladin in plate armour with gold trim, sword in right hand and heavy shield with a sun emblem',
 'veteran paladin in polished plate with gold filigree, plumed helm, red cloak and tabard, sword and large sun shield',
 'radiant high paladin in ornate golden plate, winged helm, long white cape, glowing holy sword and ornate shield'],False)
hero('cleric',['young cleric in white and cream robes with a hood, holding a mace and a holy symbol',
 'cleric in white vestments with gold trim and a mitre, holding a staff topped with a golden sun',
 'high priest in ornate white and gold robes with a halo of light, holding a grand glowing staff'],True)
hero('druid',['druid woman in green and brown leather and a leaf cloak, holding a gnarled wooden staff with a green crystal',
 'druid in a leaf and bark cloak with antler headdress and vine wrapped staff, flowers in her hair',
 'archdruid in living bark armour and a crown of antlers and leaves, glowing green staff, roots and blossoms on her cloak'],True)
hero('barbarian',['burly barbarian with bare muscular arms, fur pauldrons and loincloth, war paint, holding a big two-handed axe',
 'barbarian chief in fur and iron plates, horned iron helm, scars, a huge double-bladed axe',
 'barbarian warlord in heavy furs and spiked iron armour, horned skull helm, giant bloodied axe'],False)
hero('ranger',['ranger in a green hooded cloak and leather armour, holding a longbow, quiver on back',
 'ranger in dark green leather with bracers and a feathered hood, ornate longbow, full quiver',
 'master ranger in layered forest leather armour with a fur mantle and feather cowl, glowing enchanted longbow'],False)
hero('warlock',['dark robed warlock with a deep hood, purple and black robes, glowing purple curse flame in hand',
 'warlock in dark robes with bone pauldrons and a skull belt, hooded, swirling purple curse flame in hand',
 'dread warlock in black and violet robes with horned skull crown and spectral purple flames, cursed runes glowing'],True)
hero('illusionist',['illusionist in teal and violet robes with a half mask, tall collar and a trickster cape, holding two glowing cards',
 'illusionist in embroidered violet and gold cloak with a feathered hat and mask, glowing mirror shard in hand',
 'grand illusionist in star-patterned midnight robes, jewelled mask and tall hat, shimmering mirage trailing from his cloak'],True)
hero('gunslinger',['gunslinger in a wide brimmed hat, bandana and long duster coat, holding a long-barrelled rifle',
 'gunslinger in a leather duster with bandolier and silver spurs, long rifle with brass fittings',
 'legendary gunslinger in a black duster with gold trim, bandolier, ornate engraved long rifle, red scarf'],False)
F={}
def foe(i,d,canvas,refs,cast=False):F[i]=dict(canvas=canvas,refs=refs,desc=d+', side view facing right, standing idle, full body',cast=cast)
foe('hk_orc_grunt','green orc with crude armour, shield and a cleaver',80,['knight','wizard'])
foe('hk_orc_archer','green orc archer in leather and furs holding a crude bow, quiver of arrows',80,['knight','wizard'])
foe('hk_orc_brute','hulking green orc brute in heavy iron plates, carrying a huge spiked club',96,['knight96','mino96'])
foe('hk_orc_warlord','BOSS giant orc warlord in black spiked plate armour with a horned war crown and a huge war axe, menacing, fills the canvas',128,['mino','comm'])
foe('hk_imp','small red imp with bat wings, horns and a pointed tail, tiny, mischievous',80,['knight','wizard'])
foe('hk_demon','large winged horned demon with dark red skin and clawed hands, menacing, bat wings',128,['mino','tengu'])
foe('hk_demon_lord','BOSS towering demon lord in black spiked armour with huge curved horns, tattered wings and a flaming sword, menacing, fills the canvas',128,['mino','tengu'])
foe('hk_ogre','huge fat ogre with grey-green skin, loincloth and a giant wooden club, menacing',128,['mino','tengu'])
foe('hk_ogre_horned','BOSS giant horned ogre with big curved horns, iron shoulder plates and a huge spiked club, scarred, fills the canvas',128,['mino','comm'])
ALL={**H,**F}
ANIMS={'idle':('standing idle, breathing gently, slight bob, staying in place, facing right',4),
 'walk':('walking steadily to the right, legs swinging, weapon carried',4),
 'attack':('attacking with a strong swing or strike to the right, then recovering',4),
 'hurt':('flinching backwards in pain after being struck, recoiling, then straightening',4),
 'dead':('collapsing, falling to the ground and lying still on the ground',4),
 'attack2':('casting a spell, raising the hand or staff forward to the right with magic glowing, then lowering it',6)}
