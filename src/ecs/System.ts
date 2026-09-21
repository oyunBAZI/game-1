import type { EcsWorld } from "./World";

export interface System {
  readonly id: string;
  readonly priority?: number;
  enabled?: boolean;
  initialize?(world: EcsWorld): void;
  update?(world: EcsWorld, dt: number, time: number): void;
  fixedUpdate?(world: EcsWorld, dt: number, tick: number): void;
  dispose?(): void;
}

export abstract class BaseSystem implements System {
  abstract readonly id: string;
  priority = 0;
  enabled = true;

  initialize(_world: EcsWorld): void {
    void _world;
  }

  update(_world: EcsWorld, _dt: number, _time: number): void {
    void _world;
    void _dt;
    void _time;
  }

  fixedUpdate(_world: EcsWorld, _dt: number, _tick: number): void {
    void _world;
    void _dt;
    void _tick;
  }

  dispose(): void {}
}

export class SystemScheduler {
  private systems: System[] = [];

  add(system: System): this {
    this.systems.push(system);
    this.systems.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    return this;
  }

  runFixed(world: EcsWorld, dt: number, tick: number): void {
    for (const system of this.systems) {
      if (system.enabled !== false) system.fixedUpdate?.(world, dt, tick);
    }
  }

  runFrame(world: EcsWorld, dt: number, time: number): void {
    for (const system of this.systems) {
      if (system.enabled !== false) system.update?.(world, dt, time);
    }
  }

  enable(id: string, value = true): void {
    const system = this.systems.find((candidate) => candidate.id === id);
    if (system) system.enabled = value;
  }

  list(): System[] {
    return [...this.systems];
  }
}