// Box/Bin Configuration
export interface BoxConfig {
  // Dimensions (in grid units)
  width: number;
  depth: number;
  height: number;
  
  // Wall and floor
  wallThickness: number;
  floorThickness: number;
  
  // Magnets
  magnetEnabled: boolean;
  magnetDiameter: number;
  magnetDepth: number;
  magnetEasyRelease: 'off' | 'auto' | 'inner' | 'outer';
  
  // Screw holes
  screwEnabled: boolean;
  screwDiameter: number;
  
  // Finger slide
  fingerSlide: boolean;
  fingerSlideStyle: 'none' | 'rounded' | 'chamfered';
  fingerSlideRadius: number;
  fingerSlidePosition: 'front' | 'back' | 'left' | 'right';
  
  // Label
  labelEnabled: boolean;
  labelPosition: 'front' | 'back' | 'left' | 'right';
  labelWidth: number;
  
  // Dividers
  dividersX: number;
  dividersY: number;
  
  // Lip style
  lipStyle: 'none' | 'standard' | 'reduced' | 'minimum';
  
  // Base style
  flatBase: 'off' | 'stackable' | 'rounded';
  efficientFloor: 'off' | 'on' | 'rounded' | 'smooth';
  
  // Tapered corner
  taperedCorner: 'none' | 'rounded' | 'chamfered';
  taperedCornerSize: number;
  
  // Wall pattern
  wallPattern: 'none' | 'hexgrid' | 'grid' | 'voronoi' | 'brick';
  wallPatternSpacing: number;
  
  // Corner radius (for the outer box vertical corners)
  cornerRadius: number;
  
  // Bottom overhang prevention
  preventBottomOverhangs: boolean;  // Adds small chamfer where feet meet box walls
  
  // Feet options
  feetCornerRadius: number;
  gridSize: number;  // Grid unit size in mm (standard is 42mm)
  
  // Foot chamfer - simple angle and height controls
  footChamferAngle: number;   // Angle in degrees (45 = standard, higher = steeper)
  footChamferHeight: number;  // Total height of the chamfered foot in mm
}

// Baseplate Configuration
export interface BaseplateConfig {
  // Sizing mode
  sizingMode: 'grid_units' | 'fill_area_mm';
  
  // Dimensions (in grid units) - used when sizingMode = 'grid_units'
  width: number;
  depth: number;
  
  // Target dimensions in mm - used when sizingMode = 'fill_area_mm'
  targetWidthMm: number;
  targetDepthMm: number;
  
  // Fill options (for fill_area_mm mode)
  allowHalfCellsX: boolean;
  allowHalfCellsY: boolean;
  paddingAlignment: 'center' | 'near' | 'far';
  
  // Style
  style: 'default' | 'magnet' | 'weighted' | 'screw';
  plateStyle: 'default' | 'cnclaser';
  
  // Magnet configuration
  magnetDiameter: number;
  magnetDepth: number;
  magnetZOffset: number;
  magnetTopCover: number;
  
  // Screw configuration  
  screwDiameter: number;
  centerScrew: boolean;
  
  // Weight cavity
  weightCavity: boolean;
  
  // Bottom taper
  removeBottomTaper: boolean;
  
  // Corner radius
  cornerRadius: number;
  cornerSegments: number;
  
  // Grid size
  gridSize: number;
  
  // Socket chamfer - simple angle and height controls (should match foot for proper fit)
  socketChamferAngle: number;   // Angle in degrees (should match footChamferAngle)
  socketChamferHeight: number;  // Total height of socket in mm (should match footChamferHeight)
  syncSocketWithFoot: boolean;  // Auto-sync socket dimensions with foot dimensions
  
  // Printer bed splitting - split large baseplates into printable segments
  splitEnabled: boolean;
  printerBedWidth: number;      // Printer bed width in mm
  printerBedDepth: number;      // Printer bed depth in mm
  connectorEnabled: boolean;    // Add interlocking edges between segments
  connectorTolerance: number;   // Clearance for connector fit (default 0.3mm for FDM)
  
  // Edge pattern for interlocking segments (male/female teeth extruded vertically)
  edgePattern: 'dovetail' | 'rectangular' | 'triangular' | 'puzzle' | 'tslot';
  toothDepth: number;           // How far teeth extend into adjacent segment (mm)
  toothWidth: number;           // Width of each tooth at base (mm)
}

