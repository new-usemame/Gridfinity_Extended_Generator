import { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import { BoxConfig, BaseplateConfig } from '../../types/config';

interface PreviewCanvasProps {
  stlUrl?: string | null;
  boxStlUrl?: string | null;
  baseplateStlUrl?: string | null;
  isLoading: boolean;
  isCombinedView?: boolean;
  boxConfig?: BoxConfig;
  baseplateConfig?: BaseplateConfig;
}

export function PreviewCanvas({ 
  stlUrl, 
  boxStlUrl, 
  baseplateStlUrl, 
  isLoading, 
  isCombinedView = false,
  boxConfig,
  baseplateConfig
}: PreviewCanvasProps) {
  const [boxZOffset, setBoxZOffset] = useState(0); // mm offset for box position
  const [overlapDetected, setOverlapDetected] = useState(false);
  const [overlapMessage, setOverlapMessage] = useState<string | null>(null);

  // Reset offset when switching views
  useEffect(() => {
    if (!isCombinedView) {
      setBoxZOffset(0);
    }
  }, [isCombinedView]);

  const hasModel = isCombinedView 
    ? (boxStlUrl && baseplateStlUrl)
    : stlUrl;

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
      {!hasModel && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-slate-400 font-medium mb-2">No Model Generated</h3>
            <p className="text-slate-500 text-sm max-w-xs">
              {isCombinedView 
                ? 'Configure both box and baseplate, then click "Generate STL" to preview.'
                : 'Configure your Gridfinity box or baseplate, then click "Generate STL" to preview.'}
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
          {isCombinedView ? (
            <CombinedSceneContent 
              boxStlUrl={boxStlUrl || null} 
              baseplateStlUrl={baseplateStlUrl || null}
              boxZOffset={boxZOffset}
              onOverlapDetected={setOverlapDetected}
              onOverlapMessage={setOverlapMessage}
              boxConfig={boxConfig}
              baseplateConfig={baseplateConfig}
            />
          ) : (
            <SceneContent stlUrl={stlUrl || null} />
          )}
        </Suspense>
      </Canvas>

      {/* Combined View Controls */}
      {isCombinedView && hasModel && (
        <div className="absolute right-4 top-4 w-64 bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700 p-4 z-10">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Position Control</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Box Z Position: {boxZOffset.toFixed(1)}mm
              </label>
              <input
                type="range"
                min="-20"
                max="20"
                step="0.1"
                value={boxZOffset}
                onChange={(e) => setBoxZOffset(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>-20mm</span>
                <span>0mm</span>
                <span>+20mm</span>
              </div>
            </div>
            {overlapDetected && (
              <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-red-400">{overlapMessage || 'Overlap detected!'}</p>
                </div>
              </div>
            )}
            {!overlapDetected && boxZOffset !== 0 && (
              <div className="mt-3 p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-400">✓ No overlap detected</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls Help */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-500 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2">
        <span className="text-slate-400">Drag</span> to rotate • 
        <span className="text-slate-400"> Scroll</span> to zoom • 
        <span className="text-slate-400"> Shift+Drag</span> to pan
      </div>
    </div>
  );
}

function CombinedSceneContent({ 
  boxStlUrl, 
  baseplateStlUrl, 
  boxZOffset,
  onOverlapDetected,
  onOverlapMessage,
  boxConfig: _boxConfig,
  baseplateConfig: _baseplateConfig
}: { 
  boxStlUrl: string | null; 
  baseplateStlUrl: string | null;
  boxZOffset: number;
  onOverlapDetected: (detected: boolean) => void;
  onOverlapMessage: (message: string | null) => void;
  boxConfig?: BoxConfig;
  baseplateConfig?: BaseplateConfig;
}) {
  const [boxGeometry, setBoxGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [baseplateGeometry, setBaseplateGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [boxBoundingBox, setBoxBoundingBox] = useState<THREE.Box3 | null>(null);
  const [baseplateBoundingBox, setBaseplateBoundingBox] = useState<THREE.Box3 | null>(null);

  // Load box STL
  useEffect(() => {
    if (!boxStlUrl) {
      setBoxGeometry(null);
      setBoxBoundingBox(null);
      return;
    }

    const loader = new STLLoader();
    loader.load(
      boxStlUrl,
      (loadedGeometry) => {
        loadedGeometry.computeVertexNormals();
        
        // Apply coordinate transformation
        const matrix = new THREE.Matrix4();
        matrix.set(
          1, 0, 0, 0,
          0, 0, 1, 0,
          0, -1, 0, 0,
          0, 0, 0, 1
        );
        loadedGeometry.applyMatrix4(matrix);
        
        // Position box to align with grid corner (bottom-left)
        // Gridfinity clearance is 0.25mm on each side
        loadedGeometry.computeBoundingBox();
        const box = loadedGeometry.boundingBox!;
        const clearance = 0.25; // Standard Gridfinity clearance
        
        // Move box so its bottom-left corner (in XZ plane) is at (clearance, 0, clearance)
        // This aligns it with the first grid position on the baseplate
        loadedGeometry.translate(-box.min.x + clearance, -box.min.y, -box.min.z + clearance);
        
        // Recompute bounding box after translation
        loadedGeometry.computeBoundingBox();
        setBoxBoundingBox(loadedGeometry.boundingBox!.clone());
        
        setBoxGeometry(loadedGeometry);
      },
      undefined,
      (error) => {
        console.error('Error loading box STL:', error);
      }
    );
  }, [boxStlUrl]);

  // Load baseplate STL
  useEffect(() => {
    if (!baseplateStlUrl) {
      setBaseplateGeometry(null);
      setBaseplateBoundingBox(null);
      return;
    }

    const loader = new STLLoader();
    loader.load(
      baseplateStlUrl,
      (loadedGeometry) => {
        loadedGeometry.computeVertexNormals();
        
        // Apply coordinate transformation
        const matrix = new THREE.Matrix4();
        matrix.set(
          1, 0, 0, 0,
          0, 0, 1, 0,
          0, -1, 0, 0,
          0, 0, 0, 1
        );
        loadedGeometry.applyMatrix4(matrix);
        
        // Position baseplate so its bottom-left corner is at (0, 0, 0)
        // This aligns it with the grid origin
        loadedGeometry.computeBoundingBox();
        const box = loadedGeometry.boundingBox!;
        loadedGeometry.translate(-box.min.x, -box.min.y, -box.min.z);
        
        // Recompute bounding box after translation
        loadedGeometry.computeBoundingBox();
        setBaseplateBoundingBox(loadedGeometry.boundingBox!.clone());
        
        setBaseplateGeometry(loadedGeometry);
      },
      undefined,
      (error) => {
        console.error('Error loading baseplate STL:', error);
      }
    );
  }, [baseplateStlUrl]);

  // Overlap detection
  useEffect(() => {
    if (!boxBoundingBox || !baseplateBoundingBox) {
      onOverlapDetected(false);
      onOverlapMessage(null);
      return;
    }

    // Create a copy of box bounding box with Z offset applied
    const offsetBox = boxBoundingBox.clone();
    offsetBox.translate(new THREE.Vector3(0, boxZOffset, 0));

    // Check if boxes intersect in 3D space
    const intersects = offsetBox.intersectsBox(baseplateBoundingBox);
    
    if (intersects) {
      // Calculate overlap box
      const overlapBox = offsetBox.intersect(baseplateBoundingBox);
      if (overlapBox) {
        const overlapSize = new THREE.Vector3();
        overlapBox.getSize(overlapSize);
        const overlapVolume = overlapSize.x * overlapSize.y * overlapSize.z;
        
        // Also check if box bottom is penetrating baseplate top
        const boxBottom = offsetBox.min.y;
        const baseplateTop = baseplateBoundingBox.max.y;
        const penetration = baseplateTop - boxBottom;
        
        if (overlapVolume > 0.1 || penetration > 0.1) {
          onOverlapDetected(true);
          if (penetration > 0.1) {
            onOverlapMessage(`Penetration: ${penetration.toFixed(2)}mm`);
          } else {
            onOverlapMessage(`Overlap: ${overlapVolume.toFixed(1)} mm³`);
          }
        } else {
          onOverlapDetected(false);
          onOverlapMessage(null);
        }
      } else {
        onOverlapDetected(true);
        onOverlapMessage('Overlap detected');
      }
    } else {
      // Check if box is too far above (not useful info, but good to know)
      const boxBottom = offsetBox.min.y;
      const baseplateTop = baseplateBoundingBox.max.y;
      const gap = boxBottom - baseplateTop;
      
      if (gap > 0.1) {
        onOverlapDetected(false);
        onOverlapMessage(`Gap: ${gap.toFixed(2)}mm`);
      } else {
        onOverlapDetected(false);
        onOverlapMessage(null);
      }
    }
  }, [boxBoundingBox, baseplateBoundingBox, boxZOffset, onOverlapDetected, onOverlapMessage]);

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

      {/* Baseplate Model */}
      {baseplateGeometry && (
        <mesh geometry={baseplateGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color="#3b82f6"
            metalness={0.1}
            roughness={0.4}
            envMapIntensity={0.5}
          />
        </mesh>
      )}

      {/* Box Model with Z offset */}
      {boxGeometry && (
        <mesh 
          geometry={boxGeometry} 
          position={[0, boxZOffset, 0]}
          castShadow 
          receiveShadow
        >
          <meshStandardMaterial
            color="#22c55e"
            metalness={0.1}
            roughness={0.4}
            envMapIntensity={0.5}
          />
        </mesh>
      )}

      {/* Camera Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={500}
      />

      {/* Fit camera on load */}
      {(boxGeometry || baseplateGeometry) && (
        <CameraFitCombined boxGeometry={boxGeometry} baseplateGeometry={baseplateGeometry} />
      )}
    </>
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
        
        // OpenSCAD uses Z-up, Three.js uses Y-up
        // Apply rotation matrix to convert coordinate systems:
        // - OpenSCAD +X → Three.js +X (unchanged)
        // - OpenSCAD +Y → Three.js -Z (forward becomes back)  
        // - OpenSCAD +Z → Three.js +Y (up stays up)
        const matrix = new THREE.Matrix4();
        matrix.set(
          1, 0, 0, 0,
          0, 0, 1, 0,
          0, -1, 0, 0,
          0, 0, 0, 1
        );
        loadedGeometry.applyMatrix4(matrix);
        
        // Center horizontally and place on ground
        loadedGeometry.computeBoundingBox();
        const box = loadedGeometry.boundingBox!;
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        // Center on X/Z, put bottom (min Y) at ground level
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

function CameraFitCombined({ 
  boxGeometry, 
  baseplateGeometry 
}: { 
  boxGeometry: THREE.BufferGeometry | null;
  baseplateGeometry: THREE.BufferGeometry | null;
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    const boxes: THREE.Box3[] = [];
    
    if (boxGeometry) {
      boxGeometry.computeBoundingBox();
      if (boxGeometry.boundingBox) {
        boxes.push(boxGeometry.boundingBox);
      }
    }
    
    if (baseplateGeometry) {
      baseplateGeometry.computeBoundingBox();
      if (baseplateGeometry.boundingBox) {
        boxes.push(baseplateGeometry.boundingBox);
      }
    }
    
    if (boxes.length > 0) {
      // Combine all bounding boxes
      const combinedBox = boxes[0].clone();
      for (let i = 1; i < boxes.length; i++) {
        combinedBox.union(boxes[i]);
      }
      
      const size = new THREE.Vector3();
      combinedBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
      
      camera.position.set(cameraZ * 0.7, cameraZ * 0.5, cameraZ * 0.7);
      camera.lookAt(0, 0, 0);
    }
  }, [boxGeometry, baseplateGeometry, camera]);

  return null;
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
