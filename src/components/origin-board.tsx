"use client"; // if you're using Next 13+ app dir and want client component

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function TransformControlsExample() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentMesh, setCurrentMesh] = useState<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlRef = useRef<TransformControls | null>(null);

  const createMeshFromGeometry = useCallback(
    (geometry: THREE.BufferGeometry) => {
      if (!sceneRef.current || !controlRef.current) return;

      // Remove current mesh if exists
      if (currentMesh) {
        sceneRef.current.remove(currentMesh);
        controlRef.current.detach();
        currentMesh.geometry.dispose();
        (currentMesh.material as THREE.Material).dispose();
      }

      // Create new mesh
      const material = new THREE.MeshLambertMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.9,
      });

      const newMesh = new THREE.Mesh(geometry, material);

      // Auto-scale and position the mesh
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        const center = geometry.boundingBox.getCenter(new THREE.Vector3());
        const size = geometry.boundingBox.getSize(new THREE.Vector3());

        // Scale to fit in view
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        newMesh.scale.setScalar(scale);

        // Position the mesh
        newMesh.position.x = -center.x * scale;
        newMesh.position.z = -center.z * scale;
        newMesh.position.y = (size.y * scale) / 2; // Bottom touches grid
      }

      sceneRef.current.add(newMesh);
      controlRef.current.attach(newMesh);
      setCurrentMesh(newMesh);
    },
    [currentMesh]
  );

  const loadSTLFile = useCallback(
    (contents: ArrayBuffer) => {
      const loader = new STLLoader();
      const geometry = loader.parse(contents);
      createMeshFromGeometry(geometry);
    },
    [createMeshFromGeometry]
  );

  const loadOBJFile = useCallback(
    (contents: string) => {
      const loader = new OBJLoader();
      const object = loader.parse(contents);

      // Find the first mesh in the object
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
    },
    [createMeshFromGeometry]
  );

  const loadGLTFFile = useCallback(
    (contents: ArrayBuffer) => {
      const loader = new GLTFLoader();
      loader.parse(
        contents,
        "",
        (gltf) => {
          // Find the first mesh in the scene
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
    },
    [createMeshFromGeometry]
  );

  // File upload handler
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
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
            alert(
              "Unsupported file format. Please use STL, OBJ, or GLTF/GLB files."
            );
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
    },
    [loadSTLFile, loadOBJFile, loadGLTFFile]
  );

  useEffect(() => {
    if (!mountRef.current) return;

    const cameraPersp = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    const cameraOrtho = new THREE.OrthographicCamera(
      -5 * (window.innerWidth / window.innerHeight),
      5 * (window.innerWidth / window.innerHeight),
      5,
      -5,
      0.1,
      100
    );

    let currentCamera: THREE.Camera = cameraPersp;
    currentCamera.position.set(5, 2.5, 5);

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.add(new THREE.GridHelper(5, 10, 0x888888, 0x444444));

    const ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(1, 1, 1);
    scene.add(light);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // OrbitControls
    const orbit = new OrbitControls(currentCamera, renderer.domElement);
    orbit.update();
    orbit.addEventListener("change", render);

    // TransformControls
    const control = new TransformControls(currentCamera, renderer.domElement);
    controlRef.current = control;
    control.addEventListener("change", render);
    control.addEventListener(
      "dragging-changed",
      function (event: { value: unknown }) {
        orbit.enabled = !(event.value as boolean);
      }
    );

    const gizmo = control.getHelper();
    scene.add(gizmo);

    // Handle resize
    function onWindowResize() {
      const aspect = window.innerWidth / window.innerHeight;

      cameraPersp.aspect = aspect;
      cameraPersp.updateProjectionMatrix();

      cameraOrtho.left = cameraOrtho.bottom * aspect;
      cameraOrtho.right = cameraOrtho.top * aspect;
      cameraOrtho.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);

      render();
    }
    window.addEventListener("resize", onWindowResize);

    // Keyboard controls
    function onKeyDown(event: KeyboardEvent) {
      switch (event.key.toLowerCase()) {
        case "q":
          control.setSpace(control.space === "local" ? "world" : "local");
          break;

        case "shift":
          control.setTranslationSnap(1);
          control.setRotationSnap(THREE.MathUtils.degToRad(15));
          control.setScaleSnap(0.25);
          break;

        case "w":
          control.setMode("translate");
          break;

        case "e":
          control.setMode("rotate");
          break;

        case "r":
          control.setMode("scale");
          break;

        case "c":
          {
            const position = currentCamera.position.clone();
            currentCamera =
              currentCamera instanceof THREE.PerspectiveCamera
                ? cameraOrtho
                : cameraPersp;
            currentCamera.position.copy(position);

            orbit.object = currentCamera;
            control.camera = currentCamera;

            currentCamera.lookAt(
              orbit.target.x,
              orbit.target.y,
              orbit.target.z
            );
            onWindowResize();
          }
          break;

        case "v":
          {
            const randomFoV = Math.random() + 0.1;
            const randomZoom = Math.random() + 0.1;

            cameraPersp.fov = randomFoV * 160;
            cameraOrtho.bottom = -randomFoV * 500;
            cameraOrtho.top = randomFoV * 500;

            cameraPersp.zoom = randomZoom * 5;
            cameraOrtho.zoom = randomZoom * 5;

            onWindowResize();
          }
          break;

        case "+":
        case "=":
          control.setSize(control.size + 0.1);
          break;

        case "-":
        case "_":
          control.setSize(Math.max(control.size - 0.1, 0.1));
          break;

        case "x":
          control.showX = !control.showX;
          break;

        case "y":
          control.showY = !control.showY;
          break;

        case "z":
          control.showZ = !control.showZ;
          break;

        case " ":
          control.enabled = !control.enabled;
          break;

        case "escape":
          control.reset();
          break;
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "shift") {
        control.setTranslationSnap(null);
        control.setRotationSnap(null);
        control.setScaleSnap(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function render() {
      renderer.render(scene, currentCamera);
    }

    render();

    // Cleanup on unmount
    return () => {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }

      orbit.dispose();
      control.dispose();
      renderer.dispose();

      sceneRef.current = null;
      controlRef.current = null;
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
          }}
        />
        <div style={{ marginTop: "8px", fontSize: "11px", opacity: 0.8 }}>
          Supported: STL, OBJ, GLTF, GLB
        </div>
      </div>

      <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />
    </>
  );
}
