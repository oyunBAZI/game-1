import * as THREE from "three";

export class ArenaLighting {
  readonly group = new THREE.Group();
  readonly key: THREE.DirectionalLight;
  readonly fill: THREE.HemisphereLight;
  readonly rim: THREE.PointLight;

  constructor(shadows = true) {
    this.group.name = "arena-lighting";
    this.fill = new THREE.HemisphereLight(0xa5d8df, 0x091117, 1.45);
    this.group.add(this.fill);
    this.key = new THREE.DirectionalLight(0xe7ffff, 3.6);
    this.key.position.set(2.5, 5.8, 3.6);
    this.key.castShadow = shadows;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.camera.near = 0.1;
    this.key.shadow.camera.far = 18;
    this.key.shadow.camera.left = -5;
    this.key.shadow.camera.right = 5;
    this.key.shadow.camera.top = 5;
    this.key.shadow.camera.bottom = -5;
    this.group.add(this.key);
    this.rim = new THREE.PointLight(0x46dcd1, 18, 9, 2);
    this.rim.position.set(-3.5, 2.6, -2.5);
    this.group.add(this.rim);
    this.addPracticalLights();
  }

  private addPracticalLights(): void {
    for (const x of [-3.2, 0, 3.2]) {
      const light = new THREE.RectAreaLight(0xd9ffff, 5.5, 2.2, 0.34);
      light.position.set(x, 4.7, 0);
      light.rotation.x = 0;
      this.group.add(light);
    }
  }

  setExposure(renderer: THREE.WebGLRenderer, exposure: number): void {
    renderer.toneMappingExposure = exposure;
  }
}