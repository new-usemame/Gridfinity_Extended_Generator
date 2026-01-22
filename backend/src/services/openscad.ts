import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BoxConfig, BaseplateConfig, calculateGridFromMm, splitBaseplateForPrinter, SegmentInfo, SplitResult, EdgeType, SegmentEdgeOverride } from '../types/config.js';
export { SplitResult, SegmentInfo, EdgeType, SegmentEdgeOverride } from '../types/config.js';

const execAsync = promisify(exec);

// Result type for multi-segment generation
export interface MultiSegmentResult {
  segments: Array<{ stlUrl: string; scadContent: string; filename: string; segmentX: number; segmentY: number }>;
  connector: { stlUrl: string; scadContent: string; filename: string } | null;
  splitInfo: SplitResult;
}

export class OpenSCADService {
  private outputPath: string;

  constructor() {
    this.outputPath = path.join(process.cwd(), 'generated');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
  }

  // Generate Box STL
  async generateBox(config: BoxConfig): Promise<{ stlUrl: string; scadContent: string; filename: string }> {
    const scadContent = this.generateBoxScad(config);
    return this.renderScad(scadContent, 'box');
  }

  // Generate Baseplate STL
  async generateBaseplate(config: BaseplateConfig): Promise<{ stlUrl: string; scadContent: string; filename: string }> {
    const scadContent = this.generateBaseplateScad(config);
    return this.renderScad(scadContent, 'baseplate');
  }

  // Generate multi-segment baseplate with connectors
  async generateBaseplateSegments(config: BaseplateConfig): Promise<MultiSegmentResult> {
    // Use longer timeout for combined preview (large models can take 5+ minutes)
    // Calculate total grid units based on sizing mode
    let totalGridUnitsX: number;
    let totalGridUnitsY: number;
    
    let actualWidthMm: number | undefined;
    let actualDepthMm: number | undefined;
    
    let actualGridUnitsX: number | undefined;
    let actualGridUnitsY: number | undefined;
    let gridCoverageMmX: number | undefined;
    let gridCoverageMmY: number | undefined;
    let paddingNearX: number | undefined;
    let paddingFarX: number | undefined;
    let paddingNearY: number | undefined;
    let paddingFarY: number | undefined;
    
    if (config.sizingMode === 'fill_area_mm') {
      const calc = calculateGridFromMm(
        config.targetWidthMm,
        config.targetDepthMm,
        config.gridSize,
        config.allowHalfCellsX,
        config.allowHalfCellsY,
        config.paddingAlignment
      );
      // Use floored values for totalGridUnits (for backwards compatibility)
      totalGridUnitsX = Math.floor(calc.gridUnitsX);
      totalGridUnitsY = Math.floor(calc.gridUnitsY);
      // Pass actual grid units from calculateGridFromMm (accounts for half cells)
      actualGridUnitsX = calc.gridUnitsX;
      actualGridUnitsY = calc.gridUnitsY;
      // Pass grid coverage (what needs to fit on the bed, excluding padding)
      gridCoverageMmX = calc.gridCoverageMmX;
      gridCoverageMmY = calc.gridCoverageMmY;
      // Pass padding values for distribution across segments
      paddingNearX = calc.paddingNearX;
      paddingFarX = calc.paddingFarX;
      paddingNearY = calc.paddingNearY;
      paddingFarY = calc.paddingFarY;
    } else {
      totalGridUnitsX = Math.floor(config.width);
      totalGridUnitsY = Math.floor(config.depth);
      // In grid_units mode, grid units are exact and coverage is units * gridSize
      actualGridUnitsX = config.width;
      actualGridUnitsY = config.depth;
      gridCoverageMmX = config.width * config.gridSize;
      gridCoverageMmY = config.depth * config.gridSize;
      // No padding in grid_units mode
      paddingNearX = 0;
      paddingFarX = 0;
      paddingNearY = 0;
      paddingFarY = 0;
    }

    // Calculate split
    const splitInfo = splitBaseplateForPrinter(
      totalGridUnitsX,
      totalGridUnitsY,
      config.printerBedWidth,
      config.printerBedDepth,
      config.gridSize,
      config.connectorEnabled,
      actualGridUnitsX,
      actualGridUnitsY,
      gridCoverageMmX,
      gridCoverageMmY,
      paddingNearX,
      paddingFarX,
      paddingNearY,
      paddingFarY
    );

    // Generate a combined preview SCAD (faster - single render)
    const combinedScad = this.generateCombinedPreviewScad(config, splitInfo);
    // Use 10 minute timeout for large combined previews
    const combinedResult = await this.renderScad(combinedScad, 'baseplate_preview', 600000);
    
    // Create segment entries for the combined result
    // Each segment gets the same STL URL (combined preview) but different position info
    const segments: Array<{ stlUrl: string; scadContent: string; filename: string; segmentX: number; segmentY: number }> = [];
    
    for (let sy = 0; sy < splitInfo.segmentsY; sy++) {
      for (let sx = 0; sx < splitInfo.segmentsX; sx++) {
        const segmentInfo = splitInfo.segments[sy][sx];
        const segmentScad = this.generateSegmentScad(config, segmentInfo);
        segments.push({
          stlUrl: combinedResult.stlUrl, // Use combined preview for display
          scadContent: segmentScad,       // But keep individual SCAD for download
          filename: `baseplate_segment_${sx}_${sy}.stl`,
          segmentX: sx,
          segmentY: sy
        });
      }
    }

    // Note: No separate connector piece needed - male/female edges are integrated into segments
    return { segments, connector: null, splitInfo };
  }