// Default configurations
export const defaultBoxConfig: BoxConfig = {
  width: 2,
  depth: 2,
  height: 3,
  wallThickness: 0.95,
  floorThickness: 0.7,
  magnetEnabled: false,
  magnetDiameter: 6.5,
  magnetDepth: 2.4,
  magnetEasyRelease: 'auto',
  screwEnabled: false,
  screwDiameter: 3,
  fingerSlide: false,
  fingerSlideStyle: 'rounded',
  fingerSlideRadius: 8,
  fingerSlidePosition: 'front',
  labelEnabled: false,
  labelPosition: 'front',
  labelWidth: 100,
  dividersX: 0,
  dividersY: 0,
  lipStyle: 'standard',
  flatBase: 'off',
  efficientFloor: 'off',
  taperedCorner: 'none',
  taperedCornerSize: 10,
  wallPattern: 'none',
  wallPatternSpacing: 2,
  cornerRadius: 3.75,
  preventBottomOverhangs: true,  // Enabled by default for better printing
  feetCornerRadius: 3.75,
  gridSize: 42,
  footChamferAngle: 45,      // 45 degrees = standard Gridfinity
  footChamferHeight: 4.75    // Standard total height: 0.8 + 1.8 + 2.15 = 4.75mm
};

export const defaultBaseplateConfig: BaseplateConfig = {
  sizingMode: 'grid_units',
  width: 3,
  depth: 3,
  targetWidthMm: 200,
  targetDepthMm: 200,
  allowHalfCellsX: true,
  allowHalfCellsY: true,
  paddingAlignment: 'center',
  style: 'default',
  plateStyle: 'default',
  magnetDiameter: 6.5,
  magnetDepth: 2.4,
  magnetZOffset: 0,
  magnetTopCover: 0,
  screwDiameter: 3,
  centerScrew: false,
  weightCavity: false,
  removeBottomTaper: false,
  cornerRadius: 3.75,
  cornerSegments: 32,
  gridSize: 42,
  socketChamferAngle: 45,      // Should match footChamferAngle for proper fit
  socketChamferHeight: 4.75,   // Should match footChamferHeight for proper fit
  syncSocketWithFoot: true,    // Auto-sync with foot by default
  splitEnabled: false,
  printerBedWidth: 220,        // Common printer bed size (Ender 3, Prusa, etc.)
  printerBedDepth: 220,
  connectorEnabled: true,      // Enable interlocking edges by default when splitting
  connectorTolerance: 0.3,     // Standard FDM tolerance
  edgePattern: 'dovetail',     // Default to classic dovetail pattern
  toothDepth: 3,               // 3mm tooth depth
  toothWidth: 6                // 6mm tooth width at base
};

// Segment info for split baseplates
export interface SegmentInfo {
  segmentX: number;              // Segment position in X (0-indexed)
  segmentY: number;              // Segment position in Y (0-indexed)
  gridUnitsX: number;            // Number of grid units in this segment (X)
  gridUnitsY: number;            // Number of grid units in this segment (Y)
  hasConnectorLeft: boolean;     // Connector on left edge
  hasConnectorRight: boolean;    // Connector on right edge
  hasConnectorFront: boolean;    // Connector on front edge
  hasConnectorBack: boolean;     // Connector on back edge
}

// Split result containing all segments and connector info
export interface SplitResult {
  segments: SegmentInfo[][];     // 2D array of segments [y][x]
  segmentsX: number;             // Number of segments in X direction
  segmentsY: number;             // Number of segments in Y direction
  totalSegments: number;         // Total number of segments
  maxSegmentUnitsX: number;      // Max grid units per segment in X
  maxSegmentUnitsY: number;      // Max grid units per segment in Y
  needsSplit: boolean;           // Whether splitting is needed
}

// Grid calculation result for fill_area_mm mode
export interface GridCalculation {
  // Grid units (can be fractional like 2.5 for half cells)
  gridUnitsX: number;
  gridUnitsY: number;
  
  // Breakdown
  fullCellsX: number;
  fullCellsY: number;
  hasHalfCellX: boolean;
  hasHalfCellY: boolean;
  
  // Actual grid coverage in mm
  gridCoverageMmX: number;
  gridCoverageMmY: number;
  
  // Padding amounts
  totalPaddingX: number;
  totalPaddingY: number;
  paddingNearX: number;  // left
  paddingFarX: number;   // right
  paddingNearY: number;  // front
  paddingFarY: number;   // back
}

/**
 * Calculate how to split a baseplate into printable segments based on printer bed size.
 * Splits only at grid cell boundaries to maintain compatibility.
 */
