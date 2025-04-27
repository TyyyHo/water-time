import {
  ClampToEdgeWrapping,
  NearestFilter,
  Object3D,
  Object3DEventMap,
  Quaternion,
  RGBAFormat,
  Scene,
  Texture,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import {
  GLTFLoader,
  GPUComputationRenderer,
} from "three/examples/jsm/Addons.js";
import { BOUNDS, NUM_LEAVES, WIDTH } from "../constant";
import { readWaterLevelFragmentShader } from "../glsl/water-level";

const tmpQuatX = new Quaternion();
const tmpQuatZ = new Quaternion();
const tmpQuat = new Quaternion();
const waterNormal = new Vector3();

export async function createLeaves(
  scene: Scene,
  renderer: WebGLRenderer,
  gpuCompute: GPUComputationRenderer,
) {
  const model = await new GLTFLoader().loadAsync("/model/leaf.glb");
  const leaves: Object3D<Object3DEventMap>[] = [];

  const leafModel = model.scene.children[0];
  leafModel.receiveShadow = true;
  leafModel.castShadow = true;

  for (let i = 0; i < NUM_LEAVES; i++) {
    let sphere = leafModel;
    if (i < NUM_LEAVES - 1) {
      sphere = leafModel.clone();
    }

    sphere.position.x = (Math.random() - 0.5) * BOUNDS * 0.7;
    sphere.position.z = (Math.random() - 0.5) * BOUNDS * 0.7;

    sphere.userData.velocity = new Vector3();
    scene.add(sphere);

    leaves.push(sphere);
  }

  // Create a 4x1 pixel image and a render target (Uint8, 4 channels, 1 byte per channel) to read water height and orientation
  const readWaterLevelImage = new Uint8Array(4 * 1 * 4);
  const readWaterLevelRenderTarget = new WebGLRenderTarget(4, 1, {
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    type: UnsignedByteType,
    depthBuffer: false,
  });

  const readWaterLevelShader = gpuCompute.createShaderMaterial(
    readWaterLevelFragmentShader,
    {
      point1: { value: new Vector2() },
      levelTexture: { value: null },
    },
  );

  function leafInteraction(tmpHeightmap: Texture) {
    readWaterLevelShader.uniforms["levelTexture"].value = tmpHeightmap;
    readWaterLevelShader.defines.WIDTH = WIDTH.toFixed(1);
    readWaterLevelShader.defines.BOUNDS = BOUNDS.toFixed(1);

    for (let i = 0; i < NUM_LEAVES; i++) {
      const sphere = leaves[i];

      if (sphere) {
        // Read water level and orientation
        const u = (0.5 * sphere.position.x) / (BOUNDS / 2) + 0.5;
        const v = 1 - ((0.5 * sphere.position.z) / (BOUNDS / 2) + 0.5);
        readWaterLevelShader.uniforms["point1"].value.set(u, v);
        gpuCompute.doRenderTarget(
          readWaterLevelShader,
          readWaterLevelRenderTarget,
        );

        renderer.readRenderTargetPixels(
          readWaterLevelRenderTarget,
          0,
          0,
          4,
          1,
          readWaterLevelImage,
        );
        const pixels = new Float32Array(readWaterLevelImage.buffer);

        // Get orientation
        waterNormal.set(pixels[1], 0, -pixels[2]);

        const pos = sphere.position;

        const startPos = pos.clone();

        // Set height
        pos.y = pixels[0];

        // Move sphere
        waterNormal.multiplyScalar(0.01);
        sphere.userData.velocity.add(waterNormal);
        sphere.userData.velocity.multiplyScalar(0.998);
        pos.add(sphere.userData.velocity);

        const decal = 0.001;
        const limit = BOUNDS / 2 - 0.2;

        if (pos.x < -limit) {
          pos.x = -limit + decal;
          sphere.userData.velocity.x *= -0.3;
        } else if (pos.x > limit) {
          pos.x = limit - decal;
          sphere.userData.velocity.x *= -0.3;
        }

        if (pos.z < -limit) {
          pos.z = -limit + decal;
          sphere.userData.velocity.z *= -0.3;
        } else if (pos.z > limit) {
          pos.z = limit - decal;
          sphere.userData.velocity.z *= -0.3;
        }

        // duck orientation test

        const startNormal = new Vector3(pixels[1], 1, -pixels[2]).normalize();

        const dir = startPos.sub(pos);
        dir.y = 0;
        dir.normalize();

        const yAxis = new Vector3(0, 1, 0);
        const zAxis = new Vector3(0, 0, -1);

        tmpQuatX.setFromUnitVectors(zAxis, dir);
        tmpQuatZ.setFromUnitVectors(yAxis, startNormal);
        tmpQuat.multiplyQuaternions(tmpQuatZ, tmpQuatX);
        sphere.quaternion.slerp(tmpQuat, 0.017);
      }
    }
  }

  return { leafInteraction };
}
