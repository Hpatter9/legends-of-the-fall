# The 14 remade heroes (docs/notes/hero-art.md): id -> (canvas, style refs, description, clips). Prompts only; gen.py runs them.
SD='side-view pixel art, crisp single pixels, dark outlines, soft shading, realistic adult proportions, muted palette'
def D(d):return d+', side view facing right, standing idle, full body'
# clips: which rows get an animation (idle/walk/attack/hurt/dead always; attack2 for the heroes whose skill casts it)
HEROES={
 'wolf_bard':dict(canvas=80,refs=['knight_1','fire_wizard'],cast=True,anims=dict(
   walk='walking steadily to the right with big clear strides, legs clearly alternating, body bobbing, tail swaying, lute held in front',
   attack='playing the lute fiercely: strumming hard and leaning forward with a burst of sound to the right, then recovering',
   hurt='flinching backwards sharply in pain, head thrown back, body recoiling, then straightening',
   dead='dying: struck and knocked backwards, the lute flying from his hands, body toppling over backwards, falling onto the back and lying still on the ground'),
  desc=D('wolf bard: an anthropomorphic grey wolf with a pointed-ear wolf head and snout, a green feathered cap, blue tunic and brown leather vest with a red scarf, strumming a wooden lute')),
 'dragoon':dict(canvas=96,refs=['knight_1','samurai_commander'],cast=True,anims=dict(
   walk='marching forward to the right in big clear strides, legs clearly alternating, body swaying, lance held upright over the shoulder, wings fluttering',
   attack='lunging forward to the right and thrusting the long lance in a powerful stab, then pulling back and recovering, no effects',
   hurt='recoiling backwards sharply after being struck, staggering back with the head thrown back, then recovering',
   attack2='rearing back, then lunging forward and thrusting the lance to the right with a roar, wings spread wide, no effects'),
  desc=D('Queen Dragoon, a regal woman dragon-knight in teal and gold dragon-scale plate armour with a horned dragon-crest helm and small dragon wings on her back, holding a long lance')),
 'mercenary':dict(canvas=80,refs=['knight_1','samurai'],cast=False,
  desc=D('grizzled mercenary swordsman with a scarred stubbled face, worn leather and chainmail, dark travelling cloak, a notched broadsword, a coin pouch on the belt')),
 'beastmaster':dict(canvas=80,refs=['knight_1','kunoichi'],cast=True,
  desc=D('wild beastmaster in fur-trimmed leather with feathers and bone charms, wolf-tooth necklace, face paint, holding a coiled leather whip')),
 'time_witch':dict(canvas=80,refs=['fire_wizard','lightning_mage'],cast=True,
  desc=D('time witch in indigo and gold robes with a tall pointed hat, a clock-face amulet, holding a staff topped with a glowing golden hourglass')),
 'priestess':dict(canvas=80,refs=['fire_wizard','knight_1'],cast=True,
  desc=D('high priestess in ornate white and gold robes with a tall mitre headdress and a glowing halo, holding a long staff topped with a golden star')),
 'sage':dict(canvas=80,refs=['fire_wizard','lightning_mage'],cast=True,
  desc=D('great sage, an old man with a long white beard in deep blue star-patterned robes and a wide pointed hat, holding a gnarled staff with a glowing star orb')),
 'demon_swordsman':dict(canvas=80,refs=['samurai','knight_1'],cast=False,
  desc=D('demon swordsman with dark red skin, small black horns and glowing red eyes, black spiked armour, wielding a jagged black greatsword with a red glow')),
 'buccaneer':dict(canvas=80,refs=['knight_1','kunoichi'],cast=False,
  desc=D('pirate buccaneer in a red bandana and tricorn hat, open white shirt and brown coat, a cutlass in one hand and an iron grappling hook in the other')),
 'dread_pirate':dict(canvas=80,refs=['knight_1','skeleton_warrior'],cast=True,
  desc=D('undead dread pirate captain with a skeletal face and glowing green eyes, tattered black captain coat and feathered tricorn hat, rusty cutlass, faint ghostly green glow')),
 'kraken_mate':dict(canvas=96,refs=['knight_1','minotaur_1'],cast=True,
  desc=D('kraken mate, a ship mate with a purple squid head and writhing tentacles for a beard, big yellow eyes, navy sailor jacket, holding an iron harpoon')),
 'lancer':dict(canvas=128,refs=['minotaur_1','samurai_commander'],cast=False,
  desc=D('mounted lancer knight riding a brown armoured warhorse, steel plate armour with a blue plume, holding a long lance forward')),
 'mummy':dict(canvas=80,refs=['knight_1','skeleton_warrior'],cast=True,
  desc=D('ancient mummy tightly wrapped in aged linen bandages with glowing yellow eyes, tattered wraps trailing, a gold collar, hunched')),
 'juggernaut':dict(canvas=128,refs=['minotaur_1','samurai_commander'],cast=True,
  desc=D('juggernaut, a huge hulking knight in heavy riveted iron plate with a tiny helmet and enormous gauntlet fists, bulky and towering, menacing, fills the canvas')),
}
ANIMS={'idle':'standing idle, breathing gently with a slight bob, staying in place, facing right',
 'walk':'walking steadily to the right with clear steps, one leg then the other, body swaying, weapon carried',
 'attack':'attacking with a strong swing or strike of the weapon to the right, then recovering',
 'hurt':'flinching backwards in pain after being struck, recoiling, then straightening',
 'dead':'dying: struck and knocked backwards, body toppling over backwards, falling onto the back and lying still on the ground',
 'attack2':'casting a spell: raising the weapon forward to the right with magic glowing around it, then lowering it'}
