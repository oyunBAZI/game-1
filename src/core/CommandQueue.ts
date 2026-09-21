export interface Command<T = unknown> {
  id: string;
  execute(): T;
  undo?(): void;
  label?: string;
}

export class CommandQueue {
  private history: Command[] = [];
  private redoStack: Command[] = [];
  private counter = 0;

  execute<T>(command: Omit<Command<T>, "id">): T {
    const complete = { ...command, id: "command-" + ++this.counter };
    const result = complete.execute();
    this.history.push(complete);
    this.redoStack.length = 0;
    if (this.history.length > 200) this.history.shift();
    return result;
  }

  undo(): boolean {
    const command = this.history.pop();
    if (!command?.undo) return false;
    command.undo();
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;
    command.execute();
    this.history.push(command);
    return true;
  }

  clear(): void {
    this.history.length = 0;
    this.redoStack.length = 0;
  }

  get canUndo(): boolean {
    return this.history.some((command) => Boolean(command.undo));
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}