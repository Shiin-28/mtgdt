/**
 * A serial request queue that leaves at least `minIntervalMs` between the
 * start of consecutive tasks. Tasks run one at a time, in order.
 *
 * `pause(ms)` pushes the next start time out, used to back off after a 429
 * or repeated errors.
 */
export class Throttle {
  private tail: Promise<unknown> = Promise.resolve();
  private nextStart = 0;

  constructor(private readonly minIntervalMs: number) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      const wait = this.nextStart - Date.now();
      if (wait > 0) await sleep(wait);
      this.nextStart = Date.now() + this.minIntervalMs;
      return task();
    });
    // Keep the chain alive when a task fails.
    this.tail = result.catch(() => undefined);
    return result;
  }

  pause(ms: number) {
    this.nextStart = Math.max(this.nextStart, Date.now() + ms);
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One Throttle per key, kept on globalThis so dev hot reloads share it. */
export function getThrottle(key: string, minIntervalMs: number): Throttle {
  const g = globalThis as unknown as { __throttles?: Map<string, Throttle> };
  g.__throttles ??= new Map();
  let t = g.__throttles.get(key);
  if (!t) {
    t = new Throttle(minIntervalMs);
    g.__throttles.set(key, t);
  }
  return t;
}
