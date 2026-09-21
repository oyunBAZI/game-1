export type ComponentType<T extends object = object> = new (...args: any[]) => T;

export interface Component {
  enabled: boolean;
}

export abstract class BaseComponent implements Component {
  enabled = true;
  protected dirty = true;

  markDirty(): void {
    this.dirty = true;
  }

  clearDirty(): void {
    this.dirty = false;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  reset(): void {
    this.enabled = true;
    this.dirty = true;
  }
}

export interface ComponentSnapshot {
  type: string;
  enabled: boolean;
  data: Record<string, unknown>;
}

export function componentName(type: ComponentType): string {
  return type.name || "AnonymousComponent";
}

export function isComponent(value: unknown): value is Component {
  return Boolean(value && typeof value === "object" && "enabled" in value);
}

export class ComponentPool<T extends BaseComponent> {
  private available: T[] = [];
  private active = new Set<T>();

  constructor(private readonly factory: () => T) {}

  acquire(): T {
    const value = this.available.pop() ?? this.factory();
    value.reset();
    this.active.add(value);
    return value;
  }

  release(value: T): void {
    if (!this.active.has(value)) return;
    this.active.delete(value);
    this.available.push(value);
  }

  activeCount(): number {
    return this.active.size;
  }

  availableCount(): number {
    return this.available.length;
  }

  clear(): void {
    this.active.clear();
    this.available.length = 0;
  }
}