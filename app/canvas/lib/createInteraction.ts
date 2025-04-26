import { Vector2, Raycaster } from "three";
import { SimplexNoise } from "three/examples/jsm/Addons.js";

export function createInteraction() {
  const mouseCoords = new Vector2();
  const raycaster = new Raycaster();
  const simplex = new SimplexNoise();

  return {
    mouseCoords,
    raycaster,
    simplex,
  };
}
