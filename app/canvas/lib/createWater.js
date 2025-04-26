import {
  ClampToEdgeWrapping,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  PlaneGeometry,
  RGBAFormat,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
} from "three";
import { GPUComputationRenderer } from "three/examples/jsm/Addons.js";
import { shaderChange } from "../glsl/shaderChange";
import {
  waterLevelFragmentShader,
  smoothFragmentShader,
} from "../glsl/water-shader";

const BOUNDS = 12;
const WIDTH = 256;

export function createWater(renderer, simplex) {
  const geometry = new PlaneGeometry(BOUNDS, BOUNDS, WIDTH - 1, WIDTH - 1);
  const waterMaterial = new WaterMaterial({
    color: 0x9bd2ec,
    metalness: 0.9,
    roughness: 0,
    transparent: true,
    opacity: 0.8,
    side: DoubleSide,
  });

  const waterMesh = new Mesh(geometry, waterMaterial);
  waterMesh.rotation.x = -Math.PI * 0.5;
  // waterMesh.rotation.z = -Math.PI * 0.25;
  waterMesh.matrixAutoUpdate = false;
  waterMesh.updateMatrix();

  waterMesh.receiveShadow = true;
  waterMesh.castShadow = true;

  // THREE.Mesh just for mouse raycasting
  const geometryRay = new PlaneGeometry(BOUNDS, BOUNDS, 1, 1);

  const meshRay = new Mesh(
    geometryRay,
    new MeshBasicMaterial({ color: 0xffffff, visible: false }),
  );
  meshRay.rotation.x = -Math.PI / 2;
  meshRay.matrixAutoUpdate = false;
  meshRay.updateMatrix();

  // Creates the gpu computation class and sets it up

  const gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

  const heightmap0 = gpuCompute.createTexture();

  fillTexture(heightmap0, simplex);

  const heightmapVariable = gpuCompute.addVariable(
    "heightmap",
    shaderChange.heightmap_frag,
    heightmap0,
  );

  gpuCompute.setVariableDependencies(heightmapVariable, [heightmapVariable]);

  heightmapVariable.material.uniforms["mousePos"] = {
    value: new Vector2(10000, 10000),
  };
  heightmapVariable.material.uniforms["mouseSize"] = { value: 0.2 };
  heightmapVariable.material.uniforms["viscosity"] = { value: 0.95 };
  heightmapVariable.material.uniforms["deep"] = { value: 0.01 };
  heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed(1);

  const error = gpuCompute.init();
  if (error !== null) console.error(error);

  // Create compute shader to smooth the water surface and velocity
  const smoothShader = gpuCompute.createShaderMaterial(smoothFragmentShader, {
    smoothTexture: { value: null },
  });

  // Create compute shader to read water level
  const readWaterLevelShader = gpuCompute.createShaderMaterial(
    waterLevelFragmentShader,
    {
      point1: { value: new Vector2() },
      levelTexture: { value: null },
    },
  );
  readWaterLevelShader.defines.WIDTH = WIDTH.toFixed(1);
  readWaterLevelShader.defines.BOUNDS = BOUNDS.toFixed(1);

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

  return {
    gpuCompute,
    heightmapVariable,
    smoothShader,
    readWaterLevelShader,
    readWaterLevelRenderTarget,
    readWaterLevelImage,
    waterMesh,
    meshRay,
  };
}

// ----------------

class WaterMaterial extends MeshStandardMaterial {
  constructor(parameters) {
    super();

    this.defines = {
      STANDARD: "",
      USE_UV: "",
      WIDTH: WIDTH.toFixed(1),
      BOUNDS: BOUNDS.toFixed(1),
    };

    this.extra = {};
    this.heightmap = undefined;

    this.addParameter("heightmap", null);
    this.setValues(parameters);
  }

  addParameter(name, value) {
    this.extra[name] = value;
    Object.defineProperty(this, name, {
      get: () => this.extra[name],
      set: (v) => {
        this.extra[name] = v;
        if (this.userData.shader)
          this.userData.shader.uniforms[name].value = this.extra[name];
      },
    });
  }

  onBeforeCompile(shader) {
    for (const name in this.extra) {
      shader.uniforms[name] = { value: this.extra[name] };
    }

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      shaderChange.common,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      shaderChange.beginnormal_vertex,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      shaderChange.begin_vertex,
    );

    this.userData.shader = shader;
  }
}

// ----------------

function fillTexture(texture, simplex) {
  const waterMaxHeight = 0.1;

  function noise(x, y) {
    let multR = waterMaxHeight;
    let mult = 0.025;
    let r = 0;
    for (let i = 0; i < 15; i++) {
      r += multR * simplex.noise(x * mult, y * mult);
      multR *= 0.53 + 0.025 * i;
      mult *= 1.25;
    }

    return r;
  }

  const pixels = texture.image.data;

  let p = 0;
  for (let j = 0; j < WIDTH; j++) {
    for (let i = 0; i < WIDTH; i++) {
      const x = (i * 128) / WIDTH;
      const y = (j * 128) / WIDTH;

      pixels[p + 0] = noise(x, y);
      pixels[p + 1] = pixels[p + 0];
      pixels[p + 2] = 0;
      pixels[p + 3] = 1;

      p += 4;
    }
  }
}
