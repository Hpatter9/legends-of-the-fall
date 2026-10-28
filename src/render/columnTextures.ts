// Ownership only: no Pixi or DOM, so temporary bakes and live boards share the same tested rules.
export interface ColumnLease<T> { value: T; release(): void }
interface Entry<T> { value: T; bytes: number; refs: number; retained: boolean }

export class ColumnTextures<T> {
  private entries = new Map<string, Entry<T>>();
  private bytes = 0;
  private live = new Set<Entry<T>>();
  private hits = 0;
  private misses = 0;
  constructor(private destroy: (value: T) => void, readonly maxEntries = 256, readonly maxBytes = 4 * 1024 * 1024) {}

  acquire(key: string, bytes: number, make: () => T): ColumnLease<T> {
    let entry = this.entries.get(key);
    if (entry) {
      this.hits++;
      // Access order, rather than insertion order, keeps recent terrain useful.
      this.entries.delete(key);
      this.entries.set(key, entry);
    } else {
      this.misses++;
      entry = { value: make(), bytes, refs: 0, retained: false };
      this.live.add(entry);
      // Never evict a source still used by a live/demoted board or an in-flight bake.
      for (const [oldKey, old] of this.entries) {
        if (this.entries.size < this.maxEntries && this.bytes + bytes <= this.maxBytes) break;
        if (old.refs) continue;
        this.entries.delete(oldKey);
        this.bytes -= old.bytes;
        this.dispose(old);
      }
      if (this.entries.size < this.maxEntries && this.bytes + bytes <= this.maxBytes) {
        entry.retained = true;
        this.entries.set(key, entry);
        this.bytes += bytes;
      }
    }
    entry.refs++;
    const held = entry;
    let released = false;
    return { value: held.value, release: () => {
      if (released) return;
      released = true;
      held.refs--;
      if (!held.refs && !held.retained) this.dispose(held);
    } };
  }

  /** Explicit purge releases idle sources and lets pinned ones die with their final lease. */
  clear(): void {
    for (const entry of this.entries.values()) {
      entry.retained = false;
      if (!entry.refs) this.dispose(entry);
    }
    this.entries.clear();
    this.bytes = 0;
  }

  private dispose(entry: Entry<T>): void {
    this.live.delete(entry);
    this.destroy(entry.value);
  }

  get stats() {
    return { hits: this.hits, misses: this.misses, retained: this.entries.size, retainedBytes: this.bytes,
      live: this.live.size, liveBytes: [...this.live].reduce((sum, e) => sum + e.bytes, 0),
      leases: [...this.live].reduce((sum, e) => sum + e.refs, 0) };
  }
}

/** Inputs used by the existing painter. Keep signed/fractional offsets: scenery uses negative coordinates. */
export function columnKey(area: string, boss: boolean, height: number, bridge: boolean, ground: string | undefined, top: number, artEpoch: number, u: number, v: number, perch?: boolean, ramp?: boolean, road?: string): string {
  const key = [area, boss, height, bridge, ground ?? null, top, artEpoch, ((u * 23 + v * 11) % 5) * 16, !!perch, !!ramp];
  // (an army road's column: a short skirt that fades out below, not a cliff to the foot; `boardView.ts`)
  return JSON.stringify(road ? [...key, road] : key);
}
