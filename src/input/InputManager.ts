import { EventBus } from "../core/EventBus";
import type { InputFrame } from "../core/types";
import { emptyInputFrame, mergeInputFrames, type InputSource } from "./InputMapper";
import { GamepadInput } from "./GamepadInput";
import { KeyboardInput } from "./KeyboardInput";
import { PointerInput } from "./PointerInput";

export class InputManager {
  readonly keyboard: KeyboardInput;
  readonly pointer: PointerInput;
  readonly gamepad: GamepadInput;
  private sequence = 0;
  private current: InputFrame;
  private sources: InputSource[];

  constructor(
    private readonly element: HTMLElement,
    private readonly events: EventBus
  ) {
    this.keyboard = new KeyboardInput();
    this.pointer = new PointerInput(element);
    this.gamepad = new GamepadInput();
    this.sources = [this.keyboard, this.pointer, this.gamepad];
    this.current = emptyInputFrame();
  }

  sample(time = performance.now() / 1000): InputFrame {
    let next = emptyInputFrame(++this.sequence, time);
    for (const source of this.sources) next = mergeInputFrames(next, source.sample(time));
    this.current = next;
    this.events.emit("input:frame", next);
    return { ...next };
  }

  get frame(): InputFrame {
    return { ...this.current };
  }

  addSource(source: InputSource): () => void {
    this.sources.push(source);
    return () => {
      const index = this.sources.indexOf(source);
      if (index >= 0) this.sources.splice(index, 1);
    };
  }

  dispose(): void {
    this.sources.forEach((source) => source.dispose?.());
    this.sources.length = 0;
  }
}