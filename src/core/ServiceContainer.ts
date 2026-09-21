export type ServiceToken<T> = string | symbol | (new (...args: any[]) => T);

export class ServiceContainer {
  private services = new Map<ServiceToken<unknown>, unknown>();
  private factories = new Map<ServiceToken<unknown>, () => unknown>();

  bind<T>(token: ServiceToken<T>, value: T): this {
    this.services.set(token, value);
    return this;
  }

  singleton<T>(token: ServiceToken<T>, factory: () => T): this {
    this.factories.set(token, factory);
    return this;
  }

  has<T>(token: ServiceToken<T>): boolean {
    return this.services.has(token) || this.factories.has(token);
  }

  get<T>(token: ServiceToken<T>): T {
    if (this.services.has(token)) return this.services.get(token) as T;
    const factory = this.factories.get(token);
    if (!factory) throw new Error("Service not registered");
    const value = factory() as T;
    this.services.set(token, value);
    this.factories.delete(token);
    return value;
  }

  getOptional<T>(token: ServiceToken<T>): T | undefined {
    return this.has(token) ? this.get(token) : undefined;
  }

  remove<T>(token: ServiceToken<T>): void {
    const value = this.services.get(token);
    if (value && typeof (value as any).dispose === "function") (value as any).dispose();
    this.services.delete(token);
    this.factories.delete(token);
  }

  clear(): void {
    for (const token of this.services.keys()) this.remove(token);
    this.services.clear();
    this.factories.clear();
  }
}