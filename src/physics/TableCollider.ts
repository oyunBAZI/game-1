import { Vec3 } from "../core/Vec3";
import type { CollisionContact } from "../core/types";
import { BALL, TABLE } from "./constants";
import { sweptSpherePlane } from "./CollisionPrimitives";
import type { BallState } from "./State";

export interface TableCollision {
  contact: CollisionContact;
  normal: Vec3;
  surface: "top" | "edge" | "side";
}

export class TableCollider {
  readonly topY = TABLE.top;
  readonly left = -TABLE.width / 2;
  readonly right = TABLE.width / 2;
  readonly near = -TABLE.length / 2;
  readonly far = TABLE.length / 2;

  detect(ball: BallState): TableCollision | null {
    const start = ball.previousPosition;
    const end = ball.position;
    const plane = sweptSpherePlane(start, end, BALL.radius, {
      point: new Vec3(0, this.topY, 0),
      normal: new Vec3(0, 1, 0),
      id: "table-top",
      kind: "table"
    });
    if (plane.hit && this.isOverTop(plane.point.x, plane.point.z)) {
      return {
        contact: {
          kind: "table",
          timeOfImpact: plane.time,
          point: plane.point.toJSON(),
          normal: plane.normal.toJSON(),
          penetration: plane.penetration,
          relativeSpeed: ball.velocity.length(),
          surfaceId: "table-top"
        },
        normal: plane.normal,
        surface: "top"
      };
    }
    const edge = this.detectEdge(ball);
    if (edge) return edge;
    return null;
  }

  isOverTop(x: number, z: number): boolean {
    return x >= this.left && x <= this.right && z >= this.near && z <= this.far;
  }

  sideForZ(z: number): "home" | "away" {
    return z >= 0 ? "home" : "away";
  }

  detectEdge(ball: BallState): TableCollision | null {
    const x = ball.position.x;
    const z = ball.position.z;
    const nearEdge = Math.abs(Math.abs(x) - TABLE.width / 2) <= BALL.radius * 1.1;
    const endEdge = Math.abs(Math.abs(z) - TABLE.length / 2) <= BALL.radius * 1.1;
    const nearHeight = Math.abs(ball.position.y - TABLE.top) <= BALL.radius * 1.3;
    if (!nearHeight || (!nearEdge && !endEdge)) return null;
    const normal = nearEdge
      ? new Vec3(x > 0 ? 1 : -1, 0.45, 0).normalize()
      : new Vec3(0, 0.45, z > 0 ? 1 : -1).normalize();
    return {
      contact: {
        kind: "edge",
        timeOfImpact: 0,
        point: ball.position.toJSON(),
        normal: normal.toJSON(),
        penetration: 0,
        relativeSpeed: ball.velocity.length(),
        surfaceId: nearEdge ? "table-side-edge" : "table-end-edge"
      },
      normal,
      surface: "edge"
    };
  }

  isOnPlayingSurface(position: Vec3): boolean {
    return this.isOverTop(position.x, position.z) && position.y >= this.topY - BALL.radius * 1.5;
  }
}