// Collects items (changed paths) and flushes them once no new item arrived for `ms`. Timers are
// injected, so the behaviour is deterministic in tests and the module stays free of globals.

export interface Timers {
  readonly set: (fn: () => void, ms: number) => unknown;
  readonly clear: (handle: unknown) => void;
}

export interface Batcher<T> {
  readonly push: (item: T) => void;
  /** Drops pending items without flushing (server shutdown). */
  readonly cancel: () => void;
}

/** Items are de-duplicated and flushed in arrival order. */
export const batcher = <T>(ms: number, flush: (items: T[]) => void, timers: Timers): Batcher<T> => {
  let pending = new Set<T>();
  let handle: unknown;
  const fire = (): void => {
    handle = undefined;
    const items = [...pending];
    pending = new Set();
    if (items.length) flush(items);
  };
  return {
    push: (item) => {
      pending.add(item);
      if (handle !== undefined) timers.clear(handle);
      handle = timers.set(fire, ms);
    },
    cancel: () => {
      if (handle !== undefined) timers.clear(handle);
      handle = undefined;
      pending = new Set();
    },
  };
};
