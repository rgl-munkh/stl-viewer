import { useCallback } from "react";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { MESH_CONFIG } from "@/configs";

interface UseModelExportProps {
  originalGeometry: THREE.BufferGeometry | null;
  currentMesh: THREE.Mesh | null;
  exporter: STLExporter | null;
}

/**
 * Applies current mesh transformations to the original geometry
 * This ensures the exported model includes all user modifications
 */
const applyTransformationsToGeometry = (
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3
): THREE.BufferGeometry => {
  const transformedGeometry = geometry.clone();
  const transformationMatrix = new THREE.Matrix4();

  // Create transformation matrix from position, rotation, and scale
  transformationMatrix.compose(position, quaternion, scale);

  // Apply transformations directly to the geometry
  transformedGeometry.applyMatrix4(transformationMatrix);

  // Prepare geometry for export
  transformedGeometry.computeVertexNormals();
  transformedGeometry.computeBoundingBox();

  return transformedGeometry;
};

/**
 * Creates a clean mesh for export with reset transformations
 * Since transformations are now baked into the geometry
 */
const createExportMesh = (geometry: THREE.BufferGeometry): THREE.Mesh => {
  const material = new THREE.MeshLambertMaterial(MESH_CONFIG.EXPORT_MATERIAL);
  const mesh = new THREE.Mesh(geometry, material);

  // Reset transformations since they're now in the geometry
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);

  return mesh;
};

/**
 * Generic file saving function
 */
const saveFile = (blob: Blob, filename: string): void => {
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = filename;
  downloadLink.click();
};

/**
 * Saves text content as a file
 */
const saveTextFile = (text: string, filename: string): void => {
  const blob = new Blob([text], { type: "text/plain" });
  saveFile(blob, filename);
};

/**
 * Saves binary data as a file
 */
const saveBinaryFile = (
  buffer: ArrayBuffer | DataView,
  filename: string
): void => {
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveFile(blob, filename);
};

/**
 * Hook for handling 3D model export functionality
 *
 * Provides functions to export models in different formats
 * and debug the current geometry state
 */
export const useModelExport = ({
  originalGeometry,
  currentMesh,
  exporter,
}: UseModelExportProps) => {
  /**
   * Exports the current model as STL format
   *
   * @param isBinary - Whether to export as binary (true) or ASCII (false)
   */
  const exportAsSTL = useCallback(
    (isBinary: boolean = false) => {
      // Validate prerequisites
      if (!originalGeometry || !exporter || !currentMesh) {
        alert("No model to export. Please upload a 3D model first.");
        return;
      }

      console.log(`Exporting STL ${isBinary ? "Binary" : "ASCII"}...`);
      console.log("Current mesh rotation:", currentMesh.rotation);
      console.log("Current mesh position:", currentMesh.position);
      console.log("Current mesh scale:", currentMesh.scale);

      // Apply current transformations to the original geometry
      const transformedGeometry = applyTransformationsToGeometry(
        originalGeometry,
        currentMesh.position,
        currentMesh.quaternion,
        currentMesh.scale
      );

      // Create clean mesh for export
      const exportMesh = createExportMesh(transformedGeometry);
      const exportResult = exporter.parse(exportMesh, { binary: isBinary });

      // Save the exported file
      if (isBinary) {
        const binaryResult = exportResult as DataView;
        console.log("Export result length:", binaryResult.byteLength);
        saveBinaryFile(binaryResult, "model.stl");
      } else {
        const asciiResult = exportResult as string;
        console.log("Export result length:", asciiResult.length);
        saveTextFile(asciiResult, "model.stl");
      }
    },
    [originalGeometry, currentMesh, exporter]
  );

  /**
   * Exports model as STL ASCII format
   */
  const exportSTLASCII = useCallback(() => exportAsSTL(false), [exportAsSTL]);

  /**
   * Exports model as STL Binary format
   */
  const exportSTLBinary = useCallback(() => exportAsSTL(true), [exportAsSTL]);

  /**
   * Debug function to check current geometry state
   * Shows information about loaded mesh and original geometry
   */
  const debugGeometry = useCallback(() => {
    console.log("Current mesh:", currentMesh);
    console.log("Original geometry:", originalGeometry);

    let debugInfo = "";

    if (currentMesh) {
      const geometry = currentMesh.geometry;
      const position = currentMesh.position;
      const rotation = currentMesh.rotation;
      const scale = currentMesh.scale;
      
      // Calculate bounding box
      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox;
      
      debugInfo += `=== CURRENT MESH ===\n`;
      debugInfo += `Position: x=${position.x}, y=${position.y}, z=${position.z}\n`;
      debugInfo += `Rotation: x=${rotation.x}, y=${rotation.y}, z=${rotation.z}\n`;
      debugInfo += `Scale: x=${scale.x}, y=${scale.y}, z=${scale.z}\n`;
      
      if (boundingBox) {
        debugInfo += `Bounding Box:\n`;
        debugInfo += `  Min: x=${boundingBox.min.x}, y=${boundingBox.min.y}, z=${boundingBox.min.z}\n`;
        debugInfo += `  Max: x=${boundingBox.max.x}, y=${boundingBox.max.y}, z=${boundingBox.max.z}\n`;
        debugInfo += `  Size: x=${boundingBox.max.x - boundingBox.min.x}, y=${boundingBox.max.y - boundingBox.min.y}, z=${boundingBox.max.z - boundingBox.min.z}\n`;
      }
      
      debugInfo += `Vertices: ${geometry.attributes.position?.count || 0}\n`;
      debugInfo += `Faces: ${geometry.attributes.position?.count ? Math.floor(geometry.attributes.position.count / 3) : 0}\n`;
    } else {
      debugInfo += "Current mesh: None\n";
    }

    debugInfo += "\n";

    if (originalGeometry) {
      const geometry = originalGeometry;
      
      // Calculate bounding box for original geometry
      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox;
      
      debugInfo += `=== ORIGINAL GEOMETRY ===\n`;
      
      if (boundingBox) {
        debugInfo += `Bounding Box:\n`;
        debugInfo += `  Min: x=${boundingBox.min.x}, y=${boundingBox.min.y}, z=${boundingBox.min.z}\n`;
        debugInfo += `  Max: x=${boundingBox.max.x}, y=${boundingBox.max.y}, z=${boundingBox.max.z}\n`;
        debugInfo += `  Size: x=${boundingBox.max.x - boundingBox.min.x}, y=${boundingBox.max.y - boundingBox.min.y}, z=${boundingBox.max.z - boundingBox.min.z}\n`;
      }
      
      debugInfo += `Vertices: ${geometry.attributes.position?.count || 0}\n`;
      debugInfo += `Faces: ${geometry.attributes.position.count ? Math.floor(geometry.attributes.position.count / 3) : 0}\n`;
    } else {
      debugInfo += "Original geometry: None\n";
    }

    alert(debugInfo);
  }, [currentMesh, originalGeometry]);

  return {
    exportSTLASCII,
    exportSTLBinary,
    debugGeometry,
  };
};
