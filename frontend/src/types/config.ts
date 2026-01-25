// Box/Bin Configuration
export interface BoxConfig {
  // Dimensions (in grid units)
  width: number;
  depth: number;
  height: number;
  
  // Wall and floor
  wallThickness: number;
  floorThickness: number;
  innerEdgeBevel: boolean;  // Bevel the floor-wall edge using the same radius and style as inner corners
  
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
  dividerHeight: number;  // Divider height as percentage (0-100) of available height (wall_height - floor_thickness - lip_height)
  dividerFloorBevel: boolean;  // Bevel the divider-floor edge using the same radius and style as inner corners
  
  // Lip style
  lipStyle: 'perfect_fit' | 'none' | 'standard' | 'reduced' | 'minimum';
  
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
  bottomOverhangChamferAngle: number;  // Angle in degrees for bottom overhang chamfer (45 = standard)
  
  // Feet options
  feetCornerRadius: number;
  footBottomCornerRadius: number;  // Corner radius of the bottom of the foot (independent from top)
  gridSize: number;  // Grid unit size in mm (standard is 42mm)
  
  // Foot chamfer - simple angle and height controls
  footChamferAngle: number;   // Angle in degrees (45 = standard, higher = steeper)
  footChamferHeight: number;  // Total height of the chamfered foot in mm
  
  // Lip chamfer - angle and height controls (syncs with foot chamfer)
  lipChamferAngle: number;   // Angle in degrees (45 = standard, higher = steeper)
  lipChamferHeight: number;  // Total height of the lip chamfer in mm
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
  socketBottomCornerRadius: number;  // Corner radius of the bottom of the socket (syncs with foot bottom corner radius)
  syncSocketWithFoot: boolean;  // Auto-sync socket dimensions with foot dimensions
  
  // Printer bed splitting - split large baseplates into printable segments
  splitEnabled: boolean;
  printerBedWidth: number;      // Printer bed width in mm
  printerBedDepth: number;      // Printer bed depth in mm
  connectorEnabled: boolean;    // Add interlocking edges between segments
  connectorTolerance: number;   // Clearance for connector fit (default 0.3mm for FDM)
  
  // Edge pattern for interlocking segments (male/female teeth extruded vertically)
  // Standard patterns: dovetail, rectangular, triangular, puzzle, tslot
  // Smooth patterns (3D-print friendly with filleted corners): puzzle_smooth, tslot_smooth, wineglass
  edgePattern: 'dovetail' | 'rectangular' | 'triangular' | 'puzzle' | 'tslot' | 'puzzle_smooth' | 'tslot_smooth' | 'wineglass';
  toothDepth: number;           // Overall height of the tooth (mm) - stretches/compresses the shape
  toothWidth: number;           // Width of each tooth at base (mm)
  concaveDepth: number;         // How deep the concave swoop curves inward (0-100%, default 50%)
  wineglassAspectRatio: number; // Aspect ratio for wineglass bulb (0.5-2.0, 1.0=circular, <1.0=taller, >1.0=wider)
  connectorRoofIntensity: number; // Peak intensity for connector roof (0-200%, 0=flat, 100=standard peak, 200=maximum intensity)
  connectorRoofDepth: number;  // How far down from top the roof starts (0-100%, 0=roof at top, 100=roof at base)
  
  // Custom edge overrides (optional - overrides automatic male/female assignment)
  edgeOverrides: SegmentEdgeOverride[];
}

// Default configurations
export const defaultBoxConfig: BoxConfig = {
  width: 2,
  depth: 2,
  height: 3,
  wallThickness: 1.5,
  floorThickness: 0.7,
  innerEdgeBevel: true,
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
  dividerHeight: 100,
  dividerFloorBevel: false,
  lipStyle: 'perfect_fit',
  flatBase: 'off',
  efficientFloor: 'off',
  taperedCorner: 'none',
  taperedCornerSize: 10,
  wallPattern: 'none',
  wallPatternSpacing: 2,
  cornerRadius: 4,
  preventBottomOverhangs: true,
  bottomOverhangChamferAngle: 60,
  feetCornerRadius: 3.75,
  footBottomCornerRadius: 6,
  gridSize: 42,
  footChamferAngle: 60,
  footChamferHeight: 5,
  lipChamferAngle: 60,
  lipChamferHeight: 5
};

