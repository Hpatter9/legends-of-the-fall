// The home screen (#home), King God Castle style: a top bar (crowns, best stage), five pages behind a bottom tab
// bar (Recruit, Heroes, Battle in the middle, Castle, Spells) that slide as you switch, and the Battle page as the hub
// with a lively scene, the stage banner, one big Battle button and the daily and tower cards. The pages re-house the
// older screens (gacha, modes, achievements, settings, castle upgrades); it only reads and changes the Meta through the
// sim's own functions.

import { heroesTabMark } from './heroesTabMark';
import { glyphWord, medal, pbUrl } from './paintedButton';
import { menuFoot, menuNote, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import { openMuster, openAssaultResult } from './assaultView';
import { runAssault } from './assaultScene';
import { claimTribute } from './sim/assault/economy';
import { abandonLive } from './sim/assault/snapshot';
import { clearBattle, loadBattle } from './assaultSave';
import { settleMourning } from './sim/oath';
import { ACT_HALLS, ROOM_NAMES } from './sim/standActs';
import { BUILDING_IDS, BUILDINGS, ROOM_BUILDINGS, buildMs, nextCost, startBuild, canBuildChapel, CHAPEL_COST, CHAPEL_MS, chapelBuilt, clockText, isRoomBuilding, maxLevel, settleWorks, siteLevel, siteName, siteNextCost, siteTop, startChapel, startSite, worksLeft, type BuildSite, type SiteId } from './sim/castle';
import { roomOpen, roomsOf } from './sim/rooms';
import { chipNumber } from './topbarRules';
import { SPAR, settleSparring, startSparring } from './sim/bonds';
import { CALLINGS, PERKS, recall } from './sim/legacy';
import { roomsStrip } from './castle';
import { CastleScene, lookPicture } from './castle';
import { BLURB, effectText } from './render/castleSpots';
import { saveMeta, stonesOf, type Meta, type Pull } from './sim/meta';
import { openStall } from './stallView';
import { closeFinished } from './screens';
import { dailyBossName } from './sim/daily';
import { dailyTheme } from './sim/dailyThemes';
import { dailyLine, dailyStatus, towerOpen } from './sim/modes';

import { ARMIES, armyById, armyCleared, armyIsNew, armyStars, armyUnlocked, bossOf, clearedCount, markSeen } from './sim/armies';
import { claimAchievement, shownAchievements, unclaimed } from './sim/achievements';
import { play, setHold } from './render/sound';
import { playStandGate } from './standGate';
import type { HomeSpot } from './render/audioRules';
import { ALL_HEROES, UNITS } from './sim/units';
import { levelOfKind } from './sim/levels';
import { drawArmies } from './armiesView';
import { drawChestStash } from './chestStash';
import { drawAchievements, toastLines } from './achievementsView';
import { openDynasty, takeSeasonNews, SEASON_WORDS, seasonOf } from './sim/dynasty';
import { agedLines, openEldersTable, openHouses, openSeasonCard, seasonChip } from './housesView';
import { cadetsOf, HEIR_NOTE, regularsOf, takeHeirNote } from './sim/heirs';
import { drawCodex, stopCodex } from './codexView';
import { claimCodex, codexWaiting, gotOf, totalOf } from './sim/codex';
import { todayKey } from './modes';
import { openSettings } from './settings';
import { modeShown } from './sim/hiddenModes';
import { chapelOpen, chapelWaits, modeOpen, MODE_NEED, opensAt, progressLine } from './sim/modeUnlock';
import { tips } from './tips';
import { ICONS, icon } from './menuArt';
import { drawHeroSheet, drawRoster, strongest } from './menuHeroes';
import { PaintedTavern } from './paintedTavern';
import { hesterNews } from './render/tavernSpots';
import { openUpgrades } from './rankUpList';
import { upgradeReady } from './sim/upgradesReady';
import { openRankUp } from './rankUpView';
import { tellAwakened } from './awakenView';
import { SummoningHall } from './hall';
import { revealUnseen } from './summonTarot';
import { Library } from './library';
import { CampScene } from './camp';
import { readyKinds } from './sim/rankUp';
import type { ComebackGo } from './sim/comeback';
import { announceArmy } from './armyShown';
import { starsOf } from './sim/questStars';
import { refreshOffers, questsWaiting, trackedQuest, progressOf, isDone } from './sim/quests';
import { questById } from './sim/questData';
import { drawQuestLog, type LogTab } from './questLog';
import type { Destination } from './sim/questGoto';
import { beginChain, bindChain, offeredChain, readyToBind, summonerWaiting } from './sim/eidolonChains';
import { hornHeld } from './sim/warHorn';
import { revealCard } from './sim/sceneReveal';
import { showEndCard } from './revealCard';
import { chainById, type ChainDef } from './sim/eidolonChainData';
import { openPactGallery } from './eidolonChainView';
import { playBinding } from './eidolonBinding';
import { heartHeld, noteSavedHeart, withHeart } from './sim/vaelkharHeart';
import type { Scene } from './sim/sceneKit';
import { closeGiverCard, openGiverCard } from './questCard';
import { showWhenPainted } from './paintReady';
import { warmPortraits } from './render/sheets';
import { councilLine, councilPlate, openNemesisBoard } from './nemesisView';
import { councilTurn } from './sim/council';
import { musterOpen, warchiefOf } from './sim/muster';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export interface HomeHooks {
  /** DEPTH-BUILD: the home screen has opened (the camp or the castle): a bond scene now due plays then. */
  onOpened?: () => void;
  /** Whether a run is saved and not over. */
  hasRun(): boolean;
  /** The saved run's stage and gold, if there is one going: with the army it fights (none for a daily, tower or older run) and a line naming it. */
  runInfo?(): { stage: number; gold: number; army?: string; label: string } | null;
  onContinue(): void;
  /** Start an army from wave 1 (the page picks the party first). */
  onArmy(id: string, tier: number, auto?: number): void;
  /** Opens the party screen to change the party (the Battle page's Party button). */
  onParty(): void;
  /** Opens the collection screen (the heroes, their ranks and the odds). */
  onRecruit(): void;
  /** Does a pull of `count`, calling `play` with the heroes it gave so the hall can show them, then opens the card reveal. */
  onSummon?(count: 1 | 10, play: (got: Pull[], skip?: boolean) => Promise<void>): void;
  onDaily(): void;
  onTower(): void;
  /** Opens the calamity: the saved run's map, or the choice of a starting hero. */
  onCalamity(): void;
  /** A line about the tower's or the calamity's saved run ("Floor 7 · continue"), or null when there is none going. */
  slotInfo?(kind: 'tower' | 'calamity'): string | null;
  /** The home screen's tab, or the armies, changed (or it was left): the ambience follows (`spot`). */
  onScene?(): void;
  /** Play a cinematic again (the codex's Scenes list). */
  onWatchScene?(id: string): void;
  /** A build was raised (the page puts up its popup): the building, or `chapel`. */
  onBuilt?(site: BuildSite): void;
  /** The top bar was drawn (EIDOLONS: the War Horn's chip beside the stones follows the save). */
  onTopBar?(): void;
  /** Begin or carry on a quest battle (batch 2 of the quests: the log's Fight, a giver's card, the Done tab's Replay). */
  onQuestBattle?(battle: string, auto?: number): void;
  /** The quest battle saved part-way, if one is (its Fight reads Continue). */
  questSaved?(): string | null;
  /** The Nemesis War: call the Warchief's Muster, or carry on the one saved (the board's gilded button). */
  onMuster?(): void;
  /** A Muster is saved part-way. */
  musterSaved?(): boolean;
  /** EIDOLON-CHAINS: play a chain's story (its giver's prologue) over the home screen; resolves when it ends. */
  onStory?(scene: Scene): Promise<unknown>;
}

type Tab = 'recruit' | 'heroes' | 'battle' | 'castle' | 'spells';
const TABS: { id: Tab; label: string }[] = [
  { id: 'recruit', label: 'Recruit' },
  { id: 'heroes', label: 'Heroes' },
  { id: 'battle', label: 'Battle' },
  { id: 'castle', label: 'Castle' },
  { id: 'spells', label: 'Spells' },
];
const SEEN = 'lotf-achievements-seen';

/** The page's storage, or null where it is blocked. */
const storage = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

const seenCount = (): number => {
  try {
    return Number(localStorage.getItem(SEEN)) || 0;
  } catch {
    return 0;
  }
};

/** Put `next` in place of `old` (or at the end of `host`), unless the two read the same: then the old one, its pictures already
 *  painted, stays. A rebuilt piece is only ever the same markup with the same handlers' targets, so keeping the old is safe. */
function swapIn(host: HTMLElement, old: Element | null, next: HTMLElement): void {
  if (old && old.outerHTML === next.outerHTML) return;
  if (old) old.replaceWith(next);
  else host.append(next);
}

export class Home {
  private tab: Tab = 'battle';
  private note = '';
  private pages = new Map<Tab, HTMLElement>();
  private tabBtns = new Map<Tab, HTMLButtonElement>();
  private camp: CampScene;
  private stopSheet: (() => void) | null = null;
  private tavern: PaintedTavern;
  private castle: CastleScene;
  private hall: SummoningHall;
  private library = new Library(() => this.show('castle'));
  private castleBar = el('div', 'ctBar');
  private castleShut = el('div', 'ctShut');
  private cardOpen = false;
  private lastViewedHero?: string;
  // (MENU-GLITCH: the pages ride one strip; `shown` is the page the strip rests on, `slide` the move under way)
  private track = el('div', 'hmTrack');
  private shown: Tab = 'battle';
  private slide: { to: Tab; from: Tab; anim: Animation | null } | null = null;
  private slideToken = 0;
  private snapNext = true;
  private primed = false;

  constructor(
    private meta: Meta,
    private hooks: HomeHooks,
  ) {
    // (the Battle page is the war camp: tapping a hero opens their sheet, the war table opens the party)
    this.camp = new CampScene((kind) => this.openSheet(kind), () => this.go(this.hooks.onParty));
    // (QUESTS: Gwen behind the bar opens her card, the board opens the log's Board tab, the Quests button its Active tab)
    this.tavern = new PaintedTavern((kind) => this.openSheet(kind), () => this.openRoster(), {
      onGwen: () => openGiverCard(this.meta, 'gwen', { changed: () => this.questsChanged(), closed: () => this.revealJoined(), openLog: () => this.openQuests('active'), fight: (id) => this.questBattle(id) }),
      onBoard: () => this.openQuests('board'),
      onQuests: () => this.openQuests('active'),
      onGiver: (key) => openGiverCard(this.meta, key, { changed: () => this.questsChanged(), closed: () => this.revealJoined(), openLog: () => this.openQuests('active'), fight: (id) => this.questBattle(id) }),
    }, {
      // (TAVERN-RANKUP: the Upgrades button's quick list, and a hero's gold chevron straight to their Rank up card)
      // (TALENT-ARROWS: a talent row's Spend, and a chevron that marks only talent points, open that hero's talent tree)
      onUpgrades: () => openUpgrades(this.meta, ALL_HEROES, () => this.refresh(), (kind) => this.openSheet(kind), (kind) => this.openSheet(kind, false, 'talents')),
      onRise: (kind) =>
        !upgradeReady(this.meta, kind) ? this.openSheet(kind, false, 'talents') : openRankUp(this.meta, kind, (t) => {
          if (t.what === 'awaken') tellAwakened(kind, t.n);
          this.refresh();
        }),
    }, {
      // (CLIFF-ROAM: Hester's corner in the hearth hall opens her stall, as the stall on the cliff did, SHOP-BOOKS-GEAR)
      onStall: () => openStall(this.meta, () => this.refresh()),
    }, {
      // (Dynasties, phase 6: the Elders' table, its regulars, the day's story and ride, and a cadet visiting)
      onElders: () => void openEldersTable(this.meta, todayKey(), () => this.refresh()),
      shown: (m) => regularsOf(m).length > 0 || cadetsOf(m).length > 0,
    });
    // (the tavern leads to the Heroes tab, the chapel to the Spells tab and the signpost to the battle screen; the six upgrades open their cards)
    this.hall = new SummoningHall({
      onSummon: (n) => this.summon(n),
      // (the Chest shop button stays as a shortcut: it opens Hester's Stall on its Chests tab, SHOP-BOOKS-GEAR)
      onShop: () => openStall(this.meta, () => this.refresh(), 'chests'),
      onCollection: () => {
        this.hall.stop();
        this.hooks.onRecruit();
      },
      // (EIDOLON-CHAINS: the Summoner's plaque and the Pact Gallery)
      onChain: () => void this.summonerTap(),
      onGallery: () => this.openGallery(),
    });
    this.castle = new CastleScene(
      (id) =>
        id === 'tavern'
          ? this.show('heroes')
          : id === 'chapel'
            ? chapelBuilt(this.meta)
              ? this.openBuilding('chapel')
              : this.openChapel()
            : id === 'armies'
              ? this.show('battle')
              : this.openBuilding(id),
      (id) => {
        // (the Chapel waits for its own stars, `chapelOpen`)
        if (id === 'chapel' && !chapelOpen(this.meta)) return false;
        const ok = startSite(this.meta, id, Date.now());
        if (!ok) return false;
        saveMeta(this.meta);
        this.refresh();
        return true;
      },
      () => this.openCodex(),
      () => this.refresh(),
    );
    const pages = $('hmPages');
    const bar = $('hmTabs');
    pages.append(this.track);
    for (const t of TABS) {
      const page = el('section', `hmPage hm-${t.id}${t.id === this.shown ? ' on' : ''}`);
      this.track.append(page);
      this.pages.set(t.id, page);
      const b = el('button', `hmTab${t.id === 'battle' ? ' hero' : ''}`);
      // (PAINTED-BUTTONS: the tab's painted medallion, and its lit one for while the tab is chosen)
      b.append(medal(`tab-${t.id}`), medal(`tab-${t.id}-lit`, 'pbIco lit'), el('span', '', t.label), el('i', 'badge'));
      // (QUESTS: the Heroes tab's gold "!" while a quest waits at the tavern to be taken or handed in)
      if (t.id === 'heroes') b.append(el('i', 'qbadge', '!'));
      // (CLIFF-ROAM: Hester's coin on the Heroes tab, the way to the tavern, while her stock is new or a trader visits)
      if (t.id === 'heroes') b.append(el('i', 'sbadge'));
      b.addEventListener('click', () => this.show(t.id));
      bar.append(b);
      this.tabBtns.set(t.id, b);
    }
    // (the recruit page is the summoning hall and the spells page the library: each draws once and keeps its place)
    this.pages.get('recruit')!.append(this.hall.root);
    this.pages.get('spells')!.append(this.library.root);
    // (the heroes page is the tavern: it draws once and keeps its place while you switch tabs)
    this.pages.get('heroes')!.append(this.tavern.root);
    // (the castle page is the courtyard, with its shortcut buttons on top)
    this.pages.get('castle')!.append(this.castleBar, this.castle.root, this.castleShut);
    // (the battle page keeps the camp behind its own content)
    this.pages.get('battle')!.append(this.camp.root);
    $('hmTrophy').addEventListener('click', () => this.openAchievements());
    $('hmGear').addEventListener('click', () => openSettings());
    $('hmSubBack').addEventListener('click', () => this.closeSub());
    glyphWord($('hmSubBack'));
    $('hmSheet').addEventListener('click', (e) => e.target === $('hmSheet') && this.closeSheet());
    // (the builders' clock: once a second while something is going up, the countdowns tick and a finished build is raised)
    setInterval(() => this.tickWorks(), 1000);
  }

  /** The builders' second: raise what is done (saved, with its build in the courtyard), else tick the countdowns on the page. */
  private tickWorks(): void {
    const m = this.meta;
    if (!m.works) return;
    const raised = settleWorks(m, Date.now());
    if (raised) {
      saveMeta(m);
      this.hooks.onBuilt?.(raised);
      this.refresh();
      // (an open card redraws with the new level)
      if (this.cardOpen && this.cardFor) this.cardFor === 'chapel' && !chapelBuilt(this.meta) ? this.openChapel() : this.openBuilding(this.cardFor);
      return;
    }
    const left = clockText(worksLeft(m, Date.now()));
    for (const e of document.querySelectorAll<HTMLElement>('.worksLeft')) e.textContent = left;
    if (this.isOpen && this.tab === 'castle') this.castle.update(m);
  }

  /** What the builders are up to, for a card's button: busy here (with the time left), busy elsewhere, or free. */
  private worksOn(site: BuildSite): 'here' | 'elsewhere' | null {
    const w = this.meta.works;
    return !w ? null : w.id === site ? 'here' : 'elsewhere';
  }
  private cardFor: BuildSite | null = null;

  /** Open the home screen; `note` is a line shown on the Battle page (the last run's end). */
  open(note = this.note): void {
    this.note = note;
    // (CLOSE-SCREENS: back to a place: any flow screen still open (a result card, a recap, a summary) is closed, not left under it)
    closeFinished();
    // (Dynasties, phase 5: the seasons open with the save's heroes, every owned kind has its line, and a season ended since is settled;
    // a new season, and a stage reached at its turn, are told once)
    this.openSeasons();
    // (coming back to the home screen it is simply there, on the Battle page: nothing slides)
    if ($('home').hidden) this.snapNext = true;
    $('home').hidden = false;
    this.handToken++;
    $('home').classList.remove('handoff', 'handoffQuiet');
    this.closeSub();
    this.closeSheet();
    this.show('battle');
    this.primeScenes();
    tips.offer('home', $('hmBattle'));
    // (a run has just ended: the crowns are there to spend)
    if (note) tips.offer('crowns', $('hmTabs'));
    // (the Nemesis War: the Dark Council takes its turn on the day's first visit, phase 2)
    if (this.meta.war && councilTurn(this.meta, 'visit', todayKey())) saveMeta(this.meta);
    // (a hero who joined and has not had its first-time reveal, one earned in play or one whose reveal was missed, has it now)
    void revealUnseen(this.meta).then(() => this.refresh());
    this.hooks.onOpened?.();
  }

  /** Dynasties: open the seasons (and the lines of heroes joined since), settle a season that has turned, and tell it. */
  private openSeasons(): void {
    const m = this.meta;
    const before = JSON.stringify(m.dynasty ?? null);
    const aged = openDynasty(m, todayKey());
    // (phase 7: a mourning that has ended: the trained heir, or a foundling, takes up the mantle)
    const mourned = settleMourning(m, Date.now(), todayKey());
    const news = takeSeasonNews(m, todayKey());
    if (JSON.stringify(m.dynasty ?? null) !== before) saveMeta(m);
    // (phase 6: a save whose Hall had mentors before the heirs is told once that they may name one)
    const note = takeHeirNote(m);
    if (note) saveMeta(m);
    toastLines([...(news ? [`${SEASON_WORDS[news.name]} has come: Year ${news.year} of the War`] : []), ...agedLines(aged), ...(note ? [HEIR_NOTE] : []), ...mourned]);
  }

  /** The Houses (Dynasties): the family tree, on a line when one is given. */
  openHouses(kind?: string): void {
    openHouses(this.meta, todayKey(), kind);
  }

  /** The Dark Council's board (the Nemesis War): its Hunt opens an army, its Muster calls the page's. */
  openCouncil(tab?: 'council' | 'news' | 'fallen' | 'spoils'): void {
    const m = this.meta;
    openNemesisBoard(m, { hunt: (army) => this.openArmies(army), ...(this.hooks.onMuster ? { muster: () => this.go(this.hooks.onMuster!) } : {}), musterSaved: !!this.hooks.musterSaved?.(), day: todayKey(), save: () => (saveMeta(m), this.refresh()) }, tab);
  }

  get isOpen(): boolean {
    return !$('home').hidden;
  }

  /** Where on the home screen the player is, for the ambience: the armies if that screen is up, else the tab; null off the home screen. */
  get spot(): HomeSpot | null {
    if (!this.isOpen) return null;
    return !$('hmSub').hidden && $('hmSub').classList.contains('armies') ? 'armies' : this.tab;
  }

  /** The gacha saves the pull, the hall stops drawing, then the cards open (a hero who joins has its unlock scene there, its
   *  first-time reveal in `summonTarot.ts`, whatever the hall's state; the hall's altar show no longer plays for it). */
  summon(n: 1 | 10): void {
    if (this.hooks.onSummon) this.hooks.onSummon(n, () => {
      this.hall.stop();
      return Promise.resolve();
    });
    else this.hooks.onRecruit();
  }

  private go(then: () => void): void {
    closeGiverCard();
    $('home').hidden = true;
    // (MENU-GLITCH: the home screen is closed, but stays drawn, still and untouchable, under the screen `then` puts up, until that
    //  screen is gone again or covers it: see `handOff`)
    $('home').classList.add('handoff');
    this.camp.stop();
    this.tavern.stop();
    this.castle.stop();
    this.hall.stop();
    this.library.stop();
    this.note = '';
    this.hooks.onScene?.();
    then();
    this.handOff();
  }

  /** MENU-GLITCH: a screen opened from the home screen and laid over it (the party, the Calamity's pick, the daily's card, the Last
   *  Stand) fades in. With the home screen gone at once, the fade showed the last fight's board behind it (stale and out of place);
   *  now the home screen stays drawn under it, so the new screen fades in over where the player was, and goes (in the same frame)
   *  once nothing covers it any more: a fight's board shows, or the home screen opens again. A screen that is the board itself
   *  (the deploy) covers nothing, so the home screen goes at once, as before. */
  private handToken = 0;
  private handOff(): void {
    const home = $('home');
    const token = ++this.handToken;
    const drop = (): void => {
      watch.disconnect();
      if (token === this.handToken) home.classList.remove('handoff', 'handoffQuiet');
    };
    const watch = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (token !== this.handToken || !home.hidden || !this.coveredHome()) drop();
      });
    });
    let queued = false;
    if (!home.hidden || !this.coveredHome()) return drop();
    // (from here it takes no taps: they belong to the screen over it)
    home.classList.add('handoffQuiet');
    watch.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
  }

  /** Whether a screen is laid over the home screen at the middle of the view (one of the page's own layers above it). */
  private coveredHome(): boolean {
    const home = $('home');
    let e = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    while (e && e.parentElement && e.parentElement !== document.body) e = e.parentElement;
    if (!e || e === home || e === document.body || e === document.documentElement) return false;
    const z = Number.parseInt(getComputedStyle(e).zIndex, 10) || 0;
    const zHome = Number.parseInt(getComputedStyle(home).zIndex, 10) || 0;
    return z > zHome || (z === zHome && !!(home.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING));
  }

  private gating = false;
  /** Into the Last Stand from its watchtower: the tower's moment (`standGate.ts`), then the Stand as before (OVERLOOK-STAND). */
  private async enterStand(line: string): Promise<void> {
    if (this.gating) return;
    this.gating = true;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const done = await playStandGate(this.camp.root, this.camp.standFocus(), { line }, still);
    this.gating = false;
    this.go(this.hooks.onTower);
    done();
  }

  /** Into the Calamity from the home screen, as its place on the Battle tab does (REVEAL: the end card's button). */
  enterCalamity(): void {
    if (!modeShown('calamity')) return;
    this.go(this.hooks.onCalamity);
  }

  show(tab: Tab): void {
    if (!$('hmSheet').hidden || this.castleMenu) this.closeSheet();
    this.tab = tab;
    // (the tab bar stays under the armies: a tap on it leaves them)
    if ($('hmSub').classList.contains('armies')) this.closeSub();
    // (the Heroes tab opens the tavern itself: its All heroes button opens the list; QUESTS)
    closeGiverCard();
    this.refresh();
  }

  /** The quests' state changed (taken, handed in, pinned): save, and redraw the home screen. */
  private questsChanged(): void {
    saveMeta(this.meta);
    this.refresh();
  }

  /** SECRET-HEROES: a hero quest handed in has brought its hero: its first reveal plays now (after the giver's last words). */
  private revealJoined(): void {
    void revealUnseen(this.meta).then(() => this.refresh());
  }

  /** The quest log, over the home screen (the hero sheet's place). */
  openQuests(tab: LogTab = 'active'): void {
    closeGiverCard();
    this.closeSheet();
    this.sheetUp();
    this.tavern.stop();
    this.tavern.paintOnce();
    this.camp.stop();
    const draw = (t: LogTab) =>
      drawQuestLog($('hmSheetBox'), this.meta, t, {
        changed: () => {
          saveMeta(this.meta);
          this.refresh();
          // (SECRET-HEROES: a hero quest handed in from the log brings its hero in: its reveal plays over the log)
          this.revealJoined();
        },
        close: () => this.closeSheet(),
        fight: (id, auto) => this.questBattle(id, auto),
        saved: () => this.hooks.questSaved?.() ?? null,
        summoner: () => this.show('recruit'),
        goTo: (dest) => this.questGoto(dest),
        story: (id) => {
          const scene = chainById(id)?.prologue;
          if (scene) void this.hooks.onStory?.(scene);
        },
      });
    draw(tab);
  }

  /** EIDOLON-CHAINS: the Summoner's plaque in the Sanctum. A chain on offer: its prologue plays and the chain begins (the log's Eidolons
   *  tab opens on it). A chain ready: the binding plays, the Eidolon is bound and chosen, and the Pact Gallery opens on it. A chain going:
   *  the log's Eidolons tab. */
  private busyChain = false;
  private async summonerTap(): Promise<void> {
    if (this.busyChain) return;
    const m = this.meta;
    const offer = offeredChain(m);
    const ready = readyToBind(m);
    this.busyChain = true;
    try {
      if (offer) {
        this.hall.stop();
        if (offer.prologue) await this.hooks.onStory?.(offer.prologue);
        if (beginChain(m, offer.id)) saveMeta(m);
        this.refresh();
        this.openQuests('eidolons');
      } else if (ready) await this.bind(ready);
      else this.openQuests('eidolons');
    } finally {
      this.busyChain = false;
    }
  }

  /** The binding of a chain whose pieces are all in: the ceremony plays, the Eidolon is bound and chosen, its card, then the Pact Gallery. */
  private async bind(ready: ChainDef): Promise<void> {
    const m = this.meta;
    this.hall.stop();
    // (VAELKHAR-HEART: bound with his Heart held, he takes it back in the ceremony; a run still going is looked in first)
    if (ready.eidolon === 'vaelkhar') noteSavedHeart(m, localStorage);
    await playBinding(ready, false, ready.eidolon === 'vaelkhar' && heartHeld(m) && ready.binding ? withHeart(ready.binding) : undefined);
    // (HORN-GIFT: the first binding hands over the War Horn, full; its end card says what it does and where it is)
    const hadHorn = hornHeld(m);
    if (bindChain(m, ready.id)) saveMeta(m);
    this.refresh();
    // (EIDOLON-CHAIN-2: a later binding, the horn already held, ends on the Eidolon's own "Bound" card)
    const gift = !hadHorn && hornHeld(m) ? revealCard({ kind: 'horn' }, m) : revealCard({ kind: 'eidolon', id: ready.eidolon }, m);
    if (gift) await showEndCard(gift);
    this.openGallery();
  }

  /** EIDOLON-TRIAL: a trial won leads straight to the binding (the page calls this as the trial's beat after ends). False when no chain is
   *  ready to bind. */
  async bindAfterTrial(): Promise<boolean> {
    const ready = readyToBind(this.meta);
    if (!ready || this.busyChain) return false;
    this.busyChain = true;
    try {
      await this.bind(ready);
    } finally {
      this.busyChain = false;
    }
    return true;
  }

  /** EIDOLON-CHAINS: the Pact Gallery (from the Sanctum, and the War Horn's card at the camp). */
  openGallery(): void {
    openPactGallery(this.meta, {
      save: () => {
        saveMeta(this.meta);
        this.refresh();
      },
      watch: (id) => {
        const c = chainById(id);
        if (c) void playBinding(c, true);
      },
    });
  }

  /** "Take me there" (UI batch 1): the log closes and the screen the goal is done on opens: a battle, an army's party screen, a mode, or the Armies. */
  private questGoto(dest: Destination): void {
    this.closeSheet();
    this.show('battle');
    switch (dest.to) {
      case 'battle':
        return this.questBattle(dest.battle);
      case 'army':
        return this.go(() => this.hooks.onArmy(dest.army, dest.tier));
      case 'armies':
        return this.openArmies(dest.army);
      case 'daily':
        return this.go(this.hooks.onDaily);
      case 'stand':
        // (shut until the stars open it: the camp's own rule)
        return modeShown('tower') && (towerOpen(this.meta) || this.hooks.slotInfo?.('tower')) ? this.go(this.hooks.onTower) : this.openArmies();
      case 'calamity':
        return modeShown('calamity') && (modeOpen(this.meta, 'calamity') || this.hooks.slotInfo?.('calamity')) ? this.enterCalamity() : this.openArmies();
    }
  }

  /** A quest battle's Fight (batch 2): the sheet and the card close, and the page takes it from there (the party, the story, the deploy). */
  private questBattle(id: string, auto?: number): void {
    if (!this.hooks.onQuestBattle) return;
    this.closeSheet();
    this.go(() => this.hooks.onQuestBattle!(id, auto));
  }

  /** Redraw the page that is showing (after crowns or unlocks change elsewhere). */
  refresh(): void {
    if (!this.isOpen) return;
    const m = this.meta;
    // (a build that finished while the game was away stands now)
    const raised = settleWorks(m, Date.now());
    if (raised) {
      saveMeta(m);
      this.hooks.onBuilt?.(raised);
    }
    // top bar (the run's gold stays in the run: the owner's call)
    // (the crowns and stones chips keep their icons: only the number is written, and only when it changed, so the picture never blinks)
    // (TOPBAR-FIT: from 100,000 up a count is shown short, "999k" or "1.2M", so the top row keeps the gear beside the trophy; the full
    //  number is still the chip's title and spoken label)
    const chipCount = (id: string, pic: string, n: number): void => {
      const chip = $(id);
      const shown = chipNumber(n);
      chip.title = n.toLocaleString('en-GB');
      chip.setAttribute('aria-label', `${chip.id === 'hmStones' ? 'Summoning stones' : 'Crowns'}: ${chip.title}`);
      const count = chip.querySelector('b');
      if (!count) chip.replaceChildren(icon(pic), el('b', '', shown));
      else if (count.textContent !== shown) count.textContent = shown;
    };
    // (QUESTS: the day's offers are drawn the first time a date is seen, and kept; old ones come down)
    if (refreshOffers(m, todayKey())) saveMeta(m);
    // (PAINTED-BUTTONS: the painted crown and stone medallions on the chips)
    chipCount('hmCrowns', pbUrl('crowns'), m.crowns);
    chipCount('hmStones', pbUrl('stones'), stonesOf(m));
    this.hooks.onTopBar?.();
    // (Dynasties: the season's chip in the top bar's second row; redrawn only when the season changes, so its icon never blinks)
    if (m.dynasty) {
      const key = String(seasonOf(m.dynasty, todayKey()).index);
      const had = document.getElementById('hmSeason');
      if (had?.dataset.key !== key) {
        const chip = seasonChip(m, todayKey(), () => openSeasonCard(m, todayKey(), () => this.openHouses()));
        if (chip) {
          chip.dataset.key = key;
          // (TOPBAR-FIT: in the second row, before the armies line, so the top row keeps the gear beside the trophy)
          if (had) had.replaceWith(chip);
          else $('hmBest').prepend(chip);
        }
      }
    }
    const stars = ARMIES.reduce((n, a) => n + armyStars(m, a).got, 0);
    const best = $('hmBest');
    const bestText = best.querySelector('.hbText') ?? best.appendChild(el('span', 'hbText'));
    bestText.textContent = `Armies ${clearedCount(m)}/${ARMIES.length} · ★ ${stars}`;
    const fresh = m.achievements.length > seenCount() || unclaimed(m).length > 0;
    $('hmTrophy').classList.toggle('new', fresh);
    // tabs
    const order = TABS.map((t) => t.id);
    const cur = order.indexOf(this.tab);
    for (const id of order) this.tabBtns.get(id)!.classList.toggle('on', id === this.tab);
    this.placePages(order, cur);
    const affordable = BUILDING_IDS.some((id) => {
      const c = nextCost(m.castle, id);
      return c !== null && m.crowns >= c;
    });
    // (UX-FIXES: a badge only for what the player can act on now; "fresh" building news no longer lights the tab, and the Battle tab has none)
    void fresh;
    this.tabBtns.get('castle')!.classList.toggle('new', affordable || canBuildChapel(m));
    // (EIDOLON-CHAINS: the Summoner has a chain to tell, or one to bind)
    this.tabBtns.get('recruit')!.classList.toggle('new', stonesOf(m) > 0 || summonerWaiting(m));
    // (a rank earned, or an awakening paid for, waits for the player's tap on the Heroes tab; a quest waits at the tavern; Hester's
    // stall has new stock or a trader. BENCH-MARKS: the tab wears one mark at most, the most pressing one: `heroesTabMark`)
    const readyN = readyKinds(m, m.unlocked).length;
    const shop = hesterNews(m, todayKey());
    const mark = heroesTabMark({ ready: readyN, quest: questsWaiting(m), freshStock: shop.fresh, visitor: shop.visitor });
    const heroesTab = this.tabBtns.get('heroes')!;
    heroesTab.classList.toggle('new', mark?.kind === 'upgrade');
    const heroBadge = heroesTab.querySelector('i.badge');
    if (heroBadge) heroBadge.textContent = mark?.kind === 'upgrade' ? String(mark.count) : '';
    heroesTab.classList.toggle('quest', mark?.kind === 'quest');
    heroesTab.classList.toggle('shop', mark?.kind === 'shop');
    heroesTab.classList.toggle('dealer', mark?.kind === 'shop' && mark.visitor === 'dealer');
    heroesTab.classList.toggle('caravan', mark?.kind === 'shop' && mark.visitor === 'caravan');
    heroesTab.setAttribute('aria-label', `Heroes${readyN ? `, ${readyN} ready to upgrade` : ''}${shop.visitor ? `; ${shop.visitor === 'dealer' ? 'the Gloaming Dealer' : 'Rustam Saffar’s caravan'} is at Hester’s stall in the tavern` : shop.fresh ? '; new stock at Hester’s stall in the tavern' : ''}`);
    this.tabBtns.get('battle')!.classList.remove('new');
    // (UX-FIXES: the Spells tab is dimmed with a lock until the Chapel is built; a tap says why on its page)
    const spellsTab = this.tabBtns.get('spells')!;
    const shut = !chapelBuilt(m);
    spellsTab.classList.toggle('locked', shut);
    spellsTab.setAttribute('aria-label', shut ? 'Spells (locked: build the Chapel in the Castle)' : 'Spells');
    this.drawBattle();
    this.tavern.update(m);
    this.drawCastle();
    this.castle.update(m);
    this.hall.update(m);
    this.library.update(m);
    this.hooks.onScene?.();
    // (the camp only moves while the Battle tab shows, and not under a hero sheet)
    if (this.tab === 'battle' && $('hmSheet').hidden) this.camp.start();
    else this.camp.stop();
    // (the tavern only moves while it is showing, and not under a hero sheet)
    if (this.tab === 'heroes' && $('hmSheet').hidden) this.tavern.start();
    else this.tavern.stop();
    // (the hall and the library move only while their tab shows; a pull in flight is not cut short by a redraw)
    if (this.tab === 'recruit' && $('gacha').hidden) this.hall.start();
    else if (this.tab !== 'recruit') this.hall.stop();
    if (this.tab === 'spells') this.library.start();
    else this.library.stop();
    // (the courtyard moves only while it is showing, and not under a building card)
    if (this.tab === 'castle' && !this.cardOpen && modeOpen(m, 'castle')) this.castle.start();
    else this.castle.stop();
  }

  /** MENU-GLITCH: the pages are one strip. The page showing rests in place; on a tab change the page it goes to is laid beside it (on
   *  the side its tab is), given two frames to be drawn, and then the strip carries the two across together as one move, so they can
   *  never drift apart (an empty band or one page over the other, when each page slid on its own clock) and the new page never slides
   *  in half drawn. A change made while one is sliding finishes that one first. Reduced motion, or the home screen just opened: no slide. */
  private placePages(order: Tab[], cur: number): void {
    const to = this.tab;
    if (this.slide?.to === to) return;
    if (this.slide) this.endSlide();
    const from = this.shown;
    const snap = this.snapNext || from === to || reducedMotion() || document.hidden;
    this.snapNext = false;
    if (snap) {
      this.shown = to;
      for (const id of order) {
        const page = this.pages.get(id)!;
        page.style.transform = '';
        page.classList.toggle('on', id === to);
      }
      return;
    }
    const dir = cur > order.indexOf(from) ? 1 : -1;
    const next = this.pages.get(to)!;
    next.style.transform = `translateX(${dir * 100}%)`;
    next.classList.add('on');
    this.shown = to;
    const token = ++this.slideToken;
    this.slide = { from, to, anim: null };
    this.track.classList.add('sliding');
    // (two frames: the first draws the page beside the view, the second shows it drawn; then it moves)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (token !== this.slideToken || !this.slide) return;
        const anim = this.track.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-dir * 100}%)` }], { duration: 320, easing: 'cubic-bezier(0.3, 0.8, 0.3, 1)', fill: 'forwards' });
        this.slide.anim = anim;
        anim.onfinish = () => token === this.slideToken && this.endSlide();
      }),
    );
  }

  /** The slide is over (or cut short): the new page rests in place and the old one is put away, in the one step, so no frame shows between. */
  private endSlide(): void {
    const s = this.slide;
    if (!s) return;
    this.slide = null;
    this.slideToken++;
    s.anim?.cancel();
    this.track.classList.remove('sliding');
    const next = this.pages.get(s.to)!;
    next.style.transform = '';
    if (s.from !== s.to) this.pages.get(s.from)!.classList.remove('on');
  }

  /** MENU-GLITCH: once the home screen is up, each page's scene paints one still picture while the page is idle, so no page ever
   *  slides in as an empty canvas the first time its tab is opened. */
  private primeScenes(): void {
    if (this.primed) return;
    this.primed = true;
    const idle = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(() => f(), { timeout: 1500 }) : setTimeout(f, 300));
    idle(() => {
      if (this.tab !== 'heroes') this.tavern.paintOnce();
      if (this.tab !== 'recruit') this.hall.paintOnce();
      if (this.tab !== 'spells') this.library.paintOnce();
      if (this.tab !== 'battle') this.camp.paintOnce();
      warmPortraits();
    });
  }

  private drawBattle(): void {
    const m = this.meta;
    const page = this.pages.get('battle')!;
    const info = this.hooks.runInfo?.() ?? null;
    // (the war table shows the army in the run, else the first army open that is not cleared yet, else the newest)
    const open = ARMIES.filter((a) => armyUnlocked(m, a.id));
    const front = open.find((a) => !armyCleared(m, a.id)) ?? open[open.length - 1] ?? ARMIES[0];
    const army = info?.army ? armyById(info.army) : undefined;
    const next = army ?? front;
    // (the party stands round the fire, the strongest in the middle)
    const party = strongest(m, 99).filter((k) => m.party.includes(k));
    const boss = UNITS[bossOf(next)];
    // (the bottom bar, below the camp's picture so it covers none of it: what the next fight is, then Party, Battle! and Continue)
    const fr = el('div', 'hmFront');
    // (the last run's end: a dispatch over the enemy's camp, clear of every place, that fades by itself and lets taps through. It once sat
    //  on the bar's top edge, over the Daily and Last Stand plates, until the next mode was entered: OVERLOOK-STAND)
    if (this.note) {
      showDispatch(page, this.note);
      this.note = '';
    }
    // Keep the new-army announcement quiet on later launches; Continue still shows the wave.
    const progress = armyStars(m, next);
    // (the owner's call: with a run going there is no wave line over the bar: Continue already says the wave; only a new army is named)
    if (!info && announceArmy(next.id, storage())) fr.append(el('div', 'hmBanner', `Next army · Lv ${next.level} · ★ ${progress.got}/${progress.max}`));
    const go = el('div', 'hmGo');
    const has = this.hooks.hasRun();
    const battle = el('button', 'hmBattle');
    battle.id = 'hmBattle';
    battle.append(el('span', '', 'Choose your battle'));
    battle.setAttribute('aria-label', ARMIES.some((a) => armyIsNew(m, a.id)) ? 'Battle! A new army marches. Choose an army' : 'Battle! Choose an army');
    // (UX-FIXES: the main Battle button carries no badge)
    battle.addEventListener('click', () => this.openArmies());
    // (the owner's call: no Party button here: the party screen comes up as a run starts, and the war table's plate opens it too)
    go.append(battle);
    if (has) {
      const cont = el('button', 'hmLink hmSide hmCont');
      cont.append(el('b', '', 'Continue'), el('small', '', army && info ? `wave ${info.stage}/${army.waves.length}` : info ? info.label.replace(/^tower · /, '') : 'run'));
      // (the run's gold shows here, beside its stage: the only place in camp it matters)
      if (info) {
        const gold = el('small', 'hmContGold');
        gold.append(icon(ICONS.gold), String(info.gold));
        cont.append(gold);
      }
      cont.addEventListener('click', () => this.go(this.hooks.onContinue));
      go.append(cont);
    }
    // (QUESTS: the tracked quest's chip above the command bar; a tap opens the log)
    const tracked = trackedQuest(m);
    const tq = tracked && questById(tracked.id);
    if (tracked && tq) {
      const p = progressOf(tracked);
      const chip = el('button', `hmQuest${isDone(tracked) ? ' done' : ''}`);
      chip.id = 'hmQuest';
      chip.append(el('b', '', tq.title), el('span', 'hmQStars', `★${starsOf(tq)}`), el('span', '', isDone(tracked) ? 'Done: hand it in' : `${p.now}/${p.need}`));
      chip.setAttribute('aria-label', `Quest: ${tq.title}, ${isDone(tracked) ? 'done, hand it in at the tavern' : `${p.now} of ${p.need}`}. Open the quest log`);
      chip.addEventListener('click', () => this.openQuests('active'));
      fr.classList.add('withQuest');
      fr.append(chip);
    }
    fr.append(go);
    // (the camp's places, each tapped in the scene: a picture with its name plate under it)
    const place = (id: string, cls: string, title: string, line: string, label: string, onTap: () => void): HTMLButtonElement => {
      const b = el('button', `cpPlace ${cls}`.trim());
      if (id) b.id = id;
      const tag = el('span', 'cpTag');
      tag.append(el('b', '', title), el('small', '', line));
      b.append(tag);
      b.setAttribute('aria-label', label);
      b.addEventListener('click', onTap);
      return b;
    };
    // (the Daily: a small icon at the scene's right edge: a new daily wears the red dot, a cleared one a green check; the whole line "Today: Orc Warlord · not tried" is read aloud)
    const today = m.daily[String(todayKey())];
    const cleared = !!today?.cleared;
    const daily = place('hmDaily', cleared ? 'daily done' : 'daily', 'Daily', '', `Daily challenge. ${dailyLine(m, todayKey())}`, () => this.go(this.hooks.onDaily));
    daily.title = `${dailyTheme(todayKey())?.name ?? dailyBossName(todayKey())} · ${dailyStatus(m, todayKey())}`;
    daily.querySelector('small')?.remove();
    // (the painted hourglass, whole, in place of the small pixel one, which read as cut off; already served and cached for the relics)
    // (PAINTED-BUTTONS: now the Daily's own painted medallion, the chest at sunrise)
    daily.prepend(icon(pbUrl('daily'), 'ico cpDailyIcon'));
    if (cleared) {
      const tick = el('i', 'dailyDone');
      tick.setAttribute('role', 'img');
      tick.setAttribute('aria-label', 'Cleared today');
      daily.append(tick);
    } else if (!today?.plays) daily.append(el('i', 'badge'));
    // (the Last Stand's watchtower and the Calamity's citadel are hidden for now (`hiddenModes.ts`): their plates are not built and their slots
    // are taken out, so nothing on the overlook can be tapped; the painted scene stays as it is. A run begun in either stays in its slot, untouched.)
    const showTower = modeShown('tower');
    const showCal = modeShown('calamity');
    for (const [slot, shown] of [[this.camp.towerSlot, showTower], [this.camp.calamitySlot, showCal]] as const) {
      slot.hidden = !shown;
      slot.style.display = shown ? '' : 'none';
      if (!shown) {
        slot.classList.add('shut');
        slot.querySelector('.cpPlace')?.remove();
      }
    }
    let tower: HTMLButtonElement | undefined;
    let calamity: HTMLButtonElement | undefined;
    if (showTower) {
      // (the Last Stand, on the Tower's old place: shut, dimmed and chained, until the stars open it; a run begun stays open whatever the unlock says)
      const climbing = this.hooks.slotInfo?.('tower');
      const towerUp = towerOpen(m) || !!climbing;
      // (with the furthest room of the retreat reached: the throne room is the Last Stand's badge, STAND-RETREAT)
      const room = m.standAct !== undefined ? ` · ${m.standAct >= 3 ? '♛ ' : ''}${ROOM_NAMES[ACT_HALLS[m.standAct]].short}` : '';
      const towerLine2 = climbing ?? (towerOpen(m) ? (m.stand ? `best wave ${m.stand}${room}` : 'not tried yet') : opensAt(MODE_NEED.tower));
      // (OVERLOOK-STAND: the Last Stand's place is the watchtower painted on the overlook's left, entered with its own moment)
      tower = place('hmTower', towerUp ? 'stand' : 'stand locked', 'Last Stand', towerLine2, `The Last Stand's watchtower: ${towerLine2}${towerUp ? '' : `, ${progressLine(m, MODE_NEED.tower)}`}`, () => void this.enterStand(towerLine2));
      tower.disabled = !towerUp;
      this.camp.towerSlot.classList.toggle('shut', !towerUp);
    }
    if (showCal) {
      // The distant Calamity citadel carries the saved map or the unlock requirement.
      const going = this.hooks.slotInfo?.('calamity');
      const calUp = modeOpen(m, 'calamity') || !!going;
      const calLine = going ?? (!calUp ? opensAt(MODE_NEED.calamity) : m.calamity?.best ? `best ${m.calamity.best} regions` : 'one hero');
      calamity = place('hmCalamity', calUp ? '' : 'locked', 'The Calamity', calLine, `The distant Calamity citadel: ${calLine}${calUp ? '' : `, ${progressLine(m, MODE_NEED.calamity)}`}`, () => this.go(this.hooks.onCalamity));
      calamity.disabled = !calUp;
      this.camp.calamitySlot.classList.toggle('shut', !calUp);
    }
    // (the Nemesis War's Dark Council, over the Daily once the War is open: the warchief's face once there is one (the mightiest member's
    // until then), the seats filled on its plate, and the Muster's mark when it is open)
    const war = m.war;
    this.camp.councilSlot.hidden = !war;
    const top = war ? warchiefOf(war) ?? war.members.slice().sort((a, b) => b.might - a.might || a.id - b.id)[0] : undefined;
    const muster = musterOpen(war);
    const councilKey = war ? `${war.members.length}|${top?.id ?? 0}|${top?.might ?? 0}|${top?.rank ?? ''}|${muster}` : '';
    if (war && this.camp.councilSlot.dataset.key !== councilKey) {
      this.camp.councilSlot.dataset.key = councilKey;
      const named = war.members.length;
      const council = place('hmCouncil', 'council', 'Council', '', `${councilPlate(m)}${muster ? '. The Warchief’s Muster is open' : ''}. ${councilLine(m)}`, () => this.openCouncil());
      council.querySelector('small')?.remove();
      const medal = el('img', 'cpCouncilBadge');
      // (PAINTED-BUTTONS: the Dark Council's painted medallion, the throne between its candles)
      medal.src = pbUrl('council');
      medal.alt = '';
      medal.setAttribute('aria-hidden', 'true');
      council.prepend(medal);
      if (named) council.append(el('i', `cpCount${muster ? ' muster' : ''}`, String(named)));
      swapIn(this.camp.councilSlot, this.camp.councilSlot.querySelector('.cpPlace'), council);
    }
    // (each piece is put in only when it reads differently from the one showing: a redraw that changes nothing replaces no picture, so nothing blinks)
    swapIn(this.camp.dailySlot, this.camp.dailySlot.querySelector('.cpPlace'), daily);
    if (tower) swapIn(this.camp.towerSlot, this.camp.towerSlot.querySelector('.cpPlace'), tower);
    if (calamity) swapIn(this.camp.calamitySlot, this.camp.calamitySlot.querySelector('.cpPlace'), calamity);
    // (CLIFF-ROAM: Hester's Stall left the cliff for a corner of the tavern's hearth hall; its marks moved to the Heroes tab and the tavern)
    this.camp.update(m, party, { army: next, boss: boss.name, sheet: boss.sheet });
    // Earned chests rest by the overlook's supplies.
    const stash = el('div', 'csStash');
    drawChestStash(stash, m, () => {
      saveMeta(m);
      this.refresh();
    });
    // (the chest a tap opens is picked by its place in the stash: any change to the stash draws it afresh)
    stash.dataset.key = JSON.stringify(m.stash);
    swapIn(this.camp.stashMount, this.camp.stashMount.firstElementChild, stash);
    swapIn(page, page.querySelector(':scope > .hmFront'), fr);
  }

  /** The chips over the courtyard's sky: the achievements and settings shortcuts, the tips reset and a line of help. */
  private drawCastle(): void {
    const m = this.meta;
    const bar = this.castleBar;
    const shownAch = shownAchievements(m);
    const got = shownAch.filter((a) => m.achievements.includes(a.id)).length;
    const up = modeOpen(m, 'castle');
    bar.hidden = up;
    this.castle.setCodexWaiting(codexWaiting(m).length > 0);
    // (MENU-GLITCH: the chips are built again only when what they show has changed, so a refresh replaces none of their icons)
    const key = `${got}|${m.achievements.length > seenCount() || unclaimed(m).length > 0}|${gotOf(m, 'bestiary') + gotOf(m, 'heroes')}|${codexWaiting(m).length > 0}|${up}|${up ? '' : progressLine(m, MODE_NEED.castle)}`;
    if (bar.dataset.key === key) return;
    bar.dataset.key = key;
    bar.replaceChildren();
    const row = el('div', 'ctChips');
    const ach = el('button', 'ctChip');
    ach.append(icon(ICONS.trophy), el('b', '', 'Achievements'), el('small', '', `${got}/${shownAch.length}`));
    if (m.achievements.length > seenCount() || unclaimed(m).length) ach.append(el('i', 'badge'));
    ach.addEventListener('click', () => this.openAchievements());
    // (the codex sits by the achievements: both are the records of the castle's library of deeds; its badge shows a milestone to claim)
    const cdx = el('button', 'ctChip');
    cdx.append(medal('stall-books'), el('b', '', 'Codex'), el('small', '', `${gotOf(m, 'bestiary') + gotOf(m, 'heroes')}/${totalOf('bestiary') + totalOf('heroes')}`));
    if (codexWaiting(m).length > 0) cdx.append(el('i', 'badge'));
    cdx.addEventListener('click', () => this.openCodex());
    // (Build Town is in Settings › Developer now: a testing tool, not a castle door)
    // (UX-FIXES: Achievements is the trophy in the top bar and Reset tips is in Settings: one door each)
    void ach;
    row.append(cdx);
    bar.append(row, el('div', 'ctHelp', 'tap a building to build or upgrade it · tap the guards to salute'));
    // (the buildings open at `MODE_NEED.castle` army stars: until then the courtyard is a locked gate, with the stars still to win)
    this.castle.root.hidden = !up;
    this.castleShut.hidden = up;
    if (!up) {
      // (FIRST-HOUR: the "Open Castle Gate (Preview)" button that stood here was a testing door on every new player's Castle tab: it
      // opened the gate and gave 3000 crowns and six buildings. Testing goes through Settings › Developer › Build Town, which opens the gate too.)
      this.castleShut.replaceChildren(
        el('b', '', 'The castle is shut'),
        el('p', '', `${opensAt(MODE_NEED.castle)} · ${progressLine(m, MODE_NEED.castle)}`),
        el('small', '', 'Win stars on the armies to open the gate.'),
      );
    }
  }

  /** The castle card up now (CASTLE-REMAKE: the standard ornate menu over the courtyard), if any. */
  private castleMenu: OrnateMenu | null = null;

  /** A castle card's shell: the standard ornate card, "The Keep" over the building's name. Opening another, or the same one drawn
   *  afresh (a build started, the builders done), replaces it in the one step. */
  private castleCard(id: BuildSite, title: string, sub: string): OrnateMenu {
    this.closeSheet();
    const menu: OrnateMenu = ornateMenu({
      id: 'castleCard',
      eyebrow: 'The Keep',
      title,
      sub,
      onClose: () => {
        if (this.castleMenu !== menu) return;
        this.castleMenu = null;
        this.cardOpen = false;
        this.cardFor = null;
        if (this.isOpen && this.tab === 'castle') this.castle.start();
      },
    });
    this.castleMenu = menu;
    this.cardOpen = true;
    this.cardFor = id;
    this.castle.stop();
    return menu;
  }

  /** The head of a castle card's body: the building as it stands (greyed while unbuilt) over its level in painted stars. */
  private cardArt(body: HTMLElement, id: SiteId, level: number): void {
    const top = siteTop(id);
    const art = el('div', `crCardArt${level === 0 ? ' unbuilt' : ''}`);
    const pic = el('img', 'crCardPic');
    pic.src = lookPicture(id, Math.max(1, level));
    pic.alt = '';
    pic.draggable = false;
    const stars = el('div', 'crStars');
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', `level ${level} of ${top}`);
    for (let i = 0; i < top; i++) stars.append(medal(i < level ? 'g-star' : 'g-star-empty'));
    art.append(pic, stars);
    body.append(art);
  }

  /** The line under a card's title: building, not built, or the level. */
  private cardSub(id: BuildSite, level: number, top: number): string {
    const m = this.meta;
    return m.works?.id === id ? `building level ${m.works.level}` : level === 0 ? 'not built yet' : `level ${level} of ${top}`;
  }

  /** A section of a card holding its own content (the rooms, the plinths, the sparring yard) under a brass heading. */
  private cardSection(body: HTMLElement, title: string, content: HTMLElement, line?: string): void {
    const grid = menuSection(body, title, line);
    grid.replaceWith(content);
  }

  /** A building's upgrade card (over the courtyard): what it gives now and next, its cost, and the Build button. */
  private openBuilding(id: SiteId): void {
    this.drawBuildingCard(id);
  }

  /** The Chapel's card (over the courtyard): what it opens, its one price and the Build button. */
  private openChapel(): void {
    const m = this.meta;
    const menu = this.castleCard('chapel', 'Chapel', m.works?.id === 'chapel' ? 'being built' : 'not built yet');
    this.cardArt(menu.body, 'chapel', 0);
    menuNote(menu.body, 'A place to study the ruler\'s spells: opens the spellbook.');
    menuNote(menu.body, 'One purchase, no levels. Your starting spells still work in fights until then.');
    // (FIRST-HOUR 3: the Castle's gate opens at 6 stars now; the Chapel, and the spellbook with it, still waits for 10)
    const open = chapelOpen(m);
    if (!open) menuNote(menu.body, `${chapelWaits(m)}.`);
    this.buildButton(menu, 'chapel', CHAPEL_COST, CHAPEL_MS, open && canBuildChapel(m), () => chapelOpen(m) && startChapel(m, Date.now()));
  }

  private drawBuildingCard(id: SiteId): void {
    const m = this.meta;
    // (DEPTH-BUILD: the card also serves the levelled Chapel and the three room buildings, which give rooms, not numbers)
    if (id === 'chapel' || isRoomBuilding(id)) return this.drawRoomsCard(id);
    const b = BUILDINGS[id];
    const level = m.castle[id];
    const top = maxLevel(id);
    const menu = this.castleCard(id, b.name, this.cardSub(id, level, top));
    this.cardArt(menu.body, id, level);
    menuNote(menu.body, BLURB[id]);
    const gives = menuWell(menu.body);
    gives.classList.add('crGives');
    const now = el('p');
    now.append(el('i', '', 'Now: '), level === 0 ? 'nothing yet' : effectText(id, level));
    gives.append(now);
    const cost = nextCost(m.castle, id);
    if (cost !== null) {
      const next = el('p');
      next.append(el('i', '', `Level ${level + 1}: `), effectText(id, level + 1));
      gives.append(next);
    } else gives.append(el('p', '', 'Fully built.'));
    menuNote(menu.body, `Each level: ${b.perLevel}. Upgrades last for every run you start from now on.`);
    const strip = roomsStrip(id, level);
    if (strip) this.cardSection(menu.body, 'Rooms', strip);
    // (DEPTH-BUILD: the Barracks' Sparring Yard: two heroes spar while you are away, for bond points)
    if (id === 'barracks' && roomOpen(m.castle, 'sparringYard')) this.cardSection(menu.body, 'Sparring Yard', this.sparringYard());
    this.buildButton(menu, id, cost, cost === null ? 0 : buildMs(id, level + 1), cost !== null && m.crowns >= cost, () => startBuild(m, id, Date.now()));
  }

  /** The card of a building that gives rooms rather than numbers (the Smithy, the Watchtower, the Hall of Legends, the Chapel past level 1). */
  private drawRoomsCard(id: SiteId): void {
    const m = this.meta;
    const level = siteLevel(m.castle, id, chapelBuilt(m));
    const top = siteTop(id);
    const menu = this.castleCard(id, siteName(id), this.cardSub(id, level, top));
    this.cardArt(menu.body, id, level);
    const blurb = id === 'chapel' ? 'A place to study the ruler\'s spells; its higher levels watch over the party when a heart burns.' : ROOM_BUILDINGS[id as keyof typeof ROOM_BUILDINGS].blurb;
    menuNote(menu.body, blurb);
    const strip = roomsStrip(id, level);
    if (strip) this.cardSection(menu.body, 'Rooms', strip);
    // (DEPTH-BUILD: the Hall of Legends' four plinths, one a calling: its mentor and perk, or what an empty one needs; Recall from here)
    if (id === 'hall') this.cardSection(menu.body, 'The plinths', this.hallPlinths(level), 'one mentor a calling');
    const cost = siteNextCost(m.castle, id, chapelBuilt(m));
    const next = roomsOf(id).filter((r) => r.level === level + 1);
    if (cost !== null && next.length) menuNote(menu.body, `Level ${level + 1} opens the ${next.map((r) => r.name).join(' and ')}.`);
    this.buildButton(menu, id, cost, cost === null ? 0 : buildMs(id, level + 1), cost !== null && m.crowns >= cost, () => startSite(m, id, Date.now()));
  }

  private sparringYard(): HTMLElement {
    const m = this.meta;
    const wrap = el('div', 'hallPlinths');
    const note = settleSparring(m, Date.now());
    if (note) saveMeta(m);
    const s = m.sparring;
    if (s) {
      const row = el('div', 'hallPlinth');
      row.append(el('small', '', `${UNITS[s.a]?.name ?? s.a} and ${UNITS[s.b]?.name ?? s.b} are sparring: `), el('span', 'worksLeft', clockText(Math.max(0, s.doneAt - Date.now()))));
      wrap.append(row);
      return wrap;
    }
    const row = el('div', 'hallPlinth');
    const pick = (): HTMLSelectElement => {
      const sel = el('select');
      for (const k of m.unlocked) {
        const o = el('option', '', UNITS[k]?.name ?? k);
        o.value = k;
        sel.append(o);
      }
      return sel;
    };
    const a = pick();
    const b = pick();
    if (b.options.length > 1) b.selectedIndex = 1;
    const go = el('button', '', `Spar · ${SPAR.POINTS} bond points · 8h`);
    go.addEventListener('click', () => {
      if (!startSparring(m, a.value, b.value, Date.now(), roomOpen(m.castle, 'sparringYard'))) return;
      saveMeta(m);
      this.openBuilding('barracks');
    });
    row.append(a, b, go);
    wrap.append(el('small', '', 'Sparring Yard: two heroes spar while you are away.'), row);
    return wrap;
  }

  private hallPlinths(level: number): HTMLElement {
    const m = this.meta;
    const wrap = el('div', 'hallPlinths');
    for (const c of CALLINGS) {
      const row = el('div', 'hallPlinth');
      const who = m.mentors?.[c];
      const shut = (m.recalled?.[c] ?? 0) > Date.now();
      if (who) {
        const perk = PERKS[who.kind];
        const words = el('div', '');
        words.append(el('b', '', `${UNITS[who.kind]?.name ?? who.kind} · Lv ${levelOfKind(m, who.kind)}`), el('small', '', `${c} mentor${perk ? ` · ${perk.name}` : ''}`));
        const back = el('button', '', 'Recall');
        back.addEventListener('click', () => {
          if (back.dataset.sure !== '1') {
            back.dataset.sure = '1';
            back.textContent = 'Sure? Seat shut 7 days';
            return;
          }
          if (recall(m, c, Date.now())) {
            saveMeta(m);
            this.refresh();
            this.openBuilding('hall');
          }
        });
        row.append(words, back);
      } else row.append(el('small', '', shut ? `The ${c} seat is empty for a while yet (recalled).` : level > 0 ? `Retire ${c === 'arcane' ? 'an' : 'a'} ${c} hero of level 60 or more (from the hero's sheet).` : `Build the Hall to seat ${c === 'arcane' ? 'an' : 'a'} ${c} mentor.`));
      wrap.append(row);
    }
    return wrap;
  }

  /** A card's Build button, the card's primary (a painted plate): the price and how long it takes; "Building · 4:05" while it goes up;
   *  greyed while the builders are busy elsewhere (a note says where); "Full" at the top. A tap pays and starts the works, and the card
   *  shows the countdown. */
  private buildButton(menu: OrnateMenu, site: BuildSite, cost: number | null, ms: number, affordable: boolean, start: () => boolean): void {
    const on = this.worksOn(site);
    const words = el('span', 'crPrimaryWords');
    let disabled = false;
    if (on === 'here') {
      words.append('Building · ', el('span', 'worksLeft', clockText(worksLeft(this.meta, Date.now()))));
      disabled = true;
    } else if (cost === null) {
      words.append('Full');
      disabled = true;
    } else {
      const time = el('span', 'crTime');
      time.append(medal('clock'), clockText(ms));
      words.append('Build · ', medal('crowns'), String(cost), time);
      disabled = on === 'elsewhere' || !affordable;
    }
    const { primary } = menuFoot(menu, {
      back: { word: 'close' },
      primary: {
        label: 'Build',
        disabled,
        onClick: () => {
          if (!start()) return;
          saveMeta(this.meta);
          this.refresh();
          site === 'chapel' && !chapelBuilt(this.meta) ? this.openChapel() : this.openBuilding(site);
        },
      },
    });
    if (primary) {
      primary.replaceChildren(words);
      primary.setAttribute('aria-label', cost === null ? 'Full' : on === 'here' ? 'Building' : `Build for ${cost} crowns, ${clockText(ms)}`);
    }
    if (on === 'elsewhere') {
      const w = this.meta.works!;
      const hint = menuNote(menu.body, `The builders are at the ${siteName(w.id)}: `);
      hint.append(el('span', 'worksLeft', clockText(worksLeft(this.meta, Date.now()))), ' left.');
    }
  }

  /** The roster page: every hero, the locked ones with how to get them. */
  private openRoster(): void {
    this.closeSheet();
    this.sheetUp();
    this.tavern.stop();
    // (the tavern holds a picture under the roster, so its page never slides past empty as the tab changes)
    this.tavern.paintOnce();
    this.camp.stop();
    drawRoster($('hmSheetBox'), this.meta, (kind) => this.openSheet(kind, true), () => this.closeSheet(), this.lastViewedHero);
  }

  private openSheet(kind: string, fromRoster = false, tab = 'overview'): void {
    if (this.meta.unlocked.includes(kind)) this.lastViewedHero = kind;
    this.closeSheet();
    this.sheetUp();
    this.tavern.stop();
    this.camp.stop();
    this.stopSheet = drawHeroSheet(
      $('hmSheetBox'), this.meta, kind,
      () => fromRoster ? this.openRoster() : this.closeSheet(),
      (next, nextTab) => this.openSheet(next, fromRoster, nextTab), tab,
    );
  }

  /** Put the sheet layer up (its content is drawn straight after). MENU-GLITCH: a sheet coming up fresh shows once its pictures
   *  are decoded; one already up and drawn again (a tab, the next hero) stays in view as it is redrawn. */
  private sheetUp(): void {
    const sheet = $('hmSheet');
    const fresh = sheet.hidden && !this.sheetWasUp;
    sheet.hidden = false;
    if (fresh) queueMicrotask(() => void showWhenPainted(sheet));
  }
  /** Whether the sheet was up a moment ago (a redraw closes it and puts it up again in the one step). */
  private sheetWasUp = false;

  private closeSheet(): void {
    // (CASTLE-REMAKE: a castle card is a standard ornate menu, not the sheet: it goes too)
    const castleMenu = this.castleMenu;
    this.castleMenu = null;
    castleMenu?.close();
    this.stopSheet?.();
    this.stopSheet = null;
    // (a redraw shuts the sheet and puts it straight back: remembered until the page next draws, so it is not taken for a fresh one)
    if (!$('hmSheet').hidden) {
      this.sheetWasUp = true;
      queueMicrotask(() => (this.sheetWasUp = false));
    }
    $('hmSheet').hidden = true;
    // (CLOSE-SCREENS: the sheet left is emptied, not kept under the page; each opening draws it afresh)
    $('hmSheetBox').replaceChildren();
    this.cardOpen = false;
    this.cardFor = null;
    if (this.isOpen && this.tab === 'heroes') this.tavern.start();
    if (this.isOpen && this.tab === 'battle') this.camp.start();
    if (this.isOpen && this.tab === 'castle') this.castle.start();
  }

  /** A loss's "come back stronger" pointer was tapped (`sim/comeback.ts`): the screen that does it, over the home screen just opened. */
  goTo(go: ComebackGo): void {
    if (go.to === 'armies') return this.openArmies(go.army);
    if (go.to === 'party') return this.go(this.hooks.onParty);
    if (go.to === 'heroes' && go.hero) {
      this.show('heroes');
      return this.openSheet(go.hero, true, go.tab);
    }
    this.show(go.to === 'chests' ? 'battle' : go.to);
  }

  /** The Armies screen, over the home screen (the Battle button, and the unlock moment's way on). */
  openArmies(focus?: string): void {
    // (HOLD-SOUND: back from an Assault's war table or result by any way: the page's own music and air again)
    setHold(null);
    $('home').hidden = false;
    this.openSub(
      'Armies',
      (body) =>
        drawArmies(body, this.meta, {
          running: this.hooks.runInfo?.() ?? null,
          onContinue: () => this.go(this.hooks.onContinue),
          onFight: (id, tier, auto) => this.go(() => this.hooks.onArmy(id, tier, auto)),
          focus,
          onBack: () => this.closeSub(),
          onAssault: (id, restorm) => this.openAssault(id, restorm),
          onResume: (id) => this.resumeAssault(id),
          onAbandon: () => {
            abandonLive(this.meta);
            void clearBattle();
            saveMeta(this.meta);
          },
          onTribute: () => {
            const n = claimTribute(this.meta, todayKey());
            if (n) {
              saveMeta(this.meta);
              play('coinClaim');
            }
            return n;
          },
        }),
      false,
      true,
    );
    // (the cards a new army lit have been seen now: they glow no more the next time)
    if (markSeen(this.meta)) saveMeta(this.meta);
  }

  /** The Assault (docs/notes/assault-1.md): the muster for an army's hold, then the battle over everything, then its result, and back to the
   *  army card. */
  openAssault(army: string, restorm = false): void {
    const save = () => saveMeta(this.meta);
    openMuster(this.meta, army, {
      save,
      restorm,
      onBack: () => this.openArmies(army),
      onMarch: (plan) => {
        void runAssault(this.meta, army, plan, {
          save,
          onEnd: (result) => openAssaultResult(this.meta, result, { onBack: () => this.openArmies(army), onFill: () => this.openAssault(army, restorm) }),
        });
      },
    });
  }

  /** Resume the assault under way (phase 2) from its last snapshot; with none to be had, it is abandoned (a withdrawal). */
  private resumeAssault(army: string): void {
    const save = () => saveMeta(this.meta);
    void loadBattle().then((b) => {
      if (!b || b.field?.hold?.input.army !== army || b.phase !== 'fight') {
        abandonLive(this.meta);
        void clearBattle();
        save();
        this.openArmies(army);
        return;
      }
      void runAssault(this.meta, army, { approaches: {} }, {
        save,
        onEnd: (result) => openAssaultResult(this.meta, result, { onBack: () => this.openArmies(army), onFill: () => this.openAssault(army) }),
      }, b.seed, b);
    });
  }

  /** The achievements page; a Claim takes the crowns and stones, saves, and draws the page again. */
  private openAchievements(): void {
    const draw = (b: HTMLElement) =>
      drawAchievements(b, this.meta, (ids) => {
        const paid = ids.reduce((n, id) => n + claimAchievement(this.meta, id), 0);
        if (!paid) return;
        saveMeta(this.meta);
        play('coinClaim');
        b.replaceChildren();
        draw(b);
        this.refresh();
      });
    this.openSub('Achievements', draw);
  }

  /** The codex page; a Claim takes a milestone's crowns and stone, saves, and draws the page again. */
  openCodex(): void {
    const draw = (b: HTMLElement) =>
      drawCodex(b, this.meta, (id) => {
        if (!(claimCodex(this.meta, id))) return;
        saveMeta(this.meta);
        play('coinClaim');
        const keep = b.scrollTop;
        b.replaceChildren();
        draw(b);
        b.scrollTop = keep;
        this.refresh();
      }, undefined, (id) => this.hooks.onWatchScene?.(id));
    this.openSub('Codex', draw, false);
    $('hmSub').classList.add('codex');
  }

  private openSub(title: string, draw: (body: HTMLElement) => void, achievements = true, full = false): void {
    $('hmSub').hidden = false;
    // (the armies fill the page between the top bar and the tabs, with no header of their own)
    $('hmSub').classList.toggle('armies', full);
    $('hmSub').classList.remove('codex');
    stopCodex();
    $('hmSubBody').classList.remove('asBody');
    $('hmSubTitle').textContent = title;
    const body = $('hmSubBody');
    body.replaceChildren();
    draw(body);
    // (MENU-GLITCH: the page shows once its pictures (the armies' lands, say) are decoded, not dark and then filled in)
    void showWhenPainted($('hmSub'));
    // (looking at the achievements clears the badge)
    if (achievements)
      try {
        localStorage.setItem(SEEN, String(this.meta.achievements.length));
      } catch {
        /* private mode: the badge just stays */
      }
    this.refresh();
  }

  private closeSub(): void {
    stopCodex();
    $('hmSub').hidden = true;
    // (CLOSE-SCREENS: the armies, codex or achievements page left is emptied (a codex entry's sheet with it))
    $('hmSubBody').replaceChildren();
    $('hmSub').querySelector('.cxOverlay')?.remove();
    this.hooks.onScene?.();
  }
}

/** OVERLOOK-STAND: a run's last word on the overlook, over the enemy's camp below the heading (clear of the watchtower, the Calamity, the
 *  stall, the party and the plates). It never takes a tap, and fades by itself; a new one replaces the one showing. */
function showDispatch(page: HTMLElement, text: string): void {
  page.querySelector(':scope > .hmDispatch')?.remove();
  const d = el('div', 'hmNote hmDispatch', text);
  d.setAttribute('role', 'status');
  const gone = () => d.remove();
  d.addEventListener('animationend', gone);
  // (the fade's end, or a few seconds when animations do not run)
  setTimeout(gone, 8000);
  page.append(d);
}

