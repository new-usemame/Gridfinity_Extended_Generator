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
  
  // Segmentation for 3D printing
  enableSegmentation: boolean;   // Enable splitting into printable segments
  printerPlateWidth: number;     // 3D printer build plate width in mm
  printerPlateDepth: number;     // 3D printer build plate depth in mm
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
  enableSegmentation: false,    // Segmentation disabled by default
  printerPlateWidth: 220,      // Common Ender 3 size
  printerPlateDepth: 220       // Common Ender 3 size
};

// Generation result type
export interface GenerationResult {
  stlUrl: string;
  scadContent: string;
  filename: string;
}

// Segmented generation result type
export interface SegmentedGenerationResult {
  segments: Array<{
    stlUrl: string;
    scadContent: string;
    filename: string;
    segmentIndex: number;
  }>;
  isSegmented: true;
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
 * Segment information for a single printable segment
 */
export interface BaseplateSegment {
  segmentIndex: number;        // Index of this segment (0-based)
  gridX: number;               // Starting grid X position
  gridY: number;               // Starting grid Y position
  widthUnits: number;          // Width in grid units for this segment
  depthUnits: number;          // Depth in grid units for this segment
  widthMm: number;             // Width in mm for this segment
  depthMm: number;             // Depth in mm for this segment
  hasConnectorLeft: boolean;   // Has connector on left edge
  hasConnectorRight: boolean;  // Has connector on right edge
  hasConnectorTop: boolean;    // Has connector on top edge
  hasConnectorBottom: boolean; // Has connector on bottom edge
  isCornerSegment: boolean;    // Is this a corner segment (has connectors on 2+ edges)
}

/**
 * Segmentation calculation result
 */
export interface SegmentationResult {
  segments: BaseplateSegment[];
  segmentsX: number;           // Number of segments in X direction
  segmentsY: number;           // Number of segments in Y direction
  totalSegments: number;        // Total number of segments
}

/**
 * Calculate how to split a baseplate into printable segments
 */
export function calculateSegmentation(
  totalWidthUnits: number,
  totalDepthUnits: number,
  gridSize: number,
  printerPlateWidth: number,
  printerPlateDepth: number
): SegmentationResult {
  // Calculate how many full grid units fit in printer plate (leave some margin)
  const margin = 5; // 5mm margin on each side
  const availableWidth = printerPlateWidth - (margin * 2);
  const availableDepth = printerPlateDepth - (margin * 2);
  
  // Calculate max units that fit (must be whole units, no half units)
  const maxUnitsX = Math.floor(availableWidth / gridSize);
  const maxUnitsY = Math.floor(availableDepth / gridSize);
  
  // Calculate number of segments needed
  const segmentsX = Math.ceil(totalWidthUnits / maxUnitsX);
  const segmentsY = Math.ceil(totalDepthUnits / maxUnitsY);
  
  // Calculate actual units per segment
  const unitsPerSegmentX = Math.floor(totalWidthUnits / segmentsX);
  const unitsPerSegmentY = Math.floor(totalDepthUnits / segmentsY);
  const remainderX = totalWidthUnits - (unitsPerSegmentX * segmentsX);
  const remainderY = totalDepthUnits - (unitsPerSegmentY * segmentsY);
  
  const segments: BaseplateSegment[] = [];
  let segmentIndex = 0;
  
  for (let sy = 0; sy < segmentsY; sy++) {
    for (let sx = 0; sx < segmentsX; sx++) {
      // Calculate segment dimensions
      let widthUnits = unitsPerSegmentX;
      let depthUnits = unitsPerSegmentY;
      
      // Add remainder to last segments
      if (sx === segmentsX - 1) {
        widthUnits += remainderX;
      }
      if (sy === segmentsY - 1) {
        depthUnits += remainderY;
      }
      
      // Calculate grid position
      const gridX = sx * unitsPerSegmentX;
      const gridY = sy * unitsPerSegmentY;
      
      // Determine connector positions
      const hasConnectorLeft = sx > 0;
      const hasConnectorRight = sx < segmentsX - 1;
      const hasConnectorTop = sy > 0;
      const hasConnectorBottom = sy < segmentsY - 1;
      
      const isCornerSegment = (hasConnectorLeft && hasConnectorTop) ||
                              (hasConnectorLeft && hasConnectorBottom) ||
                              (hasConnectorRight && hasConnectorTop) ||
                              (hasConnectorRight && hasConnectorBottom);
      
      segments.push({
        segmentIndex: segmentIndex++,
        gridX,
        gridY,
        widthUnits,
        depthUnits,
        widthMm: widthUnits * gridSize,
        depthMm: depthUnits * gridSize,
        hasConnectorLeft,
        hasConnectorRight,
        hasConnectorTop,
        hasConnectorBottom,
        isCornerSegment
      });
    }
  }
  
  return {
    segments,
    segmentsX,
    segmentsY,
    totalSegments: segments.length
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
