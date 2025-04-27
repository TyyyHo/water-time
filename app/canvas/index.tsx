"use client";

import { useEffect, useRef } from "react";

// three
import { createBasis } from "./lib/createBasis";
import { createTexture } from "./lib/createTexture";
import { createWater } from "./lib/createWater";
import { createInteraction } from "./lib/createInteraction";
// import { createLeaves } from "./lib/createLeaves";

const speed = 5;

export default function Canvas() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    let pause = false;
    let frame = 0;
    let mousedown = false;
    const { mouseCoords, raycaster, simplex } = createInteraction();
    const { camera, renderer, scene } = createBasis(container.current);
    const { waterMesh, meshRay, gpuCompute, heightmapVariable } = createWater(
      renderer,
      simplex,
    );
    createTexture(scene);
    // createLeaves(scene, renderer, gpuCompute);

    scene.add(waterMesh);
    scene.add(meshRay);

    function onPointerDown(event: TouchEvent | MouseEvent) {
      const touch = event instanceof TouchEvent ? event.touches[0] : event;
      const dom = renderer.domElement;
      mouseCoords.set(
        (touch.clientX / dom.clientWidth) * 2 - 1,
        -(touch.clientY / dom.clientHeight) * 2 + 1,
      );
      if (pause) return;
      mousedown = true;
    }

    function onPointerMove(event: PointerEvent) {
      const dom = renderer.domElement;
      mouseCoords.set(
        (event.clientX / dom.clientWidth) * 2 - 1,
        -(event.clientY / dom.clientHeight) * 2 + 1,
      );
      if (pause) return;
      mousedown = true;
    }

    container.current?.addEventListener("pointermove", onPointerMove);
    container.current?.addEventListener("pointerdown", onPointerDown);

    renderer.domElement.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function raycast() {
      // Set uniforms: mouse interaction
      const uniforms = heightmapVariable.material.uniforms;
      if (mousedown && !pause) {
        raycaster.setFromCamera(mouseCoords, camera);

        const intersects = raycaster.intersectObject(meshRay);

        // if (intersects.length > 0) {
        if (intersects.length > 0) {
          const point = intersects[0].point;
          uniforms["mousePos"].value.set(point.x, point.z);

          mousedown = false;
          pause = true;
          setTimeout(() => {
            pause = false;
          }, 120);
        } else {
          uniforms["mousePos"].value.set(10000, 10000);
        }
      } else {
        uniforms["mousePos"].value.set(10000, 10000);
      }
    }

    function render() {
      raycast();

      frame++;

      if (frame >= 7 - speed) {
        // Do the gpu computation
        gpuCompute.compute();
        const tmpHeightmap =
          gpuCompute.getCurrentRenderTarget(heightmapVariable).texture;

        // Get compute output in custom uniform
        if (waterMesh) waterMesh.material.heightmap = tmpHeightmap;

        frame = 0;
      }

      // Render
      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(render);

    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
      container.current?.removeEventListener("pointermove", onPointerMove);
      container.current?.removeEventListener("pointerdown", onPointerDown);
      renderer.clear();
      gpuCompute.dispose();
      scene.clear();
      camera.clear();
    };
  }, []);

  return <div ref={container} className="fixed inset-0 overflow-hidden"></div>;
}
