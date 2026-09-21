export type Observer<T> = (value: T, previous: T) => void;

export class ObservableValue<T> {
  private observers = new Set<Observer<T>>();

  constructor(private value: T) {}

  get(): T {
    return this.value;
  }

  set(value: T): boolean {
    if (Object.is(value, this.value)) return false;
    const previous = this.value;
    this.value = value;
    for (const observer of [...this.observers]) observer(value, previous);
    return true;
  }

  update(updater: (value: T) => T): boolean {
    return this.set(updater(this.value));
  }

  subscribe(observer: Observer<T>): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  map<U>(mapper: (value: T) => U): ObservableValue<U> {
    const mapped = new ObservableValue(mapper(this.value));
    this.subscribe((value) => mapped.set(mapper(value)));
    return mapped;
  }

  dispose(): void {
    this.observers.clear();
  }
}

export class ObservableArray<T> {
  private values: T[] = [];
  private observers = new Set<(values: readonly T[]) => void>();

  constructor(initial: T[] = []) {
    this.values = [...initial];
  }

  get length(): number {
    return this.values.length;
  }

  at(index: number): T | undefined {
    return this.values[index];
  }

  toArray(): T[] {
    return [...this.values];
  }

  push(...values: T[]): void {
    this.values.push(...values);
    this.emit();
  }

  remove(value: T): boolean {
    const index = this.values.indexOf(value);
    if (index < 0) return false;
    this.values.splice(index, 1);
    this.emit();
    return true;
  }

  clear(): void {
    if (!this.values.length) return;
    this.values.length = 0;
    this.emit();
  }

  subscribe(observer: (values: readonly T[]) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private emit(): void {
    const snapshot = this.values;
    for (const observer of [...this.observers]) observer(snapshot);
  }
}