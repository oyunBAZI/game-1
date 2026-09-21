import { BaseSystem } from "../System";
import { TransformComponent } from "../components/TransformComponent";
import { EcsWorld } from "../World";

export class TransformSystem extends BaseSystem {
  readonly id = "transform";
  priority = 10;

  fixedUpdate(world: EcsWorld, dt: number): void {
    for (const entity of world.query(TransformComponent)) {
      const transform = entity.require(TransformComponent);
      if (!transform.enabled || !transform.parentId) continue;
      const parent = world.get(transform.parentId);
      const parentTransform = parent?.get(TransformComponent);
      if (!parentTransform) continue;
      transform.previousPosition.copy(transform.position);
      transform.position.copy(parentTransform.position).add(transform.position);
      transform.markDirty();
      void dt;
    }
  }
}