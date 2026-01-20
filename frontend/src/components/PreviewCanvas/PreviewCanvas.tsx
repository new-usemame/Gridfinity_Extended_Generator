import { Suspense, useEffect, useState, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Text, Billboard } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import { BoxConfig, BaseplateConfig } from '../../types/config';

// Track if camera has been fitted to prevent resetting on geometry changes
let cameraFittedForScene = false;
let cameraFittedForCombined = false;

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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset offset when switching views
  useEffect(() => {
    if (!isCombinedView) {
      setBoxZOffset(0);
    }
  }, [isCombinedView]);

  // Track container size using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    // Initial size
    updateSize();

    // Use ResizeObserver to track container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(containerRef.current);

    // Also listen to window resize as fallback
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const hasModel = isCombinedView 
    ? (boxStlUrl && baseplateStlUrl)
    : stlUrl;

  // Calculate Position Control position based on container size
  // Position it in the top-right, but move it if there's not enough space
  const positionControlStyle: React.CSSProperties = {};
  const controlWidth = 256; // w-64 = 16rem = 256px
  const controlHeight = 150; // Approximate height
  const padding = 16; // 1rem = 16px
  const exportButtonsHeight = 200; // Approximate height of export buttons area at bottom
  
  // Use container dimensions instead of window dimensions
  const availableWidth = containerSize.width;
  const availableHeight = containerSize.height;
  
  // Check if there's enough space on the right side
  if (availableWidth < controlWidth + padding * 2) {
    // Not enough horizontal space, position on left side instead
    positionControlStyle.right = 'auto';
    positionControlStyle.left = `${padding}px`;
  } else {
    // Position on right, but ensure it never overflows
    const maxRight = availableWidth - controlWidth - padding;
    positionControlStyle.right = `${Math.max(padding, maxRight)}px`;
    positionControlStyle.left = 'auto';
  }
  
  // Check if there's enough vertical space
  if (availableHeight < controlHeight + padding * 2) {
    // Not enough vertical space, move down (but above export buttons)
    positionControlStyle.top = 'auto';
    positionControlStyle.bottom = `${exportButtonsHeight + padding}px`;
  } else {
    positionControlStyle.top = `${padding}px`;
    positionControlStyle.bottom = 'auto';
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-gradient-to-b from-slate-100 to-white dark:from-slate-900 dark:to-slate-950 relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-green-500/30 dark:border-green-500/30 border-t-green-500 dark:border-t-green-500 rounded-full animate-spin" />
            <p className="text-slate-700 dark:text-slate-400 text-sm">Generating STL...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasModel && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-600 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-slate-600 dark:text-slate-400 font-medium mb-2">No Model Generated</h3>
            <p className="text-slate-600 dark:text-slate-500 text-sm max-w-xs">
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
        <div 
          className="absolute w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-4 z-10"
          style={positionControlStyle}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Position Control</h3>
            <button
              onClick={() => setBoxZOffset(0)}
              className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
              title="Reset to 0"
            >
              Reset
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-2">
                Box Z Position: {boxZOffset.toFixed(1)}mm
              </label>
              <input
                type="range"
                min="-20"
                max="20"
                step="0.1"
                value={boxZOffset}
                onChange={(e) => setBoxZOffset(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500 dark:accent-green-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Controls Help */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-600 dark:text-slate-500 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
        <span className="text-slate-700 dark:text-slate-400">Drag</span> to rotate • 
        <span className="text-slate-700 dark:text-slate-400"> Scroll</span> to zoom • 
        <span className="text-slate-700 dark:text-slate-400"> Shift+Drag</span> to pan
      </div>
    </div>
  );
}

function CombinedSceneContent({ 
  boxStlUrl, 
  baseplateStlUrl, 
  boxZOffset,
  boxConfig: _boxConfig,
  baseplateConfig: _baseplateConfig
}: { 
  boxStlUrl: string | null; 
  baseplateStlUrl: string | null;
  boxZOffset: number;
  boxConfig?: BoxConfig;
  baseplateConfig?: BaseplateConfig;
}) {
  const [boxGeometry, setBoxGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [baseplateGeometry, setBaseplateGeometry] = useState<THREE.BufferGeometry | null>(null);

  // Load box STL
  useEffect(() => {
    if (!boxStlUrl) {
      setBoxGeometry(null);
      return;
    }

    const loader = new STLLoader();
    loader.load(
      boxStlUrl,
      (loadedGeometry) => {
        loadedGeometry.computeVertexNormals();
        
        // Apply coordinate transformation
        // OpenSCAD: X=right, Y=back, Z=up
        // Three.js: X=right, Y=up, Z=front
        // We want: SCAD high Y (back) → Three.js low Z (left) so half cells appear on left
        //         SCAD low Y (front) → Three.js high Z (right) so full cells appear on right
        const matrix = new THREE.Matrix4();
        matrix.set(
          1, 0, 0, 0,
          0, 0, 1, 0,
          0, -1, 0, 0,   // Z = -Y (negated, so high SCAD Y → low Three.js Z / left side)
          0, 0, 0, 1
        );
        loadedGeometry.applyMatrix4(matrix);
        
        // Position box to align with grid corner
        // Gridfinity clearance is 0.25mm on each side
        loadedGeometry.computeBoundingBox();
        const box = loadedGeometry.boundingBox!;
        const clearance = 0.25; // Standard Gridfinity clearance
        
        // Calculate where to position box - we want it at high Z (right) on full cells
        // After Y-axis flip: low SCAD Y (front/full cells) → high Three.js Z (right)
        // So we position box at high Z, and it extends toward low Z (left)
        // This leaves empty space on the left over the half cells (which are at low Z)
        const baseplateDepth = _baseplateConfig ? 
          (_baseplateConfig.sizingMode === 'fill_area_mm' ? 
            _baseplateConfig.targetDepthMm : 
            _baseplateConfig.depth * _baseplateConfig.gridSize) : 0;
        
        // Position box at high Z (right side) where full cells are
        // Box extends from high Z toward low Z (left), leaving empty space over half cells on left
        const boxZPosition = baseplateDepth > 0 ? 
          baseplateDepth - (box.max.z - box.min.z) - clearance : 
          -box.min.z + clearance;
        
        // Move box so its corner is at (clearance, 0, boxZPosition)
        // This positions it on full cells at high Z (right side)
        loadedGeometry.translate(-box.min.x + clearance, -box.min.y, -box.min.z + boxZPosition);
        
        setBoxGeometry(loadedGeometry);
      },
      undefined,
      (error) => {
        console.error('Error loading box STL:', error);
      }
    );
  }, [boxStlUrl, _baseplateConfig]);

  // Load baseplate STL
  useEffect(() => {
    if (!baseplateStlUrl) {
      setBaseplateGeometry(null);
      return;
    }

    const loader = new STLLoader();
    loader.load(
      baseplateStlUrl,
      (loadedGeometry) => {
        loadedGeometry.computeVertexNormals();
        
        // Apply coordinate transformation
        // OpenSCAD: X=right, Y=back, Z=up
        // Three.js: X=right, Y=up, Z=front
        // We want: SCAD high Y (back) → Three.js low Z (left) so half cells appear on left
        //         SCAD low Y (front) → Three.js high Z (right) so full cells appear on right
        const matrix = new THREE.Matrix4();
        matrix.set(
          1, 0, 0, 0,
          0, 0, 1, 0,
          0, -1, 0, 0,   // Z = -Y (negated, so high SCAD Y → low Three.js Z / left side)
          0, 0, 0, 1
        );
        loadedGeometry.applyMatrix4(matrix);
        
        // Position baseplate so its corner is at (0, 0, 0)
        // This aligns it with the grid origin
        loadedGeometry.computeBoundingBox();
        const box = loadedGeometry.boundingBox!;
        loadedGeometry.translate(-box.min.x, -box.min.y, -box.min.z);
        
        setBaseplateGeometry(loadedGeometry);
      },
      undefined,
      (error) => {
        console.error('Error loading baseplate STL:', error);
      }
    );
  }, [baseplateStlUrl]);

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
        cellColor="#cbd5e1"
        sectionSize={42}
        sectionThickness={1}
        sectionColor="#16a34a"
        fadeDistance={400}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
        position={[0, -0.1, 0]}
      />

      {/* Axis Indicator at origin */}
      <AxisIndicator size={30} />

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
            color="#16a34a"
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
        // - OpenSCAD +Y → Three.js -Z (depth axis, negated)  
        // - OpenSCAD +Z → Three.js +Y (up stays up)
        const matrix = new THREE.Matrix4();
        matrix.set(
          1, 0, 0, 0,
          0, 0, 1, 0,
          0, -1, 0, 0,   // Z = -Y (negated)
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
        cellColor="#cbd5e1"
        sectionSize={42}
        sectionThickness={1}
        sectionColor="#16a34a"
        fadeDistance={400}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
        position={[0, -0.1, 0]}
      />

      {/* Axis Indicator at origin */}
      <AxisIndicator size={30} />

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
    // Only fit camera once on initial load
    // Don't reset camera when geometry changes after initial load
    if (!cameraFittedForCombined && (boxGeometry || baseplateGeometry)) {
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
        cameraFittedForCombined = true;
      }
    }
  }, [boxGeometry, baseplateGeometry, camera]);

  return null;
}

