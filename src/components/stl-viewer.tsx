/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats, TransformControls } from "@react-three/drei";
import { STLLoader } from "three-stdlib";
import * as THREE from "three";

export default function STLViewer() {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  const meshRef = useRef<THREE.Mesh>(null);
  const transformRef = useRef<any>(null);
  const orbitRef = useRef<any>(null);

  // Load and parse STL file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const contents = event.target?.result;
      if (!contents) return;

      const loader = new STLLoader();
      const geom = loader.parse(contents as ArrayBuffer);
      setGeometry(geom);
    };
    reader.readAsArrayBuffer(file);
  };

  // Auto-scale STL to fit board
  const scaledGeometry = useMemo(() => {
    if (!geometry) return null;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 500 / maxDim; // fit into 500 unit space
    return { geometry, scale };
  }, [geometry]);

  // Orbit disable when dragging
  useEffect(() => {
    const controls = transformRef.current;
    const orbit = orbitRef.current;

    if (controls && orbit) {
      const callback = (e: any) => {
        orbit.enabled = !e.value;
      };
      controls.addEventListener("dragging-changed", callback);
      return () => controls.removeEventListener("dragging-changed", callback);
    }
  }, []);

  return (
    <div className="w-full h-screen relative">
      <input
        type="file"
        accept=".stl"
        onChange={handleFileUpload}
        className="absolute z-10 top-4 left-4 bg-white p-2 rounded shadow"
      />

      <Canvas camera={{ position: [0, 0, 800], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 200]} />
        <OrbitControls ref={orbitRef} />
        <Stats />

        {/* X/Y Grid board */}
        <gridHelper
          args={[1000, 50, "red", "gray"]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <axesHelper args={[500]} />

        {/* STL Model with TransformControls */}
        {scaledGeometry && (
          <TransformControls
            ref={transformRef}
            object={meshRef.current!}
            mode="translate"
            showX
            showY
            showZ
          >
            <mesh
              ref={meshRef}
              geometry={scaledGeometry.geometry}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0, 1]}
              scale={[
                scaledGeometry.scale,
                scaledGeometry.scale,
                scaledGeometry.scale,
              ]}
            >
              <meshStandardMaterial color="orange" />
            </mesh>
          </TransformControls>
        )}
      </Canvas>
    </div>
  );
}
