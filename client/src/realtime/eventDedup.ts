export class MutationEventDeduplicator {
  private seen = new Map<string, number>();
  private ttlMs: number;

  constructor(ttlMs = 8000) {
    this.ttlMs = ttlMs;
  }

  private prune(now: number): void {
    for (const [key, expiresAt] of this.seen.entries()) {
      if (expiresAt <= now) {
        this.seen.delete(key);
      }
    }
  }

  /**
   * Records a locally originated mutation key (e.g. `node:created:${nodeId}` or correlation id)
   * so the matching echoed socket event is ignored cleanly.
   */
  markLocal(key: string, now = Date.now()): void {
    this.prune(now);
    this.seen.set(key, now + this.ttlMs);
  }

  /**
   * Returns true if this incoming socket event matches a recent local optimistic mutation
   * and should be deduplicated (consumes the marker once).
   */
  shouldDeduplicate(key: string, now = Date.now()): boolean {
    this.prune(now);
    const expiresAt = this.seen.get(key);
    if (expiresAt && expiresAt > now) {
      this.seen.delete(key);
      return true;
    }
    return false;
  }

  clear(): void {
    this.seen.clear();
  }
}