  // Generate combined preview showing all segments laid out together
  generateCombinedPreviewScad(config: BaseplateConfig, splitInfo: SplitResult): string {
    const gridSize = config.gridSize;
    const gap = 5; // Gap between segments in mm (small gap to show teeth)
    const edgePattern = config.edgePattern;
    
    let segmentPlacements = '';
    const edgeOverrides = config.edgeOverrides || [];
    
    // Generate each segment placement with edge types
    for (let sy = 0; sy < splitInfo.segmentsY; sy++) {
      for (let sx = 0; sx < splitInfo.segmentsX; sx++) {
        const segment = splitInfo.segments[sy][sx];
        
        // Get edge types (with override support)
        const leftEdge = this.getEdgeType(segment, 'left', edgeOverrides);
        const rightEdge = this.getEdgeType(segment, 'right', edgeOverrides);
        const frontEdge = this.getEdgeType(segment, 'front', edgeOverrides);
        const backEdge = this.getEdgeType(segment, 'back', edgeOverrides);
        
        // Calculate position with gap
        // Account for padding when calculating positions - padding affects segment width/depth
        let posX = 0;
        let posY = 0;
        
        for (let i = 0; i < sx; i++) {
          const prevSegment = splitInfo.segments[sy][i];
          const prevSegmentWidth = prevSegment.gridUnitsX * gridSize + (prevSegment.paddingNearX || 0) + (prevSegment.paddingFarX || 0);
          posX += prevSegmentWidth + gap;
        }
        for (let i = 0; i < sy; i++) {
          const prevSegment = splitInfo.segments[i][sx];
          const prevSegmentDepth = prevSegment.gridUnitsY * gridSize + (prevSegment.paddingNearY || 0) + (prevSegment.paddingFarY || 0);
          posY += prevSegmentDepth + gap;
        }
        
        // Get padding values for this segment (validate they're numbers)
        let paddingNearX = (typeof segment.paddingNearX === 'number' && !isNaN(segment.paddingNearX)) ? segment.paddingNearX : 0;
        let paddingFarX = (typeof segment.paddingFarX === 'number' && !isNaN(segment.paddingFarX)) ? segment.paddingFarX : 0;
        let paddingNearY = (typeof segment.paddingNearY === 'number' && !isNaN(segment.paddingNearY)) ? segment.paddingNearY : 0;
        let paddingFarY = (typeof segment.paddingFarY === 'number' && !isNaN(segment.paddingFarY)) ? segment.paddingFarY : 0;
        
        // CRITICAL: Last segment must always have a closing wall, even if no half cell
        // Also ensure padding when half cells are present on the far edge
        const minWallThickness = 0.5;
        // Use > 0.49 instead of >= 0.5 to account for floating point precision errors
        const fractionalX = segment.gridUnitsX - Math.floor(segment.gridUnitsX);
        const fractionalY = segment.gridUnitsY - Math.floor(segment.gridUnitsY);
        const hasHalfCellX = fractionalX > 0.49;
        const hasHalfCellY = fractionalY > 0.49;
        const isLastSegmentX = sx === splitInfo.segmentsX - 1;
        const isLastSegmentY = sy === splitInfo.segmentsY - 1;
        
        
        // CRITICAL FIX: First and last segments must always have closing walls, regardless of half cells
        // First segment in X: ensure closing wall on near edge (X=0)
        const isFirstSegmentX = sx === 0;
        if (isFirstSegmentX) {
          paddingNearX = Math.max(paddingNearX, minWallThickness);
        } else if (hasHalfCellX) {
          // CRITICAL FIX: Non-first segments with half cells need closing wall on NEAR edge too
          // If gridUnitsX has a fractional part (e.g., 0.5), the half cell starts at X=0 (near edge)
          // So we need padding on the near edge to create the closing wall
          paddingNearX = Math.max(paddingNearX, minWallThickness);
        }
        // Last segment in X: ensure closing wall on far edge
        if (isLastSegmentX) {
          paddingFarX = Math.max(paddingFarX, minWallThickness);
        } else if (hasHalfCellX) {
          // Non-last segments with half cells also need closing wall on far edge
          paddingFarX = Math.max(paddingFarX, minWallThickness);
        }
        // First segment in Y: ensure closing wall on near edge (Y=0)
        const isFirstSegmentY = sy === 0;
        if (isFirstSegmentY) {
          paddingNearY = Math.max(paddingNearY, minWallThickness);
        } else if (hasHalfCellY) {
          // CRITICAL FIX: Non-first segments with half cells need closing wall on NEAR edge too
          // If gridUnitsY has a fractional part (e.g., 0.5), the half cell starts at Y=0 (near edge)
          // So we need padding on the near edge to create the closing wall
          paddingNearY = Math.max(paddingNearY, minWallThickness);
        }
        // Last segment in Y: ensure closing wall on far edge
        if (isLastSegmentY) {
          paddingFarY = Math.max(paddingFarY, minWallThickness);
        } else if (hasHalfCellY) {
          // Non-last segments with half cells also need closing wall on far edge
          paddingFarY = Math.max(paddingFarY, minWallThickness);
        }
        
        // CRITICAL FIX: Remove padding on edges with connectors - connectors need zero padding to expose the cutouts
        // LEFT edge has connector (female) -> remove paddingNearX
        // FRONT edge has connector (female) -> remove paddingNearY
        // RIGHT edge has connector (male) -> remove paddingFarX
        // BACK edge has connector (male) -> remove paddingFarY
        if (segment.hasConnectorLeft) {
          paddingNearX = 0;  // LEFT edge has female connector - remove wall
        }
        if (segment.hasConnectorFront) {
          paddingNearY = 0;  // FRONT edge has female connector - remove wall
        }
        if (segment.hasConnectorRight) {
          paddingFarX = 0;  // RIGHT edge has male connector - remove wall
        }
        if (segment.hasConnectorBack) {
          paddingFarY = 0;  // BACK edge has male connector - remove wall
        }
        
        // Validate segment dimensions
        const segmentWidth = segment.gridUnitsX * gridSize + paddingNearX + paddingFarX;
        const segmentDepth = segment.gridUnitsY * gridSize + paddingNearY + paddingFarY;
        if (segmentWidth <= 0 || segmentWidth > 10000 || segmentDepth <= 0 || segmentDepth > 10000) {
          throw new Error(`Invalid segment dimensions for [${sx}, ${sy}]: ${segmentWidth}mm x ${segmentDepth}mm`);
        }
        
        
        segmentPlacements += `
    // Segment [${sx}, ${sy}]
    translate([${posX}, ${posY}, 0])
    segment_base(${segment.gridUnitsX}, ${segment.gridUnitsY}, "${leftEdge}", "${rightEdge}", "${frontEdge}", "${backEdge}", ${paddingNearX.toFixed(2)}, ${paddingFarX.toFixed(2)}, ${paddingNearY.toFixed(2)}, ${paddingFarY.toFixed(2)});
`;
      }
    }
    
    // Get edge pattern modules
    const edgePatternModules = this.generateEdgePatternModules(config);
    
    return `// Gridfinity Baseplate - Combined Preview
// Shows all ${splitInfo.totalSegments} segments laid out with ${gap}mm gaps
// Edge pattern: ${edgePattern}
// This is a preview - download individual segments for printing

/* [Configuration] */
grid_unit = ${gridSize};
corner_radius = ${config.cornerRadius};
socket_chamfer_angle = ${config.socketChamferAngle};
socket_chamfer_height = ${config.socketChamferHeight};
socket_bottom_corner_radius = ${config.socketBottomCornerRadius};
edge_pattern = "${edgePattern}";
style = "${config.style}";
magnet_diameter = ${config.magnetDiameter};
magnet_depth = ${config.magnetDepth};
remove_bottom_taper = ${config.removeBottomTaper};

/* [Constants] */
clearance = 0.25;
socket_taper_height = socket_chamfer_height;
socket_bottom_inset = socket_chamfer_height / tan(socket_chamfer_angle);
plate_height = socket_taper_height;

$fn = 24; // Lower for faster preview

${edgePatternModules}

// Render all segments
${segmentPlacements}

// Parametric segment module with male/female interlocking edges
// Edge types: "none", "male", "female"
module segment_base(width_units, depth_units, left_edge, right_edge, front_edge, back_edge, padding_near_x = 0, padding_far_x = 0, padding_near_y = 0, padding_far_y = 0) {
    // Grid coverage (actual grid area)
    grid_width = width_units * grid_unit;
    grid_depth = depth_units * grid_unit;
    
    // Total plate size (grid + padding) - using same pattern as non-split baseplate
    // This matches: plate_width = use_fill_mode ? outer_width_mm : grid_width
    // CRITICAL: When half cells are present on the far edge, padding_far_x/y passed to this module
    // are guaranteed to be at least 0.5mm to ensure the plate extends beyond half cells
    // This creates the closing wall that runs along the entire Y axis (depth) from Y=0 to Y=depth
    outer_width_mm = grid_width + padding_near_x + padding_far_x;
    outer_depth_mm = grid_depth + padding_near_y + padding_far_y;
    use_fill_mode = (padding_near_x + padding_far_x + padding_near_y + padding_far_y) > 0;
    plate_width = use_fill_mode ? outer_width_mm : grid_width;
    plate_depth = use_fill_mode ? outer_depth_mm : grid_depth;
    
    // Grid offset (where the grid starts within the plate)
    // When using fill mode with padding, offset the grid by the near padding amount
    // This positions the grid correctly within the plate for proper centering
    grid_offset_x = use_fill_mode ? padding_near_x : 0;
    grid_offset_y = use_fill_mode ? padding_near_y : 0;
    
    difference() {
        union() {
            // Main plate body
            // CRITICAL: plate_depth = outer_depth_mm = grid_depth + padding_near_y + padding_far_y
            // This creates walls on BOTH near and far edges when padding > 0
            // Near wall: from Y=0 to Y=padding_near_y (grid_offset_y)
            // Far wall: from Y=(grid_offset_y + grid_depth) to Y=plate_depth
            rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
            
            // Right edge teeth (male or female depending on type)
            // Position at grid boundary (using grid offset)
            // COLOR: RED for male, PINK for female
            // COMMENTED OUT FOR TESTING
            // if (right_edge == "male") {
            //     grid_right_edge = grid_offset_x + width_units * grid_unit;
            //     if (depth_units > 1) {
            //         for (i = [1 : max(1, depth_units) - 1]) {
            //             color([1, 0, 0]) translate([grid_right_edge, grid_offset_y + i * grid_unit, 0])
            //             rotate([0, 0, -90])
            //             male_tooth_3d(edge_pattern, plate_height);
            //         }
            //     }
            //     if (depth_units == 1) {
            //         // Single unit - put connectors at corner boundaries (strong edges), not center (weak edge)
            //         color([1, 0, 0]) translate([grid_right_edge, grid_offset_y + 0, 0])
            //         rotate([0, 0, -90])
            //         male_tooth_3d(edge_pattern, plate_height);
            //         color([1, 0, 0]) translate([grid_right_edge, grid_offset_y + grid_unit, 0])
            //         rotate([0, 0, -90])
            //         male_tooth_3d(edge_pattern, plate_height);
            //     }
            // }
            
            // Back edge teeth
            // Position at grid boundary (using grid offset)
            // COLOR: BLUE for male, LIGHT BLUE for female
            // COMMENTED OUT FOR TESTING
            // if (back_edge == "male") {
            //     grid_back_edge = grid_offset_y + depth_units * grid_unit;
            //     if (width_units > 1) {
            //         for (i = [1 : max(1, width_units) - 1]) {
            //             color([0, 0, 1]) translate([grid_offset_x + i * grid_unit, grid_back_edge, 0])
            //             male_tooth_3d(edge_pattern, plate_height);
            //         }
            //     }
            //     if (width_units == 1) {
            //         // Single unit - put connectors at corner boundaries (strong edges), not center (weak edge)
            //         color([0, 0, 1]) translate([grid_offset_x + 0, grid_back_edge, 0])
            //         male_tooth_3d(edge_pattern, plate_height);
            //         color([0, 0, 1]) translate([grid_offset_x + grid_unit, grid_back_edge, 0])
            //         male_tooth_3d(edge_pattern, plate_height);
            //     }
            // }
            
            // Left edge male teeth (if overridden to male)
            // Position at grid boundary (using grid offset) - NOT at plate edge (X=0)
            // CRITICAL: When padding_near_x > 0, the wall extends from X=0 to X=grid_offset_x
            // Teeth must be at the grid boundary (X=grid_offset_x), not at the plate edge
            // COLOR: GREEN for male, LIGHT GREEN for female
            // COMMENTED OUT FOR TESTING
            // if (left_edge == "male") {
            //     if (depth_units > 1) {
            //         for (i = [1 : max(1, depth_units) - 1]) {
            //             color([0, 1, 0]) translate([grid_offset_x, grid_offset_y + i * grid_unit, 0])
            //             rotate([0, 0, -90])
            //             male_tooth_3d(edge_pattern, plate_height);
            //         }
            //     }
            //     if (depth_units == 1) {
            //         // Single unit - put connectors at corner boundaries (strong edges), not center (weak edge)
            //         color([0, 1, 0]) translate([grid_offset_x, grid_offset_y + 0, 0])
            //         rotate([0, 0, -90])
            //         male_tooth_3d(edge_pattern, plate_height);
            //         color([0, 1, 0]) translate([grid_offset_x, grid_offset_y + grid_unit, 0])
            //         rotate([0, 0, -90])
            //         male_tooth_3d(edge_pattern, plate_height);
            //     }
            // }
            
            // Front edge male teeth (if overridden to male)
            // Position at grid boundary (using grid offset) - NOT at plate edge (Y=0)
            // CRITICAL: When padding_near_y > 0, the wall extends from Y=0 to Y=grid_offset_y
            // Teeth must be at the grid boundary (Y=grid_offset_y), not at the plate edge
            // COLOR: YELLOW for male, ORANGE for female
            // COMMENTED OUT FOR TESTING
            // if (front_edge == "male") {
            //     if (width_units > 1) {
            //         for (i = [1 : max(1, width_units) - 1]) {
            //             color([1, 1, 0]) translate([grid_offset_x + i * grid_unit, grid_offset_y, 0])
            //             male_tooth_3d(edge_pattern, plate_height);
            //         }
            //     }
            //     if (width_units == 1) {
            //         // Single unit - put connectors at corner boundaries (strong edges), not center (weak edge)
            //         color([1, 1, 0]) translate([grid_offset_x + 0, grid_offset_y, 0])
            //         male_tooth_3d(edge_pattern, plate_height);
            //         color([1, 1, 0]) translate([grid_offset_x + grid_unit, grid_offset_y, 0])
            //         male_tooth_3d(edge_pattern, plate_height);
            //     }
            // }
        }
        
        // Socket cutouts
        // Handle both full and half cells (same pattern as non-split baseplate)
        // Half cells go on the FAR edge (right/back) at high X, high Y
        full_cells_x = floor(width_units);
        full_cells_y = floor(depth_units);
        has_half_x = width_units - full_cells_x >= 0.5;
        has_half_y = depth_units - full_cells_y >= 0.5;
        half_cell_size = grid_unit / 2;
        
        // Full grid cells - positioned at grid_offset for proper centering
        for (gx = [0:full_cells_x-1]) {
            for (gy = [0:full_cells_y-1]) {
                translate([grid_offset_x + gx * grid_unit, grid_offset_y + gy * grid_unit, 0])
                grid_socket(grid_unit, grid_unit);
            }
        }
        
        // Half cells on X edge (far/right side) - AFTER full cells, at high X values
        // Generate for all Y positions including the half Y row if it exists
        if (has_half_x) {
            // Full Y cells
            for (gy = [0:full_cells_y-1]) {
                translate([grid_offset_x + full_cells_x * grid_unit, grid_offset_y + gy * grid_unit, 0])
                grid_socket(half_cell_size, grid_unit);
            }
            // Half Y row (if it exists) - this creates the corner half cell when both X and Y have half cells
            if (has_half_y) {
                translate([grid_offset_x + full_cells_x * grid_unit, grid_offset_y + full_cells_y * grid_unit, 0])
                grid_socket(half_cell_size, half_cell_size);
            }
        }
        
        // Half cells on Y edge (far/back side) - AFTER full cells, at high Y values
        // Only generate for full X cells (corner is already handled above)
        if (has_half_y) {
            for (gx = [0:full_cells_x-1]) {
                translate([grid_offset_x + gx * grid_unit, grid_offset_y + full_cells_y * grid_unit, 0])
                grid_socket(grid_unit, half_cell_size);
            }
        }
        
        // Left edge cavities
        // Position at grid boundary (using grid offset) - NOT at plate edge (X=0)
        // CRITICAL: When padding_near_x > 0, the wall extends from X=0 to X=grid_offset_x
        // Cavities must be at the grid boundary (X=grid_offset_x), not at the plate edge
        // CRITICAL FIX: Position at grid boundary (same as male teeth) to properly align and remove wall
        // The cavity profile extends inward from the grid boundary, removing the wall between grid and plate edge
        // COLOR: LIGHT GREEN for female
        if (left_edge == "female") {
            if (depth_units > 1) {
                for (i = [1 : max(1, depth_units) - 1]) {
                    color([0.5, 1, 0.5]) translate([grid_offset_x, grid_offset_y + i * grid_unit, 0])
                    rotate([0, 0, -90])
                    female_cavity_3d(edge_pattern, plate_height);
                }
            }
            if (depth_units == 1) {
                // Single unit - put connectors at corner boundaries (strong edges), not center (weak edge)
                color([0.5, 1, 0.5]) translate([grid_offset_x, grid_offset_y + 0, 0])
                rotate([0, 0, -90])
                female_cavity_3d(edge_pattern, plate_height);
                color([0.5, 1, 0.5]) translate([grid_offset_x, grid_offset_y + grid_unit, 0])
                rotate([0, 0, -90])
                female_cavity_3d(edge_pattern, plate_height);
            }
        }
        
        // Front edge cavities
        // Position at grid boundary (using grid offset) - NOT at plate edge (Y=0)
        // CRITICAL: When padding_near_y > 0, the wall extends from Y=0 to Y=grid_offset_y
        // Cavities must be at the grid boundary (Y=grid_offset_y), not at the plate edge
        // COLOR: ORANGE for female
        if (front_edge == "female") {
            if (width_units > 1) {
                for (i = [1 : max(1, width_units) - 1]) {
                    color([1, 0.5, 0]) translate([grid_offset_x + i * grid_unit, grid_offset_y, 0])
                    female_cavity_3d(edge_pattern, plate_height);
                }
            }
            if (width_units == 1) {
                // Single unit - put connectors at corner boundaries (strong edges), not center (weak edge)
                color([1, 0.5, 0]) translate([grid_offset_x + 0, grid_offset_y, 0])
                female_cavity_3d(edge_pattern, plate_height);
                color([1, 0.5, 0]) translate([grid_offset_x + grid_unit, grid_offset_y, 0])
                female_cavity_3d(edge_pattern, plate_height);
            }
        }
        
        // Right edge cavities (if overridden to female)
        // CRITICAL FIX: Position at grid boundary (same as male teeth) to properly align and remove wall
        // The cavity profile extends inward from the grid boundary, removing the wall between grid and plate edge
        // COLOR: PINK for female
        if (right_edge == "female") {
            // Position at grid boundary (same position as male teeth) so cavity aligns properly
            // The cavity profile extends inward, removing the wall between grid boundary and plate edge
            grid_right_edge = grid_offset_x + width_units * grid_unit;
            if (depth_units > 1) {
                for (i = [1 : max(1, depth_units) - 1]) {
                    color([1, 0.5, 0.8]) translate([grid_right_edge, grid_offset_y + i * grid_unit, 0])
                    rotate([0, 0, -90])
                    female_cavity_3d(edge_pattern, plate_height);
                }
            }
            if (depth_units == 1) {
                // Single unit - put connectors at corner boundaries (strong edges), not center (weak edge)
                color([1, 0.5, 0.8]) translate([grid_right_edge, grid_offset_y + 0, 0])
                rotate([0, 0, -90])
                female_cavity_3d(edge_pattern, plate_height);
                color([1, 0.5, 0.8]) translate([grid_right_edge, grid_offset_y + grid_unit, 0])
                rotate([0, 0, -90])
                female_cavity_3d(edge_pattern, plate_height);
            }
        }
        
        // Back edge cavities (if overridden to female)
        // CRITICAL FIX: Position at grid boundary (same as male teeth) to properly align and remove wall
        // The cavity profile extends inward from the grid boundary, removing the wall between grid and plate edge
        // COLOR: LIGHT BLUE for female
        if (back_edge == "female") {
            // Position at grid boundary (same position as male teeth) so cavity aligns properly
            // The cavity profile extends inward, removing the wall between grid boundary and plate edge
            grid_back_edge = grid_offset_y + depth_units * grid_unit;
            if (width_units > 1) {
                for (i = [1 : max(1, width_units) - 1]) {
                    color([0.5, 0.8, 1]) translate([grid_offset_x + i * grid_unit, grid_back_edge, 0])
                    female_cavity_3d(edge_pattern, plate_height);
                }
            }
            if (width_units == 1) {
                // Single unit - put connectors at corner boundaries (strong edges), not center (weak edge)
                color([0.5, 0.8, 1]) translate([grid_offset_x + 0, grid_back_edge, 0])
                female_cavity_3d(edge_pattern, plate_height);
                color([0.5, 0.8, 1]) translate([grid_offset_x + grid_unit, grid_back_edge, 0])
                female_cavity_3d(edge_pattern, plate_height);
            }
        }
    }
}

module rounded_rect_plate(width, depth, height, radius) {
    if (radius <= 0) {
        cube([width, depth, height]);
    } else {
        r = min(radius, min(width, depth) / 2 - 0.01);
        hull() {
            translate([r, r, 0]) cylinder(r = r, h = height);
            translate([width - r, r, 0]) cylinder(r = r, h = height);
            translate([r, depth - r, 0]) cylinder(r = r, h = height);
            translate([width - r, depth - r, 0]) cylinder(r = r, h = height);
        }
    }
}

module socket_rounded_rect(width, depth, height, radius) {
    if (radius <= 0) {
        cube([width, depth, height]);
    } else {
        r = min(radius, min(width, depth) / 2 - 0.01);
        hull() {
            translate([r, r, 0]) cylinder(r = r, h = height);
            translate([width - r, r, 0]) cylinder(r = r, h = height);
            translate([r, depth - r, 0]) cylinder(r = r, h = height);
            translate([width - r, depth - r, 0]) cylinder(r = r, h = height);
        }
    }
}

module grid_socket(cell_width = grid_unit, cell_depth = grid_unit) {
    // Socket that receives Gridfinity bin foot
    // Supports full cells (42mm) and half cells (21mm)
    // CRITICAL: Socket must be contained within cell boundaries to preserve walls
    // When padding_near_y > 0, wall extends from Y=0 to Y=grid_offset_y
    // Socket is positioned at grid_offset_y + gy * grid_unit, so first socket is at Y=grid_offset_y
    // Socket then translates by clearance, so it starts at Y=grid_offset_y + clearance
    // This preserves the wall from Y=0 to Y=grid_offset_y + clearance
    socket_width = cell_width - clearance * 2;
    socket_depth_size = cell_depth - clearance * 2;
    socket_corner_radius = 3.75;
    bottom_width = socket_width - socket_bottom_inset * 2;
    bottom_depth = socket_depth_size - socket_bottom_inset * 2;
    bottom_radius = socket_bottom_corner_radius;
    
    // Constrain socket to cell boundaries using intersection
    // This ensures socket never extends beyond its cell, preserving walls
    intersection() {
        // Cell boundary constraint
        translate([-clearance, -clearance, -0.2])
        cube([cell_width, cell_depth, plate_height + 0.3]);
        
        // Socket geometry
        translate([clearance, clearance, -0.1]) {
            hull() {
                translate([0, 0, plate_height])
                socket_rounded_rect(socket_width, socket_depth_size, 0.2, socket_corner_radius);
                if (!remove_bottom_taper) {
                    translate([socket_bottom_inset, socket_bottom_inset, 0])
                    socket_rounded_rect(bottom_width, bottom_depth, 0.2, bottom_radius);
                } else {
                    socket_rounded_rect(socket_width, socket_depth_size, 0.2, socket_corner_radius);
                }
            }
        }
    }
    
    // Only add features for full-size cells
    is_full_cell = cell_width >= grid_unit - 0.1 && cell_depth >= grid_unit - 0.1;
    
    if (style == "magnet" && is_full_cell) {
        positions = [[4.8, 4.8], [4.8, grid_unit - 4.8], [grid_unit - 4.8, 4.8], [grid_unit - 4.8, grid_unit - 4.8]];
        for (pos = positions) {
            translate([pos[0], pos[1], plate_height - magnet_depth])
            cylinder(d = magnet_diameter, h = magnet_depth + 0.1);
        }
    }
}
`;
  }

  // Generate a single segment (for individual download)
  async generateSingleSegment(config: BaseplateConfig, segmentX: number, segmentY: number): Promise<{ stlUrl: string; scadContent: string; filename: string }> {
    // Calculate split info
    let totalGridUnitsX: number;
    let totalGridUnitsY: number;
    
    let actualGridUnitsX: number | undefined;
    let actualGridUnitsY: number | undefined;
    let gridCoverageMmX: number | undefined;
    let gridCoverageMmY: number | undefined;
    let paddingNearX: number | undefined;
    let paddingFarX: number | undefined;
    let paddingNearY: number | undefined;
    let paddingFarY: number | undefined;
    
    if (config.sizingMode === 'fill_area_mm') {
      const calc = calculateGridFromMm(
        config.targetWidthMm,
        config.targetDepthMm,
        config.gridSize,
        config.allowHalfCellsX,
        config.allowHalfCellsY,
        config.paddingAlignment
      );
      // Use floored values for totalGridUnits (for backwards compatibility)
      totalGridUnitsX = Math.floor(calc.gridUnitsX);
      totalGridUnitsY = Math.floor(calc.gridUnitsY);
      // Pass actual grid units from calculateGridFromMm (accounts for half cells)
      actualGridUnitsX = calc.gridUnitsX;
      actualGridUnitsY = calc.gridUnitsY;
      // Pass grid coverage (what needs to fit on the bed, excluding padding)
      gridCoverageMmX = calc.gridCoverageMmX;
      gridCoverageMmY = calc.gridCoverageMmY;
      // Pass padding values for distribution across segments
      paddingNearX = calc.paddingNearX;
      paddingFarX = calc.paddingFarX;
      paddingNearY = calc.paddingNearY;
      paddingFarY = calc.paddingFarY;
    } else {
      totalGridUnitsX = Math.floor(config.width);
      totalGridUnitsY = Math.floor(config.depth);
      // In grid_units mode, grid units are exact and coverage is units * gridSize
      actualGridUnitsX = config.width;
      actualGridUnitsY = config.depth;
      gridCoverageMmX = config.width * config.gridSize;
      gridCoverageMmY = config.depth * config.gridSize;
      // No padding in grid_units mode
      paddingNearX = 0;
      paddingFarX = 0;
      paddingNearY = 0;
      paddingFarY = 0;
    }

    const splitInfo = splitBaseplateForPrinter(
      totalGridUnitsX,
      totalGridUnitsY,
      config.printerBedWidth,
      config.printerBedDepth,
      config.gridSize,
      config.connectorEnabled,
      actualGridUnitsX,
      actualGridUnitsY,
      gridCoverageMmX,
      gridCoverageMmY,
      paddingNearX,
      paddingFarX,
      paddingNearY,
      paddingFarY
    );

    // Get segment info
    const segmentInfo = splitInfo.segments[segmentY][segmentX];
    const scadContent = this.generateSegmentScad(config, segmentInfo);
    
    return this.renderScad(scadContent, `segment_${segmentX}_${segmentY}`);
  }

