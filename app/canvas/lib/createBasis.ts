import {
  ACESFilmicToneMapping,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";

export function createBasis(container: HTMLElement) {
  const scene = new Scene();

  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.2,
    100,
  );
  camera.position.set(0, 2, -1);
  camera.lookAt(0, 0, 0);

  const sun = new DirectionalLight(0xffffff, 4.0);
  sun.position.set(-1, 2.6, 1.4);
  scene.add(sun);

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;

  // initialize canvas size
  //   camera.aspect = window.innerWidth / window.innerHeight;
  //   camera.updateProjectionMatrix();
  //   renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);
  // container.style.touchAction = "none";

  return {
    scene,
    camera,
    renderer,
  };
}
