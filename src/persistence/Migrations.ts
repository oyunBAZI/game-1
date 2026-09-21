export interface VersionedDocument {
  version: number;
  payload: Record<string, unknown>;
}

export type Migration = (payload: Record<string, unknown>) => Record<string, unknown>;

export class MigrationRunner {
  private migrations = new Map<number, Migration>();

  register(fromVersion: number, migration: Migration): this {
    this.migrations.set(fromVersion, migration);
    return this;
  }

  migrate(document: VersionedDocument, targetVersion: number): VersionedDocument {
    let version = document.version;
    let payload = { ...document.payload };
    while (version < targetVersion) {
      const migration = this.migrations.get(version);
      if (!migration) throw new Error("Missing migration from version " + version);
      payload = migration(payload);
      version += 1;
    }
    if (version > targetVersion) throw new Error("Document is newer than requested target");
    return { version, payload };
  }

  hasPath(fromVersion: number, targetVersion: number): boolean {
    for (let version = fromVersion; version < targetVersion; version += 1) {
      if (!this.migrations.has(version)) return false;
    }
    return true;
  }
}

export const SETTINGS_MIGRATIONS = new MigrationRunner()
  .register(0, (payload) => ({
    ...payload,
    controls: { ...(payload.controls as Record<string, unknown> | undefined), assist: true }
  }))
  .register(1, (payload) => ({
    ...payload,
    graphics: { ...(payload.graphics as Record<string, unknown> | undefined), reducedMotion: false }
  }));