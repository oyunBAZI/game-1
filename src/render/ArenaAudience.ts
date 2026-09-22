import * as THREE from "three";

/** Deterministic seated audience: four instanced draws, no per-frame animation. */
export function createArenaAudience(): THREE.Group {
  const group = new THREE.Group();
  group.name = "arena-audience";
  const standMaterial = new THREE.MeshStandardMaterial({ color: 0x162c38, roughness: 0.8 });
  for (const side of [-1, 1]) for (let row = 0; row < 3; row += 1) {
    const tier = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18 + row * 0.22, 7.4), standMaterial);
    tier.position.set(side * (4.65 + row * 0.55), (0.18 + row * 0.22) / 2, -0.5);
    tier.receiveShadow = true;
    group.add(tier);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 7.2), standMaterial);
    bench.position.set(side * (4.65 + row * 0.55), 0.25 + row * 0.22, -0.5);
    group.add(bench);
  }
  const count = 72;
  const shirts = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.11, 0.22, 4, 8),
    new THREE.MeshStandardMaterial({ roughness: 0.92 }), count);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.087, 10, 8),
    new THREE.MeshStandardMaterial({ roughness: 0.85 }), count);
  const laps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.21, 0.13, 0.29),
    new THREE.MeshStandardMaterial({ color: 0x25313e, roughness: 0.9 }), count);
  const legs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.045, 0.30, 8),
    new THREE.MeshStandardMaterial({ color: 0x25313e, roughness: 0.9 }), count * 2);
  const dummy = new THREE.Object3D();
  const colors = [0x40566c, 0x996344, 0x375d58, 0x8f3d4b, 0xa3987a, 0x293448];
  const skins = [0xc78f6b, 0x8b5c43, 0xdcb296, 0x654635];
  let index = 0;
  for (const side of [-1, 1]) for (let row = 0; row < 3; row += 1) for (let seat = 0; seat < 12; seat += 1) {
    const x = side * (4.65 + row * 0.55);
    const z = -3.8 + seat * 0.60;
    const seatY = 0.28 + row * 0.22;
    dummy.rotation.set(0, -side * Math.PI / 2, 0);
    dummy.position.set(x, seatY + 0.30, z);
    dummy.scale.set(1, 0.93 + (seat % 3) * 0.055, 0.8);
    dummy.updateMatrix(); shirts.setMatrixAt(index, dummy.matrix);
    shirts.setColorAt(index, new THREE.Color(colors[(seat * 7 + row * 3 + (side + 1)) % colors.length]));
    dummy.position.y = seatY + 0.62;
    dummy.scale.set(1, 1.12, 1);
    dummy.updateMatrix(); heads.setMatrixAt(index, dummy.matrix);
    heads.setColorAt(index, new THREE.Color(skins[(seat + row) % skins.length]));
    dummy.scale.set(1, 1, 1);
    dummy.position.set(x - side * 0.09, seatY + 0.06, z);
    dummy.updateMatrix(); laps.setMatrixAt(index, dummy.matrix);
    for (let leg = 0; leg < 2; leg += 1) {
      dummy.position.set(x - side * 0.20, seatY - 0.10, z + (leg ? 0.065 : -0.065));
      dummy.updateMatrix(); legs.setMatrixAt(index * 2 + leg, dummy.matrix);
    }
    index += 1;
  }
  group.add(shirts, heads, laps, legs);
  return group;
}
