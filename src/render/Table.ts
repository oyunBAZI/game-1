import * as THREE from "three";
import { TABLE } from "../physics/constants";
import type { MaterialPalette } from "./ProceduralMaterials";

export class TableVisual {
  readonly group = new THREE.Group();
  private readonly top: THREE.Mesh;
  private readonly legs = new THREE.Group();
  private readonly net = new THREE.Group();
  private readonly shadows = new THREE.Group();

  constructor(private readonly materials: MaterialPalette) {
    this.group.name = "table-visual";
    const topGeometry = new THREE.BoxGeometry(TABLE.width, TABLE.thickness, TABLE.length);
    this.top = new THREE.Mesh(topGeometry, materials.table);
    this.top.position.y = TABLE.top - TABLE.thickness / 2;
    this.top.castShadow = true;
    this.top.receiveShadow = true;
    this.group.add(this.top);
    this.addBoundaryLines();
    this.addUnderframe();
    this.addLegs();
    this.addNet();
  }

  private addBoundaryLines(): void {
    const lineHeight = TABLE.top + 0.001;
    const lineWidth = 0.018;
    const horizontal = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.width - 0.03, 0.002, lineWidth),
      this.materials.tableLine
    );
    horizontal.position.set(0, lineHeight, -TABLE.length / 2 + 0.018);
    const horizontal2 = horizontal.clone();
    horizontal2.position.z = TABLE.length / 2 - 0.018;
    const vertical = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, 0.002, TABLE.length - 0.03),
      this.materials.tableLine
    );
    vertical.position.set(-TABLE.width / 2 + 0.018, lineHeight, 0);
    const vertical2 = vertical.clone();
    vertical2.position.x = TABLE.width / 2 - 0.018;
    this.group.add(horizontal, horizontal2, vertical, vertical2);
    const center = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.002, TABLE.length - 0.04),
      this.materials.tableLine
    );
    center.position.set(0, lineHeight + 0.0005, 0);
    this.group.add(center);
  }

  private addUnderframe(): void {
    const railY = TABLE.top - 0.08;
    const longRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, TABLE.length + 0.12),
      this.materials.tableEdge
    );
    longRail.position.set(-TABLE.width / 2 + 0.07, railY, 0);
    const longRail2 = longRail.clone();
    longRail2.position.x = TABLE.width / 2 - 0.07;
    const endRail = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.width - 0.08, 0.06, 0.06),
      this.materials.tableEdge
    );
    endRail.position.set(0, railY, -TABLE.length / 2 + 0.07);
    const endRail2 = endRail.clone();
    endRail2.position.z = TABLE.length / 2 - 0.07;
    this.group.add(longRail, longRail2, endRail, endRail2);
  }

  private addLegs(): void {
    const positions = [
      [-TABLE.width / 2 + 0.11, -TABLE.length / 2 + 0.14],
      [TABLE.width / 2 - 0.11, -TABLE.length / 2 + 0.14],
      [-TABLE.width / 2 + 0.11, TABLE.length / 2 - 0.14],
      [TABLE.width / 2 - 0.11, TABLE.length / 2 - 0.14]
    ];
    for (const [x, z] of positions) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, TABLE.top - 0.08, 12),
        this.materials.metal
      );
      leg.position.set(x, (TABLE.top - 0.08) / 2, z);
      leg.castShadow = true;
      this.legs.add(leg);
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.035, 0.12),
        this.materials.metal
      );
      foot.position.set(x, 0.018, z);
      this.legs.add(foot);
    }
    this.group.add(this.legs);
  }

  private addNet(): void {
    const postHeight = TABLE.netHeight + 0.08;
    for (const x of [-TABLE.width / 2 - 0.018, TABLE.width / 2 + 0.018]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.018, postHeight, 12),
        this.materials.metal
      );
      post.position.set(x, TABLE.top + postHeight / 2, 0);
      post.castShadow = true;
      this.net.add(post);
    }
    const netGeometry = new THREE.PlaneGeometry(TABLE.width, TABLE.netHeight, 12, 4);
    const netMesh = new THREE.Mesh(
      netGeometry,
      new THREE.MeshStandardMaterial({
        color: 0x17262b,
        roughness: 0.94,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      })
    );
    netMesh.rotation.y = Math.PI / 2;
    netMesh.position.set(0, TABLE.top + TABLE.netHeight / 2, 0);
    this.net.add(netMesh);
    this.group.add(this.net);
  }

  updateNet(nodes: Array<{ x: number; y: number; z: number }>): void {
    const mesh = this.net.children.find((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry) as THREE.Mesh | undefined;
    if (!mesh) return;
    const positions = mesh.geometry.getAttribute("position");
    for (let index = 0; index < Math.min(nodes.length, positions.count); index += 1) {
      const node = nodes[index];
      positions.setXYZ(index, node.z, node.y - (TABLE.top + TABLE.netHeight / 2), node.x);
    }
    positions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  dispose(): void {
    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
    });
  }
}