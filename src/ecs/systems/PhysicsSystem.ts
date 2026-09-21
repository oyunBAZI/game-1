import { BaseSystem } from "../System";
import { PhysicsComponent } from "../components/PhysicsComponent";
import { TransformComponent } from "../components/TransformComponent";
import { EcsWorld } from "../World";

export class PhysicsSystem extends BaseSystem {
  readonly id = "ecs-physics";
  priority = 20;

  fixedUpdate(world: EcsWorld, dt: number): void {
    for (const entity of world.query(TransformComponent, PhysicsComponent)) {
      const transform = entity.require(TransformComponent);
      const physics = entity.require(PhysicsComponent);
      if (!physics.enabled || physics.body !== "dynamic" || physics.sleeping) continue;
      transform.previousPosition.copy(transform.position);
      physics.integrate(dt);
      transform.position.addScaled(physics.velocity, dt);
      transform.markDirty();
    }
  }
}