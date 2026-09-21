import type { EventKey, GameEventMap } from "./types";

type Listener<T> = (payload: T) => void;

export interface EventSubscription {
  unsubscribe(): void;
}

export class EventBus {
  private listeners = new Map<string, Set<Listener<unknown>>>();
  private history: Array<{ key: string; payload: unknown; time: number }> = [];
  private historyLimit: number;

  constructor(historyLimit = 256) {
    this.historyLimit = historyLimit;
  }

  on<K extends EventKey>(key: K, listener: Listener<GameEventMap[K]>): EventSubscription {
    const bucket = this.listeners.get(key) ?? new Set<Listener<unknown>>();
    bucket.add(listener as Listener<unknown>);
    this.listeners.set(key, bucket);
    return {
      unsubscribe: () => bucket.delete(listener as Listener<unknown>)
    };
  }

  once<K extends EventKey>(key: K, listener: Listener<GameEventMap[K]>): EventSubscription {
    let subscription: EventSubscription;
    subscription = this.on(key, (payload) => {
      subscription.unsubscribe();
      listener(payload);
    });
    return subscription;
  }

  emit<K extends EventKey>(key: K, payload: GameEventMap[K]): void {
    this.record(key, payload);
    const bucket = this.listeners.get(key);
    if (!bucket) return;
    for (const listener of [...bucket]) listener(payload);
  }

  emitUnknown(key: string, payload: unknown): void {
    this.record(key, payload);
    const bucket = this.listeners.get(key);
    if (!bucket) return;
    for (const listener of [...bucket]) listener(payload);
  }

  off<K extends EventKey>(key: K, listener: Listener<GameEventMap[K]>): void {
    this.listeners.get(key)?.delete(listener as Listener<unknown>);
  }

  clear(key?: string): void {
    if (key) this.listeners.delete(key);
    else this.listeners.clear();
  }

  listenerCount(key?: string): number {
    if (key) return this.listeners.get(key)?.size ?? 0;
    let count = 0;
    for (const bucket of this.listeners.values()) count += bucket.size;
    return count;
  }

  recent(limit = 32): Array<{ key: string; payload: unknown; time: number }> {
    return this.history.slice(-Math.max(0, limit));
  }

  private record(key: string, payload: unknown): void {
    this.history.push({ key, payload, time: Date.now() });
    if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit);
  }

  dispose(): void {
    this.clear();
    this.history.length = 0;
  }
}