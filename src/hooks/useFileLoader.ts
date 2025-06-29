import { useCallback } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MESH_CONFIG } from "@/configs";

interface UseFileLoaderProps {
  onMeshCreated: (geometry: THREE.BufferGeometry) => void;
}

/**
 * Calculates the appropriate scale factor to fit geometry in the view
 * Uses the maximum dimension to determine scaling
 */
const calculateAutoScale = (geometry: THREE.BufferGeometry): number => {
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return 1;

  const boundingBoxSize = geometry.boundingBox.getSize(new THREE.Vector3());
  const maximumDimension = Math.max(
    boundingBoxSize.x,
    boundingBoxSize.y,
    boundingBoxSize.z
  );
  const scaleFactor = MESH_CONFIG.SCALE_FACTOR / maximumDimension;

  return scaleFactor;
};

// Loads and parses STL file content
const loadSTLFileContent = (
  fileContent: ArrayBuffer,
  onMeshCreated: UseFileLoaderProps["onMeshCreated"]
) => {
  const stlLoader = new STLLoader();
  const parsedGeometry = stlLoader.parse(fileContent);
  onMeshCreated(parsedGeometry);
};

// Loads and parses OBJ file content
const loadOBJFileContent = (
  fileContent: string,
  onMeshCreated: UseFileLoaderProps["onMeshCreated"]
) => {
  const objLoader = new OBJLoader();
  const parsedObject = objLoader.parse(fileContent);

  // Find the first mesh in the object
  let foundMesh: THREE.Mesh | null = null;
  parsedObject.traverse((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh && !foundMesh) {
      foundMesh = child;
    }
  });

  if (foundMesh) {
    onMeshCreated((foundMesh as THREE.Mesh).geometry);
  } else {
    alert("No mesh found in OBJ file.");
  }
};

// Loads and parses GLTF/GLB file content
const loadGLTFFileContent = (
  fileContent: ArrayBuffer,
  onMeshCreated: UseFileLoaderProps["onMeshCreated"]
) => {
  const gltfLoader = new GLTFLoader();
  gltfLoader.parse(
    fileContent,
    "",
    (parsedGLTF) => {
      // Find the first mesh in the scene
      let foundMesh: THREE.Mesh | null = null;
      parsedGLTF.scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && !foundMesh) {
          foundMesh = child;
        }
      });

      if (foundMesh) {
        onMeshCreated((foundMesh as THREE.Mesh).geometry);
      } else {
        alert("No mesh found in GLTF file.");
      }
    },
    (error) => {
      console.error("Error parsing GLTF:", error);
      alert("Error parsing GLTF file.");
    }
  );
};

// MAIN HOOK
export const useFileLoader = ({ onMeshCreated }: UseFileLoaderProps) => {
  // FILE TYPE HANDLERS

  const handleSTLFile = useCallback(
    (fileContent: ArrayBuffer) => {
      loadSTLFileContent(fileContent, onMeshCreated);
    },
    [onMeshCreated]
  );

  const handleOBJFile = useCallback(
    (fileContent: string) => {
      loadOBJFileContent(fileContent, onMeshCreated);
    },
    [onMeshCreated]
  );

  const handleGLTFFile = useCallback(
    (fileContent: ArrayBuffer) => {
      loadGLTFFileContent(fileContent, onMeshCreated);
    },
    [onMeshCreated]
  );

  // Main file upload handler that determines file type and processes accordingly
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      const fileReader = new FileReader();

      fileReader.onload = function (readEvent) {
        const fileContent = readEvent.target?.result;
        if (!fileContent) return;

        const fileName = selectedFile.name.toLowerCase();

        try {
          // Route to appropriate loader based on file extension
          if (fileName.endsWith(".stl")) {
            handleSTLFile(fileContent as ArrayBuffer);
          } else if (fileName.endsWith(".obj")) {
            handleOBJFile(fileContent as string);
          } else if (fileName.endsWith(".gltf") || fileName.endsWith(".glb")) {
            handleGLTFFile(fileContent as ArrayBuffer);
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

      // Read file as text for OBJ, as ArrayBuffer for others
      if (selectedFile.name.toLowerCase().endsWith(".obj")) {
        fileReader.readAsText(selectedFile);
      } else {
        fileReader.readAsArrayBuffer(selectedFile);
      }
    },
    [handleSTLFile, handleOBJFile, handleGLTFFile]
  );

  return {
    handleFileUpload,
    calculateAutoScale,
  };
};
