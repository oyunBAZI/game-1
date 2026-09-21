import { componentName, type Component, type ComponentType } from "./Component";

let nextEntityId = 1;

export type EntityId = number;

export class Entity {
  readonly id: EntityId;
  readonly tags = new Set<string>();
  private components = new Map<ComponentType, Component>();
  private alive = true;
  private parent: Entity | null = null;
  private children = new Set<Entity>();

  constructor(id = nextEntityId++) {
    this.id = id;
  }

  static resetIds(): void {
    nextEntityId = 1;
  }

  add<T extends Component>(type: ComponentType<T>, component?: T): T {
    if (!this.alive) throw new Error("Cannot modify a dead entity");
    const value = component ?? new type();
    this.components.set(type, value);
    return value;
  }

  remove<T extends Component>(type: ComponentType<T>): boolean {
    return this.components.delete(type);
  }

  get<T extends Component>(type: ComponentType<T>): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  require<T extends Component>(type: ComponentType<T>): T {
    const value = this.get(type);
    if (!value) throw new Error("Entity " + this.id + " lacks " + componentName(type));
    return value;
  }

  has(...types: ComponentType[]): boolean {
    return types.every((type) => this.components.has(type));
  }

  hasAny(...types: ComponentType[]): boolean {
    return types.some((type) => this.components.has(type));
  }

  eachComponent(callback: (component: Component, type: ComponentType) => void): void {
    for (const [type, component] of this.components) callback(component, type);
  }

  setTag(tag: string, value = true): this {
    if (value) this.tags.add(tag);
    else this.tags.delete(tag);
    return this;
  }

  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  attach(child: Entity): this {
    if (child.parent) child.parent.detach(child);
    child.parent = this;
    this.children.add(child);
    return this;
  }

  detach(child: Entity): void {
    if (this.children.delete(child)) child.parent = null;
  }

  getParent(): Entity | null {
    return this.parent;
  }

  getChildren(): Entity[] {
    return [...this.children];
  }

  isAlive(): boolean {
    return this.alive;
  }

  destroy(): void {
    if (!this.alive) return;
    for (const child of this.children) child.destroy();
    this.children.clear();
    this.parent?.detach(this);
    this.components.clear();
    this.tags.clear();
    this.alive = false;
  }

  revive(): void {
    this.alive = true;
  }

  describe(): string {
    const components: string[] = [];
    this.eachComponent((_, type) => components.push(componentName(type)));
    return "Entity#" + this.id + "[" + components.join(", ") + "]";
  }
}