export const defaultBaseplateConfig: BaseplateConfig = {
  sizingMode: 'fill_area_mm',
  width: 8,
  depth: 8,
  targetWidthMm: 130,
  targetDepthMm: 130,
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
  cornerRadius: 8,
  cornerSegments: 32,
  gridSize: 42,
  socketChamferAngle: 60,
  socketChamferHeight: 5,
  socketBottomCornerRadius: 6,
  syncSocketWithFoot: true,
  splitEnabled: false,
  printerBedWidth: 220,
  printerBedDepth: 210,
  connectorEnabled: true,
  connectorTolerance: 0.3,
  edgePattern: 'wineglass',
  toothDepth: 5,
  toothWidth: 5,
  concaveDepth: 0,
  wineglassAspectRatio: 1.3,
  connectorRoofIntensity: 200,
  connectorRoofDepth: 0,
  edgeOverrides: []
};

// Generation result type
export interface GenerationResult {
  stlUrl: string;
  scadContent: string;
  filename: string;
}

// Edge type for interlocking
export type EdgeType = 'none' | 'male' | 'female';

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
  paddingNearX: number;          // Padding on left edge (mm) - only for first segment in X
  paddingFarX: number;           // Padding on right edge (mm) - only for last segment in X
  paddingNearY: number;          // Padding on front edge (mm) - only for first segment in Y
  paddingFarY: number;           // Padding on back edge (mm) - only for last segment in Y
}

