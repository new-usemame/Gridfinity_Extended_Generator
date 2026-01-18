import { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';

interface PreviewCanvasProps {
  stlUrl: string | null;
  isLoading: boolean;
}

export function PreviewCanvas({ stlUrl, isLoading }: PreviewCanvasProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Generating STL...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!stlUrl && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-slate-400 font-medium mb-2">No Model Generated</h3>
            <p className="text-slate-500 text-sm max-w-xs">
              Configure your Gridfinity box or baseplate, then click "Generate STL" to preview.
            </p>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [80, 60, 80], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <SceneContent stlUrl={stlUrl} />
        </Suspense>
      </Canvas>

      {/* Controls Help */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-500 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2">
        <span className="text-slate-400">Drag</span> to rotate • 
        <span className="text-slate-400"> Scroll</span> to zoom • 
        <span className="text-slate-400"> Shift+Drag</span> to pan
      </div>
    </div>
  );
}

function SceneContent({ stlUrl }: { stlUrl: string | null }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (!stlUrl) {
      setGeometry(null);
      return;
    }

    const loader = new STLLoader();
    loader.load(
      stlUrl,
      (loadedGeometry) => {
        loadedGeometry.computeVertexNormals();
        
        // Rotate from Z-up (OpenSCAD) to Y-up (Three.js)
        // +90° around X converts Z-up to Y-up correctly
        loadedGeometry.rotateX(Math.PI / 2);
        
        // Center horizontally, place bottom on ground
        loadedGeometry.computeBoundingBox();
        const box = loadedGeometry.boundingBox!;
        const center = new THREE.Vector3();
        box.getCenter(center);
        loadedGeometry.translate(-center.x, -box.min.y, -center.z);
        
        setGeometry(loadedGeometry);
      },
      undefined,
      (error) => {
        console.error('Error loading STL:', error);
      }
    );
  }, [stlUrl]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, 10, -5]} intensity={0.5} />
      <pointLight position={[0, 20, 0]} intensity={0.5} />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Grid Floor */}
      <Grid
        args={[300, 300]}
        cellSize={42}
        cellThickness={0.5}
        cellColor="#1e3a4a"
        sectionSize={42}
        sectionThickness={1}
        sectionColor="#22c55e"
        fadeDistance={400}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
        position={[0, -0.1, 0]}
      />

      {/* Model */}
      {geometry && <ModelMesh geometry={geometry} />}

      {/* Camera Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={500}
      />

      {/* Fit camera on load */}
      {geometry && <CameraFit geometry={geometry} />}
    </>
  );
}

function ModelMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#22c55e"
        metalness={0.1}
        roughness={0.4}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

function CameraFit({ geometry }: { geometry: THREE.BufferGeometry }) {
  const { camera } = useThree();
  
  useEffect(() => {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (box) {
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
      
      camera.position.set(cameraZ * 0.7, cameraZ * 0.5, cameraZ * 0.7);
      camera.lookAt(0, 0, 0);
    }
  }, [geometry, camera]);

  return null;
}
