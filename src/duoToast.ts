// Toast/banner notification for Duo-Combo Ultimates and Harmonic Resonances.
// Displays a subtle, elegant banner at the top of the combat screen,
// formatted crisply for upright phone layouts (360x780, 393x852, 412x915).

let toastTimer: ReturnType<typeof setTimeout> | null = null;

const CSS = `
#duoToast {
  position: fixed;
  top: 48px;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  z-index: 100;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease, transform 0.25s ease;
  padding: 6px 14px;
  background: rgba(18, 22, 18, 0.94);
  border: 1px solid var(--gold, #f5c542);
  border-radius: 4px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.7), inset 0 0 10px rgba(245, 197, 66, 0.15);
  color: var(--gold-hi, #fff3b0);
  font: 700 12px/1.3 var(--body, monospace);
  text-align: center;
  white-space: nowrap;
  max-width: calc(100vw - 32px);
  overflow: hidden;
  text-overflow: ellipsis;
}
#duoToast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
#duoToast.harmonic {
  border-color: #ffd700;
  box-shadow: 0 4px 18px rgba(255, 215, 0, 0.45), inset 0 0 14px rgba(255, 215, 0, 0.25);
  color: #ffffff;
  text-shadow: 0 0 6px #ffd700;
}
@media (max-width: 420px) {
  #duoToast {
    font-size: 11px;
    padding: 5px 10px;
    top: 44px;
    max-width: calc(100vw - 24px);
  }
}
@media (prefers-reduced-motion: reduce) {
  #duoToast {
    transition: opacity 0.2s ease;
    transform: translateX(-50%);
  }
}
`;

let styleInjected = false;

function injectStyle(): void {
  if (styleInjected || typeof document === 'undefined') return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** Show a subtle battle banner toast on screen when a Duo-Combo or Harmonic Resonance triggers. */
export function showDuoToast(text: string, harmonic = false): void {
  if (typeof document === 'undefined') return;
  injectStyle();
  let box = document.getElementById('duoToast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'duoToast';
    box.setAttribute('role', 'status');
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.classList.toggle('harmonic', harmonic);
  box.classList.remove('show');
  void box.offsetWidth;
  box.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    box?.classList.remove('show');
  }, 2600);
}