  // Generate all segments and return their file paths
  async generateAllSegments(config: BaseplateConfig): Promise<{ splitInfo: SplitResult; filePaths: Array<{ segmentX: number; segmentY: number; filePath: string; filename: string }> }> {
    // Calculate split info (same logic as generateSingleSegment)
    let totalGridUnitsX: number;
    let totalGridUnitsY: number;
    
    let actualGridUnitsX: number | undefined;
    let actualGridUnitsY: number | undefined;
    let gridCoverageMmX: number | undefined;
    let gridCoverageMmY: number | undefined;
    let paddingNearX: number | undefined;
    let paddingFarX: number | undefined;
    let paddingNearY: number | undefined;
    let paddingFarY: number | undefined;
    
    if (config.sizingMode === 'fill_area_mm') {
      const calc = calculateGridFromMm(
        config.targetWidthMm,
        config.targetDepthMm,
        config.gridSize,
        config.allowHalfCellsX,
        config.allowHalfCellsY,
        config.paddingAlignment
      );
      totalGridUnitsX = Math.floor(calc.gridUnitsX);
      totalGridUnitsY = Math.floor(calc.gridUnitsY);
      actualGridUnitsX = calc.gridUnitsX;
      actualGridUnitsY = calc.gridUnitsY;
      gridCoverageMmX = calc.gridCoverageMmX;
      gridCoverageMmY = calc.gridCoverageMmY;
      paddingNearX = calc.paddingNearX;
      paddingFarX = calc.paddingFarX;
      paddingNearY = calc.paddingNearY;
      paddingFarY = calc.paddingFarY;
    } else {
      totalGridUnitsX = Math.floor(config.width);
      totalGridUnitsY = Math.floor(config.depth);
      actualGridUnitsX = config.width;
      actualGridUnitsY = config.depth;
      gridCoverageMmX = config.width * config.gridSize;
      gridCoverageMmY = config.depth * config.gridSize;
      paddingNearX = 0;
      paddingFarX = 0;
      paddingNearY = 0;
      paddingFarY = 0;
    }

    const splitInfo = splitBaseplateForPrinter(
      totalGridUnitsX,
      totalGridUnitsY,
      config.printerBedWidth,
      config.printerBedDepth,
      config.gridSize,
      config.connectorEnabled,
      actualGridUnitsX,
      actualGridUnitsY,
      gridCoverageMmX,
      gridCoverageMmY,
      paddingNearX,
      paddingFarX,
      paddingNearY,
      paddingFarY
    );

    // Generate all segments
    const filePaths: Array<{ segmentX: number; segmentY: number; filePath: string; filename: string }> = [];
    
    for (let sy = 0; sy < splitInfo.segmentsY; sy++) {
      for (let sx = 0; sx < splitInfo.segmentsX; sx++) {
        const segmentInfo = splitInfo.segments[sy][sx];
        const scadContent = this.generateSegmentScad(config, segmentInfo);
        const result = await this.renderScad(scadContent, `segment_${sx}_${sy}`);
        
        // Extract file path from stlUrl (remove /files/ prefix)
        const filename = result.filename;
        const filePath = path.join(this.outputPath, filename);
        
        filePaths.push({
          segmentX: sx,
          segmentY: sy,
          filePath,
          filename
        });
      }
    }

    return { splitInfo, filePaths };
  }

  // Generate OpenSCAD modules for edge patterns (8 patterns, male + female)
  generateEdgePatternModules(config: BaseplateConfig): string {
    const tolerance = config.connectorTolerance;
    const toothDepth = config.toothDepth;
    const toothWidth = config.toothWidth;
    const concaveDepth = config.concaveDepth ?? 50; // 0-100% depth of concave swoop
    const wineglassAspectRatio = config.wineglassAspectRatio ?? 1.0; // Aspect ratio for wineglass bulb (0.5-2.0)
    const roofIntensity = config.connectorRoofIntensity ?? 0; // 0-200% peak intensity
    const roofDepth = config.connectorRoofDepth ?? 0; // 0-100% how far down from top the roof starts
    
    return `
// ===========================================
// EDGE PATTERN MODULES (Male/Female Interlocking)
// 2D profiles extruded vertically - NO overhangs
// ===========================================

tooth_depth = ${toothDepth};
tooth_width = ${toothWidth};
edge_tolerance = ${tolerance};
concave_depth = ${concaveDepth / 100}; // 0.0 to 1.0 (how deep the concave swoop is)
wineglass_aspect_ratio = ${wineglassAspectRatio}; // Aspect ratio for wineglass bulb (0.5-2.0, 1.0=circular)
roof_intensity = ${roofIntensity / 100}; // 0.0 to 1.0 (peak intensity for connector roof, 0=flat)
roof_depth = ${roofDepth / 100}; // 0.0 to 1.0 (how far down from top the roof starts, 0=at top)

// --- PATTERN 1: DOVETAIL (Trapezoidal) ---
// Classic woodworking dovetail - wider at tip than base
module dovetail_male_2d() {
    // Trapezoidal shape: narrow base, wider tip
    base_width = tooth_width * 0.7;
    tip_width = tooth_width;
    polygon([
        [-base_width/2, 0],
        [base_width/2, 0],
        [tip_width/2, tooth_depth],
        [-tip_width/2, tooth_depth]
    ]);
}

module dovetail_female_2d() {
    // Inverse with tolerance
    base_width = tooth_width * 0.7 + edge_tolerance * 2;
    tip_width = tooth_width + edge_tolerance * 2;
    polygon([
        [-base_width/2, 0],
        [base_width/2, 0],
        [tip_width/2, tooth_depth + edge_tolerance],
        [-tip_width/2, tooth_depth + edge_tolerance]
    ]);
}

// --- PATTERN 2: RECTANGULAR (Simple blocks) ---
module rectangular_male_2d() {
    translate([-tooth_width/2, 0])
    square([tooth_width, tooth_depth]);
}

module rectangular_female_2d() {
    translate([-(tooth_width/2 + edge_tolerance), -edge_tolerance])
    square([tooth_width + edge_tolerance * 2, tooth_depth + edge_tolerance * 2]);
}

// --- PATTERN 3: TRIANGULAR (Sawtooth) ---
module triangular_male_2d() {
    polygon([
        [-tooth_width/2, 0],
        [tooth_width/2, 0],
        [0, tooth_depth]
    ]);
}

module triangular_female_2d() {
    w = tooth_width + edge_tolerance * 2;
    polygon([
        [-w/2, -edge_tolerance],
        [w/2, -edge_tolerance],
        [0, tooth_depth + edge_tolerance]
    ]);
}

// --- PATTERN 4: PUZZLE (Jigsaw bulb) ---
module puzzle_male_2d() {
    neck_width = tooth_width * 0.5;
    bulb_radius = tooth_width * 0.4;
    neck_length = tooth_depth - bulb_radius;
    
    // Neck
    translate([-neck_width/2, 0])
    square([neck_width, neck_length]);
    
    // Bulb (approximated with polygon for clean extrusion)
    translate([0, neck_length])
    circle(r = bulb_radius, $fn = 24);
}

module puzzle_female_2d() {
    neck_width = tooth_width * 0.5 + edge_tolerance * 2;
    bulb_radius = tooth_width * 0.4 + edge_tolerance;
    neck_length = tooth_depth - (tooth_width * 0.4);
    
    // Neck slot
    translate([-neck_width/2, -edge_tolerance])
    square([neck_width, neck_length + edge_tolerance]);
    
    // Bulb cavity
    translate([0, neck_length])
    circle(r = bulb_radius, $fn = 24);
}

// --- PATTERN 5: T-SLOT (T-shaped hook) ---
module tslot_male_2d() {
    stem_width = tooth_width * 0.4;
    head_width = tooth_width;
    head_depth = tooth_depth * 0.35;
    stem_depth = tooth_depth - head_depth;
    
    // Stem
    translate([-stem_width/2, 0])
    square([stem_width, stem_depth]);
    
    // T-head
    translate([-head_width/2, stem_depth])
    square([head_width, head_depth]);
}

module tslot_female_2d() {
    stem_width = tooth_width * 0.4 + edge_tolerance * 2;
    head_width = tooth_width + edge_tolerance * 2;
    head_depth = tooth_depth * 0.35 + edge_tolerance;
    stem_depth = tooth_depth - (tooth_depth * 0.35);
    
    // Stem slot
    translate([-stem_width/2, -edge_tolerance])
    square([stem_width, stem_depth + edge_tolerance]);
    
    // T-head cavity
    translate([-head_width/2, stem_depth])
    square([head_width, head_depth + edge_tolerance]);
}

// --- PATTERN 6: PUZZLE SMOOTH (Jigsaw with adjustable concave swoop) ---
// Classic puzzle bulb but with concave hourglass neck - no sharp corners
// The neck curves INWARD (concave) before swooping out to the bulb
// concave_depth controls how pronounced the inward swoop is (0=straight, 1=deep)

module puzzle_smooth_male_2d() {
    bulb_r = tooth_width * 0.4;
    neck_len = tooth_depth - bulb_r;
    base_hw = tooth_width * 0.4;
    waist_hw = tooth_width * (0.32 - 0.22 * concave_depth);
    waist_y = neck_len * 0.5;
    concave_r = base_hw * (0.3 + 0.7 * concave_depth);
    
    union() {
        // Lower section with concave curves from base to waist
        hull() {
            // Base corners
            translate([base_hw - 0.15, 0.15])
            circle(r = 0.15, $fn = 16);
            translate([-base_hw + 0.15, 0.15])
            circle(r = 0.15, $fn = 16);
            // Waist
            translate([waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([-waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
        }
        
        // Carve concave inward curves if depth > 0
        if (concave_depth > 0.1) {
            difference() {
                hull() {
                    translate([base_hw - 0.15, 0.15])
                    circle(r = 0.15, $fn = 16);
                    translate([-base_hw + 0.15, 0.15])
                    circle(r = 0.15, $fn = 16);
                    translate([waist_hw, waist_y])
                    circle(r = 0.1, $fn = 16);
                    translate([-waist_hw, waist_y])
                    circle(r = 0.1, $fn = 16);
                }
                // Right concave carve
                translate([base_hw + concave_r * 0.6, waist_y * 0.5])
                scale([1, 1.6])
                circle(r = concave_r, $fn = 48);
                // Left concave carve
                translate([-(base_hw + concave_r * 0.6), waist_y * 0.5])
                scale([1, 1.6])
                circle(r = concave_r, $fn = 48);
            }
        }
        
        // Upper section: waist swoops out to bulb
        hull() {
            translate([waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([-waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([0, neck_len - bulb_r * 0.3])
            circle(r = bulb_r * 0.7, $fn = 32);
        }
        
        // The bulb (locking feature)
        translate([0, neck_len])
        circle(r = bulb_r, $fn = 32);
    }
}

module puzzle_smooth_female_2d() {
    bulb_r = tooth_width * 0.4 + edge_tolerance;
    neck_len = tooth_depth - (tooth_width * 0.4);
    base_hw = tooth_width * 0.4 + edge_tolerance;
    waist_hw = tooth_width * (0.32 - 0.22 * concave_depth) + edge_tolerance;
    waist_y = neck_len * 0.5;
    concave_r = (tooth_width * 0.4) * (0.3 + 0.7 * concave_depth);
    
    union() {
        hull() {
            translate([base_hw - 0.15, -edge_tolerance + 0.15])
            circle(r = 0.15, $fn = 16);
            translate([-base_hw + 0.15, -edge_tolerance + 0.15])
            circle(r = 0.15, $fn = 16);
            translate([waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([-waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
        }
        
        if (concave_depth > 0.1) {
            difference() {
                hull() {
                    translate([base_hw - 0.15, -edge_tolerance + 0.15])
                    circle(r = 0.15, $fn = 16);
                    translate([-base_hw + 0.15, -edge_tolerance + 0.15])
                    circle(r = 0.15, $fn = 16);
                    translate([waist_hw, waist_y])
                    circle(r = 0.1, $fn = 16);
                    translate([-waist_hw, waist_y])
                    circle(r = 0.1, $fn = 16);
                }
                translate([base_hw + concave_r * 0.6 - edge_tolerance * 0.3, waist_y * 0.5])
                scale([1, 1.6])
                circle(r = concave_r - edge_tolerance * 0.5, $fn = 48);
                translate([-(base_hw + concave_r * 0.6 - edge_tolerance * 0.3), waist_y * 0.5])
                scale([1, 1.6])
                circle(r = concave_r - edge_tolerance * 0.5, $fn = 48);
            }
        }
        
        hull() {
            translate([waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([-waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([0, neck_len - bulb_r * 0.3])
            circle(r = bulb_r * 0.7, $fn = 32);
        }
        
        translate([0, neck_len])
        circle(r = bulb_r, $fn = 32);
    }
}

// --- PATTERN 7: T-SLOT SMOOTH (T-shape with adjustable concave stem) ---
// T-head locking but with concave hourglass stem
// concave_depth controls how pronounced the inward swoop is

module tslot_smooth_male_2d() {
    head_w = tooth_width;
    head_h = tooth_depth * 0.3;
    stem_len = tooth_depth - head_h;
    base_hw = tooth_width * 0.3;
    waist_hw = tooth_width * (0.22 - 0.14 * concave_depth);
    waist_y = stem_len * 0.55;
    concave_r = base_hw * (0.25 + 0.6 * concave_depth);
    
    union() {
        // Lower stem with concave curves
        hull() {
            translate([base_hw - 0.12, 0.12])
            circle(r = 0.12, $fn = 16);
            translate([-base_hw + 0.12, 0.12])
            circle(r = 0.12, $fn = 16);
            translate([waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([-waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
        }
        
        if (concave_depth > 0.1) {
            difference() {
                hull() {
                    translate([base_hw - 0.12, 0.12])
                    circle(r = 0.12, $fn = 16);
                    translate([-base_hw + 0.12, 0.12])
                    circle(r = 0.12, $fn = 16);
                    translate([waist_hw, waist_y])
                    circle(r = 0.1, $fn = 16);
                    translate([-waist_hw, waist_y])
                    circle(r = 0.1, $fn = 16);
                }
                translate([base_hw + concave_r * 0.5, waist_y * 0.5])
                scale([1, 1.5])
                circle(r = concave_r, $fn = 48);
                translate([-(base_hw + concave_r * 0.5), waist_y * 0.5])
                scale([1, 1.5])
                circle(r = concave_r, $fn = 48);
            }
        }
        
        // Upper stem flares to T-head
        hull() {
            translate([waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([-waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([head_w/2 - 0.1, stem_len])
            circle(r = 0.1, $fn = 16);
            translate([-head_w/2 + 0.1, stem_len])
            circle(r = 0.1, $fn = 16);
        }
        
        // T-head
        translate([-head_w/2, stem_len])
        square([head_w, head_h]);
    }
}

module tslot_smooth_female_2d() {
    head_w = tooth_width + edge_tolerance * 2;
    head_h = tooth_depth * 0.3 + edge_tolerance;
    stem_len = tooth_depth - (tooth_depth * 0.3);
    base_hw = tooth_width * 0.3 + edge_tolerance;
    waist_hw = tooth_width * (0.22 - 0.14 * concave_depth) + edge_tolerance;
    waist_y = stem_len * 0.55;
    concave_r = (tooth_width * 0.3) * (0.25 + 0.6 * concave_depth);
    
    union() {
        hull() {
            translate([base_hw - 0.12, -edge_tolerance + 0.12])
            circle(r = 0.12, $fn = 16);
            translate([-base_hw + 0.12, -edge_tolerance + 0.12])
            circle(r = 0.12, $fn = 16);
            translate([waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([-waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
        }
        
        if (concave_depth > 0.1) {
            difference() {
                hull() {
                    translate([base_hw - 0.12, -edge_tolerance + 0.12])
                    circle(r = 0.12, $fn = 16);
                    translate([-base_hw + 0.12, -edge_tolerance + 0.12])
                    circle(r = 0.12, $fn = 16);
                    translate([waist_hw, waist_y])
                    circle(r = 0.1, $fn = 16);
                    translate([-waist_hw, waist_y])
                    circle(r = 0.1, $fn = 16);
                }
                translate([base_hw + concave_r * 0.5 - edge_tolerance * 0.2, waist_y * 0.5])
                scale([1, 1.5])
                circle(r = concave_r - edge_tolerance * 0.3, $fn = 48);
                translate([-(base_hw + concave_r * 0.5 - edge_tolerance * 0.2), waist_y * 0.5])
                scale([1, 1.5])
                circle(r = concave_r - edge_tolerance * 0.3, $fn = 48);
            }
        }
        
        hull() {
            translate([waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([-waist_hw, waist_y])
            circle(r = 0.1, $fn = 16);
            translate([head_w/2 - 0.1, stem_len])
            circle(r = 0.1, $fn = 16);
            translate([-head_w/2 + 0.1, stem_len])
            circle(r = 0.1, $fn = 16);
        }
        
        translate([-head_w/2, stem_len])
        square([head_w, head_h]);
    }
}

// --- PATTERN 8: WINE GLASS (Swoopy bulbous - stem + rounded top) ---
// Combines wine glass stem (concave hourglass) with semicircle top
// Simple version without conditionals for better OpenSCAD compatibility

module wineglass_male_2d() {
    bulb_r = tooth_width * 0.42;
    stem_len = tooth_depth * 0.5;
    // Position bulb center so it overlaps with the upper stem flare
    bulb_center_y = stem_len + bulb_r * 0.35;
    
    base_hw = tooth_width * 0.38;
    // Waist narrows based on concave_depth (0=wide, 1=narrow)
    waist_hw = tooth_width * 0.25 * (1 - concave_depth * 0.65);
    waist_y = stem_len * 0.5;
    
    union() {
        // Lower stem: base to waist using hull
        // Base starts at y=0 (flush with baseplate edge)
        hull() {
            // Base - wide, at y=0
            translate([-base_hw, 0]) square([0.01, 0.01]);
            translate([base_hw, 0]) square([0.01, 0.01]);
            // Waist - narrow
            translate([-waist_hw, waist_y]) circle(r = 0.08, $fn = 12);
            translate([waist_hw, waist_y]) circle(r = 0.08, $fn = 12);
        }
        
        // Upper stem: waist flares out and connects INTO the bulb
        // Account for aspect ratio when connecting to bulb
        hull() {
            translate([-waist_hw, waist_y]) circle(r = 0.08, $fn = 12);
            translate([waist_hw, waist_y]) circle(r = 0.08, $fn = 12);
            // Connect to points on the bulb (scaled by aspect ratio)
            translate([-bulb_r * 0.7 * wineglass_aspect_ratio, bulb_center_y - bulb_r * 0.5]) circle(r = 0.15, $fn = 12);
            translate([bulb_r * 0.7 * wineglass_aspect_ratio, bulb_center_y - bulb_r * 0.5]) circle(r = 0.15, $fn = 12);
        }
        
        // Bulb (rounded top) - positioned to overlap with upper stem
        // Scale to make circular (1.0) or ovular based on aspect ratio
        translate([0, bulb_center_y])
        scale([wineglass_aspect_ratio, 1])
        circle(r = bulb_r, $fn = 32);
    }
}

module wineglass_female_2d() {
    bulb_r = tooth_width * 0.42 + edge_tolerance;
    stem_len = tooth_depth * 0.5;
    bulb_center_y = stem_len + (tooth_width * 0.42) * 0.35;
    
    base_hw = tooth_width * 0.38 + edge_tolerance;
    waist_hw = tooth_width * 0.25 * (1 - concave_depth * 0.65) + edge_tolerance;
    waist_y = stem_len * 0.5;
    
    union() {
        // Lower stem - base at y=-edge_tolerance (flush)
        hull() {
            translate([-base_hw, -edge_tolerance]) square([0.01, 0.01]);
            translate([base_hw, -edge_tolerance]) square([0.01, 0.01]);
            translate([-waist_hw, waist_y]) circle(r = 0.08, $fn = 12);
            translate([waist_hw, waist_y]) circle(r = 0.08, $fn = 12);
        }
        
        // Upper stem connects into bulb
        // Account for aspect ratio when connecting to bulb
        hull() {
            translate([-waist_hw, waist_y]) circle(r = 0.08, $fn = 12);
            translate([waist_hw, waist_y]) circle(r = 0.08, $fn = 12);
            translate([-bulb_r * 0.7 * wineglass_aspect_ratio, bulb_center_y - bulb_r * 0.5]) circle(r = 0.15, $fn = 12);
            translate([bulb_r * 0.7 * wineglass_aspect_ratio, bulb_center_y - bulb_r * 0.5]) circle(r = 0.15, $fn = 12);
        }
        
        // Bulb cavity
        translate([0, bulb_center_y])
        scale([wineglass_aspect_ratio, 1])
        circle(r = bulb_r, $fn = 32);
    }
}

// ===========================================
// PATTERN SELECTOR MODULES
// ===========================================

// Male tooth - select pattern
module edge_tooth_male(pattern) {
    if (pattern == "dovetail") dovetail_male_2d();
    else if (pattern == "rectangular") rectangular_male_2d();
    else if (pattern == "triangular") triangular_male_2d();
    else if (pattern == "puzzle") puzzle_male_2d();
    else if (pattern == "tslot") tslot_male_2d();
    else if (pattern == "puzzle_smooth") puzzle_smooth_male_2d();
    else if (pattern == "tslot_smooth") tslot_smooth_male_2d();
    else if (pattern == "wineglass") wineglass_male_2d();
    else dovetail_male_2d(); // default
}

// Female cavity - select pattern  
module edge_tooth_female(pattern) {
    if (pattern == "dovetail") dovetail_female_2d();
    else if (pattern == "rectangular") rectangular_female_2d();
    else if (pattern == "triangular") triangular_female_2d();
    else if (pattern == "puzzle") puzzle_female_2d();
    else if (pattern == "tslot") tslot_female_2d();
    else if (pattern == "puzzle_smooth") puzzle_smooth_female_2d();
    else if (pattern == "tslot_smooth") tslot_smooth_female_2d();
    else if (pattern == "wineglass") wineglass_female_2d();
    else dovetail_female_2d(); // default
}

// 3D male tooth (extruded with optional peaked roof)
// The roof follows the actual profile shape to avoid overhangs for 3D printing
module male_tooth_3d(pattern, height) {
    if (roof_intensity > 0.01) {
        // Calculate peak height based on intensity
        peak_height = height * roof_intensity * 0.3;
        
        // Calculate base height where roof starts (based on roof_depth)
        // roof_depth = 0 means roof starts near top, roof_depth = 1 means roof at base
        max_base_height = height - peak_height;
        base_height = max_base_height * (1 - roof_depth);
        
        // Ensure total doesn't exceed height (auto-shorten if needed)
        total_needed = base_height + peak_height;
        if (total_needed > height) {
            // Reduce base_height so total equals height
            base_height = height - peak_height;
        }
        
        // Base extrusion up to where roof starts
        linear_extrude(height = base_height)
        edge_tooth_male(pattern);
        
        // Peaked roof: follows the profile shape using intersection
        // This ensures the roof respects concave sections (like wineglass waist)
        // and never creates overhangs
        translate([0, 0, base_height])
        intersection() {
            // Constraint: The roof must stay within the profile bounds
            // Extrude the profile to the peak height
            linear_extrude(height = peak_height + 0.1)
            edge_tooth_male(pattern);
            
            // Roof shape: hull between profile base and center peak line
            // This creates a "^" shape that slopes from edges to center
            hull() {
                // Base: full profile at roof start (z=0 in translated space)
                linear_extrude(height = 0.01)
                edge_tooth_male(pattern);
                
                // Peak: center line running along the length (y-direction)
                // Sample points along the length for smooth peak
                for (y = [0 : tooth_depth/30 : tooth_depth]) {
                    translate([0, y, peak_height])
                    cylinder(r = 0.06, h = 0.01, $fn = 12);
                }
            }
        }
    } else {
        // Flat top (original behavior)
        linear_extrude(height = height)
        edge_tooth_male(pattern);
    }
}

// 3D female cavity (extruded - no roof, just shorter to accommodate male roof)
// The female side is a simple cutout that matches the male shape
module female_cavity_3d(pattern, height) {
    translate([0, 0, -0.1]) {
        // Female cavity has no roof - it's just a cutout
        // Make it shorter to accommodate the male roof when roof is enabled
        if (roof_intensity > 0.01) {
            // Calculate the same dimensions as the male connector
            peak_height = height * roof_intensity * 0.3;
            max_base_height = height - peak_height;
            base_height = max_base_height * (1 - roof_depth);
            
            // Ensure total doesn't exceed height (same logic as male)
            total_needed = base_height + peak_height;
            if (total_needed > height) {
                base_height = height - peak_height;
            }
            
            // Female cavity height: base_height + peak_height (accommodates the full male roof)
            // Add small clearance for tolerance
            cavity_height = base_height + peak_height;
            linear_extrude(height = cavity_height + 0.2)
            edge_tooth_female(pattern);
        } else {
            // Flat top (original behavior)
            linear_extrude(height = height + 0.2)
            edge_tooth_female(pattern);
        }
    }
}
`;
  }

