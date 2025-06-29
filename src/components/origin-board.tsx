"use client";

import React, { useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { MESH_CONFIG } from "@/configs";
import { useThreeScene, useFileLoader, useModelExport } from "@/hooks";
import { ControlsInfo } from "./controls-info";
import { FileUploadPanel } from "./file-upload-panel";

export default function TransformControlsExample() {
  /** Reference to the DOM element where the Three.js scene will be mounted */
  const sceneContainerRef = useRef<HTMLDivElement>(null);

  /** Currently loaded 3D mesh in the scene */
  const [activeMesh, setActiveMesh] = useState<THREE.Mesh | null>(null);

  /** Three.js scene references (scene, controls, exporter, etc.) */
  const sceneRefs = useThreeScene(sceneContainerRef);

  /**
   * Removes the current mesh from the scene and cleans up resources
   * This prevents memory leaks and prepares for loading a new model
   */
  const removeCurrentMesh = useCallback(() => {
    const { scene, control } = sceneRefs.current;
    if (!scene || !control || !activeMesh) return;

    // Remove from scene and detach controls
    scene.remove(activeMesh);
    control.detach();

    // Clean up Three.js resources
    activeMesh.geometry.dispose();
    (activeMesh.material as THREE.Material).dispose();
  }, [activeMesh, sceneRefs]);

  const loadModelIntoScene = useCallback(
    (geometry: THREE.BufferGeometry) => {
      const { scene, control } = sceneRefs.current;
      if (!scene || !control) return;

      // Store original geometry for export (before any modifications)
      sceneRefs.current.originalGeometry = geometry.clone();

      // Remove any existing model
      removeCurrentMesh();

      // Create new mesh with proper material
      const displayGeometry = geometry.clone();
      const material = new THREE.MeshLambertMaterial(MESH_CONFIG.MATERIAL);
      const newMesh = new THREE.Mesh(displayGeometry, material);

      // Auto-scale the model to fit nicely in the view
      const scaleFactor = calculateAutoScale(displayGeometry);
      newMesh.scale.setScalar(scaleFactor);

      // Center the model at the origin
      newMesh.position.set(0, 0, 0);

      // Add to scene and enable controls
      scene.add(newMesh);
      control.attach(newMesh);
      setActiveMesh(newMesh);
    },
    [removeCurrentMesh, sceneRefs]
  );

  /** File loading functionality (STL, OBJ, GLTF/GLB support) */
  const { handleFileUpload, calculateAutoScale } = useFileLoader({
    onMeshCreated: loadModelIntoScene,
  });

  /** Model export functionality (STL ASCII/Binary) */
  const { exportSTLASCII, exportSTLBinary, debugGeometry } = useModelExport({
    originalGeometry: sceneRefs.current.originalGeometry,
    currentMesh: activeMesh,
    exporter: sceneRefs.current.exporter,
  });

  return (
    <div className="relative w-screen h-screen">
      <ControlsInfo />
      <FileUploadPanel
        onFileUpload={handleFileUpload}
        onExportSTLASCII={exportSTLASCII}
        onExportSTLBinary={exportSTLBinary}
        onDebugGeometry={debugGeometry}
      />
      <div ref={sceneContainerRef} className="w-full h-full" />
    </div>
  );
}
