export interface Feature {
  id: string;
  label: string;
  version: string;
  enabled: boolean;
  dependencies: string[];
  initialize?(): void;
  update?(dt: number): void;
  dispose?(): void;
}

export class FeatureRegistry {
  private features = new Map<string, Feature>();
  private initialized = false;

  register(feature: Feature): void {
    if (this.features.has(feature.id)) throw new Error("Feature already registered: " + feature.id);
    this.features.set(feature.id, { ...feature, dependencies: [...feature.dependencies] });
  }

  enable(id: string): boolean {
    const feature = this.features.get(id);
    if (!feature) return false;
    for (const dependency of feature.dependencies) {
      if (!this.enable(dependency)) return false;
    }
    if (!feature.enabled) {
      feature.enabled = true;
      if (this.initialized) feature.initialize?.();
    }
    return true;
  }

  disable(id: string): void {
    const feature = this.features.get(id);
    if (!feature) return;
    feature.enabled = false;
    feature.dispose?.();
  }

  initialize(): void {
    this.initialized = true;
    for (const feature of this.features.values()) {
      if (feature.enabled) feature.initialize?.();
    }
  }

  update(dt: number): void {
    for (const feature of this.features.values()) if (feature.enabled) feature.update?.(dt);
  }

  list(): Feature[] {
    return [...this.features.values()].map((feature) => ({ ...feature, dependencies: [...feature.dependencies] }));
  }

  dispose(): void {
    for (const feature of this.features.values()) feature.dispose?.();
    this.features.clear();
    this.initialized = false;
  }
}