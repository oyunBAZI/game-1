import type { ReplayData } from "../core/types";

const INDEX_KEY = "table-tennis-ultra.replays.index.v1";
const DATA_PREFIX = "table-tennis-ultra.replay.";

export interface ReplayIndexEntry {
  id: string;
  createdAt: string;
  frames: number;
  label: string;
}

export class ReplayStore {
  list(): ReplayIndexEntry[] {
    try {
      return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]") as ReplayIndexEntry[];
    } catch {
      return [];
    }
  }

  save(id: string, label: string, data: ReplayData): void {
    const index = this.list().filter((entry) => entry.id !== id);
    index.unshift({ id, label, createdAt: data.header.createdAt, frames: data.frames.length });
    try {
      localStorage.setItem(DATA_PREFIX + id, JSON.stringify(data));
      localStorage.setItem(INDEX_KEY, JSON.stringify(index.slice(0, 20)));
    } catch {
      void 0;
    }
  }

  load(id: string): ReplayData | null {
    try {
      const raw = localStorage.getItem(DATA_PREFIX + id);
      return raw ? JSON.parse(raw) as ReplayData : null;
    } catch {
      return null;
    }
  }

  remove(id: string): void {
    const index = this.list().filter((entry) => entry.id !== id);
    try {
      localStorage.removeItem(DATA_PREFIX + id);
      localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    } catch {
      void 0;
    }
  }

  clear(): void {
    for (const entry of this.list()) {
      try {
        localStorage.removeItem(DATA_PREFIX + entry.id);
      } catch {
        void 0;
      }
    }
    try {
      localStorage.removeItem(INDEX_KEY);
    } catch {
      void 0;
    }
  }
}