import { useEffect } from "react";
import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  KEYBOARD_SHORTCUTS,
  SNAP_VALUES,
  RANDOM_ZOOM_CONFIG
} from "@/configs";

interface UseKeyboardControlsProps {
  transformControls: TransformControls | null;
  cameraSetup: {
    perspective: THREE.PerspectiveCamera;
    orthographic: THREE.OrthographicCamera;
    current: THREE.Camera;
  } | null;
  orbitControls: OrbitControls | null;
  onWindowResize: () => void;
}

export const useKeyboardControls = ({
  transformControls,
  cameraSetup,
  orbitControls,
  onWindowResize
}: UseKeyboardControlsProps) => {
  useEffect(() => {
    if (!transformControls || !cameraSetup || !orbitControls) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      switch (key) {
        case KEYBOARD_SHORTCUTS.TOGGLE_SPACE:
          transformControls.setSpace(transformControls.space === "local" ? "world" : "local");
          break;

        case KEYBOARD_SHORTCUTS.SNAP:
          transformControls.setTranslationSnap(SNAP_VALUES.TRANSLATION);
          transformControls.setRotationSnap(SNAP_VALUES.ROTATION);
          transformControls.setScaleSnap(SNAP_VALUES.SCALE);
          break;

        case KEYBOARD_SHORTCUTS.TRANSLATE:
          transformControls.setMode("translate");
          break;

        case KEYBOARD_SHORTCUTS.ROTATE:
          transformControls.setMode("rotate");
          break;

        case KEYBOARD_SHORTCUTS.SCALE:
          transformControls.setMode("scale");
          break;

        case KEYBOARD_SHORTCUTS.TOGGLE_CAMERA:
          const position = cameraSetup.current.position.clone();
          cameraSetup.current = cameraSetup.current instanceof THREE.PerspectiveCamera
            ? cameraSetup.orthographic
            : cameraSetup.perspective;
          cameraSetup.current.position.copy(position);

          orbitControls.object = cameraSetup.current;
          transformControls.camera = cameraSetup.current;

          cameraSetup.current.lookAt(
            orbitControls.target.x,
            orbitControls.target.y,
            orbitControls.target.z
          );
          onWindowResize();
          break;

        case KEYBOARD_SHORTCUTS.RANDOM_ZOOM:
          const randomFoV = Math.random() + 0.1;
          const randomZoom = Math.random() + 0.1;

          cameraSetup.perspective.fov = randomFoV * RANDOM_ZOOM_CONFIG.FOV_MULTIPLIER;
          cameraSetup.orthographic.bottom = -randomFoV * RANDOM_ZOOM_CONFIG.ORTHO_MULTIPLIER;
          cameraSetup.orthographic.top = randomFoV * RANDOM_ZOOM_CONFIG.ORTHO_MULTIPLIER;

          cameraSetup.perspective.zoom = randomZoom * RANDOM_ZOOM_CONFIG.ZOOM_MULTIPLIER;
          cameraSetup.orthographic.zoom = randomZoom * RANDOM_ZOOM_CONFIG.ZOOM_MULTIPLIER;

          onWindowResize();
          break;

        case "+":
        case "=":
          transformControls.setSize(transformControls.size + 0.1);
          break;

        case "-":
        case "_":
          transformControls.setSize(Math.max(transformControls.size - 0.1, 0.1));
          break;

        case KEYBOARD_SHORTCUTS.TOGGLE_X:
          transformControls.showX = !transformControls.showX;
          break;

        case KEYBOARD_SHORTCUTS.TOGGLE_Y:
          transformControls.showY = !transformControls.showY;
          break;

        case KEYBOARD_SHORTCUTS.TOGGLE_Z:
          transformControls.showZ = !transformControls.showZ;
          break;

        case KEYBOARD_SHORTCUTS.TOGGLE_ENABLED:
          transformControls.enabled = !transformControls.enabled;
          break;

        case KEYBOARD_SHORTCUTS.RESET:
          transformControls.reset();
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === KEYBOARD_SHORTCUTS.SNAP) {
        transformControls.setTranslationSnap(null);
        transformControls.setRotationSnap(null);
        transformControls.setScaleSnap(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [transformControls, cameraSetup, orbitControls, onWindowResize]);
}; 