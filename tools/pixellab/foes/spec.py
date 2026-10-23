# The foes remade in the main Craftpix style (docs/notes/art-cleanup.md): id -> canvas, style refs, description, own clip prompts.
SD='side-view pixel art, crisp single pixels, dark outlines, soft shading, realistic adult proportions, muted dark-fantasy palette'
def D(d):return d+', side view facing right, standing idle, full body, fills the canvas'
BIG=['minotaur_1','samurai_commander','hk_orc_warlord']
HEROES={
 'thorn_warden':dict(canvas=128,refs=BIG,desc=D('BOSS Thorn Warden, a towering green forest beast-guardian covered in thorny vines and moss, two huge glowing purple and blue mushroom caps growing on its back and shoulders, a long curling blue tail, heavy clawed limbs, glowing white eyes')),
 'golem_stone':dict(canvas=128,refs=BIG,desc=D('stone golem, a hulking rust-orange rock giant with cracked boulder skin, huge fists, a spiked rocky crest on its head, hunched and menacing, muscular stone body')),
}
ANIMS={'idle':'standing idle, breathing heavily with a slow bob, staying in place, facing right',
 'walk':'walking steadily to the right with big heavy clear strides, legs clearly alternating, body swaying and bobbing, arms swinging',
 'attack':'attacking with a powerful swing of the arm to the right, lunging forward, then recovering, no magic effects',
 'hurt':'recoiling backwards sharply after being struck, staggering back with the head thrown back and the body flinching, then recovering',
 'dead':'dying: struck and knocked backwards, body toppling over backwards, falling onto the back and lying still on the ground',
 'attack2':'casting: raising both arms and thrusting forward to the right with a big gesture, then pulling back, no magic effects'}
