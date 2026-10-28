// Defeated Boss Trophy Wall: a decorative wooden plaque & trophy rack in the Tavern & Castle Hall
// showcasing caricatures/tokens of defeated Calamity and Spire bosses with humorous defeat blurbs.

import type { Meta } from './sim/meta';
import { play } from './render/sound';

export interface BossTrophy {
  id: string;
  name: string;
  title: string;
  origin: 'calamity' | 'spire';
  badgeIcon: string;
  accentColor: string;
  blurb: string;
  humorousLore: string;
  defeatTag: string;
}

export const BOSS_TROPHIES: readonly BossTrophy[] = [
  // --- Calamity Bosses ---
  {
    id: 'calBoss1',
    name: 'Gorvak the Ashen',
    title: 'First Herald of the Calamity',
    origin: 'calamity',
    badgeIcon: '🌋👹',
    accentColor: '#ef4444',
    blurb: 'Claimed the thick volcanic soot was "part of an ancient exfoliating skincare routine". Lost his war-axe in a badger hole on retreat.',
    humorousLore: 'Witnesses report Gorvak spent twenty minutes after the battle shouting challenges at a moderately tall scarecrow.',
    defeatTag: 'EXTINGUISHED & MOUNTED',
  },
  {
    id: 'calBoss2',
    name: 'The Thorn Warden',
    title: 'The Bramble That Remembers',
    origin: 'calamity',
    badgeIcon: '🥀🪵',
    accentColor: '#10b981',
    blurb: 'Complained bitterly that the heroes\' hedge-clippers violated ancient woodland zoning regulations. Left in a huff to compost peacefully.',
    humorousLore: 'Our druid pruned several of his prize branches; they are currently growing very confused heirloom raspberries behind the stable.',
    defeatTag: 'PRUNED & DRIED',
  },
  {
    id: 'calBoss3',
    name: 'Malphas',
    title: 'He Who Calls the Hordes',
    origin: 'calamity',
    badgeIcon: '🦇👑',
    accentColor: '#8b5cf6',
    blurb: 'Disbanded the Infernal Legions after finding out overtime was paid exclusively in sulphur vouchers. Last seen filing union paperwork.',
    humorousLore: 'His dreaded cape was snagged on a weathercock during his dramatic airborne escape. It now serves as a very theatrical draught-excluder.',
    defeatTag: 'GROUNDED & PINNED',
  },
  {
    id: 'calBoss4',
    name: 'Hrungar the Mountain',
    title: 'The Wall That Walks',
    origin: 'calamity',
    badgeIcon: '🏔️🗿',
    accentColor: '#06b6d4',
    blurb: 'Firmly insisted he wasn\'t knocked flat, merely taking an unhurried tectonic power-nap to recalibrate regional gravity.',
    humorousLore: 'Tavern patrons regularly use his chipped ear fragment as a remarkably heavy coaster for foaming tankards.',
    defeatTag: 'QUARRIED & HUNG',
  },
  {
    id: 'calBoss5',
    name: 'Vorgrath the Hellbringer',
    title: 'Bringer of the Last Flame',
    origin: 'calamity',
    badgeIcon: '🔥🐍',
    accentColor: '#f97316',
    blurb: 'Extinguished by a single bucket of murky tavern dishwater. His legendary cursed cauldron is currently boiling turnip broth.',
    humorousLore: 'Threatened to incinerate our wizard\'s lineage, but sneezed into his own flame-sack and singed his favorite loincloth.',
    defeatTag: 'SNUFFED & CURED',
  },
  {
    id: 'calBoss6',
    name: 'Karnok the Calamity',
    title: 'The End of All Roads',
    origin: 'calamity',
    badgeIcon: '🐗⚡',
    accentColor: '#eab308',
    blurb: 'Missed his catastrophic charge by four yards, skidded through three haystacks, and was thoroughly pacified with Duchess\'s spare cabbage.',
    humorousLore: 'The final herald of doom was conquered not with divine wrath, but by Duchess headbutting his left kneecap.',
    defeatTag: 'TUSKS DISPLAYED',
  },

  // --- Spire & Army Bosses ---
  {
    id: 'lichKing',
    name: 'The Lich King',
    title: 'Lord of Cold Tombs',
    origin: 'spire',
    badgeIcon: '💀❄️',
    accentColor: '#93c5fd',
    blurb: 'Swore vengeance as soon as he located his spare phylactery, which he unfortunately left in the pocket of his other winter robe.',
    humorousLore: 'His chilling aura of despair was ruined when our cleric offered him a warm woollen scarf and a cup of chamomile tea.',
    defeatTag: 'SKELETON BAGGED',
  },
  {
    id: 'oniKing',
    name: 'The Oni King',
    title: 'Mountain Cleaver',
    origin: 'spire',
    badgeIcon: '👺🪓',
    accentColor: '#f43f5e',
    blurb: 'Admitted that challenging five heavily armed heroes at once was "perhaps overambitious on an empty stomach".',
    humorousLore: 'His giant spiked kanabo club proved entirely unwieldy once grease from a dropped meat pie made the grip slippery.',
    defeatTag: 'HORNS MOUNTED',
  },
  {
    id: 'demonLord',
    name: 'The Demon Lord',
    title: 'The Iron Horn',
    origin: 'spire',
    badgeIcon: '😈🔱',
    accentColor: '#ec4899',
    blurb: 'Demanded a refund on his brimstone guarantee after our paladin delivered an unscheduled 40-minute lecture on chivalric table manners.',
    humorousLore: 'Reportedly traumatized by the sheer quantity of holy water splashed on his freshly polished brimstone cuirass.',
    defeatTag: 'BANISHED & TAGGED',
  },
  {
    id: 'sapphireColossus',
    name: 'Sapphire Colossus',
    title: 'The Glacial Pillar',
    origin: 'spire',
    badgeIcon: '💎❄️',
    accentColor: '#38bdf8',
    blurb: 'Currently being utilized as a high-end decorative paperweight in the Keep\'s royal taxation and customs bureau.',
    humorousLore: 'The colossus shed three carats of sapphire during its defeat; the royal accountant immediately logged them under "unforeseen clerical gains".',
    defeatTag: 'CHIPPED & POLISHED',
  },
  {
    id: 'forgeTitan',
    name: 'Forge Titan',
    title: 'Furnace Heart',
    origin: 'spire',
    badgeIcon: '⚙️🔥',
    accentColor: '#d97706',
    blurb: 'Overheated when the wizard cast deepfreeze directly into its ventilation chute. Currently operating as the barracks waffle iron.',
    humorousLore: 'Produces sixty crisp golden waffles every morning, though its chimney still mutters muffled mechanical curses.',
    defeatTag: 'REPURPOSED IN BRASS',
  },
  {
    id: 'gorgonQueen',
    name: 'The Gorgon Queen',
    title: 'Serpent Matron',
    origin: 'spire',
    badgeIcon: '🐍👁️',
    accentColor: '#84cc16',
    blurb: 'Attempted to petrify our knight, but his shield was polished so mirror-bright that her snake-hair petrified itself into permanent curls.',
    humorousLore: 'Her petrified vipers are now marketed across local bazaars as avant-garde serpentine hat-pins.',
    defeatTag: 'PETRIFIED PLAQUE',
  },
  {
    id: 'orcWarlord',
    name: 'Orc Warlord',
    title: 'The Unbroken',
    origin: 'spire',
    badgeIcon: '⚔️🛡️',
    accentColor: '#e11d48',
    blurb: 'Retired from warlording to pursue competitive giant turnip farming. Reports significantly lower blood pressure and excellent harvest yields.',
    humorousLore: 'Frequently sends crates of artisanal root vegetables to the tavern as a gesture of grudging sporting respect.',
    defeatTag: 'HELM HUNG',
  },
  {
    id: 'minotaurChampion',
    name: 'Minotaur Champion',
    title: 'Labyrinth Brute',
    origin: 'spire',
    badgeIcon: '🐂🌀',
    accentColor: '#ca8a04',
    blurb: 'Still attempting to navigate his way out of the tavern pantry. Staff have pointed him toward the front exit on seven separate occasions.',
    humorousLore: 'Has eaten sixty-four wheels of smoked gouda while contemplating maze geography. The tavern master has opened a tab.',
    defeatTag: 'NOSE RING CLAIMED',
  },
  {
    id: 'nineTails',
    name: 'Nine-Tails Kitsune',
    title: 'Fox of the Eclipse',
    origin: 'spire',
    badgeIcon: '🦊✨',
    accentColor: '#a855f7',
    blurb: 'Tricked our peasant into trading her a plump chicken, only to realize forty miles down the road that it was a raw potato painted white.',
    humorousLore: 'Can still be heard barking indignantly from the ridge at sunset whenever someone bakes potato skins.',
    defeatTag: 'WHISKER DISPLAYED',
  },
  {
    id: 'boneCaptain',
    name: 'Bone Captain',
    title: 'Scourge of the Shallows',
    origin: 'spire',
    badgeIcon: '🏴‍☠️🦴',
    accentColor: '#94a3b8',
    blurb: 'Lost his spare peg-leg in the mud, then spent half an hour arguing salvage laws with a deeply unimpressed seagull.',
    humorousLore: 'His pirate hat was confiscated and now adorns the bust of the tavern founder behind the draft cider barrel.',
    defeatTag: 'SABRE CROSSED',
  },
  {
    id: 'hornedOgre',
    name: 'Horned Ogre',
    title: 'Tusker of the Crags',
    origin: 'spire',
    badgeIcon: '🧌🪵',
    accentColor: '#b45309',
    blurb: 'Bonked his skull on a low cave stalactite while trying to look terrifying. Decided to sit down and nurse an oversized bump instead.',
    humorousLore: 'The stalactite survived undamaged; the ogre was awarded a complimentary cold cabbage compress by the party cleric.',
    defeatTag: 'TUSK PAIRED',
  },
  {
    id: 'shamanKing',
    name: 'Shaman King',
    title: 'Void Whisperer',
    origin: 'spire',
    badgeIcon: '🔮🕯️',
    accentColor: '#6366f1',
    blurb: 'Consulted the great ancestral spirits about his battlefield odds. The spirits unanimously advised immediate surrender and hot mint tea.',
    humorousLore: 'His mystic bone rattle was swapped with Duchess\'s chew toy. The resulting divination prophesied seventy days of clover.',
    defeatTag: 'MASK CARVED',
  },
];

