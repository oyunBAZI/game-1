export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
  time: number;
}

export class Logger {
  private entries: LogEntry[] = [];
  private enabled = true;
  private minimum: LogLevel = "info";
  private scopes = new Map<string, Logger>();

  constructor(private readonly scope = "game") {}

  child(scope: string): Logger {
    const existing = this.scopes.get(scope);
    if (existing) return existing;
    const child = new Logger(this.scope + ":" + scope);
    child.setMinimum(this.minimum);
    this.scopes.set(scope, child);
    return child;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setMinimum(level: LogLevel): void {
    this.minimum = level;
  }

  debug(message: string, data?: unknown): void {
    this.write("debug", message, data);
  }

  info(message: string, data?: unknown): void {
    this.write("info", message, data);
  }

  warn(message: string, data?: unknown): void {
    this.write("warn", message, data);
  }

  error(message: string, data?: unknown): void {
    this.write("error", message, data);
  }

  recent(limit = 50): LogEntry[] {
    return this.entries.slice(-limit);
  }

  clear(): void {
    this.entries.length = 0;
  }

  private write(level: LogLevel, message: string, data?: unknown): void {
    if (!this.enabled || !this.shouldWrite(level)) return;
    const entry = { level, scope: this.scope, message, data, time: Date.now() };
    this.entries.push(entry);
    if (this.entries.length > 500) this.entries.shift();
    const prefix = "[" + this.scope + "]";
    if (level === "error") console.error(prefix, message, data ?? "");
    else if (level === "warn") console.warn(prefix, message, data ?? "");
    else if (level === "debug") console.debug(prefix, message, data ?? "");
    else console.info(prefix, message, data ?? "");
  }

  private shouldWrite(level: LogLevel): boolean {
    const order: LogLevel[] = ["debug", "info", "warn", "error"];
    return order.indexOf(level) >= order.indexOf(this.minimum);
  }
}