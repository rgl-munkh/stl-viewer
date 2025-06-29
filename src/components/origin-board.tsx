"use client"; // if you're using Next 13+ app dir and want client component

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import {
  CAMERA_CONFIG,
  GRID_CONFIG,
  LIGHTING_CONFIG,
  MESH_CONFIG,
  KEYBOARD_SHORTCUTS,
  SNAP_VALUES,
  RANDOM_ZOOM_CONFIG
} from "@/configs";

// Types
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

// Utility functions
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

const calculateAutoScale = (geometry: THREE.BufferGeometry): number => {
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return 1;
  
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = MESH_CONFIG.SCALE_FACTOR / maxDimension;
  
  return scale;
};

const applyTransformToGeometry = (
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3
): THREE.BufferGeometry => {
  const geometryCopy = geometry.clone();
  const matrix = new THREE.Matrix4();
  matrix.compose(position, quaternion, scale);
  geometryCopy.applyMatrix4(matrix);
  
  // Prepare geometry for export
  geometryCopy.computeVertexNormals();
  geometryCopy.computeBoundingBox();
  
  return geometryCopy;
};

const createCleanMeshForExport = (geometry: THREE.BufferGeometry): THREE.Mesh => {
  const material = new THREE.MeshLambertMaterial(MESH_CONFIG.EXPORT_MATERIAL);
  const mesh = new THREE.Mesh(geometry, material);
  
  // Reset transformations since they're now in the geometry
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  
  return mesh;
};

const saveFile = (blob: Blob, filename: string): void => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const saveStringAsFile = (text: string, filename: string): void => {
  const blob = new Blob([text], { type: "text/plain" });
  saveFile(blob, filename);
};

const saveArrayBufferAsFile = (buffer: ArrayBuffer | DataView, filename: string): void => {
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveFile(blob, filename);
};