/** Check if a boss trophy is marked defeated in the player\'s save meta. */
export function isTrophyUnlocked(meta: Meta, trophy: BossTrophy): boolean {
  if (meta.bosses && meta.bosses.includes(trophy.id)) return true;
  if (trophy.origin === 'calamity') {
    const mapNum = parseInt(trophy.id.replace('calBoss', ''), 10);
    if (!isNaN(mapNum) && meta.calamity) {
      if (meta.calamity.clears && meta.calamity.clears > 0) return true;
      if (meta.calamity.best !== undefined && meta.calamity.best >= mapNum) return true;
    }
  }
  if (meta.bossCards && meta.bossCards.some((c) => c.includes(trophy.id))) return true;
  return false;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The Defeated Boss Trophy Wall overlay modal. */
export class TrophyWallModal {
  readonly root = el('div', 'twOverlay');
  private card = el('div', 'twCard');
  private grid = el('div', 'twGrid');
  private filter = 'all';
  private meta: Meta | null = null;
  private activeDetail: HTMLElement | null = null;

  constructor() {
    this.root.hidden = true;
    this.build();
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.root.hidden && e.key === 'Escape') this.close();
    });
  }

  private build(): void {
    this.root.replaceChildren();
    this.card.replaceChildren();

    // Plaque Header with wood/brass trim
    const header = el('div', 'twHeader');
    const titleBox = el('div', 'twTitleBox');
    const crest = el('span', 'twCrest', '🏆');
    const title = el('h2', 'twTitle', 'DEFEATED BOSS TROPHY WALL');
    const sub = el('p', 'twSub', 'Caricatures & spoils of the Calamity Heralds and Spire Champions');
    titleBox.append(crest, title, sub);

    const closeBtn = el('button', 'twCloseBtn', '✕');
    closeBtn.title = 'Close Trophy Wall (Esc)';
    closeBtn.addEventListener('click', () => this.close());
    header.append(titleBox, closeBtn);

    // Filter Chips
    const filters = el('div', 'twFilters');
    const chips: [string, string][] = [
      ['all', 'All Trophies'],
      ['calamity', 'Calamity Heralds (6)'],
      ['spire', 'Spire Champions (12)'],
    ];

    for (const [id, label] of chips) {
      const btn = el('button', `twFilterChip ${this.filter === id ? 'active' : ''}`, label);
      btn.addEventListener('click', () => {
        play('tap');
        this.filter = id;
        for (const c of filters.children) c.classList.remove('active');
        btn.classList.add('active');
        this.renderGrid();
      });
      filters.append(btn);
    }

    // Scrollable Wooden Rack Shelf Area
    const rackFrame = el('div', 'twRackFrame');
    this.grid.className = 'twGrid';
    rackFrame.append(this.grid);

    // Footer with Stats and Legend
    const footer = el('div', 'twFooter');
    const hint = el('span', 'twHint', '💡 Tap any mounted plaque to view their humorous defeat account.');
    footer.append(hint);

    this.card.append(header, filters, rackFrame, footer);
    this.root.append(this.card);
  }

  public open(meta: Meta): void {
    play('tap');
    this.meta = meta;
    this.root.hidden = false;
    this.renderGrid();
    document.body.style.overflow = 'hidden';
  }

  public close(): void {
    play('tap');
    this.root.hidden = true;
    if (this.activeDetail) {
      this.activeDetail.remove();
      this.activeDetail = null;
    }
    document.body.style.overflow = '';
  }

  private renderGrid(): void {
    if (!this.meta) return;
    this.grid.replaceChildren();

    const trophies = BOSS_TROPHIES.filter((t) => this.filter === 'all' || t.origin === this.filter);
    let unlockedCount = 0;

    for (const trophy of trophies) {
      const unlocked = isTrophyUnlocked(this.meta, trophy);
      if (unlocked) unlockedCount++;

      const plaque = el('div', `twPlaque ${unlocked ? 'unlocked' : 'locked'}`);
      plaque.setAttribute('role', 'button');
      plaque.setAttribute('tabindex', '0');

      // Decorative brass rivets in four corners
      const rTL = el('span', 'twRivet tl');
      const rTR = el('span', 'twRivet tr');
      const rBL = el('span', 'twRivet bl');
      const rBR = el('span', 'twRivet br');

      // Token Medallion / Caricature Badge
      const medallion = el('div', 'twMedallion');
      medallion.style.borderColor = unlocked ? trophy.accentColor : '#525252';

      const icon = el('span', 'twIcon', unlocked ? trophy.badgeIcon : '❓');
      medallion.append(icon);

      // Brass Nameplate
      const nameplate = el('div', 'twNameplate');
      const name = el('h4', 'twBossName', unlocked ? trophy.name : 'Unknown Threat');
      const title = el('span', 'twBossTitle', unlocked ? trophy.title : (trophy.origin === 'calamity' ? 'Calamity Void' : 'Deep Spire'));
      const statusStamp = el('span', `twStamp ${unlocked ? 'mounted' : 'loose'}`, unlocked ? trophy.defeatTag : 'STILL AT LARGE');

      nameplate.append(name, title, statusStamp);
      plaque.append(rTL, rTR, rBL, rBR, medallion, nameplate);

      const trigger = () => {
        play('tap');
        this.showDetail(trophy, unlocked);
      };

      plaque.addEventListener('click', trigger);
      plaque.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger();
        }
      });

      this.grid.append(plaque);
    }
  }

  private showDetail(trophy: BossTrophy, unlocked: boolean): void {
    if (this.activeDetail) this.activeDetail.remove();

    const detailOverlay = el('div', 'twDetailOverlay');
    const box = el('div', 'twDetailBox');
    box.style.borderTopColor = trophy.accentColor;

    const closeBtn = el('button', 'twDetailClose', '✕');
    closeBtn.addEventListener('click', () => {
      play('tap');
      detailOverlay.remove();
      this.activeDetail = null;
    });

    const top = el('div', 'twDetailTop');
    const badge = el('div', 'twDetailBadge');
    badge.textContent = unlocked ? trophy.badgeIcon : '🔒';
    badge.style.borderColor = trophy.accentColor;

    const titles = el('div', 'twDetailTitles');
    const h3 = el('h3', 'twDetailName', unlocked ? trophy.name : 'Unconquered Adversary');
    const h4 = el('span', 'twDetailTitle', trophy.title);
    const tag = el('span', `twStamp ${unlocked ? 'mounted' : 'loose'}`, unlocked ? trophy.defeatTag : 'YET TO BE BAGGED');
    titles.append(h3, h4, tag);
    top.append(badge, titles);

    const body = el('div', 'twDetailBody');
    if (unlocked) {
      const quote = el('blockquote', 'twQuote', `"${trophy.blurb}"`);
      const loreTitle = el('div', 'twLoreHead', '📜 AFTERMATH & INCIDENT REPORT:');
      const lore = el('p', 'twLoreText', trophy.humorousLore);
      body.append(quote, loreTitle, lore);
    } else {
      const lockedMsg = el('p', 'twLockedMsg', 'This dread boss continues to roam unchallenged! Conquer them in the Spire or the Calamity maps to secure their trophy and preserve the humiliating details for posterity.');
      body.append(lockedMsg);
    }

    box.append(closeBtn, top, body);
    detailOverlay.append(box);
    detailOverlay.addEventListener('click', (e) => {
      if (e.target === detailOverlay) {
        detailOverlay.remove();
        this.activeDetail = null;
      }
    });

    this.card.append(detailOverlay);
    this.activeDetail = detailOverlay;
  }
}
