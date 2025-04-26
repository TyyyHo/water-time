import { EquirectangularReflectionMapping, Scene } from "three";
import { RGBELoader } from "three/examples/jsm/Addons.js";

export async function createTexture(scene: Scene) {
  const env = await new RGBELoader().loadAsync("/HDR/enviroment.hdr");
  env.mapping = EquirectangularReflectionMapping;
  scene.environment = env;
  scene.background = env;
  scene.backgroundBlurriness = 0.3;
  scene.environmentIntensity = 1;
}
