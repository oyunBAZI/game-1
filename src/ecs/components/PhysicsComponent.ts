import { Vec3 } from "../../core/Vec3";
import { BaseComponent } from "../Component";

export type BodyKind = "dynamic" | "kinematic" | "static";

export class PhysicsComponent extends BaseComponent {
  body: BodyKind = "dynamic";
  velocity = new Vec3();
  angularVelocity = new Vec3();
  force = new Vec3();
  mass = 1;
  restitution = 0.5;
  friction = 0.5;
  gravityScale = 1;
  sleeping = false;
  ccd = true;
  collisionMask = 0xffff;
  collisionGroup = 1;

  applyForce(force: Vec3): void {
    this.force.add(force);
    this.markDirty();
  }

  integrate(dt: number, gravity = -9.81): void {
    if (!this.enabled || this.body !== "dynamic" || this.sleeping) return;
    this.velocity.y += gravity * this.gravityScale * dt;
    this.velocity.addScaled(this.force, dt / Math.max(0.0001, this.mass));
    this.force.set(0, 0, 0);
  }

  reset(): void {
    super.reset();
    this.body = "dynamic";
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.force.set(0, 0, 0);
    this.mass = 1;
    this.restitution = 0.5;
    this.friction = 0.5;
    this.gravityScale = 1;
    this.sleeping = false;
    this.ccd = true;
    this.collisionMask = 0xffff;
    this.collisionGroup = 1;
  }
}