// Custom edge settings for a segment (overrides automatic male/female assignment)
export interface SegmentEdgeOverride {
  segmentX: number;
  segmentY: number;
  leftEdge: EdgeType;           // Left edge: none, male, or female
  rightEdge: EdgeType;          // Right edge: none, male, or female
  frontEdge: EdgeType;          // Front edge: none, male, or female
  backEdge: EdgeType;           // Back edge: none, male, or female
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

// Segment generation result (extends GenerationResult with position info)
export interface SegmentGenerationResult extends GenerationResult {
  segmentX: number;
  segmentY: number;
}

// Multi-segment generation result
export interface MultiSegmentResult {
  segments: SegmentGenerationResult[];
  connector: GenerationResult | null;
  splitInfo: SplitResult;
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
  connectorEnabled: boolean,
  actualGridUnitsX?: number,
  actualGridUnitsY?: number,
  gridCoverageMmX?: number,
  gridCoverageMmY?: number,
  paddingNearX?: number,
  paddingFarX?: number,
  paddingNearY?: number,
  paddingFarY?: number
): SplitResult {
  // #region agent log
  console.log(JSON.stringify({
    location: 'splitBaseplateForPrinter:entry',
    message: 'Split calculation entry',
    data: {
      totalGridUnitsX, totalGridUnitsY, printerBedWidth, printerBedDepth, gridSize,
      actualGridUnitsX, actualGridUnitsY, gridCoverageMmX, gridCoverageMmY,
      paddingNearX, paddingFarX, paddingNearY, paddingFarY
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'A,B,C,D'
  }));
  // #endregion
  
  // Use actual grid units from calculateGridFromMm if provided (accounts for half cells)
  // Otherwise fall back to the floored totalGridUnits values
  const effectiveGridUnitsX = actualGridUnitsX !== undefined ? actualGridUnitsX : totalGridUnitsX;
  const effectiveGridUnitsY = actualGridUnitsY !== undefined ? actualGridUnitsY : totalGridUnitsY;
  
  // Calculate grid coverage in mm (grid units * gridSize)
  // This is what we need to fit on the bed, not the targetWidthMm which includes padding
  const effectiveGridCoverageMmX = gridCoverageMmX !== undefined 
    ? gridCoverageMmX 
    : effectiveGridUnitsX * gridSize;
  const effectiveGridCoverageMmY = gridCoverageMmY !== undefined 
    ? gridCoverageMmY 
    : effectiveGridUnitsY * gridSize;
  
  // Check if grid coverage exceeds printer bed size
  // This is the correct check - we need to fit the grid coverage, not the total target size
  const gridCoverageExceedsBedX = effectiveGridCoverageMmX > printerBedWidth;
  const gridCoverageExceedsBedY = effectiveGridCoverageMmY > printerBedDepth;
  
  // Calculate max grid units that fit on the printer bed
  // CRITICAL FIX: Account for padding on both first and last segments
  // First segment has paddingNearX, last segment has paddingFarX (at least 0.5mm closing wall)
  // We need to ensure segments fit even with padding, so we need to reserve space for both
  const minWallThickness = 0.5;
  // Estimate max padding: use actual padding if provided, otherwise assume worst case
  // For first segment: use paddingNearX if provided, otherwise 0
  // For last segment: use paddingFarX if provided, otherwise minWallThickness
  const estimatedPaddingNearX = paddingNearX !== undefined ? paddingNearX : 0;
  const estimatedPaddingFarX = paddingFarX !== undefined ? Math.max(paddingFarX, minWallThickness) : minWallThickness;
  const estimatedPaddingNearY = paddingNearY !== undefined ? paddingNearY : 0;
  const estimatedPaddingFarY = paddingFarY !== undefined ? Math.max(paddingFarY, minWallThickness) : minWallThickness;
  
  // Reserve space for padding: worst case is when a segment has both (first segment has near, last has far)
  // But segments are split, so each segment only has one type of padding
  // For non-first, non-last segments: no padding
  // For first segment: has near padding
  // For last segment: has far padding
  // So we need to account for the maximum of near or far padding
  const maxPaddingX = Math.max(estimatedPaddingNearX, estimatedPaddingFarX);
  const maxPaddingY = Math.max(estimatedPaddingNearY, estimatedPaddingFarY);
  
  const maxSegmentUnitsX = Math.floor((printerBedWidth - maxPaddingX) / gridSize);
  const maxSegmentUnitsY = Math.floor((printerBedDepth - maxPaddingY) / gridSize);
  
  // Ensure at least 1 unit can fit
  const safeMaxSegmentUnitsX = Math.max(1, maxSegmentUnitsX);
  const safeMaxSegmentUnitsY = Math.max(1, maxSegmentUnitsY);
  
  // Calculate number of segments needed based on actual grid units
  let segmentsX = Math.ceil(effectiveGridUnitsX / safeMaxSegmentUnitsX);
  let segmentsY = Math.ceil(effectiveGridUnitsY / safeMaxSegmentUnitsY);
  
  // #region agent log
  console.log(JSON.stringify({
    location: 'splitBaseplateForPrinter:initial-calc',
    message: 'Initial split calculation',
    data: {
      effectiveGridUnitsX, effectiveGridUnitsY, effectiveGridCoverageMmX, effectiveGridCoverageMmY,
      gridCoverageExceedsBedX, gridCoverageExceedsBedY, maxSegmentUnitsX, maxSegmentUnitsY, safeMaxSegmentUnitsX, safeMaxSegmentUnitsY,
      segmentsX, segmentsY
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'C,D'
  }));
  // #endregion
  
  // If grid coverage exceeds bed size, ensure we split even if grid units suggest otherwise
  // This handles edge cases where rounding might suggest no split is needed
  if (gridCoverageExceedsBedX && segmentsX === 1) {
    segmentsX = Math.ceil(effectiveGridUnitsX / safeMaxSegmentUnitsX);
  }
  
  if (gridCoverageExceedsBedY && segmentsY === 1) {
    segmentsY = Math.ceil(effectiveGridUnitsY / safeMaxSegmentUnitsY);
  }
  
  // Check if splitting is needed
  const needsSplit = segmentsX > 1 || segmentsY > 1;
  
  // Generate segment info
  const segments: SegmentInfo[][] = [];
  
  for (let sy = 0; sy < segmentsY; sy++) {
    const row: SegmentInfo[] = [];
    for (let sx = 0; sx < segmentsX; sx++) {
      // Calculate grid units for this segment
      const startX = sx * safeMaxSegmentUnitsX;
      const startY = sy * safeMaxSegmentUnitsY;
      
      // Calculate segment boundaries using actual grid units
      let endX: number;
      let endY: number;
      
      if (sx === segmentsX - 1) {
        // Last segment in X: use the full effective grid units (may include fractional part for half cells)
        endX = effectiveGridUnitsX;
      } else {
        endX = Math.min(startX + safeMaxSegmentUnitsX, effectiveGridUnitsX);
      }
      
      if (sy === segmentsY - 1) {
        // Last segment in Y: use the full effective grid units (may include fractional part for half cells)
        endY = effectiveGridUnitsY;
      } else {
        endY = Math.min(startY + safeMaxSegmentUnitsY, effectiveGridUnitsY);
      }
      
      // Calculate grid units for this segment
      // Use the exact difference to preserve fractional parts (for half cells)
      // For non-last segments: use floor to ensure they fit on the bed
      // For the last segment: use the exact value to preserve half cells
      let gridUnitsX: number;
      let gridUnitsY: number;
      
      if (sx === segmentsX - 1) {
        // Last segment: preserve exact value (may be fractional for half cells)
        gridUnitsX = endX - startX;
      } else {
        // Non-last segments: floor to ensure they fit on the bed
        gridUnitsX = Math.floor(endX - startX);
      }
      
      if (sy === segmentsY - 1) {
        // Last segment: preserve exact value (may be fractional for half cells)
        gridUnitsY = endY - startY;
      } else {
        // Non-last segments: floor to ensure they fit on the bed
        gridUnitsY = Math.floor(endY - startY);
      }
      
      // Ensure each segment has at least 0.5 grid units (to allow half cells)
      // But if we have a very small remainder, ensure at least 0.5
      if (gridUnitsX < 0.5 && sx === segmentsX - 1) {
        gridUnitsX = 0.5; // Minimum half cell
      } else if (gridUnitsX < 1 && sx !== segmentsX - 1) {
        gridUnitsX = 1; // Non-last segments must be at least 1 full unit
      }
      
      if (gridUnitsY < 0.5 && sy === segmentsY - 1) {
        gridUnitsY = 0.5; // Minimum half cell
      } else if (gridUnitsY < 1 && sy !== segmentsY - 1) {
        gridUnitsY = 1; // Non-last segments must be at least 1 full unit
      }
      
      // Determine connector positions (only on internal edges between segments)
      const hasConnectorLeft = connectorEnabled && sx > 0;
      const hasConnectorRight = connectorEnabled && sx < segmentsX - 1;
      const hasConnectorFront = connectorEnabled && sy > 0;
      const hasConnectorBack = connectorEnabled && sy < segmentsY - 1;
      
      // Assign padding based on segment position
      // Padding is only on outer edges of the first/last segments
      let segmentPaddingNearX = (sx === 0 && paddingNearX !== undefined) ? paddingNearX : 0;
      let segmentPaddingFarX = (sx === segmentsX - 1 && paddingFarX !== undefined) ? paddingFarX : 0;
      let segmentPaddingNearY = (sy === 0 && paddingNearY !== undefined) ? paddingNearY : 0;
      let segmentPaddingFarY = (sy === segmentsY - 1 && paddingFarY !== undefined) ? paddingFarY : 0;
      
      // CRITICAL FIX: Last segment must always have a closing wall, even if padding was 0
      // This ensures the grid is properly closed on the far edge
      // Minimum wall thickness to ensure border is closed (similar to clearance between cells)
      // IMPORTANT: Only add minWallThickness if original padding was 0, to preserve total size
      const minWallThickness = 0.5;
      if (sx === segmentsX - 1) {
        // Last segment in X: ensure at least minWallThickness padding to create closing wall
        // But only if original padding was 0 (to avoid increasing total size)
        const originalPaddingFarX = paddingFarX !== undefined ? paddingFarX : 0;
        if (originalPaddingFarX < minWallThickness) {
          // Original padding was too small, add minimum wall
          segmentPaddingFarX = minWallThickness;
        }
        // Otherwise, use the original padding (which is already >= minWallThickness or we want to preserve exact size)
      }
      if (sy === segmentsY - 1) {
        // Last segment in Y: ensure at least minWallThickness padding to create closing wall
        // But only if original padding was 0 (to avoid increasing total size)
        const originalPaddingFarY = paddingFarY !== undefined ? paddingFarY : 0;
        if (originalPaddingFarY < minWallThickness) {
          // Original padding was too small, add minimum wall
          segmentPaddingFarY = minWallThickness;
        }
        // Otherwise, use the original padding (which is already >= minWallThickness or we want to preserve exact size)
      }
      
      // #region agent log
      const segmentWidthMm = gridUnitsX * gridSize + segmentPaddingNearX + segmentPaddingFarX;
      const segmentDepthMm = gridUnitsY * gridSize + segmentPaddingNearY + segmentPaddingFarY;
      const hasHalfCellX = gridUnitsX - Math.floor(gridUnitsX) >= 0.5;
      const hasHalfCellY = gridUnitsY - Math.floor(gridUnitsY) >= 0.5;
      const isLastX = sx === segmentsX - 1;
      const isLastY = sy === segmentsY - 1;
      const exceedsBedX = segmentWidthMm > printerBedWidth;
      const exceedsBedY = segmentDepthMm > printerBedDepth;
      
      // Validate segment fits on bed
      if (exceedsBedX || exceedsBedY) {
        console.error(JSON.stringify({
          location: 'splitBaseplateForPrinter:segment:ERROR',
          message: `Segment [${sx}, ${sy}] EXCEEDS BED SIZE!`,
          data: {
            sx, sy, segmentWidthMm, segmentDepthMm, printerBedWidth, printerBedDepth,
            gridUnitsX, gridUnitsY, segmentPaddingNearX, segmentPaddingFarX,
            segmentPaddingNearY, segmentPaddingFarY, exceedsBedX, exceedsBedY
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'C'
        }));
      }
      
      console.log(JSON.stringify({
        location: 'splitBaseplateForPrinter:segment',
        message: `Segment [${sx}, ${sy}] calculation`,
        data: {
          sx, sy, startX, startY, endX, endY, gridUnitsX, gridUnitsY,
          segmentPaddingNearX, segmentPaddingFarX, segmentPaddingNearY, segmentPaddingFarY,
          segmentWidthMm, segmentDepthMm, hasHalfCellX, hasHalfCellY,
          isLastX, isLastY, exceedsBedX, exceedsBedY,
          originalPaddingFarX: (isLastX && paddingFarX !== undefined) ? paddingFarX : 0,
          originalPaddingFarY: (isLastY && paddingFarY !== undefined) ? paddingFarY : 0,
          wallAddedX: isLastX && segmentPaddingFarX >= minWallThickness,
          wallAddedY: isLastY && segmentPaddingFarY >= minWallThickness,
          wallThicknessX: segmentPaddingFarX,
          wallThicknessY: segmentPaddingFarY
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A,B,C'
      }));
      // #endregion
      
      row.push({
        segmentX: sx,
        segmentY: sy,
        gridUnitsX,
        gridUnitsY,
        hasConnectorLeft,
        hasConnectorRight,
        hasConnectorFront,
        hasConnectorBack,
        paddingNearX: segmentPaddingNearX,
        paddingFarX: segmentPaddingFarX,
        paddingNearY: segmentPaddingNearY,
        paddingFarY: segmentPaddingFarY
      });
    }
    segments.push(row);
  }
  
  // Validate total size matches expected (for fill_area_mm mode)
  if (paddingNearX !== undefined && paddingFarX !== undefined && 
      paddingNearY !== undefined && paddingFarY !== undefined &&
      gridCoverageMmX !== undefined && gridCoverageMmY !== undefined) {
    // Calculate total size from segments
    let totalWidthMm = 0;
    let totalDepthMm = 0;
    
    // Sum up all segments in X direction (use first row)
    for (let sx = 0; sx < segmentsX; sx++) {
      const segment = segments[0][sx];
      totalWidthMm += segment.gridUnitsX * gridSize;
      if (sx === 0) totalWidthMm += segment.paddingNearX;
      if (sx === segmentsX - 1) totalWidthMm += segment.paddingFarX;
    }
    
    // Sum up all segments in Y direction (use first column)
    for (let sy = 0; sy < segmentsY; sy++) {
      const segment = segments[sy][0];
      totalDepthMm += segment.gridUnitsY * gridSize;
      if (sy === 0) totalDepthMm += segment.paddingNearY;
      if (sy === segmentsY - 1) totalDepthMm += segment.paddingFarY;
    }
    
    const expectedWidthMm = gridCoverageMmX + paddingNearX + paddingFarX;
    const expectedDepthMm = gridCoverageMmY + paddingNearY + paddingFarY;
    
    // #region agent log
    console.log(JSON.stringify({
      location: 'splitBaseplateForPrinter:total-size-validation',
      message: 'Total size validation',
      data: {
        totalWidthMm, totalDepthMm, expectedWidthMm, expectedDepthMm,
        gridCoverageMmX, gridCoverageMmY, paddingNearX, paddingFarX, paddingNearY, paddingFarY,
        widthMatches: Math.abs(totalWidthMm - expectedWidthMm) < 0.01,
        depthMatches: Math.abs(totalDepthMm - expectedDepthMm) < 0.01
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'C'
    }));
    // #endregion
  }
  
  return {
    segments,
    segmentsX,
    segmentsY,
    totalSegments: segmentsX * segmentsY,
    maxSegmentUnitsX: safeMaxSegmentUnitsX,
    maxSegmentUnitsY: safeMaxSegmentUnitsY,
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
  // #region agent log
  console.log(JSON.stringify({
    location: 'calculateGridFromMm:entry',
    message: 'Grid calculation entry',
    data: { targetWidthMm, targetDepthMm, gridSize, allowHalfCellsX, allowHalfCellsY, paddingAlignment },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'B'
  }));
  // #endregion
  
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
  // For "center" alignment, ensure exact equality by calculating one side and using remainder for the other
  let paddingNearX: number, paddingFarX: number;
  let paddingNearY: number, paddingFarY: number;
  
  if (paddingAlignment === 'center') {
    // Calculate one side precisely, then the other as remainder to ensure exact equality
    // Round to 3 decimal places for precision, then calculate remainder
    paddingNearX = Math.round((totalPaddingX / 2) * 1000) / 1000;
    paddingFarX = totalPaddingX - paddingNearX; // Ensure exact equality: paddingNearX + paddingFarX = totalPaddingX
    
    paddingNearY = Math.round((totalPaddingY / 2) * 1000) / 1000;
    paddingFarY = totalPaddingY - paddingNearY; // Ensure exact equality: paddingNearY + paddingFarY = totalPaddingY
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
  
  // #region agent log
  console.log(JSON.stringify({
    location: 'calculateGridFromMm:result',
    message: 'Grid calculation result',
    data: {
      fullCellsX, fullCellsY, remainderX, remainderY, halfSize,
      hasHalfCellX, hasHalfCellY, gridUnitsX, gridUnitsY,
      gridCoverageMmX, gridCoverageMmY, totalPaddingX, totalPaddingY,
      paddingNearX, paddingFarX, paddingNearY, paddingFarY, paddingAlignment
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'B'
  }));
  // #endregion
  
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
 * Normalize/migrate a BoxConfig to ensure all fields are present with defaults.
 * This provides backwards compatibility when loading old configs that may be missing new fields.
 */
export function normalizeBoxConfig(config: Partial<BoxConfig> | null): BoxConfig {
  if (!config) {
    return defaultBoxConfig;
  }
  // Migrate old parameter names to new one for backwards compatibility
  const migratedConfig: any = { ...config };
  // Migrate innerWallFloorRadius (number) to innerEdgeBevel (boolean)
  if ('innerWallFloorRadius' in config && !('innerEdgeBevel' in config)) {
    // If old value was > 0, enable bevel; otherwise disable
    migratedConfig.innerEdgeBevel = (config as any).innerWallFloorRadius > 0;
    delete migratedConfig.innerWallFloorRadius;
  }
  // Remove old innerEdgeBevelSegments if present (no longer needed)
  if ('innerEdgeBevelSegments' in migratedConfig) {
    delete migratedConfig.innerEdgeBevelSegments;
  }
  // Merge with defaults to ensure all fields are present
  return { ...defaultBoxConfig, ...migratedConfig };
}

/**
 * Normalize/migrate a BaseplateConfig to ensure all fields are present with defaults.
 * This provides backwards compatibility when loading old configs that may be missing new fields.
 */
export function normalizeBaseplateConfig(config: Partial<BaseplateConfig> | null): BaseplateConfig {
  if (!config) {
    return defaultBaseplateConfig;
  }
  // Merge with defaults to ensure all fields are present
  return { ...defaultBaseplateConfig, ...config };
}
