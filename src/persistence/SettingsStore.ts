import type { GameConfig } from "../config/GameConfig";

const KEY = "table-tennis-ultra.settings.v1";

export interface PersistedSettings {
  graphics: Partial<GameConfig["graphics"]>;
  controls: Partial<GameConfig["controls"]>;
  difficultyId: string;
  arenaId: string;
}

export class SettingsStore {
  load(): PersistedSettings | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedSettings;
    } catch {
      return null;
    }
  }

  save(settings: PersistedSettings): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      void 0;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      void 0;
    }
  }

  apply(settings: PersistedSettings | null, config: GameConfig): void {
    if (!settings) return;
    config.graphics = { ...config.graphics, ...settings.graphics };
    config.controls = { ...config.controls, ...settings.controls };
  }
}