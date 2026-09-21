import type { EventBus } from "../core/EventBus";
import type { GameSimulation } from "../game/GameSimulation";
import { FeatureRegistry } from "./FeatureRegistry";

export interface GamePlugin {
  id: string;
  version: string;
  setup(api: PluginApi): void;
  dispose?(): void;
}

export class PluginApi {
  constructor(
    readonly simulation: GameSimulation,
    readonly events: EventBus,
    readonly features: FeatureRegistry
  ) {}

  addEventListener<K extends keyof import("../core/types").GameEventMap>(
    key: K,
    listener: (payload: import("../core/types").GameEventMap[K]) => void
  ): () => void {
    return this.events.on(key, listener).unsubscribe;
  }

  readBall(): Readonly<ReturnType<GameSimulation["snapshot"]>["ball"]> {
    return this.simulation.snapshot().ball;
  }

  announce(message: string): void {
    this.events.emit("ui:toast", { message, level: "info" });
  }
}

export class PluginHost {
  readonly features = new FeatureRegistry();
  readonly plugins: GamePlugin[] = [];
  readonly api: PluginApi;

  constructor(readonly simulation: GameSimulation) {
    this.api = new PluginApi(simulation, simulation.events, this.features);
  }

  install(plugin: GamePlugin): void {
    plugin.setup(this.api);
    this.plugins.push(plugin);
  }

  uninstall(id: string): void {
    const index = this.plugins.findIndex((plugin) => plugin.id === id);
    if (index < 0) return;
    this.plugins[index].dispose?.();
    this.plugins.splice(index, 1);
  }

  update(dt: number): void {
    this.features.update(dt);
  }

  dispose(): void {
    for (const plugin of this.plugins) plugin.dispose?.();
    this.plugins.length = 0;
    this.features.dispose();
  }
}