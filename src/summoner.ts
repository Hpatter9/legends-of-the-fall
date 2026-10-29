// A separate ceremonial actor: planted feet, a breathing robe, casting and an eye-shield reaction.
import summonerUrl from './art/hall/summoner-active.png';

export function summoner(): HTMLElement {
  const actor = document.createElement('div');
  actor.className = 'summonerActor';
  actor.dataset.pose = 'idle';
  actor.setAttribute('aria-hidden', 'true');
  actor.append(document.createElement('i'));
  return actor;
}

const style = document.createElement('style');
style.textContent = `
.summonerActor { position: absolute; left: 0; top: 42%; width: 33%; height: 35%; pointer-events: none; }
.summonerActor i { display: block; width: 100%; height: 100%; background: url("${summonerUrl}") 0 50% / 300% 100% no-repeat; transform-origin: 50% 100%; animation: summonerBreath 3.2s ease-in-out infinite; }
.summonerActor[data-pose="cast"] i { background-position-x: 50%; animation: summonerCast 1s ease-in-out infinite; }
.summonerActor[data-pose="shield"] i { background-position-x: 100%; animation: summonerShield .35s ease-out both; }
@keyframes summonerBreath { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.012) skewX(.35deg); } }
@keyframes summonerCast { 0%, 100% { transform: skewX(0); } 50% { transform: skewX(-1.2deg) scaleY(1.01); } }
@keyframes summonerShield { from { transform: skewX(0); } to { transform: skewX(-2deg); } }
@media (prefers-reduced-motion: reduce) { .summonerActor i { animation: none !important; } }
`;
document.head.append(style);
