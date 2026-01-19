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
  
  // Printer bed splitting
  enableSplitting: boolean;     // Enable splitting into segments
  printerBedWidth: number;      // Printer bed width in mm
  printerBedDepth: number;       // Printer bed depth in mm
  connectorTolerance: number;    // Connector clearance in mm (default 0.2)
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
  syncSocketWithFoot: true,     // Auto-sync with foot by default
  enableSplitting: false,
  printerBedWidth: 220,
  printerBedDepth: 220,
  connectorTolerance: 0.2
};

// Generation result type
export interface GenerationResult {
  stlUrl: string;
  scadContent: string;
  filename: string;
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

// Baseplate segment information
export interface BaseplateSegment {
  segmentIndex: number;      // 0-based index
  row: number;               // Row in the grid of segments
  col: number;               // Column in the grid of segments
  widthUnits: number;        // Width in grid units (integer, no half cells)
  depthUnits: number;        // Depth in grid units (integer, no half cells)
  widthMm: number;           // Actual width in mm
  depthMm: number;           // Actual depth in mm
  offsetX: number;           // X offset in grid units from origin
  offsetY: number;           // Y offset in grid units from origin
  hasConnectorLeft: boolean;  // Needs connector on left edge
  hasConnectorRight: boolean; // Needs connector on right edge
  hasConnectorTop: boolean;   // Needs connector on top edge
  hasConnectorBottom: boolean;// Needs connector on bottom edge
  isCornerTopLeft: boolean;   // Is top-left corner segment
  isCornerTopRight: boolean;  // Is top-right corner segment
  isCornerBottomLeft: boolean;// Is bottom-left corner segment
  isCornerBottomRight: boolean;// Is bottom-right corner segment
}

// Splitting calculation result
export interface SplittingResult {
  segments: BaseplateSegment[];
  segmentsX: number;         // Number of segments in X direction
  segmentsY: number;         // Number of segments in Y direction
  needsSplitting: boolean;   // Whether splitting is actually needed
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

/**
 * Calculate how to split a baseplate into segments that fit on the printer bed
 * Ensures segments align with grid cell boundaries (no half cells)
 */
export function calculateSplitting(
  totalWidthUnits: number,
  totalDepthUnits: number,
  gridSize: number,
  printerBedWidth: number,
  printerBedDepth: number
): SplittingResult {
  // Convert grid units to mm (round down to full cells only for splitting)
  const fullCellsX = Math.floor(totalWidthUnits);
  const fullCellsY = Math.floor(totalDepthUnits);
  const totalWidthMm = fullCellsX * gridSize;
  const totalDepthMm = fullCellsY * gridSize;
  
  // Calculate how many grid units fit on the printer bed
  const maxUnitsX = Math.floor(printerBedWidth / gridSize);
  const maxUnitsY = Math.floor(printerBedDepth / gridSize);
  
  // Calculate number of segments needed
  const segmentsX = Math.max(1, Math.ceil(fullCellsX / maxUnitsX));
  const segmentsY = Math.max(1, Math.ceil(fullCellsY / maxUnitsY));
  
  const needsSplitting = segmentsX > 1 || segmentsY > 1;
  
  // Calculate segment dimensions
  const unitsPerSegmentX = Math.floor(fullCellsX / segmentsX);
  const unitsPerSegmentY = Math.floor(fullCellsY / segmentsY);
  const remainderX = fullCellsX % segmentsX;
  const remainderY = fullCellsY % segmentsY;
  
  const segments: BaseplateSegment[] = [];
  
  let currentOffsetX = 0;
  for (let col = 0; col < segmentsX; col++) {
    // Distribute remainder cells across first segments
    const widthUnits = unitsPerSegmentX + (col < remainderX ? 1 : 0);
    const widthMm = widthUnits * gridSize;
    
    let currentOffsetY = 0;
    for (let row = 0; row < segmentsY; row++) {
      // Distribute remainder cells across first segments
      const depthUnits = unitsPerSegmentY + (row < remainderY ? 1 : 0);
      const depthMm = depthUnits * gridSize;
      
      const segmentIndex = row * segmentsX + col;
      
      segments.push({
        segmentIndex,
        row,
        col,
        widthUnits,
        depthUnits,
        widthMm,
        depthMm,
        offsetX: currentOffsetX,
        offsetY: currentOffsetY,
        hasConnectorLeft: col > 0,
        hasConnectorRight: col < segmentsX - 1,
        hasConnectorTop: row > 0,
        hasConnectorBottom: row < segmentsY - 1,
        isCornerTopLeft: col === 0 && row === 0,
        isCornerTopRight: col === segmentsX - 1 && row === 0,
        isCornerBottomLeft: col === 0 && row === segmentsY - 1,
        isCornerBottomRight: col === segmentsX - 1 && row === segmentsY - 1
      });
      
      currentOffsetY += depthUnits;
    }
    
    currentOffsetX += widthUnits;
  }
  
  return {
    segments,
    segmentsX,
    segmentsY,
    needsSplitting
  };
}
