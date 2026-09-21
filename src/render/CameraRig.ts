import * as THREE from "three";
import { damp, dampAngle } from "../core/MathUtils";
import { Vec3 } from "../core/Vec3";
import type { BallState } from "../physics/State";

export type CameraMode = "competitive" | "broadcast" | "ball" | "free";

export class CameraRig {
  mode: CameraMode = "competitive";
  private readonly target = new THREE.Vector3(0, 0.8, 0);
  private readonly desiredPosition = new THREE.Vector3(3.2, 2.2, 4.8);
  private yaw = 0.58;
  private pitch = 0.22;
  private distance = 5.7;
  private shake = 0;
  private elapsed = 0;

  constructor(readonly camera: THREE.PerspectiveCamera) {
    camera.position.copy(this.desiredPosition);
  }

  update(dt: number, ball: BallState): void {
    this.elapsed += dt;
    if (this.mode === "competitive") this.updateCompetitive(ball);
    else if (this.mode === "broadcast") this.updateBroadcast(ball);
    else if (this.mode === "ball") this.updateBall(ball);
    this.camera.position.x = damp(this.camera.position.x, this.desiredPosition.x, 7, dt);
    this.camera.position.y = damp(this.camera.position.y, this.desiredPosition.y, 7, dt);
    this.camera.position.z = damp(this.camera.position.z, this.desiredPosition.z, 7, dt);
    const shakeAmount = this.shake * this.shake;
    this.camera.position.x += Math.sin(this.elapsed * 53) * shakeAmount;
    this.camera.position.y += Math.cos(this.elapsed * 47) * shakeAmount * 0.5;
    this.camera.position.z += Math.sin(this.elapsed * 61) * shakeAmount * 0.4;
    this.camera.lookAt(this.target);
    this.shake = Math.max(0, this.shake - dt * 2.5);
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  setOrbit(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = Math.max(-0.15, Math.min(0.8, pitch));
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, Math.min(1, amount));
  }

  private updateCompetitive(ball: BallState): void {
    this.target.set(0, 0.9, ball.position.z * 0.08);
    this.distance = 5.8;
    this.desiredPosition.set(
      Math.sin(this.yaw) * this.distance,
      1.85 + Math.sin(this.pitch) * 1.5,
      Math.cos(this.yaw) * this.distance + 0.8
    );
    this.camera.fov = damp(this.camera.fov, 42 + ball.speed() * 0.12, 4, 1 / 60);
    this.camera.updateProjectionMatrix();
  }

  private updateBroadcast(ball: BallState): void {
    this.target.set(0, 0.82, 0);
    this.desiredPosition.set(4.8, 2.8, 3.8 + ball.position.z * 0.12);
    this.camera.fov = damp(this.camera.fov, 48, 4, 1 / 60);
    this.camera.updateProjectionMatrix();
  }

  private updateBall(ball: BallState): void {
    this.target.set(ball.position.x, ball.position.y, ball.position.z);
    const forward = ball.velocity.clone().normalize();
    const position = Vec3.from(ball.position).addScaled(forward, -1.1).add(new Vec3(0, 0.35, 0));
    this.desiredPosition.set(position.x, position.y, position.z);
    this.camera.fov = damp(this.camera.fov, 55, 5, 1 / 60);
    this.camera.updateProjectionMatrix();
  }
}