export function splitBaseplateForPrinter(
  totalGridUnitsX: number,
  totalGridUnitsY: number,
  printerBedWidth: number,
  printerBedDepth: number,
  gridSize: number,
  connectorEnabled: boolean
): SplitResult {
  // Calculate max grid units that fit on the printer bed
  const maxSegmentUnitsX = Math.floor(printerBedWidth / gridSize);
  const maxSegmentUnitsY = Math.floor(printerBedDepth / gridSize);
  
  // Calculate number of segments needed
  const segmentsX = Math.ceil(totalGridUnitsX / maxSegmentUnitsX);
  const segmentsY = Math.ceil(totalGridUnitsY / maxSegmentUnitsY);
  
  // Check if splitting is needed
  const needsSplit = segmentsX > 1 || segmentsY > 1;
  
  // Generate segment info
  const segments: SegmentInfo[][] = [];
  
  for (let sy = 0; sy < segmentsY; sy++) {
    const row: SegmentInfo[] = [];
    for (let sx = 0; sx < segmentsX; sx++) {
      // Calculate grid units for this segment
      const startX = sx * maxSegmentUnitsX;
      const startY = sy * maxSegmentUnitsY;
      const endX = Math.min(startX + maxSegmentUnitsX, totalGridUnitsX);
      const endY = Math.min(startY + maxSegmentUnitsY, totalGridUnitsY);
      
      const gridUnitsX = endX - startX;
      const gridUnitsY = endY - startY;
      
      // Determine connector positions (only on internal edges between segments)
      const hasConnectorLeft = connectorEnabled && sx > 0;
      const hasConnectorRight = connectorEnabled && sx < segmentsX - 1;
      const hasConnectorFront = connectorEnabled && sy > 0;
      const hasConnectorBack = connectorEnabled && sy < segmentsY - 1;
      
      row.push({
        segmentX: sx,
        segmentY: sy,
        gridUnitsX,
        gridUnitsY,
        hasConnectorLeft,
        hasConnectorRight,
        hasConnectorFront,
        hasConnectorBack
      });
    }
    segments.push(row);
  }
  
  return {
    segments,
    segmentsX,
    segmentsY,
    totalSegments: segmentsX * segmentsY,
    maxSegmentUnitsX,
    maxSegmentUnitsY,
    needsSplit
  };
}

/**
 * Calculate grid cells and padding from target mm dimensions
 */
export function calculateGridFromMm(
  targetWidthMm: number,
  targetDepthMm: number,
  gridSize: number,
  allowHalfCellsX: boolean,
  allowHalfCellsY: boolean,
  paddingAlignment: 'center' | 'near' | 'far'
): GridCalculation {
  const halfSize = gridSize / 2;
  
  // Calculate for X axis (width)
  const fullCellsX = Math.floor(targetWidthMm / gridSize);
  const remainderX = targetWidthMm - (fullCellsX * gridSize);
  const hasHalfCellX = allowHalfCellsX && remainderX >= halfSize;
  const gridUnitsX = fullCellsX + (hasHalfCellX ? 0.5 : 0);
  const gridCoverageMmX = gridUnitsX * gridSize;
  const totalPaddingX = targetWidthMm - gridCoverageMmX;
  
  // Calculate for Y axis (depth)
  const fullCellsY = Math.floor(targetDepthMm / gridSize);
  const remainderY = targetDepthMm - (fullCellsY * gridSize);
  const hasHalfCellY = allowHalfCellsY && remainderY >= halfSize;
  const gridUnitsY = fullCellsY + (hasHalfCellY ? 0.5 : 0);
  const gridCoverageMmY = gridUnitsY * gridSize;
  const totalPaddingY = targetDepthMm - gridCoverageMmY;
  
  // Distribute padding based on alignment
  let paddingNearX: number, paddingFarX: number;
  let paddingNearY: number, paddingFarY: number;
  
  if (paddingAlignment === 'center') {
    paddingNearX = totalPaddingX / 2;
    paddingFarX = totalPaddingX / 2;
    paddingNearY = totalPaddingY / 2;
    paddingFarY = totalPaddingY / 2;
  } else if (paddingAlignment === 'near') {
    paddingNearX = totalPaddingX;
    paddingFarX = 0;
    paddingNearY = totalPaddingY;
    paddingFarY = 0;
  } else {
    // 'far'
    paddingNearX = 0;
    paddingFarX = totalPaddingX;
    paddingNearY = 0;
    paddingFarY = totalPaddingY;
  }
  
  return {
    gridUnitsX,
    gridUnitsY,
    fullCellsX,
    fullCellsY,
    hasHalfCellX,
    hasHalfCellY,
    gridCoverageMmX,
    gridCoverageMmY,
    totalPaddingX,
    totalPaddingY,
    paddingNearX,
    paddingFarX,
    paddingNearY,
    paddingFarY
  };
}
