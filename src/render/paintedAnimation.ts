// The selected painted materials have six actual drawing frames. Pure timing,
// shared by one-shot particles and held effects; reduced motion keeps frame zero.
export const PAINTED_MOTION_FORMS = ['fire', 'smoke', 'electric'] as const;
export const paintedMotionRow = (form: string): number => (PAINTED_MOTION_FORMS as readonly string[]).indexOf(form);

export function paintedFrame(elapsed: number, life: number, loop: boolean, calm: boolean): number {
  if (calm) return 0;
  const time = Math.max(0, elapsed);
  return loop ? Math.floor(time / 90) % 6 : Math.min(5, Math.floor(time / Math.max(1, life) * 6));
}