export default function TransformControlsExample() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentMesh, setCurrentMesh] = useState<THREE.Mesh | null>(null);
  const sceneRefs = useRef<ThreeSceneRefs>({
    scene: null,
    control: null,
    exporter: null,
    originalGeometry: null
  });

  const cleanupCurrentMesh = useCallback(() => {
    const { scene, control } = sceneRefs.current;
    if (!scene || !control || !currentMesh) return;
    
    scene.remove(currentMesh);
    control.detach();
    currentMesh.geometry.dispose();
    (currentMesh.material as THREE.Material).dispose();
  }, [currentMesh]);

  const createMeshFromGeometry = useCallback((geometry: THREE.BufferGeometry) => {
    const { scene, control } = sceneRefs.current;
    if (!scene || !control) return;

    // Store original geometry for export
    sceneRefs.current.originalGeometry = geometry.clone();

    // Clean up existing mesh
    cleanupCurrentMesh();

    // Create new mesh
    const displayGeometry = geometry.clone();
    const material = new THREE.MeshLambertMaterial(MESH_CONFIG.MATERIAL);
    const newMesh = new THREE.Mesh(displayGeometry, material);

    // Apply auto-scaling only (no auto-centering)
    const autoScale = calculateAutoScale(displayGeometry);
    newMesh.scale.setScalar(autoScale);
    
    // Keep mesh at origin (no auto-positioning)
    newMesh.position.set(0, 0, 0);

    // Add to scene and attach controls
    scene.add(newMesh);
    control.attach(newMesh);
    setCurrentMesh(newMesh);
  }, [cleanupCurrentMesh]);

  const loadSTLFile = useCallback((contents: ArrayBuffer) => {
    const loader = new STLLoader();
    const geometry = loader.parse(contents);
    createMeshFromGeometry(geometry);
  }, [createMeshFromGeometry]);

  const loadOBJFile = useCallback((contents: string) => {
    const loader = new OBJLoader();
    const object = loader.parse(contents);

    let mesh: THREE.Mesh | null = null;
    object.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && !mesh) {
        mesh = child;
      }
    });

    if (mesh) {
      createMeshFromGeometry((mesh as THREE.Mesh).geometry);
    } else {
      alert("No mesh found in OBJ file.");
    }
  }, [createMeshFromGeometry]);

  const loadGLTFFile = useCallback((contents: ArrayBuffer) => {
    const loader = new GLTFLoader();
    loader.parse(
      contents,
      "",
      (gltf) => {
        let mesh: THREE.Mesh | null = null;
        gltf.scene.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && !mesh) {
            mesh = child;
          }
        });

        if (mesh) {
          createMeshFromGeometry((mesh as THREE.Mesh).geometry);
        } else {
          alert("No mesh found in GLTF file.");
        }
      },
      (error) => {
        console.error("Error parsing GLTF:", error);
        alert("Error parsing GLTF file.");
      }
    );
  }, [createMeshFromGeometry]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const contents = event.target?.result;
      if (!contents) return;

      const fileName = file.name.toLowerCase();

      try {
        if (fileName.endsWith(".stl")) {
          loadSTLFile(contents as ArrayBuffer);
        } else if (fileName.endsWith(".obj")) {
          loadOBJFile(contents as string);
        } else if (fileName.endsWith(".gltf") || fileName.endsWith(".glb")) {
          loadGLTFFile(contents as ArrayBuffer);
        } else {
          alert("Unsupported file format. Please use STL, OBJ, or GLTF/GLB files.");
        }
      } catch (error) {
        console.error("Error loading file:", error);
        alert("Error loading file. Please check if the file is valid.");
      }
    };

    if (file.name.toLowerCase().endsWith(".obj")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [loadSTLFile, loadOBJFile, loadGLTFFile]);

  const exportSTL = useCallback((isBinary: boolean = false) => {
    const { originalGeometry, exporter } = sceneRefs.current;
    if (!originalGeometry || !exporter || !currentMesh) {
      alert("No model to export. Please upload a 3D model first.");
      return;
    }

    console.log(`Exporting STL ${isBinary ? 'Binary' : 'ASCII'}...`);
    console.log("Current mesh rotation:", currentMesh.rotation);
    console.log("Current mesh position:", currentMesh.position);
    console.log("Current mesh scale:", currentMesh.scale);

    const transformedGeometry = applyTransformToGeometry(
      originalGeometry,
      currentMesh.position,
      currentMesh.quaternion,
      currentMesh.scale
    );

    const cleanMesh = createCleanMeshForExport(transformedGeometry);
    const result = exporter.parse(cleanMesh, { binary: isBinary });
    
    if (isBinary) {
      const binaryResult = result as DataView;
      console.log("Export result length:", binaryResult.byteLength);
      saveArrayBufferAsFile(binaryResult, "model.stl");
    } else {
      const asciiResult = result as string;
      console.log("Export result length:", asciiResult.length);
      saveStringAsFile(asciiResult, "model.stl");
    }
  }, [currentMesh]);

  const exportSTLASCII = useCallback(() => exportSTL(false), [exportSTL]);
  const exportSTLBinary = useCallback(() => exportSTL(true), [exportSTL]);

  const debugGeometry = useCallback(() => {
    console.log("Current mesh:", currentMesh);
    console.log("Original geometry:", sceneRefs.current.originalGeometry);
    alert(
      `Current mesh: ${currentMesh ? "Loaded" : "None"}\nOriginal geometry: ${
        sceneRefs.current.originalGeometry ? "Stored" : "None"
      }`
    );
  }, [currentMesh]);

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
  }, []);

  return (
    <>
      <div
        id="info"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          color: "#aaa",
          fontFamily: "monospace",
          padding: "10px",
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 1,
          whiteSpace: "pre-line",
          fontSize: 12,
          maxWidth: 300,
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      >
        {"W - translate | E - rotate | R - scale | +/- adjust size\n" +
          "Q - toggle world/local space | Shift - snap to grid\n" +
          "X - toggle X | Y - toggle Y | Z - toggle Z | Spacebar - toggle enabled\n" +
          "Esc - reset current transform\n" +
          "C - toggle camera | V - random zoom"}
      </div>

      {/* File Upload UI */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: "15px",
          borderRadius: "8px",
          color: "white",
          minWidth: "200px",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
          Upload 3D Model
        </h3>
        <input
          type="file"
          accept=".stl,.obj,.gltf,.glb"
          onChange={handleFileUpload}
          style={{
            color: "white",
            cursor: "pointer",
            fontSize: "12px",
            width: "100%",
            marginBottom: "10px",
          }}
        />
        <div style={{ marginBottom: "10px", fontSize: "11px", opacity: 0.8 }}>
          Supported: STL, OBJ, GLTF, GLB
        </div>

        {/* Export Buttons */}
        <div
          style={{
            marginTop: "15px",
            borderTop: "1px solid rgba(255,255,255,0.3)",
            paddingTop: "10px",
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", fontSize: "13px" }}>
            Export Model
          </h4>
          <button
            onClick={debugGeometry}
            style={{
              backgroundColor: "#FF9800",
              color: "white",
              border: "none",
              padding: "4px 8px",
              margin: "2px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "10px",
              width: "100%",
              marginBottom: "4px",
            }}
          >
            Debug: Check Geometry
          </button>
          <button
            onClick={exportSTLASCII}
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              padding: "6px 12px",
              margin: "2px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              width: "100%",
              marginBottom: "4px",
            }}
          >
            Export STL (ASCII)
          </button>
          <button
            onClick={exportSTLBinary}
            style={{
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              padding: "6px 12px",
              margin: "2px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              width: "100%",
            }}
          >
            Export STL (Binary)
          </button>
        </div>
      </div>

      <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />
    </>
  );
}
