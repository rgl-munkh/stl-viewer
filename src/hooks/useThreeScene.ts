import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import {
  CAMERA_CONFIG,
  GRID_CONFIG,
  LIGHTING_CONFIG,
  KEYBOARD_SHORTCUTS,
  SNAP_VALUES,
  RANDOM_ZOOM_CONFIG
} from "@/configs";

interface ThreeSceneRefs {
  scene: THREE.Scene | null;
  control: TransformControls | null;
  exporter: STLExporter | null;
  originalGeometry: THREE.BufferGeometry | null;
}

interface CameraSetup {
  perspective: THREE.PerspectiveCamera;
  orthographic: THREE.OrthographicCamera;
  current: THREE.Camera;
}

const createCameraSetup = (): CameraSetup => {
  const aspectRatio = window.innerWidth / window.innerHeight;
  
  const perspectiveCamera = new THREE.PerspectiveCamera(
    CAMERA_CONFIG.PERSPECTIVE.FOV,
    aspectRatio,
    CAMERA_CONFIG.PERSPECTIVE.NEAR,
    CAMERA_CONFIG.PERSPECTIVE.FAR
  );
  
  const orthographicCamera = new THREE.OrthographicCamera(
    CAMERA_CONFIG.ORTHOGRAPHIC.LEFT_MULTIPLIER * aspectRatio,
    CAMERA_CONFIG.ORTHOGRAPHIC.RIGHT_MULTIPLIER * aspectRatio,
    CAMERA_CONFIG.ORTHOGRAPHIC.TOP,
    CAMERA_CONFIG.ORTHOGRAPHIC.BOTTOM,
    CAMERA_CONFIG.ORTHOGRAPHIC.NEAR,
    CAMERA_CONFIG.ORTHOGRAPHIC.FAR
  );
  
  const currentCamera = perspectiveCamera;
  currentCamera.position.set(
    CAMERA_CONFIG.PERSPECTIVE.INITIAL_POSITION.x,
    CAMERA_CONFIG.PERSPECTIVE.INITIAL_POSITION.y,
    CAMERA_CONFIG.PERSPECTIVE.INITIAL_POSITION.z
  );
  
  return { perspective: perspectiveCamera, orthographic: orthographicCamera, current: currentCamera };
};

const createScene = (): THREE.Scene => {
  const scene = new THREE.Scene();
  
  // Add grid
  const gridHelper = new THREE.GridHelper(
    GRID_CONFIG.SIZE,
    GRID_CONFIG.DIVISIONS,
    GRID_CONFIG.CENTER_COLOR,
    GRID_CONFIG.GRID_COLOR
  );
  scene.add(gridHelper);
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(
    LIGHTING_CONFIG.AMBIENT.color,
    LIGHTING_CONFIG.AMBIENT.intensity
  );
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(
    LIGHTING_CONFIG.DIRECTIONAL.color,
    LIGHTING_CONFIG.DIRECTIONAL.intensity
  );
  directionalLight.position.set(
    LIGHTING_CONFIG.DIRECTIONAL.position.x,
    LIGHTING_CONFIG.DIRECTIONAL.position.y,
    LIGHTING_CONFIG.DIRECTIONAL.position.z
  );
  scene.add(directionalLight);
  
  return scene;
};

const createRenderer = (): THREE.WebGLRenderer => {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  return renderer;
};

export const useThreeScene = (mountRef: React.RefObject<HTMLDivElement | null>) => {
  const sceneRefs = useRef<ThreeSceneRefs>({
    scene: null,
    control: null,
    exporter: null,
    originalGeometry: null
  });

  useEffect(() => {
    if (!mountRef.current) return;

    const cameraSetup = createCameraSetup();
    const scene = createScene();
    const renderer = createRenderer();
    
    sceneRefs.current.scene = scene;
    mountRef.current.appendChild(renderer.domElement);

    // Setup controls
    const orbitControls = new OrbitControls(cameraSetup.current, renderer.domElement);
    orbitControls.update();
    
    const transformControls = new TransformControls(cameraSetup.current, renderer.domElement);
    sceneRefs.current.control = transformControls;
    
    // Setup exporter
    sceneRefs.current.exporter = new STLExporter();

    const gizmo = transformControls.getHelper();
    scene.add(gizmo);

    const render = () => {
      renderer.render(scene, cameraSetup.current);
    };

    orbitControls.addEventListener("change", render);
    transformControls.addEventListener("change", render);
    transformControls.addEventListener("dragging-changed", (event: { value: unknown }) => {
      orbitControls.enabled = !(event.value as boolean);
    });

    const handleWindowResize = () => {
      const aspectRatio = window.innerWidth / window.innerHeight;

      cameraSetup.perspective.aspect = aspectRatio;
      cameraSetup.perspective.updateProjectionMatrix();

      cameraSetup.orthographic.left = cameraSetup.orthographic.bottom * aspectRatio;
      cameraSetup.orthographic.right = cameraSetup.orthographic.top * aspectRatio;
      cameraSetup.orthographic.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
      render();
    };

    // ============================================================================
    // KEYBOARD CONTROLS
    // ============================================================================
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
          handleWindowResize();
          break;

        case KEYBOARD_SHORTCUTS.RANDOM_ZOOM:
          const randomFoV = Math.random() + 0.1;
          const randomZoom = Math.random() + 0.1;

          cameraSetup.perspective.fov = randomFoV * RANDOM_ZOOM_CONFIG.FOV_MULTIPLIER;
          cameraSetup.orthographic.bottom = -randomFoV * RANDOM_ZOOM_CONFIG.ORTHO_MULTIPLIER;
          cameraSetup.orthographic.top = randomFoV * RANDOM_ZOOM_CONFIG.ORTHO_MULTIPLIER;

          cameraSetup.perspective.zoom = randomZoom * RANDOM_ZOOM_CONFIG.ZOOM_MULTIPLIER;
          cameraSetup.orthographic.zoom = randomZoom * RANDOM_ZOOM_CONFIG.ZOOM_MULTIPLIER;

          handleWindowResize();
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

    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================
    window.addEventListener("resize", handleWindowResize);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    render();

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }

      orbitControls.dispose();
      transformControls.dispose();
      renderer.dispose();

      sceneRefs.current = {
        scene: null,
        control: null,
        exporter: null,
        originalGeometry: null
      };
    };
  }, [mountRef]);

  return sceneRefs;
}; 