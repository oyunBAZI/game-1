import * as THREE from "three";

export const COURT_VERTEX_SHADER = [
  "varying vec2 vUv;",
  "varying vec3 vWorldPosition;",
  "void main() {",
  "  vUv = uv;",
  "  vec4 world = modelMatrix * vec4(position, 1.0);",
  "  vWorldPosition = world.xyz;",
  "  gl_Position = projectionMatrix * viewMatrix * world;",
  "}"
].join("\n");

export const COURT_FRAGMENT_SHADER = [
  "uniform vec3 baseColor;",
  "uniform vec3 accentColor;",
  "uniform float time;",
  "varying vec2 vUv;",
  "varying vec3 vWorldPosition;",
  "void main() {",
  "  float grain = sin(vWorldPosition.x * 40.0 + sin(vWorldPosition.z * 8.0)) * 0.015;",
  "  float edge = smoothstep(0.0, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));",
  "  vec3 color = mix(accentColor, baseColor, edge);",
  "  color += grain + sin(time * 0.2) * 0.002;",
  "  gl_FragColor = vec4(color, 1.0);",
  "}"
].join("\n");

export function createCourtShaderMaterial(color = 0x0876a5, accent = 0x0b4052): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: new THREE.Color(color) },
      accentColor: { value: new THREE.Color(accent) },
      time: { value: 0 }
    },
    vertexShader: COURT_VERTEX_SHADER,
    fragmentShader: COURT_FRAGMENT_SHADER
  });
}