  // Generate segment SCAD with interlocking male/female edges
  generateSegmentScad(config: BaseplateConfig, segment: SegmentInfo): string {
    const widthUnits = segment.gridUnitsX;
    const depthUnits = segment.gridUnitsY;
    const plateHeight = config.socketChamferHeight;
    const tolerance = config.connectorTolerance;
    const gridSize = config.gridSize;
    const edgePattern = config.edgePattern;
    
    // Validate and get padding values (ensure they're valid numbers, not NaN/undefined)
    const paddingNearX = (typeof segment.paddingNearX === 'number' && !isNaN(segment.paddingNearX)) ? segment.paddingNearX : 0;
    const paddingFarX = (typeof segment.paddingFarX === 'number' && !isNaN(segment.paddingFarX)) ? segment.paddingFarX : 0;
    const paddingNearY = (typeof segment.paddingNearY === 'number' && !isNaN(segment.paddingNearY)) ? segment.paddingNearY : 0;
    const paddingFarY = (typeof segment.paddingFarY === 'number' && !isNaN(segment.paddingFarY)) ? segment.paddingFarY : 0;
    
    // Validate grid units are valid numbers
    if (typeof widthUnits !== 'number' || isNaN(widthUnits) || widthUnits <= 0) {
      throw new Error(`Invalid gridUnitsX for segment [${segment.segmentX}, ${segment.segmentY}]: ${widthUnits}`);
    }
    if (typeof depthUnits !== 'number' || isNaN(depthUnits) || depthUnits <= 0) {
      throw new Error(`Invalid gridUnitsY for segment [${segment.segmentX}, ${segment.segmentY}]: ${depthUnits}`);
    }
    
    // Calculate outer dimensions for this segment (similar to non-split baseplate)
    // This matches the pattern: outer_dimension = grid_units * gridSize + padding
    // Note: widthUnits and depthUnits can be fractional (e.g., 7.5) to include half cells
    // The gridWidth/depth calculation automatically includes half cells: 7.5 * 42 = 315mm (includes 0.5 * 42 = 21mm half cell)
    // CRITICAL: The plate width MUST extend to at least widthUnits * gridSize to cover half cells on the far edge
    const gridWidth = widthUnits * gridSize;
    const gridDepth = depthUnits * gridSize;
    
    // CRITICAL: Ensure plate extends to cover half cells on the far edge
    // Half cells extend to: grid_offset_x + width_units * grid_unit
    // When in fill mode: grid_offset_x = padding_near_x, so half cells extend to padding_near_x + width_units * grid_unit
    // Plate must extend to: padding_near_x + width_units * grid_unit + padding_far_x
    // When not in fill mode: grid_offset_x = 0, so half cells extend to width_units * grid_unit
    // Plate must extend BEYOND width_units * grid_unit to create the wall
    // The wall needs to be at least as thick as the clearance (0.25mm) to be visible and functional
    // Use a minimum wall thickness of 0.5mm to ensure the border is properly closed
    const minWallThickness = 0.5; // Minimum wall thickness to ensure border is closed (similar to clearance between cells)
    // Calculate if we have half cells on the far edge
    // Use > 0.49 instead of >= 0.5 to account for floating point precision errors
    const fractionalX = widthUnits - Math.floor(widthUnits);
    const fractionalY = depthUnits - Math.floor(depthUnits);
    const hasHalfCellX = fractionalX > 0.49;  // More robust than >= 0.5
    const hasHalfCellY = fractionalY > 0.49;  // More robust than >= 0.5
    // CRITICAL FIX: Last segment must always have closing wall
    // In splitBaseplateForPrinter, last segment always gets paddingFarX set to at least 0.5mm
    // So if paddingFarX >= minWallThickness, it's the last segment - use it as-is
    // If paddingFarX < minWallThickness but hasHalfCellX, add wall for half cell
    // Otherwise (paddingFarX < minWallThickness and no half cell), it's a non-last segment - use padding as-is
    // DOUBLE-CHECK: Also verify fractional part directly as safety net (handles floating point errors)
    // If fractional part is close to 0.5 (between 0.4 and 0.6), treat as half cell
    const definitelyHasHalfCellX = hasHalfCellX || (fractionalX > 0.4 && fractionalX < 0.6);  // Safety net for floating point errors
    const definitelyHasHalfCellY = hasHalfCellY || (fractionalY > 0.4 && fractionalY < 0.6);  // Safety net for floating point errors
    // CRITICAL: Calculate effective padding for BOTH near and far edges to handle half cells
    // For near edges: if first segment (paddingNearX/Y > 0) OR has half cell, ensure minimum wall
    // For far edges: if last segment (paddingFarX/Y >= 0.5) OR has half cell, ensure minimum wall
    // CRITICAL FIX: Remove padding on edges with connectors - connectors need zero padding to expose the cutouts
    // LEFT edge has connector (female) -> remove paddingNearX
    // FRONT edge has connector (female) -> remove paddingNearY
    // RIGHT edge has connector (male) -> remove paddingFarX (but only if it's not the last segment)
    // BACK edge has connector (male) -> remove paddingFarY (but only if it's not the last segment)
    let effectivePaddingNearX = (paddingNearX >= minWallThickness) ? paddingNearX : (definitelyHasHalfCellX ? Math.max(paddingNearX, minWallThickness) : paddingNearX);
    let effectivePaddingNearY = (paddingNearY >= minWallThickness) ? paddingNearY : (definitelyHasHalfCellY ? Math.max(paddingNearY, minWallThickness) : paddingNearY);
    let effectivePaddingFarX = (paddingFarX >= minWallThickness) ? paddingFarX : (definitelyHasHalfCellX ? Math.max(paddingFarX, minWallThickness) : paddingFarX);
    let effectivePaddingFarY = (paddingFarY >= minWallThickness) ? paddingFarY : (definitelyHasHalfCellY ? Math.max(paddingFarY, minWallThickness) : paddingFarY);
    
    // Remove padding on edges with connectors (connectors need zero padding to expose cutouts)
    if (segment.hasConnectorLeft) {
      effectivePaddingNearX = 0;  // LEFT edge has female connector - remove wall
    }
    if (segment.hasConnectorFront) {
      effectivePaddingNearY = 0;  // FRONT edge has female connector - remove wall
    }
    if (segment.hasConnectorRight) {
      effectivePaddingFarX = 0;  // RIGHT edge has male connector - remove wall
    }
    if (segment.hasConnectorBack) {
      effectivePaddingFarY = 0;  // BACK edge has male connector - remove wall
    }
    const outerWidthMm = gridWidth + effectivePaddingNearX + effectivePaddingFarX;
    const outerDepthMm = gridDepth + effectivePaddingNearY + effectivePaddingFarY;
    
    // #region agent log
    console.log(JSON.stringify({
      location: 'generateSegmentScad:padding-calculation',
      message: `Segment [${segment.segmentX}, ${segment.segmentY}] padding calculation`,
      data: {
        segmentX: segment.segmentX, segmentY: segment.segmentY,
        widthUnits, depthUnits, gridWidth, gridDepth,
        paddingNearX, paddingFarX, paddingNearY, paddingFarY,
        effectivePaddingNearX, effectivePaddingNearY, effectivePaddingFarX, effectivePaddingFarY,
        outerWidthMm, outerDepthMm,
        hasHalfCellX, hasHalfCellY,
        isLastSegmentX: paddingFarX >= minWallThickness,
        isLastSegmentY: paddingFarY >= minWallThickness,
        minWallThickness,
        effectivePaddingNearXCalculation: `(${paddingNearX} >= ${minWallThickness}) ? ${paddingNearX} : (${hasHalfCellX} ? Math.max(${paddingNearX}, ${minWallThickness}) : ${paddingNearX})`,
        effectivePaddingNearYCalculation: `(${paddingNearY} >= ${minWallThickness}) ? ${paddingNearY} : (${hasHalfCellY} ? Math.max(${paddingNearY}, ${minWallThickness}) : ${paddingNearY})`,
        effectivePaddingFarXCalculation: `(${paddingFarX} >= ${minWallThickness}) ? ${paddingFarX} : (${hasHalfCellX} ? Math.max(${paddingFarX}, ${minWallThickness}) : ${paddingFarX})`,
        effectivePaddingFarYCalculation: `(${paddingFarY} >= ${minWallThickness}) ? ${paddingFarY} : (${hasHalfCellY} ? Math.max(${paddingFarY}, ${minWallThickness}) : ${paddingFarY})`,
        wallNeededForHalfCellX: hasHalfCellX && paddingFarX < minWallThickness,
        wallNeededForHalfCellY: hasHalfCellY && paddingNearY < minWallThickness
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A,B,C,D'
    }));
    // #endregion
    
    // Validate calculated dimensions are reasonable
    if (outerWidthMm <= 0 || outerWidthMm > 10000) {
      throw new Error(`Invalid outerWidthMm for segment [${segment.segmentX}, ${segment.segmentY}]: ${outerWidthMm}mm (gridWidth: ${gridWidth}, padding: ${paddingNearX}+${paddingFarX})`);
    }
    if (outerDepthMm <= 0 || outerDepthMm > 10000) {
      throw new Error(`Invalid outerDepthMm for segment [${segment.segmentX}, ${segment.segmentY}]: ${outerDepthMm}mm (gridDepth: ${gridDepth}, padding: ${paddingNearY}+${paddingFarY})`);
    }
    
    // Determine if this segment should use fill mode (when padding > 0)
    // CRITICAL: Use effective padding values to account for wall extension added for half cells
    // This ensures useFillMode is true when half cells need wall extension, even if original padding was 0
    const useFillMode = (effectivePaddingNearX + effectivePaddingFarX + effectivePaddingNearY + effectivePaddingFarY) > 0;
    
    // Calculate expected plate dimensions for verification
    const expectedPlateWidth = useFillMode ? outerWidthMm : gridWidth;
    const expectedPlateDepth = useFillMode ? outerDepthMm : gridDepth;
    const gridOffsetX = useFillMode ? effectivePaddingNearX : 0;
    const gridOffsetY = useFillMode ? effectivePaddingNearY : 0;
    // For half cell wall verification: wall should extend from (gridOffsetX + widthUnits * gridSize) to (expectedPlateWidth)
    const halfCellEndX = gridOffsetX + widthUnits * gridSize;
    const wallStartX = halfCellEndX;
    const wallEndX = expectedPlateWidth;
    const wallThicknessX = wallEndX - wallStartX;
    
    
    // Generate edge pattern modules
    const edgePatternModules = this.generateEdgePatternModules(config);
    
    // Generate male/female edge code (with override support)
    // Pass padding values so connectors are positioned correctly relative to grid boundaries
    // Use effective padding values to account for half cells and ensure correct plate edge calculation
    const edgeCode = this.generateEdgeCode(
      segment, 
      gridSize, 
      plateHeight, 
      edgePattern, 
      config.edgeOverrides || [],
      effectivePaddingNearX,
      effectivePaddingNearY,
      effectivePaddingFarX,
      effectivePaddingFarY
    );
    
    
    return `// Gridfinity Baseplate Segment [${segment.segmentX}, ${segment.segmentY}]
// Part of a split baseplate system with interlocking male/female edges
// Edge pattern: ${edgePattern}
// Socket profile matches bin foot for proper fit

/* [Configuration] */
width_units = ${widthUnits};
depth_units = ${depthUnits};
style = "${config.style}";
plate_style = "${config.plateStyle}";
magnet_diameter = ${config.magnetDiameter};
magnet_depth = ${config.magnetDepth};
magnet_z_offset = ${config.magnetZOffset};
magnet_top_cover = ${config.magnetTopCover};
screw_diameter = ${config.screwDiameter};
center_screw = ${config.centerScrew};
weight_cavity = ${config.weightCavity};
remove_bottom_taper = ${config.removeBottomTaper};
corner_radius = ${config.cornerRadius};
grid_unit = ${gridSize};
socket_chamfer_angle = ${config.socketChamferAngle};
socket_chamfer_height = ${config.socketChamferHeight};
socket_bottom_corner_radius = ${config.socketBottomCornerRadius};
edge_pattern = "${edgePattern}";

/* [Edge Settings] */
has_male_right = ${segment.hasConnectorRight};
has_male_back = ${segment.hasConnectorBack};
has_female_left = ${segment.hasConnectorLeft};
has_female_front = ${segment.hasConnectorFront};

/* [Padding] */
// Note: padding_far_x/y may be increased to ensure minimum wall thickness when half cells are present
// CRITICAL: For segments with half cells (e.g., width_units=1.5), padding_far_x MUST be >= 0.5mm to create closing wall
// CRITICAL FIX: Padding is set to 0 on edges with connectors to remove walls and expose connector cutouts
// Original padding: near_x=${paddingNearX.toFixed(2)}, far_x=${paddingFarX.toFixed(2)}, near_y=${paddingNearY.toFixed(2)}, far_y=${paddingFarY.toFixed(2)}
// Effective padding (after connector and half cell adjustment): near_x=${effectivePaddingNearX.toFixed(2)}, near_y=${effectivePaddingNearY.toFixed(2)}, far_x=${effectivePaddingFarX.toFixed(2)}, far_y=${effectivePaddingFarY.toFixed(2)}
padding_near_x = ${effectivePaddingNearX.toFixed(2)};
padding_far_x = ${effectivePaddingFarX.toFixed(2)};
padding_near_y = ${effectivePaddingNearY.toFixed(2)};
padding_far_y = ${effectivePaddingFarY.toFixed(2)};

/* [Constants] */
clearance = 0.25;
socket_taper_height = socket_chamfer_height;
socket_bottom_inset = socket_chamfer_height / tan(socket_chamfer_angle);
socket_depth = socket_taper_height;
plate_height = socket_depth;

$fn = 32;

/* [Calculated] */
// Grid coverage (actual grid area)
// Note: width_units and depth_units can be fractional (e.g., 7.5) to include half cells
// The calculation automatically includes half cells: 7.5 * grid_unit = 315mm (includes 21mm half cell)
grid_width = width_units * grid_unit;
grid_depth = depth_units * grid_unit;

// Total plate size (grid + padding) - using same pattern as non-split baseplate
// This matches: plate_width = use_fill_mode ? outer_width_mm : grid_width
// CRITICAL: The plate_width MUST extend to cover all grid cells including half cells on the far edges
// When width_units is fractional (e.g., 7.5), grid_width = 7.5 * grid_unit includes the half cell
// Half cells are positioned at: grid_offset_x + full_cells_x * grid_unit
// Half cells extend to: grid_offset_x + full_cells_x * grid_unit + half_cell_size = grid_offset_x + width_units * grid_unit
// CRITICAL: When half cells are present on the far edge, padding_far_x is guaranteed to be at least 0.5mm
// This ensures the plate always extends beyond half cells to create the closing wall
// The wall runs along the entire Y axis (depth) from Y=0 to Y=depth, closing the half cells
// Plate extends to: grid_offset_x + width_units * grid_unit + max(padding_far_x, 0.5mm) when half cells exist
// IMPORTANT: grid_width = width_units * grid_unit already includes half cells when width_units is fractional
outer_width_mm = ${outerWidthMm.toFixed(2)};
outer_depth_mm = ${outerDepthMm.toFixed(2)};
use_fill_mode = ${useFillMode};
// Plate width calculation: grid_width already includes half cells (e.g., 7.5 * 42 = 315mm includes 21mm half cell)
// When in fill mode: plate_width = width_units * grid_unit + padding_near_x + padding_far_x
// When not in fill mode: plate_width = width_units * grid_unit
// CRITICAL: For segments with half cells on far edge, padding_far_x is guaranteed to be >= 0.5mm
// This ensures plate_width extends beyond half cells to create the closing wall
// Wall extends from X=(grid_offset_x + width_units * grid_unit) to X=plate_width
// For width_units=1.5: half cell ends at grid_offset_x + 1.5*42 = grid_offset_x + 63mm
// Wall should extend from X=63mm to X=plate_width (which includes padding_far_x >= 0.5mm)
plate_width = use_fill_mode ? outer_width_mm : grid_width;
plate_depth = use_fill_mode ? outer_depth_mm : grid_depth;


// Grid offset (where the grid starts within the plate)
// When using fill mode with padding, offset the grid by the near padding amount
// This positions the grid correctly within the plate for proper centering
grid_offset_x = use_fill_mode ? padding_near_x : 0;
grid_offset_y = use_fill_mode ? padding_near_y : 0;

${edgePatternModules}

// Main module
gridfinity_segment();

module gridfinity_segment() {
    difference() {
        union() {
            // Main plate body
            rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
            
            // Male teeth (protrude outward)
            ${edgeCode.maleTeeth}
        }
        
        // Socket cutouts
        // Handle both full and half cells (same pattern as non-split baseplate)
        // Half cells go on the FAR edge (right/back) at high X, high Y
        full_cells_x = floor(width_units);
        full_cells_y = floor(depth_units);
        has_half_x = width_units - full_cells_x >= 0.5;
        has_half_y = depth_units - full_cells_y >= 0.5;
        half_cell_size = grid_unit / 2;
        
        // Full grid cells - positioned at grid_offset for proper centering
        for (gx = [0:full_cells_x-1]) {
            for (gy = [0:full_cells_y-1]) {
                translate([grid_offset_x + gx * grid_unit, grid_offset_y + gy * grid_unit, 0])
                grid_socket(grid_unit, grid_unit);
            }
        }
        
        // Half cells on X edge (far/right side) - AFTER full cells, at high X values
        // Generate for all Y positions including the half Y row if it exists
        if (has_half_x) {
            // Full Y cells
            for (gy = [0:full_cells_y-1]) {
                translate([grid_offset_x + full_cells_x * grid_unit, grid_offset_y + gy * grid_unit, 0])
                grid_socket(half_cell_size, grid_unit);
            }
            // Half Y row (if it exists) - this creates the corner half cell when both X and Y have half cells
            if (has_half_y) {
                translate([grid_offset_x + full_cells_x * grid_unit, grid_offset_y + full_cells_y * grid_unit, 0])
                grid_socket(half_cell_size, half_cell_size);
            }
        }
        
        // Half cells on Y edge (far/back side) - AFTER full cells, at high Y values
        // Only generate for full X cells (corner is already handled above)
        // CRITICAL: When depth_units < 1 (e.g., 0.5), full_cells_y = 0, so this generates half cells
        // at grid_offset_y + 0 * grid_unit = grid_offset_y, which is correct
        // The plate extends to grid_depth + padding_far_y, creating the closing wall
        if (has_half_y) {
            for (gx = [0:full_cells_x-1]) {
                translate([grid_offset_x + gx * grid_unit, grid_offset_y + full_cells_y * grid_unit, 0])
                grid_socket(grid_unit, half_cell_size);
            }
        }
        
        
        // Female cavities (cut into edges)
        ${edgeCode.femaleCavities}
    }
}

// Rounded rectangle module for baseplate
module rounded_rect_plate(width, depth, height, radius) {
    if (radius <= 0) {
        cube([width, depth, height]);
    } else {
        r = min(radius, min(width, depth) / 2 - 0.01);
        hull() {
            translate([r, r, 0])
            cylinder(r = r, h = height);
            translate([width - r, r, 0])
            cylinder(r = r, h = height);
            translate([r, depth - r, 0])
            cylinder(r = r, h = height);
            translate([width - r, depth - r, 0])
            cylinder(r = r, h = height);
        }
    }
}

module socket_rounded_rect(width, depth, height, radius) {
    if (radius <= 0) {
        cube([width, depth, height]);
    } else {
        r = min(radius, min(width, depth) / 2 - 0.01);
        hull() {
            translate([r, r, 0])
            cylinder(r = r, h = height);
            translate([width - r, r, 0])
            cylinder(r = r, h = height);
            translate([r, depth - r, 0])
            cylinder(r = r, h = height);
            translate([width - r, depth - r, 0])
            cylinder(r = r, h = height);
        }
    }
}

module grid_socket(cell_width = grid_unit, cell_depth = grid_unit) {
    // Socket that receives Gridfinity bin foot
    // Supports full cells (42mm) and half cells (21mm)
    // CRITICAL: Socket must be contained within cell boundaries to preserve walls
    // When padding_near_y > 0, wall extends from Y=0 to Y=grid_offset_y
    // Socket is positioned at grid_offset_y + gy * grid_unit, so first socket is at Y=grid_offset_y
    // Socket then translates by clearance, so it starts at Y=grid_offset_y + clearance
    // This preserves the wall from Y=0 to Y=grid_offset_y + clearance
    socket_width = cell_width - clearance * 2;
    socket_depth_size = cell_depth - clearance * 2;
    socket_corner_radius = 3.75;
    
    bottom_width = socket_width - socket_bottom_inset * 2;
    bottom_depth = socket_depth_size - socket_bottom_inset * 2;
    bottom_radius = socket_bottom_corner_radius;
    
    // Constrain socket to cell boundaries using intersection
    // This ensures socket never extends beyond its cell, preserving walls
    intersection() {
        // Cell boundary constraint
        translate([-clearance, -clearance, -0.2])
        cube([cell_width, cell_depth, plate_height + 0.3]);
        
        // Socket geometry
        translate([clearance, clearance, -0.1]) {
            hull() {
                translate([0, 0, plate_height])
                socket_rounded_rect(socket_width, socket_depth_size, 0.2, socket_corner_radius);
                
                if (!remove_bottom_taper) {
                    translate([socket_bottom_inset, socket_bottom_inset, 0])
                    socket_rounded_rect(bottom_width, bottom_depth, 0.2, bottom_radius);
                } else {
                    translate([0, 0, 0])
                    socket_rounded_rect(socket_width, socket_depth_size, 0.2, socket_corner_radius);
                }
            }
        }
    }
    
    // Only add features for full-size cells
    is_full_cell = cell_width >= grid_unit - 0.1 && cell_depth >= grid_unit - 0.1;
    
    if (style == "magnet" && is_full_cell) {
        magnet_holes();
    }
    
    if (style == "screw" && is_full_cell) {
        screw_holes();
    }
    
    if (center_screw && is_full_cell) {
        center_screw_hole();
    }
    
    if ((weight_cavity || style == "weighted") && is_full_cell) {
        weight_cavity_cutout();
    }
}

module center_screw_hole() {
    translate([grid_unit / 2, grid_unit / 2, -0.1])
    union() {
        cylinder(d = screw_diameter, h = plate_height + 0.2);
        translate([0, 0, plate_height - 2.4])
        cylinder(d1 = screw_diameter, d2 = screw_diameter * 2.5, h = 2.5);
    }
}

module weight_cavity_cutout() {
    cavity_size = 21.4;
    cavity_depth = 4;
    translate([(grid_unit - cavity_size) / 2, (grid_unit - cavity_size) / 2, -0.1])
    cube([cavity_size, cavity_size, cavity_depth + 0.1]);
}

module magnet_holes() {
    positions = [
        [4.8, 4.8],
        [4.8, grid_unit - 4.8],
        [grid_unit - 4.8, 4.8],
        [grid_unit - 4.8, grid_unit - 4.8]
    ];
    
    magnet_z = magnet_z_offset > 0 ? magnet_z_offset : 
               magnet_top_cover > 0 ? plate_height - magnet_depth - magnet_top_cover : 
               plate_height - magnet_depth;
    
    for (pos = positions) {
        translate([pos[0], pos[1], magnet_z])
        cylinder(d = magnet_diameter, h = magnet_depth + 0.1);
        
        if (magnet_z_offset > 0) {
            translate([pos[0], pos[1], -0.1])
            cylinder(d = magnet_diameter * 0.6, h = magnet_z_offset + 0.1);
        }
    }
}

module screw_holes() {
    positions = [
        [4.8, 4.8],
        [4.8, grid_unit - 4.8],
        [grid_unit - 4.8, 4.8],
        [grid_unit - 4.8, grid_unit - 4.8]
    ];
    
    for (pos = positions) {
        translate([pos[0], pos[1], -0.1])
        union() {
            cylinder(d = screw_diameter, h = plate_height + 0.2);
            translate([0, 0, plate_height - 2.4])
            cylinder(d1 = screw_diameter, d2 = screw_diameter * 2.5, h = 2.5);
        }
    }
}
`;
  }

  // Get edge type for a segment (with override support)
  private getEdgeType(
    segment: SegmentInfo, 
    edge: 'left' | 'right' | 'front' | 'back', 
    edgeOverrides: SegmentEdgeOverride[]
  ): EdgeType {
    // Check for override
    const override = edgeOverrides.find(o => o.segmentX === segment.segmentX && o.segmentY === segment.segmentY);
    if (override) {
      if (edge === 'left') return override.leftEdge;
      if (edge === 'right') return override.rightEdge;
      if (edge === 'front') return override.frontEdge;
      if (edge === 'back') return override.backEdge;
    }
    
    // Default automatic assignment
    if (edge === 'right') return segment.hasConnectorRight ? 'male' : 'none';
    if (edge === 'back') return segment.hasConnectorBack ? 'male' : 'none';
    if (edge === 'left') return segment.hasConnectorLeft ? 'female' : 'none';
    if (edge === 'front') return segment.hasConnectorFront ? 'female' : 'none';
    return 'none';
  }

  // Generate edge code for male teeth and female cavities
  private generateEdgeCode(
    segment: SegmentInfo, 
    gridSize: number, 
    plateHeight: number, 
    edgePattern: string,
    edgeOverrides: SegmentEdgeOverride[] = [],
    paddingNearX: number = 0,
    paddingNearY: number = 0,
    paddingFarX: number = 0,
    paddingFarY: number = 0
  ): { maleTeeth: string; femaleCavities: string } {
    const maleTeeth: string[] = [];
    const femaleCavities: string[] = [];
    
    // Helper to get tooth positions - at grid cell boundaries (corner boundaries where cells meet)
    // Positions are relative to the grid area (accounting for padding)
    // Corner boundaries are at integer multiples of gridSize: 0, gridSize, 2*gridSize, etc.
    // These are "strong edges" with more material, not "weak edges" in the middle of cells
    const getPositions = (units: number, paddingOffset: number): number[] => {
      const positions: number[] = [];
      
      if (units <= 1) {
        // Single unit or less - put connectors at corner boundaries (start and end of grid area)
        // These are strong edges where cells meet, not weak edges in the middle of cells
        positions.push(paddingOffset + 0);        // Start boundary (corner)
        if (units >= 1) {
          positions.push(paddingOffset + gridSize); // End boundary (corner)
        }
      } else {
        // Multiple units - put teeth at grid boundaries between cells (at corners where cells meet)
        // For units=2: place at 1*gridSize (boundary between cell 0 and cell 1)
        // For units=3: place at 1*gridSize and 2*gridSize (boundaries between cells)
        for (let i = 1; i < units; i++) {
          positions.push(paddingOffset + i * gridSize);
        }
      }
      return positions;
    };

    // Get edge types (with override support)
    const rightEdgeType = this.getEdgeType(segment, 'right', edgeOverrides);
    const backEdgeType = this.getEdgeType(segment, 'back', edgeOverrides);
    const leftEdgeType = this.getEdgeType(segment, 'left', edgeOverrides);
    const frontEdgeType = this.getEdgeType(segment, 'front', edgeOverrides);
    
    // Calculate grid boundaries (where connectors should be positioned)
    const gridRightEdge = paddingNearX + segment.gridUnitsX * gridSize;
    const gridBackEdge = paddingNearY + segment.gridUnitsY * gridSize;
    
    // RIGHT EDGE
    if (rightEdgeType === 'male') {
      const positions = getPositions(segment.gridUnitsY, paddingNearY);
      for (const y of positions) {
        maleTeeth.push(`
            // Right edge male tooth at Y=${y}
            translate([${gridRightEdge}, ${y}, 0])
            rotate([0, 0, -90])
            male_tooth_3d("${edgePattern}", plate_height);`);
      }
    } else if (rightEdgeType === 'female') {
      const positions = getPositions(segment.gridUnitsY, paddingNearY);
      for (const y of positions) {
        femaleCavities.push(`
        // Right edge female cavity at Y=${y}
        // CRITICAL FIX: Position at grid boundary (same as male teeth) to properly align and remove wall
        translate([${gridRightEdge}, ${y}, 0])
        rotate([0, 0, -90])
        female_cavity_3d("${edgePattern}", plate_height);`);
      }
    }
    
    // BACK EDGE
    if (backEdgeType === 'male') {
      const positions = getPositions(segment.gridUnitsX, paddingNearX);
      for (const x of positions) {
        maleTeeth.push(`
            // Back edge male tooth at X=${x}
            translate([${x}, ${gridBackEdge}, 0])
            rotate([0, 0, 0])
            male_tooth_3d("${edgePattern}", plate_height);`);
      }
    } else if (backEdgeType === 'female') {
      const positions = getPositions(segment.gridUnitsX, paddingNearX);
      for (const x of positions) {
        femaleCavities.push(`
        // Back edge female cavity at X=${x}
        // CRITICAL FIX: Position at grid boundary (same as male teeth) to properly align and remove wall
        translate([${x}, ${gridBackEdge}, 0])
        rotate([0, 0, 0])
        female_cavity_3d("${edgePattern}", plate_height);`);
      }
    }
    
    // LEFT EDGE
    // CRITICAL: Position at grid boundary (X=paddingNearX), NOT at plate edge (X=0)
    // When paddingNearX > 0, the wall extends from X=0 to X=paddingNearX
    // Connectors must be at the grid boundary to preserve the wall
    const gridLeftEdge = paddingNearX;  // Grid boundary, not plate edge
    if (leftEdgeType === 'female') {
      const positions = getPositions(segment.gridUnitsY, paddingNearY);
      for (const y of positions) {
        femaleCavities.push(`
        // Left edge female cavity at Y=${y}, X=${gridLeftEdge} (grid boundary)
        // CRITICAL FIX: Position at grid boundary (same as male teeth) to properly align and remove wall
        translate([${gridLeftEdge}, ${y}, 0])
        rotate([0, 0, -90])
        female_cavity_3d("${edgePattern}", plate_height);`);
      }
    } else if (leftEdgeType === 'male') {
      const positions = getPositions(segment.gridUnitsY, paddingNearY);
      for (const y of positions) {
        maleTeeth.push(`
            // Left edge male tooth at Y=${y}, X=${gridLeftEdge} (grid boundary)
            translate([${gridLeftEdge}, ${y}, 0])
            rotate([0, 0, -90])
            male_tooth_3d("${edgePattern}", plate_height);`);
      }
    }
    
    // FRONT EDGE
    // CRITICAL: Position at grid boundary (Y=paddingNearY), NOT at plate edge (Y=0)
    // When paddingNearY > 0, the wall extends from Y=0 to Y=paddingNearY
    // Connectors must be at the grid boundary to preserve the wall
    const gridFrontEdge = paddingNearY;  // Grid boundary, not plate edge
    const frontEdgePositions = getPositions(segment.gridUnitsX, paddingNearX);
    
    
    if (frontEdgeType === 'female') {
      for (const x of frontEdgePositions) {
        femaleCavities.push(`
        // Front edge female cavity at X=${x}, Y=${gridFrontEdge} (grid boundary)
        translate([${x}, ${gridFrontEdge}, 0])
        rotate([0, 0, 0])
        female_cavity_3d("${edgePattern}", plate_height);`);
      }
    } else if (frontEdgeType === 'male') {
      for (const x of frontEdgePositions) {
        maleTeeth.push(`
            // Front edge male tooth at X=${x}, Y=${gridFrontEdge} (grid boundary)
            translate([${x}, ${gridFrontEdge}, 0])
            rotate([0, 0, 0])
            male_tooth_3d("${edgePattern}", plate_height);`);
      }
    }
    
    return {
      maleTeeth: maleTeeth.join('\n'),
      femaleCavities: femaleCavities.join('\n')
    };
  }

  // Generate Box SCAD code - simplified version compatible with standard OpenSCAD
  generateBoxScad(config: BoxConfig): string {
    return `// Gridfinity Box Generator
// Compatible with standard OpenSCAD

/* [Configuration] */
width_units = ${config.width};
depth_units = ${config.depth};
height_units = ${config.height};
wall_thickness = ${config.wallThickness};
floor_thickness = ${config.floorThickness};
magnet_enabled = ${config.magnetEnabled};
magnet_diameter = ${config.magnetDiameter};
magnet_depth = ${config.magnetDepth};
magnet_easy_release = "${config.magnetEasyRelease}";
screw_enabled = ${config.screwEnabled};
screw_diameter = ${config.screwDiameter};
// Map "standard" to "normal" for Gridfinity Extended compatibility
lip_style = "${config.lipStyle === 'standard' ? 'normal' : config.lipStyle === 'perfect_fit' ? 'perfect_fit' : config.lipStyle}";
dividers_x = ${config.dividersX};
dividers_y = ${config.dividersY};
divider_height_percent = ${config.dividerHeight};
divider_floor_bevel = ${config.dividerFloorBevel};
finger_slide = ${config.fingerSlide};
finger_slide_style = "${config.fingerSlideStyle}";
finger_slide_radius = ${config.fingerSlideRadius};
label_enabled = ${config.labelEnabled};
corner_radius = ${config.cornerRadius};
prevent_bottom_overhangs = ${config.preventBottomOverhangs};
bottom_overhang_chamfer_angle = ${config.bottomOverhangChamferAngle};
feet_corner_radius = ${config.cornerRadius};
foot_bottom_corner_radius = ${config.footBottomCornerRadius};
grid_unit = ${config.gridSize};
foot_chamfer_angle = ${config.footChamferAngle};
foot_chamfer_height = ${config.footChamferHeight};
lip_chamfer_angle = ${config.lipChamferAngle};
lip_chamfer_height = ${config.lipChamferHeight};
flat_base = "${config.flatBase}";
efficient_floor = "${config.efficientFloor}";
tapered_corner = "${config.taperedCorner}";
tapered_corner_size = ${config.taperedCornerSize};
wall_pattern = "${config.wallPattern}";
wall_pattern_spacing = ${config.wallPatternSpacing};
inner_edge_bevel = ${config.innerEdgeBevel};

/* [Constants] */
// SIMPLE TAPER foot - ONE taper from small bottom to larger top
// Chamfer angle determines the taper steepness
// Chamfer height is the total height of the foot
foot_taper_height = foot_chamfer_height;
// Calculate bottom inset from angle: inset = height / tan(angle)
// tan(45°) = 1, tan(60°) ≈ 1.73, tan(30°) ≈ 0.58
foot_bottom_inset = foot_chamfer_height / tan(foot_chamfer_angle);
// Total base height (foot taper only, no extra lip)
base_height = foot_taper_height;
gf_corner_radius = 3.75;  // Standard Gridfinity corner radius
clearance = 0.25;  // Gap from grid edge
$fn = 32;

// Gridfinity Extended lip constants - user-controlled angle and height
// Standard lip profile: lower taper → riser → upper taper → lip
// Proportions: lower taper ~16%, riser ~41%, upper taper ~43% of total (excluding lip)
// Lip height is separate and fixed at 1.2mm
gf_lip_riser_height = 1.8;          // Vertical riser section (fixed)
gf_lip_height = 1.2;                // Top lip section (fixed)
// Calculate taper heights proportionally from total height
// Total taper height = lip_chamfer_height - riser_height - lip_height
gf_lip_taper_total = lip_chamfer_height - gf_lip_riser_height - gf_lip_height;
// Distribute taper heights: lower ~16%, upper ~43% (ratio 0.7:1.9 ≈ 0.27:0.73)
gf_lip_lower_taper_height = gf_lip_taper_total * 0.27;
gf_lip_upper_taper_height = gf_lip_taper_total * 0.73;
gf_lip_total_height = lip_chamfer_height;  // Use user-controlled total height
// Lower taper angle (can use lip_chamfer_angle for aesthetic purposes)
gf_lip_lower_taper_angle = lip_chamfer_angle;
// Upper taper angle MUST match foot_chamfer_angle for proper stacking
// This is the critical part that creates the recess for the foot to fit into
gf_lip_upper_taper_angle = foot_chamfer_angle;

/* [Calculated] */
box_width = width_units * grid_unit;
box_depth = depth_units * grid_unit;
box_height = height_units * 7 + base_height;

// Main module
gridfinity_box();

module gridfinity_box() {
    // Base with stacking feet - ONE simple taper each
    gridfinity_base();
    
    // Box walls - start directly after the foot taper
    // Walls align with base units: base units are at grid positions [gx * grid_unit, gy * grid_unit]
    // The first base unit is at (0, 0), so walls should also start at (0, 0) to align
    translate([0, 0, base_height])
    gridfinity_walls();
}

// Rounded rectangle module for corner rounding (vertical edges only)
module rounded_rect(width, depth, height, radius) {
    if (radius <= 0) {
        cube([width, depth, height]);
    } else {
        r = min(radius, min(width, depth) / 2);
        hull() {
            translate([r, r, 0])
            cylinder(r = r, h = height);
            translate([width - r, r, 0])
            cylinder(r = r, h = height);
            translate([r, depth - r, 0])
            cylinder(r = r, h = height);
            translate([width - r, depth - r, 0])
            cylinder(r = r, h = height);
        }
    }
}

// Cavity with optional floor-wall edge bevel (using same radius as inner corners)
module cavity_with_inner_bevel(width, depth, height, corner_radius, bevel_enabled) {
    if (!bevel_enabled || corner_radius <= 0) {
        // No bevel - use standard rounded_rect
        rounded_rect(width, depth, height, corner_radius);
    } else {
        // Create cavity with rounded vertical corners AND rounded floor-wall edge
        // Use the same corner radius and style as the vertical corners
        r = min(corner_radius, min(width, depth) / 2);
        
        // Use hull of spheres/cylinders similar to rounded_rect, but include floor rounding
        hull() {
            // Bottom corners with floor rounding (spheres at floor level)
            translate([r, r, r])
            sphere(r = r, $fn = $fn);
            translate([width - r, r, r])
            sphere(r = r, $fn = $fn);
            translate([r, depth - r, r])
            sphere(r = r, $fn = $fn);
            translate([width - r, depth - r, r])
            sphere(r = r, $fn = $fn);
            
            // Top corners (cylinders like rounded_rect)
            translate([r, r, height])
            cylinder(r = r, h = 0.01, $fn = $fn);
            translate([width - r, r, height])
            cylinder(r = r, h = 0.01, $fn = $fn);
            translate([r, depth - r, height])
            cylinder(r = r, h = 0.01, $fn = $fn);
            translate([width - r, depth - r, height])
            cylinder(r = r, h = 0.01, $fn = $fn);
        }
    }
}

module gridfinity_base() {
    for (gx = [0:width_units-1]) {
        for (gy = [0:depth_units-1]) {
            translate([gx * grid_unit, gy * grid_unit, 0])
            single_base_unit();
        }
    }
}

module single_base_unit() {
    // Gridfinity base profile - matches baseplate sockets
    // Uses official dimensions from gridfinity_constants.scad
    
    difference() {
        // The stacking foot with proper chamfer profile
        gridfinity_foot();
        
        // Magnet holes
        if (magnet_enabled) {
            magnet_holes();
        }
        
        // Screw holes
        if (screw_enabled) {
            screw_holes();
        }
    }
}

// Rounded rectangle profile for feet - used in hull operations
module rounded_rect_profile(width, depth, height, radius) {
    if (radius <= 0) {
        cube([width, depth, height]);
    } else {
        r = min(radius, min(width, depth) / 2 - 0.01);
        hull() {
            translate([r, r, 0])
            cylinder(r = r, h = height, $fn = $fn);
            translate([width - r, r, 0])
            cylinder(r = r, h = height, $fn = $fn);
            translate([r, depth - r, 0])
            cylinder(r = r, h = height, $fn = $fn);
            translate([width - r, depth - r, 0])
            cylinder(r = r, h = height, $fn = $fn);
        }
    }
}

module gridfinity_foot() {
    // ONE SIMPLE TAPER per foot
    // Small at bottom, expands to full size at top
    // This is what fits into the baseplate socket
    // Angle and height control the taper steepness and size
    
    // Use user-specified feet corner radius, default to standard 3.75mm
    foot_radius = feet_corner_radius > 0 ? feet_corner_radius : gf_corner_radius;
    foot_full_size = grid_unit - clearance * 2;  // 41.5mm at top
    
    // Bottom size - calculated from chamfer angle and height
    // foot_bottom_inset is pre-calculated: height / tan(angle)
    bottom_size = foot_full_size - foot_bottom_inset * 2;
    bottom_radius = foot_bottom_corner_radius;
    
    translate([clearance, clearance, 0])
    hull() {
        // Bottom - smaller size (inset calculated from angle)
        translate([foot_bottom_inset, foot_bottom_inset, 0])
        rounded_rect_profile(bottom_size, bottom_size, 0.01, bottom_radius);
        
        // Top - full size (ONE simple taper from bottom to here)
        translate([0, 0, foot_taper_height - 0.01])
        rounded_rect_profile(foot_full_size, foot_full_size, 0.02, foot_radius);
    }
}

module magnet_holes() {
    positions = [
        [4.8, 4.8],
        [4.8, grid_unit - 4.8],
        [grid_unit - 4.8, 4.8],
        [grid_unit - 4.8, grid_unit - 4.8]
    ];
    
    for (pos = positions) {
        translate([pos[0], pos[1], -0.1])
        cylinder(d = magnet_diameter, h = magnet_depth + 0.1);
    }
}

module screw_holes() {
    positions = [
        [4.8, 4.8],
        [4.8, grid_unit - 4.8],
        [grid_unit - 4.8, 4.8],
        [grid_unit - 4.8, grid_unit - 4.8]
    ];
    
    for (pos = positions) {
        translate([pos[0], pos[1], -0.1])
        cylinder(d = screw_diameter, h = base_height + 0.2);
    }
}

// Walls with small chamfer at bottom edge to prevent overhangs where feet meet walls
module walls_with_bottom_chamfer(width, depth, height, radius, chamfer_height, chamfer_angle) {
    // Create walls with a user-controlled angle chamfer at the bottom edge
    // This prevents the overhang where the foot top meets the wall bottom
    // Calculate horizontal inset from angle: inset = height / tan(angle)
    chamfer_inset = chamfer_height / tan(chamfer_angle);
    hull() {
        // Bottom - slightly inset by chamfer inset amount
        translate([chamfer_inset, chamfer_inset, 0])
        rounded_rect_profile(width - chamfer_inset * 2, depth - chamfer_inset * 2, 0.01, max(0.5, radius - chamfer_inset));
        
        // Just above chamfer - full size
        translate([0, 0, chamfer_height])
        rounded_rect_profile(width, depth, 0.01, radius);
        
        // Top - full size
        translate([0, 0, height - 0.01])
        rounded_rect_profile(width, depth, 0.02, radius);
    }
}

module gridfinity_walls() {
    wall_height = box_height - base_height;
    // Use the standard Gridfinity corner radius or user override
    outer_radius = corner_radius > 0 ? corner_radius : gf_corner_radius;
    inner_radius = max(0, outer_radius - wall_thickness);
    
    // Chamfer height for overhang prevention (fixed at 0.3mm, angle is user-controlled)
    overhang_chamfer_height = 0.3;
    
    difference() {
        // Outer walls with rounded corners
        if (prevent_bottom_overhangs) {
            // Walls with small chamfer at bottom to prevent overhangs
            walls_with_bottom_chamfer(box_width, box_depth, wall_height, outer_radius, overhang_chamfer_height, bottom_overhang_chamfer_angle);
        } else {
            // Standard walls
            rounded_rect(box_width, box_depth, wall_height, outer_radius);
        }
        
        // Inner cavity with rounded corners and optional floor-wall edge bevel
        translate([wall_thickness, wall_thickness, floor_thickness])
        cavity_with_inner_bevel(
            box_width - wall_thickness * 2,
            box_depth - wall_thickness * 2,
            wall_height,
            inner_radius,
            inner_edge_bevel
        );
        
        // Stacking lip cutout at top
        // All lip styles are handled by the stacking_lip_cutout module
        // including "none" (which does nothing)
        stacking_lip_cutout(lip_style, wall_height, outer_radius);
        
        // Finger slide
        if (finger_slide) {
            finger_slide_cutout();
        }
        
        // Tapered corners (internal cutouts at top corners for easier access)
        if (tapered_corner != "none") {
            tapered_corner_cutouts(wall_height, outer_radius);
        }
        
        // Wall pattern
        if (wall_pattern != "none") {
            wall_pattern_cutouts(wall_height);
        }
    }
    
    // Perfect Fit Lip: additive approach - add triangular chamfer on top
    if (lip_style == "perfect_fit") {
        perfect_fit_lip_additive(wall_height, outer_radius);
    }
    
    // Label tab
    if (label_enabled) {
        label_tab();
    }
    
    // Dividers
    if (dividers_x > 0 || dividers_y > 0) {
        dividers();
    }
}

module tapered_corner_cutouts(wall_height, outer_radius) {
    // Create tapered cutouts at the top internal corners for easier item access
    taper_size = tapered_corner_size;
    taper_height = wall_height * 0.6;
    setback = outer_radius > 0 ? outer_radius : gf_corner_radius;
    
    // All four corners
    for (pos = [[setback, setback], [box_width - setback, setback], 
                [setback, box_depth - setback], [box_width - setback, box_depth - setback]]) {
        translate([pos[0], pos[1], wall_height - taper_height])
        if (tapered_corner == "rounded") {
            cylinder(r1 = 0, r2 = taper_size, h = taper_height + 0.1);
        } else {
            // chamfered
            linear_extrude(height = taper_height + 0.1, scale = taper_size / 0.1)
            square(0.1, center = true);
        }
    }
}

module wall_pattern_cutouts(wall_height) {
    // Create decorative/weight-saving patterns on walls
    pattern_depth = wall_thickness * 0.6;
    pattern_border = 5;
    pattern_cell = 10;
    spacing = wall_pattern_spacing;
    
    // Front wall pattern
    translate([pattern_border, -0.1, pattern_border])
    wall_pattern_grid(box_width - pattern_border * 2, wall_height - pattern_border * 2 - gf_lip_total_height, pattern_depth + 0.1, pattern_cell, spacing);
    
    // Back wall pattern  
    translate([pattern_border, box_depth - pattern_depth, pattern_border])
    wall_pattern_grid(box_width - pattern_border * 2, wall_height - pattern_border * 2 - gf_lip_total_height, pattern_depth + 0.1, pattern_cell, spacing);
    
    // Left wall pattern
    translate([-0.1, pattern_border, pattern_border])
    rotate([0, 90, 0])
    rotate([0, 0, 90])
    wall_pattern_grid(box_depth - pattern_border * 2, wall_height - pattern_border * 2 - gf_lip_total_height, pattern_depth + 0.1, pattern_cell, spacing);
    
    // Right wall pattern
    translate([box_width - pattern_depth, pattern_border, pattern_border])
    rotate([0, 90, 0])
    rotate([0, 0, 90])
    wall_pattern_grid(box_depth - pattern_border * 2, wall_height - pattern_border * 2 - gf_lip_total_height, pattern_depth + 0.1, pattern_cell, spacing);
}

module wall_pattern_grid(width, height, depth, cell_size, spacing) {
    cols = floor(width / (cell_size + spacing));
    rows = floor(height / (cell_size + spacing));
    offset_x = (width - cols * (cell_size + spacing) + spacing) / 2;
    offset_y = (height - rows * (cell_size + spacing) + spacing) / 2;
    
    for (col = [0:cols-1]) {
        for (row = [0:rows-1]) {
            translate([offset_x + col * (cell_size + spacing), offset_y + row * (cell_size + spacing), 0])
            if (wall_pattern == "hexgrid") {
                // Hexagonal pattern
                translate([cell_size/2, cell_size/2, 0])
                cylinder(r = cell_size / 2, h = depth, $fn = 6);
            } else if (wall_pattern == "grid") {
                // Square grid
                cube([cell_size, cell_size, depth]);
            } else if (wall_pattern == "voronoi") {
                // Approximate voronoi with offset circles
                translate([cell_size/2, cell_size/2, 0])
                cylinder(r = cell_size / 2 * 0.8, h = depth, $fn = 16);
            } else {
                // Brick pattern
                brick_offset = (row % 2 == 0) ? 0 : cell_size / 2;
                translate([brick_offset, 0, 0])
                cube([cell_size * 1.5, cell_size * 0.7, depth]);
            }
        }
    }
}

// Custom foot-matched lip cutout module
// Creates lip cutouts for different stacking styles
module stacking_lip_cutout(lip_style, wall_height, outer_radius) {
    // Calculate inner dimensions
    inner_wall_radius = max(0, outer_radius - wall_thickness);
    inner_width = box_width - wall_thickness * 2;
    inner_depth = box_depth - wall_thickness * 2;
    
    if (lip_style == "none") {
        // No lip - flat top, no cutout needed
    }
    else if (lip_style == "perfect_fit") {
        // Perfect Fit Lip uses additive approach - no cutout needed here
        // The lip is added in gridfinity_walls() after the difference() block
    }
    else {
        // Other lip styles: chamfers the OUTER top edge of the walls
        // Uses foot_chamfer_angle and foot_chamfer_height directly
        
        // Calculate chamfer inset from foot geometry (same calculation as foot)
        // This is how much the outer edge tapers inward at the top
        chamfer_inset = foot_chamfer_height / tan(foot_chamfer_angle);
        
        // Chamfer the outer wall at the top
        // Creates a tapered shape that, when subtracted, removes the outer corner
        // Result: outer wall slopes inward from (wall_height - foot_chamfer_height) to wall_height
        translate([0, 0, wall_height - foot_chamfer_height])
        difference() {
            // Tapered hull: wide at bottom (outside wall), narrow at top (inside wall)
            hull() {
                // Bottom: just outside the outer wall (removes nothing here)
                translate([-0.1, -0.1, 0])
                rounded_rect(
                    box_width + 0.2,
                    box_depth + 0.2,
                    0.01,
                    outer_radius + 0.1
                );
                
                // Top: inset by chamfer_inset (creates the chamfer)
                translate([chamfer_inset, chamfer_inset, foot_chamfer_height])
                rounded_rect(
                    box_width - chamfer_inset * 2,
                    box_depth - chamfer_inset * 2,
                    0.01,
                    max(0.5, outer_radius - chamfer_inset)
                );
            }
            
            // Protect inner cavity - only cut the outer wall, not the interior
            translate([wall_thickness, wall_thickness, -0.1])
            rounded_rect(
                inner_width,
                inner_depth,
                foot_chamfer_height + 0.2,
                inner_wall_radius
            );
        }
    }
}

module finger_slide_cutout() {
    wall_height = box_height - base_height;
    slide_width = box_width * 0.6;
    slide_depth = 15;
    slide_height = wall_height * 0.5;
    r = finger_slide_radius;
    
    translate([(box_width - slide_width) / 2, -1, wall_height - slide_height])
    if (finger_slide_style == "rounded") {
        // Rounded finger slide
        rotate([-30, 0, 0])
        hull() {
            translate([r, 0, 0])
            cylinder(r = r, h = slide_depth);
            translate([slide_width - r, 0, 0])
            cylinder(r = r, h = slide_depth);
            translate([0, 0, slide_height])
            cube([slide_width, slide_depth, 0.1]);
        }
    } else if (finger_slide_style == "chamfered") {
        // Chamfered finger slide  
        rotate([-30, 0, 0])
        polyhedron(
            points = [
                [0, 0, 0], [slide_width, 0, 0],
                [slide_width, slide_depth, 0], [0, slide_depth, 0],
                [0, 0, slide_height], [slide_width, 0, slide_height],
                [slide_width, slide_depth, slide_height], [0, slide_depth, slide_height]
            ],
            faces = [
                [0,1,2,3], [4,5,6,7], [0,1,5,4],
                [1,2,6,5], [2,3,7,6], [3,0,4,7]
            ]
        );
    } else {
        // Default rectangular
        rotate([-30, 0, 0])
        cube([slide_width, slide_depth, slide_height]);
    }
}

module label_tab() {
    wall_height = box_height - base_height;
    tab_width = box_width * 0.6;
    tab_height = 12;
    tab_depth = 1.2;
    
    translate([(box_width - tab_width) / 2, -0.1, wall_height - tab_height - gf_lip_total_height])
    cube([tab_width, tab_depth + 0.1, tab_height]);
}

module perfect_fit_lip_additive(wall_height, outer_radius) {
    // Additive Perfect Fit Lip: adds a triangular chamfered ring ON TOP of the wall
    // The triangle sits on top, pointing UP, and tapers INWARD as it goes up
    // 
    //     /|  <- triangle on top, pointing up, tapering inward
    //    / |
    //   /  |
    //  /   |
    // /____|  <- wall top edge (z=wall_height)
    // |    |
    // |    |  <- wall below
    //
    // The triangle forms a right triangle with:
    // - Base width: wall_thickness (the horizontal base of the triangle at the wall edge)
    // - Angle: foot_chamfer_angle (the slope angle from horizontal)
    // - Height: calculated to form a 90-degree right triangle
    //   For a right triangle: tan(angle) = height / base
    //   Therefore: height = base * tan(angle) = wall_thickness * tan(foot_chamfer_angle)
    
    // Calculate triangle height from wall thickness and angle
    // This creates a right triangle where:
    // - Base (adjacent) = wall_thickness
    // - Height (opposite) = wall_thickness * tan(foot_chamfer_angle)
    // - Angle = foot_chamfer_angle
    triangle_height = wall_thickness * tan(foot_chamfer_angle);
    
    // Calculate how far the triangle tapers inward at the top
    // For a right triangle with base = wall_thickness and angle = foot_chamfer_angle:
    // The horizontal inset at the top = triangle_height / tan(foot_chamfer_angle)
    // Since triangle_height = wall_thickness * tan(foot_chamfer_angle),
    // inset = (wall_thickness * tan(foot_chamfer_angle)) / tan(foot_chamfer_angle) = wall_thickness
    // So the triangle tapers inward by wall_thickness at the top
    chamfer_inset = wall_thickness;
    
    // Create a triangular ring that sits ON TOP of the wall, pointing UP
    // The triangle has the hypotenuse on the INSIDE (slanted edge faces inward)
    // 
    //     /|  <- triangle on top, hypotenuse on inside (left), vertical edge on outside (right)
    //    / |
    //   /  |
    //  /   |
    // /____|  <- wall top edge
    // |    |
    // |    |  <- wall
    //
    // Mirrored horizontally from the previous version:
    // - Outer edge stays vertical (at box_width) - no change
    // - Inner edge slopes outward (creates / on inside)
    translate([0, 0, wall_height])
    difference() {
        // Outer shape: stays at outer wall edge (vertical edge on outside, no change)
        hull() {
            // Bottom: at the outer wall edge (where triangle sits on wall, z=0)
            translate([0, 0, 0])
            rounded_rect(
                box_width,
                box_depth,
                0.01,
                outer_radius
            );
            
            // Top: stays at outer wall edge (vertical edge, no change)
            translate([0, 0, triangle_height])
            rounded_rect(
                box_width,
                box_depth,
                0.01,
                outer_radius
            );
        }
        
        // Inner cut: creates the hypotenuse on the INSIDE
        // Mirrored from before - inner edge extends OUTWARD at top (creates / on inside)
        hull() {
            // Bottom: at inner wall edge (where hypotenuse starts)
            translate([wall_thickness, wall_thickness, -0.1])
            rounded_rect(
                box_width - wall_thickness * 2,
                box_depth - wall_thickness * 2,
                0.01,
                max(0, outer_radius - wall_thickness)
            );
            
            // Top: extends OUTWARD (mirrored horizontally) to create / on inside
            // This creates the slanted hypotenuse facing inward
            translate([wall_thickness - chamfer_inset, wall_thickness - chamfer_inset, triangle_height + 0.1])
            rounded_rect(
                box_width - (wall_thickness - chamfer_inset) * 2,
                box_depth - (wall_thickness - chamfer_inset) * 2,
                0.01,
                max(0.5, outer_radius - wall_thickness + chamfer_inset)
            );
        }
    }
}

module dividers() {
    wall_height = box_height - base_height;
    inner_width = box_width - wall_thickness * 2;
    inner_depth = box_depth - wall_thickness * 2;
    // Calculate available height (from floor to lip)
    available_height = wall_height - floor_thickness - gf_lip_total_height;
    // Apply height percentage (0-100) to get actual divider height
    divider_height = available_height * (divider_height_percent / 100);
    divider_thickness = 1.2;
    inner_radius = max(0, corner_radius - wall_thickness);
    
    // X dividers (vertical walls along Y axis)
    // These dividers run parallel to the Y axis and divide the box along the X direction
    // They extend from Y=wall_thickness to Y=wall_thickness+inner_depth
    // And are positioned at specific X coordinates within the inner cavity
    if (dividers_x > 0) {
        // Calculate spacing to evenly divide the inner space
        // With dividers_x dividers, we create dividers_x + 1 compartments
        spacing = inner_width / (dividers_x + 1);
        for (i = [1:dividers_x]) {
            // Position divider at i * spacing from the inner wall start
            // The divider should be centered at this position
            divider_center_x = wall_thickness + i * spacing;
            // Position the left edge of the divider (divider extends divider_thickness to the right)
            // This positions the divider so it's centered at divider_center_x
            divider_left_x = divider_center_x - divider_thickness / 2;
            // Position divider within the inner cavity:
            // X: from divider_left_x to divider_left_x+divider_thickness (centered at divider_center_x)
            // Y: from wall_thickness to wall_thickness+inner_depth (full depth of inner cavity)
            // Z: from floor_thickness upward
            translate([divider_left_x, wall_thickness, floor_thickness])
            divider_with_bevel(divider_thickness, inner_depth, divider_height, inner_radius, divider_floor_bevel);
        }
    }
    
    // Y dividers (vertical walls along X axis)
    // These dividers run parallel to the X axis and divide the box along the Y direction
    // They extend from X=wall_thickness to X=wall_thickness+inner_width
    // And are positioned at specific Y coordinates within the inner cavity
    if (dividers_y > 0) {
        // Calculate spacing to evenly divide the inner space
        // With dividers_y dividers, we create dividers_y + 1 compartments
        spacing = inner_depth / (dividers_y + 1);
        for (i = [1:dividers_y]) {
            // Position divider at i * spacing from the inner wall start
            // The divider should be centered at this position
            divider_center_y = wall_thickness + i * spacing;
            // Position the bottom edge of the divider (divider extends divider_thickness in Y direction)
            // This positions the divider so it's centered at divider_center_y
            divider_bottom_y = divider_center_y - divider_thickness / 2;
            // Position divider within the inner cavity:
            // X: from wall_thickness to wall_thickness+inner_width (full width of inner cavity)
            // Y: from divider_bottom_y to divider_bottom_y+divider_thickness (centered at divider_center_y)
            // Z: from floor_thickness upward
            // Create divider directly with [inner_width, divider_thickness, divider_height] - no rotation needed!
            // This matches the X divider pattern: create in correct orientation, just translate to position
            translate([wall_thickness, divider_bottom_y, floor_thickness])
            divider_with_bevel(inner_width, divider_thickness, divider_height, inner_radius, divider_floor_bevel);
        }
    }
}

// Divider with optional floor bevel (using same corner radius style)
module divider_with_bevel(thickness, length, height, corner_radius, bevel_enabled) {
    if (!bevel_enabled || corner_radius <= 0) {
        // No bevel - use simple cube
        cube([thickness, length, height]);
    } else {
        // Create divider with beveled floor edge using same radius as corners
        r = min(corner_radius, min(thickness, length) / 2);
        
        // Use hull of spheres/cylinders similar to cavity bevel
        hull() {
            // Bottom corners with floor rounding (spheres at floor level)
            translate([r, r, r])
            sphere(r = r, $fn = $fn);
            translate([thickness - r, r, r])
            sphere(r = r, $fn = $fn);
            translate([r, length - r, r])
            sphere(r = r, $fn = $fn);
            translate([thickness - r, length - r, r])
            sphere(r = r, $fn = $fn);
            
            // Top corners (cylinders)
            translate([r, r, height])
            cylinder(r = r, h = 0.01, $fn = $fn);
            translate([thickness - r, r, height])
            cylinder(r = r, h = 0.01, $fn = $fn);
            translate([r, length - r, height])
            cylinder(r = r, h = 0.01, $fn = $fn);
            translate([thickness - r, length - r, height])
            cylinder(r = r, h = 0.01, $fn = $fn);
        }
    }
}
`;
  }

  // Generate Baseplate SCAD code
  generateBaseplateScad(config: BaseplateConfig): string {
    // Calculate dimensions based on sizing mode
    let widthUnits: number;
    let depthUnits: number;
    let outerWidthMm: number;
    let outerDepthMm: number;
    let paddingNearX: number;
    let paddingFarX: number;
    let paddingNearY: number;
    let paddingFarY: number;
    let useFillMode: boolean;
    
    if (config.sizingMode === 'fill_area_mm') {
      // Calculate grid from target mm dimensions
      const calc = calculateGridFromMm(
        config.targetWidthMm,
        config.targetDepthMm,
        config.gridSize,
        config.allowHalfCellsX,
        config.allowHalfCellsY,
        config.paddingAlignment
      );
      
      widthUnits = calc.gridUnitsX;
      depthUnits = calc.gridUnitsY;
      outerWidthMm = config.targetWidthMm;
      outerDepthMm = config.targetDepthMm;
      paddingNearX = calc.paddingNearX;
      paddingFarX = calc.paddingFarX;
      paddingNearY = calc.paddingNearY;
      paddingFarY = calc.paddingFarY;
      useFillMode = true;
    } else {
      // Standard grid units mode
      widthUnits = config.width;
      depthUnits = config.depth;
      outerWidthMm = config.width * config.gridSize;
      outerDepthMm = config.depth * config.gridSize;
      paddingNearX = 0;
      paddingFarX = 0;
      paddingNearY = 0;
      paddingFarY = 0;
      useFillMode = false;
    }
    
    // Determine position alignment for SCAD
    const positionFillGridX = config.paddingAlignment === 'near' ? 'far' : 
                              config.paddingAlignment === 'far' ? 'near' : 'center';
    const positionFillGridY = positionFillGridX;
    
    return `// Gridfinity Baseplate Generator
// Compatible with standard OpenSCAD
// Socket profile matches bin foot for proper fit
// ${useFillMode ? `Fill mode: Target ${outerWidthMm}mm x ${outerDepthMm}mm` : 'Grid units mode'}

/* [Configuration] */
width_units = ${widthUnits};
depth_units = ${depthUnits};
outer_width_mm = ${outerWidthMm};
outer_depth_mm = ${outerDepthMm};
use_fill_mode = ${useFillMode};
padding_near_x = ${paddingNearX.toFixed(2)};
padding_far_x = ${paddingFarX.toFixed(2)};
padding_near_y = ${paddingNearY.toFixed(2)};
padding_far_y = ${paddingFarY.toFixed(2)};
style = "${config.style}";
plate_style = "${config.plateStyle}";
magnet_diameter = ${config.magnetDiameter};
magnet_depth = ${config.magnetDepth};
magnet_z_offset = ${config.magnetZOffset};
magnet_top_cover = ${config.magnetTopCover};
screw_diameter = ${config.screwDiameter};
center_screw = ${config.centerScrew};
weight_cavity = ${config.weightCavity};
remove_bottom_taper = ${config.removeBottomTaper};
corner_radius = ${config.cornerRadius};
grid_unit = ${config.gridSize};
socket_chamfer_angle = ${config.socketChamferAngle};
socket_chamfer_height = ${config.socketChamferHeight};
socket_bottom_corner_radius = ${config.socketBottomCornerRadius};

/* [Constants - Official Gridfinity Spec] */
clearance = 0.25;  // Gap between bin and socket walls

// Socket profile - ONE SIMPLE TAPER matching bin foot
// Full size at top, tapers down to smaller size at bottom
// Chamfer angle determines the taper steepness
socket_taper_height = socket_chamfer_height;
// Calculate bottom inset from angle: inset = height / tan(angle)
socket_bottom_inset = socket_chamfer_height / tan(socket_chamfer_angle);
socket_depth = socket_taper_height;

// The baseplate is just the socket frame - no solid floor underneath
// Sockets are OPEN (go all the way through)
plate_height = socket_depth;

$fn = 32;

/* [Calculated] */
// Grid coverage (actual grid area)
grid_width = width_units * grid_unit;
grid_depth = depth_units * grid_unit;

// Total plate size (grid + padding)
plate_width = use_fill_mode ? outer_width_mm : grid_width;
plate_depth = use_fill_mode ? outer_depth_mm : grid_depth;

// Grid offset (where the grid starts within the plate)
// When using fill mode with padding, offset the grid by the near padding amount
// This positions the grid correctly within the plate for proper centering
grid_offset_x = use_fill_mode ? padding_near_x : 0;
grid_offset_y = use_fill_mode ? padding_near_y : 0;

// Main module
gridfinity_baseplate();

// Rounded rectangle module for baseplate
module rounded_rect_plate(width, depth, height, radius) {
    if (radius <= 0) {
        cube([width, depth, height]);
    } else {
        r = min(radius, min(width, depth) / 2 - 0.01);
        hull() {
            translate([r, r, 0])
            cylinder(r = r, h = height);
            translate([width - r, r, 0])
            cylinder(r = r, h = height);
            translate([r, depth - r, 0])
            cylinder(r = r, h = height);
            translate([width - r, depth - r, 0])
            cylinder(r = r, h = height);
        }
    }
}

module gridfinity_baseplate() {
    // Plate is created at origin with full dimensions
    // Grid sockets are offset by grid_offset_x/y to position them correctly within the plate
    difference() {
        // Main plate body with rounded corners (full size including padding)
        rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
        
        // Socket cutouts for each grid unit
        // Handle both full and half cells
        // Half cells go on the FAR edge (right/back) at high X, high Y
        // After Y-axis flip in preview, high Y becomes low Z (left), so half cells appear on left
        full_cells_x = floor(width_units);
        full_cells_y = floor(depth_units);
        has_half_x = width_units - full_cells_x >= 0.5;
        has_half_y = depth_units - full_cells_y >= 0.5;
        half_cell_size = grid_unit / 2;
        
        // Full grid cells - positioned at grid_offset for proper centering
        for (gx = [0:full_cells_x-1]) {
            for (gy = [0:full_cells_y-1]) {
                translate([grid_offset_x + gx * grid_unit, grid_offset_y + gy * grid_unit, 0])
                grid_socket(grid_unit, grid_unit);
            }
        }
        
        // Half cells on X edge (far/right side) - AFTER full cells, at high X values
        if (has_half_x) {
            for (gy = [0:full_cells_y-1]) {
                translate([grid_offset_x + full_cells_x * grid_unit, grid_offset_y + gy * grid_unit, 0])
                grid_socket(half_cell_size, grid_unit);
            }
        }
        
        // Half cells on Y edge (far/back side) - AFTER full cells, at high Y values
        // After transformation, high Y becomes low Z (left side)
        if (has_half_y) {
            for (gx = [0:full_cells_x-1]) {
                translate([grid_offset_x + gx * grid_unit, grid_offset_y + full_cells_y * grid_unit, 0])
                grid_socket(grid_unit, half_cell_size);
            }
        }
        
        // Corner half cell (if both X and Y have half cells) - far corner at high X, high Y
        if (has_half_x && has_half_y) {
            translate([grid_offset_x + full_cells_x * grid_unit, grid_offset_y + full_cells_y * grid_unit, 0])
            grid_socket(half_cell_size, half_cell_size);
        }
    }
}

// Rounded rectangle profile for sockets - used in hull operations
module socket_rounded_rect(width, depth, height, radius) {
    if (radius <= 0) {
        cube([width, depth, height]);
    } else {
        r = min(radius, min(width, depth) / 2 - 0.01);
        hull() {
            translate([r, r, 0])
            cylinder(r = r, h = height);
            translate([width - r, r, 0])
            cylinder(r = r, h = height);
            translate([r, depth - r, 0])
            cylinder(r = r, h = height);
            translate([width - r, depth - r, 0])
            cylinder(r = r, h = height);
        }
    }
}

module grid_socket(cell_width = grid_unit, cell_depth = grid_unit) {
    // Socket that receives Gridfinity bin foot
    // ONE SIMPLE TAPER - full size at top, smaller at bottom
    // OPEN SOCKET - goes all the way through!
    // 
    // Matches the foot: foot is small at bottom, full at top
    // Socket is full at top, small at bottom (inverse)
    // Angle and height control the taper (should match foot)
    // Supports full cells (42mm) and half cells (21mm)
    
    socket_width = cell_width - clearance * 2;
    socket_depth_size = cell_depth - clearance * 2;
    socket_corner_radius = 3.75;  // Standard Gridfinity corner radius for sockets
    
    // Bottom size - calculated from chamfer angle and height
    // socket_bottom_inset is pre-calculated: height / tan(angle)
    bottom_width = socket_width - socket_bottom_inset * 2;
    bottom_depth = socket_depth_size - socket_bottom_inset * 2;
    bottom_radius = socket_bottom_corner_radius;
    
    // The socket is an open hole with ONE simple taper
    translate([clearance, clearance, -0.1]) {
        hull() {
            // Top of socket - full size
            translate([0, 0, plate_height])
            socket_rounded_rect(socket_width, socket_depth_size, 0.2, socket_corner_radius);
            
            // Bottom of socket - smaller size (ONE simple taper from top to here)
            if (!remove_bottom_taper) {
                translate([socket_bottom_inset, socket_bottom_inset, 0])
                socket_rounded_rect(bottom_width, bottom_depth, 0.2, bottom_radius);
            } else {
                // No taper - vertical walls at full size
                translate([0, 0, 0])
                socket_rounded_rect(socket_width, socket_depth_size, 0.2, socket_corner_radius);
            }
        }
    }
    
    // Only add features for full-size cells
    is_full_cell = cell_width >= grid_unit - 0.1 && cell_depth >= grid_unit - 0.1;
    
    // Magnet holes (only for full cells)
    if (style == "magnet" && is_full_cell) {
        magnet_holes();
    }
    
    // Screw holes (corner) (only for full cells)
    if (style == "screw" && is_full_cell) {
        screw_holes();
    }
    
    // Center screw hole (only for full cells)
    if (center_screw && is_full_cell) {
        center_screw_hole();
    }
    
    // Weight cavity (only for full cells)
    if ((weight_cavity || style == "weighted") && is_full_cell) {
        weight_cavity_cutout();
    }
}

module center_screw_hole() {
    // Center mounting screw hole
    translate([grid_unit / 2, grid_unit / 2, -0.1])
    union() {
        cylinder(d = screw_diameter, h = plate_height + 0.2);
        // Countersink at top
        translate([0, 0, plate_height - 2.4])
        cylinder(d1 = screw_diameter, d2 = screw_diameter * 2.5, h = 2.5);
    }
}

module weight_cavity_cutout() {
    // Large central cavity for adding weight (lead, steel, etc.)
    cavity_size = 21.4;  // Standard gridfinity weight cavity
    cavity_depth = 4;
    
    translate([(grid_unit - cavity_size) / 2, (grid_unit - cavity_size) / 2, -0.1])
    cube([cavity_size, cavity_size, cavity_depth + 0.1]);
}

module magnet_holes() {
    // For magnet style, we cut holes in the corner posts
    // Magnet positions: 4.8mm from each edge of grid unit
    positions = [
        [4.8, 4.8],
        [4.8, grid_unit - 4.8],
        [grid_unit - 4.8, 4.8],
        [grid_unit - 4.8, grid_unit - 4.8]
    ];
    
    // Calculate magnet hole position based on z-offset and top cover
    magnet_z = magnet_z_offset > 0 ? magnet_z_offset : 
               magnet_top_cover > 0 ? plate_height - magnet_depth - magnet_top_cover : 
               plate_height - magnet_depth;
    
    for (pos = positions) {
        translate([pos[0], pos[1], magnet_z])
        cylinder(d = magnet_diameter, h = magnet_depth + 0.1);
        
        // If using z-offset, create access hole from bottom
        if (magnet_z_offset > 0) {
            translate([pos[0], pos[1], -0.1])
            cylinder(d = magnet_diameter * 0.6, h = magnet_z_offset + 0.1);
        }
    }
}

module screw_holes() {
    // Screw holes go through the corner posts
    positions = [
        [4.8, 4.8],
        [4.8, grid_unit - 4.8],
        [grid_unit - 4.8, 4.8],
        [grid_unit - 4.8, grid_unit - 4.8]
    ];
    
    for (pos = positions) {
        // Countersunk screw hole
        translate([pos[0], pos[1], -0.1])
        union() {
            cylinder(d = screw_diameter, h = plate_height + 0.2);
            // Countersink at top
            translate([0, 0, plate_height - 2.4])
            cylinder(d1 = screw_diameter, d2 = screw_diameter * 2.5, h = 2.5);
        }
    }
}

`;
  }

  // Render SCAD to STL
  private async renderScad(scadContent: string, prefix: string, timeoutMs: number = 300000): Promise<{ stlUrl: string; scadContent: string; filename: string }> {
    const id = uuidv4().substring(0, 8);
    const scadFilename = `${prefix}_${id}.scad`;
    const stlFilename = `${prefix}_${id}.stl`;
    const scadFilePath = path.join(this.outputPath, scadFilename);
    const stlFilePath = path.join(this.outputPath, stlFilename);

    // Write SCAD file
    fs.writeFileSync(scadFilePath, scadContent);

    try {
      // Run OpenSCAD to generate STL
      const openscadCmd = process.env.OPENSCAD_PATH || 'openscad';
      const cmd = `${openscadCmd} -o "${stlFilePath}" "${scadFilePath}"`;
      
      await execAsync(cmd, { timeout: timeoutMs }); // Configurable timeout (default 5 minutes for large models)

      // Clean up SCAD file
      fs.unlinkSync(scadFilePath);

      return {
        stlUrl: `/files/${stlFilename}`,
        scadContent,
        filename: stlFilename
      };
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(scadFilePath)) {
        fs.unlinkSync(scadFilePath);
      }
      throw error;
    }
  }

  // Clean up old generated files
  cleanupOldFiles(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    const files = fs.readdirSync(this.outputPath);

    for (const file of files) {
      const filePath = path.join(this.outputPath, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
      }
    }
  }
}
