import * as THREE from "three";

export const BALL_VERTEX_SHADER = [
  "varying vec3 vNormal;",
  "varying vec3 vWorldPosition;",
  "void main() {",
  "  vNormal = normalize(normalMatrix * normal);",
  "  vec4 world = modelMatrix * vec4(position, 1.0);",
  "  vWorldPosition = world.xyz;",
  "  gl_Position = projectionMatrix * viewMatrix * world;",
  "}"
].join("\n");

export const BALL_FRAGMENT_SHADER = [
  "uniform vec3 baseColor;",
  "uniform float rimStrength;",
  "varying vec3 vNormal;",
  "varying vec3 vWorldPosition;",
  "void main() {",
  "  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);",
  "  float rim = pow(1.0 - max(dot(vNormal, viewDirection), 0.0), 3.0);",
  "  vec3 color = baseColor + rim * rimStrength * vec3(0.35, 0.55, 0.5);",
  "  gl_FragColor = vec4(color, 1.0);",
  "}"
].join("\n");

export function createBallShaderMaterial(color = 0xf7f6e8): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: new THREE.Color(color) },
      rimStrength: { value: 0.32 }
    },
    vertexShader: BALL_VERTEX_SHADER,
    fragmentShader: BALL_FRAGMENT_SHADER
  });
}