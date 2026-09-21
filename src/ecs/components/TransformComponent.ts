import { Quat } from "../../core/Quat";
import { Vec3 } from "../../core/Vec3";
import { BaseComponent } from "../Component";

export class TransformComponent extends BaseComponent {
  position = new Vec3();
  previousPosition = new Vec3();
  scale = new Vec3(1, 1, 1);
  rotation = new Quat();
  parentId: number | null = null;
  local = true;

  setPosition(value: Vec3): this {
    this.previousPosition.copy(this.position);
    this.position.copy(value);
    this.markDirty();
    return this;
  }

  translate(delta: Vec3): this {
    this.previousPosition.copy(this.position);
    this.position.add(delta);
    this.markDirty();
    return this;
  }

  setRotation(value: Quat): this {
    this.rotation.copy(value);
    this.markDirty();
    return this;
  }

  interpolate(alpha: number): Vec3 {
    return this.previousPosition.clone().lerp(this.position, alpha);
  }

  reset(): void {
    super.reset();
    this.position.set(0, 0, 0);
    this.previousPosition.set(0, 0, 0);
    this.scale.set(1, 1, 1);
    this.rotation.set(0, 0, 0, 1);
    this.parentId = null;
    this.local = true;
  }
}