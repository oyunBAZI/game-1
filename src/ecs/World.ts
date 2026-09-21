import type { EventBus } from "../core/EventBus";
import type { ComponentType } from "./Component";
import { Entity, type EntityId } from "./Entity";
import type { System } from "./System";

export class EcsWorld {
  private entities = new Map<EntityId, Entity>();
  private systems: System[] = [];
  private pendingDestroy: Entity[] = [];
  private time = 0;
  private tick = 0;

  constructor(readonly events?: EventBus) {}

  createEntity(tags: string[] = []): Entity {
    const entity = new Entity();
    tags.forEach((tag) => entity.setTag(tag));
    this.entities.set(entity.id, entity);
    this.events?.emitUnknown("ecs:entity-created", { id: entity.id, tags });
    return entity;
  }

  destroyEntity(entity: Entity): void {
    if (!this.entities.has(entity.id)) return;
    this.pendingDestroy.push(entity);
  }

  get(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  all(): Entity[] {
    return [...this.entities.values()].filter((entity) => entity.isAlive());
  }

  query(...types: ComponentType[]): Entity[] {
    return this.all().filter((entity) => entity.has(...types));
  }

  queryTag(tag: string): Entity[] {
    return this.all().filter((entity) => entity.hasTag(tag));
  }

  addSystem(system: System): () => void {
    this.systems.push(system);
    this.systems.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    system.initialize?.(this);
    return () => {
      const index = this.systems.indexOf(system);
      if (index >= 0) this.systems.splice(index, 1);
      system.dispose?.();
    };
  }

  fixedUpdate(dt: number): void {
    this.tick += 1;
    this.time += dt;
    for (const system of this.systems) {
      if (system.enabled !== false) system.fixedUpdate?.(this, dt, this.tick);
    }
    this.flushDestroy();
  }

  update(dt: number): void {
    for (const system of this.systems) {
      if (system.enabled !== false) system.update?.(this, dt, this.time);
    }
  }

  getTick(): number {
    return this.tick;
  }

  getTime(): number {
    return this.time;
  }

  clear(): void {
    for (const system of this.systems) system.dispose?.();
    this.systems.length = 0;
    for (const entity of this.entities.values()) entity.destroy();
    this.entities.clear();
    this.pendingDestroy.length = 0;
    this.time = 0;
    this.tick = 0;
  }

  private flushDestroy(): void {
    for (const entity of this.pendingDestroy.splice(0)) {
      entity.destroy();
      this.entities.delete(entity.id);
      this.events?.emitUnknown("ecs:entity-destroyed", { id: entity.id });
    }
  }
}