function CameraFit({ geometry }: { geometry: THREE.BufferGeometry }) {
  const { camera } = useThree();
  
  useEffect(() => {
    // Only fit camera once on initial load
    // Don't reset camera when geometry changes after initial load
    if (!cameraFittedForScene) {
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
        cameraFittedForScene = true;
      }
    }
  }, [geometry, camera]);

  return null;
}

// 3D Axis indicator at origin with labels
function AxisIndicator({ size = 30 }: { size?: number }) {
  const axisLength = size;
  const axisRadius = size * 0.02;
  const coneHeight = size * 0.15;
  const coneRadius = size * 0.05;
  const labelOffset = axisLength + coneHeight + 3;
  const fontSize = size * 0.2;

  return (
    <group position={[0, 0, 0]}>
      {/* X Axis - Red */}
      <group>
        <mesh position={[axisLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh position={[axisLength, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[coneRadius, coneHeight, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <Billboard position={[labelOffset, 0, 0]}>
          <Text fontSize={fontSize} color="#ef4444" anchorX="center" anchorY="middle">
            X
          </Text>
        </Billboard>
      </group>

      {/* Y Axis - Green (Up) */}
      <group>
        <mesh position={[0, axisLength / 2, 0]}>
          <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
        <mesh position={[0, axisLength, 0]}>
          <coneGeometry args={[coneRadius, coneHeight, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
        <Billboard position={[0, labelOffset, 0]}>
          <Text fontSize={fontSize} color="#22c55e" anchorX="center" anchorY="middle">
            Y
          </Text>
        </Billboard>
      </group>

      {/* Z Axis - Blue */}
      <group>
        <mesh position={[0, 0, axisLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 8]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[0, 0, axisLength]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[coneRadius, coneHeight, 8]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <Billboard position={[0, 0, labelOffset]}>
          <Text fontSize={fontSize} color="#3b82f6" anchorX="center" anchorY="middle">
            Z
          </Text>
        </Billboard>
      </group>

      {/* Origin sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[axisRadius * 2, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
