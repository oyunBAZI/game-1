export type StateContext = object;

export interface StateDefinition<TContext extends StateContext = StateContext> {
  name: string;
  enter?(context: TContext, previous: string | null): void;
  exit?(context: TContext, next: string | null): void;
  update?(context: TContext, dt: number): void;
  fixedUpdate?(context: TContext, dt: number): void;
  canExit?(context: TContext, next: string): boolean;
}

export class StateMachine<TContext extends StateContext = StateContext> {
  private definitions = new Map<string, StateDefinition<TContext>>();
  private currentName: string | null = null;
  private previousName: string | null = null;
  private transitionQueue: string[] = [];
  private transitioning = false;

  constructor(private readonly context: TContext) {}

  add(definition: StateDefinition<TContext>): this {
    if (this.definitions.has(definition.name)) throw new Error("Duplicate state: " + definition.name);
    this.definitions.set(definition.name, definition);
    return this;
  }

  addMany(definitions: readonly StateDefinition<TContext>[]): this {
    definitions.forEach((definition) => this.add(definition));
    return this;
  }

  get current(): string | null {
    return this.currentName;
  }

  get previous(): string | null {
    return this.previousName;
  }

  has(name: string): boolean {
    return this.definitions.has(name);
  }

  start(name: string): void {
    if (this.currentName !== null) throw new Error("State machine already started");
    this.transitionTo(name);
  }

  transitionTo(name: string): boolean {
    if (!this.definitions.has(name)) throw new Error("Unknown state: " + name);
    if (this.currentName === name) return false;
    const current = this.currentName ? this.definitions.get(this.currentName) : null;
    if (current?.canExit && !current.canExit(this.context, name)) return false;
    if (this.transitioning) {
      this.transitionQueue.push(name);
      return true;
    }
    this.transitioning = true;
    current?.exit?.(this.context, name);
    this.previousName = this.currentName;
    this.currentName = name;
    this.definitions.get(name)?.enter?.(this.context, this.previousName);
    this.transitioning = false;
    const next = this.transitionQueue.shift();
    if (next) this.transitionTo(next);
    return true;
  }

  update(dt: number): void {
    if (!this.currentName) return;
    this.definitions.get(this.currentName)?.update?.(this.context, dt);
  }

  fixedUpdate(dt: number): void {
    if (!this.currentName) return;
    this.definitions.get(this.currentName)?.fixedUpdate?.(this.context, dt);
  }

  reset(): void {
    if (this.currentName) this.definitions.get(this.currentName)?.exit?.(this.context, null);
    this.currentName = null;
    this.previousName = null;
    this.transitionQueue.length = 0;
  }
}
