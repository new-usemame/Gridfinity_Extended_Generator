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
    // Calculate total grid units based on sizing mode
    let totalGridUnitsX: number;
    let totalGridUnitsY: number;
    
    if (config.sizingMode === 'fill_area_mm') {
      const calc = calculateGridFromMm(
        config.targetWidthMm,
        config.targetDepthMm,
        config.gridSize,
        config.allowHalfCellsX,
        config.allowHalfCellsY,
        config.paddingAlignment
      );
      totalGridUnitsX = Math.floor(calc.gridUnitsX); // Only use full cells for splitting
      totalGridUnitsY = Math.floor(calc.gridUnitsY);
    } else {
      totalGridUnitsX = Math.floor(config.width);
      totalGridUnitsY = Math.floor(config.depth);
    }

    // Calculate split
    const splitInfo = splitBaseplateForPrinter(
      totalGridUnitsX,
      totalGridUnitsY,
      config.printerBedWidth,
      config.printerBedDepth,
      config.gridSize,
      config.connectorEnabled
    );

    // Generate a combined preview SCAD (faster - single render)
    const combinedScad = this.generateCombinedPreviewScad(config, splitInfo);
    const combinedResult = await this.renderScad(combinedScad, 'baseplate_preview');
    
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
        let posX = 0;
        let posY = 0;
        
        for (let i = 0; i < sx; i++) {
          posX += splitInfo.segments[sy][i].gridUnitsX * gridSize + gap;
        }
        for (let i = 0; i < sy; i++) {
          posY += splitInfo.segments[i][sx].gridUnitsY * gridSize + gap;
        }
        
        segmentPlacements += `
    // Segment [${sx}, ${sy}]
    translate([${posX}, ${posY}, 0])
    segment_base(${segment.gridUnitsX}, ${segment.gridUnitsY}, "${leftEdge}", "${rightEdge}", "${frontEdge}", "${backEdge}");
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
module segment_base(width_units, depth_units, left_edge, right_edge, front_edge, back_edge) {
    plate_width = width_units * grid_unit;
    plate_depth = depth_units * grid_unit;
    
    difference() {
        union() {
            // Main plate body
            rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
            
            // Right edge teeth (male or female depending on type)
            if (right_edge == "male") {
                for (i = [1 : max(1, depth_units) - 1]) {
                    translate([plate_width, i * grid_unit, 0])
                    rotate([0, 0, -90])
                    male_tooth_3d(edge_pattern, plate_height);
                }
                if (depth_units == 1) {
                    translate([plate_width, 0.5 * grid_unit, 0])
                    rotate([0, 0, -90])
                    male_tooth_3d(edge_pattern, plate_height);
                }
            }
            
            // Back edge teeth
            if (back_edge == "male") {
                for (i = [1 : max(1, width_units) - 1]) {
                    translate([i * grid_unit, plate_depth, 0])
                    male_tooth_3d(edge_pattern, plate_height);
                }
                if (width_units == 1) {
                    translate([0.5 * grid_unit, plate_depth, 0])
                    male_tooth_3d(edge_pattern, plate_height);
                }
            }
            
            // Left edge male teeth (if overridden to male)
            if (left_edge == "male") {
                for (i = [1 : max(1, depth_units) - 1]) {
                    translate([0, i * grid_unit, 0])
                    rotate([0, 0, -90])
                    male_tooth_3d(edge_pattern, plate_height);
                }
                if (depth_units == 1) {
                    translate([0, 0.5 * grid_unit, 0])
                    rotate([0, 0, -90])
                    male_tooth_3d(edge_pattern, plate_height);
                }
            }
            
            // Front edge male teeth (if overridden to male)
            if (front_edge == "male") {
                for (i = [1 : max(1, width_units) - 1]) {
                    translate([i * grid_unit, 0, 0])
                    male_tooth_3d(edge_pattern, plate_height);
                }
                if (width_units == 1) {
                    translate([0.5 * grid_unit, 0, 0])
                    male_tooth_3d(edge_pattern, plate_height);
                }
            }
        }
        
        // Socket cutouts
        for (gx = [0:width_units-1]) {
            for (gy = [0:depth_units-1]) {
                translate([gx * grid_unit, gy * grid_unit, 0])
                grid_socket();
            }
        }
        
        // Left edge cavities
        if (left_edge == "female") {
            for (i = [1 : max(1, depth_units) - 1]) {
                translate([0, i * grid_unit, 0])
                rotate([0, 0, -90])
                female_cavity_3d(edge_pattern, plate_height);
            }
            if (depth_units == 1) {
                translate([0, 0.5 * grid_unit, 0])
                rotate([0, 0, -90])
                female_cavity_3d(edge_pattern, plate_height);
            }
        }
        
        // Front edge cavities
        if (front_edge == "female") {
            for (i = [1 : max(1, width_units) - 1]) {
                translate([i * grid_unit, 0, 0])
                female_cavity_3d(edge_pattern, plate_height);
            }
            if (width_units == 1) {
                translate([0.5 * grid_unit, 0, 0])
                female_cavity_3d(edge_pattern, plate_height);
            }
        }
        
        // Right edge cavities (if overridden to female)
        if (right_edge == "female") {
            for (i = [1 : max(1, depth_units) - 1]) {
                translate([plate_width, i * grid_unit, 0])
                rotate([0, 0, -90])
                female_cavity_3d(edge_pattern, plate_height);
            }
            if (depth_units == 1) {
                translate([plate_width, 0.5 * grid_unit, 0])
                rotate([0, 0, -90])
                female_cavity_3d(edge_pattern, plate_height);
            }
        }
        
        // Back edge cavities (if overridden to female)
        if (back_edge == "female") {
            for (i = [1 : max(1, width_units) - 1]) {
                translate([i * grid_unit, plate_depth, 0])
                female_cavity_3d(edge_pattern, plate_height);
            }
            if (width_units == 1) {
                translate([0.5 * grid_unit, plate_depth, 0])
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

module grid_socket() {
    socket_width = grid_unit - clearance * 2;
    socket_depth_size = grid_unit - clearance * 2;
    socket_corner_radius = 3.75;
    bottom_width = socket_width - socket_bottom_inset * 2;
    bottom_depth = socket_depth_size - socket_bottom_inset * 2;
    bottom_radius = max(0.5, socket_corner_radius - socket_bottom_inset);
    
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
    
    if (style == "magnet") {
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
    } else {
      totalGridUnitsX = Math.floor(config.width);
      totalGridUnitsY = Math.floor(config.depth);
    }

    const splitInfo = splitBaseplateForPrinter(
      totalGridUnitsX,
      totalGridUnitsY,
      config.printerBedWidth,
      config.printerBedDepth,
      config.gridSize,
      config.connectorEnabled
    );

    // Get segment info
    const segmentInfo = splitInfo.segments[segmentY][segmentX];
    const scadContent = this.generateSegmentScad(config, segmentInfo);
    
    return this.renderScad(scadContent, `segment_${segmentX}_${segmentY}`);
  }

  // Generate OpenSCAD modules for edge patterns (5 patterns, male + female)
  generateEdgePatternModules(config: BaseplateConfig): string {
    const tolerance = config.connectorTolerance;
    const toothDepth = config.toothDepth;
    const toothWidth = config.toothWidth;
    
    return `
// ===========================================
// EDGE PATTERN MODULES (Male/Female Interlocking)
// 2D profiles extruded vertically - NO overhangs
// ===========================================

tooth_depth = ${toothDepth};
tooth_width = ${toothWidth};
edge_tolerance = ${tolerance};

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

// --- PATTERN 6: PUZZLE SMOOTH (Jigsaw with concave swoop) ---
// Classic puzzle bulb but with concave hourglass neck - no sharp corners
// The neck curves INWARD (concave) before swooping out to the bulb
// Allows printhead to trace smooth continuous curves
module puzzle_smooth_male_2d() {
    bulb_radius = tooth_width * 0.4;
    neck_length = tooth_depth - bulb_radius;
    
    // Base width (where it meets plate) - wider for stability
    base_half_width = tooth_width * 0.4;
    // Narrowest point of the concave neck (waist)
    waist_half_width = tooth_width * 0.2;
    waist_y = neck_length * 0.5;  // Middle of neck
    
    // Create smooth concave curve using polygon points
    // Generate points for the concave swoop on each side
    steps = 12;
    
    // Build polygon with concave sides leading to bulb
    points = concat(
        // Right side: base to waist (concave inward curve)
        [for (i = [0:steps]) 
            let(t = i/steps,
                // Sine curve creates smooth concave swoop
                x = base_half_width - (base_half_width - waist_half_width) * sin(t * 90),
                y = t * waist_y)
            [x, y]
        ],
        // Right side: waist to bulb connection (concave outward to meet bulb)
        [for (i = [1:steps])
            let(t = i/steps,
                // Curve back out to meet the bulb
                x = waist_half_width + (bulb_radius - waist_half_width) * sin(t * 90),
                y = waist_y + t * (neck_length - waist_y))
            [x, y]
        ],
        // Bulb arc (top half of circle)
        [for (a = [-90:10:270])
            [bulb_radius * cos(a), neck_length + bulb_radius * sin(a)]
        ],
        // Left side: bulb connection back to waist
        [for (i = [steps:-1:1])
            let(t = i/steps,
                x = -(waist_half_width + (bulb_radius - waist_half_width) * sin(t * 90)),
                y = waist_y + t * (neck_length - waist_y))
            [x, y]
        ],
        // Left side: waist back to base
        [for (i = [steps:-1:0])
            let(t = i/steps,
                x = -(base_half_width - (base_half_width - waist_half_width) * sin(t * 90)),
                y = t * waist_y)
            [x, y]
        ]
    );
    
    polygon(points);
}

module puzzle_smooth_female_2d() {
    bulb_radius = tooth_width * 0.4 + edge_tolerance;
    neck_length = tooth_depth - (tooth_width * 0.4);
    
    base_half_width = tooth_width * 0.4 + edge_tolerance;
    waist_half_width = tooth_width * 0.2 + edge_tolerance;
    waist_y = neck_length * 0.5;
    
    steps = 12;
    
    points = concat(
        [for (i = [0:steps]) 
            let(t = i/steps,
                x = base_half_width - (base_half_width - waist_half_width) * sin(t * 90),
                y = -edge_tolerance + t * (waist_y + edge_tolerance))
            [x, y]
        ],
        [for (i = [1:steps])
            let(t = i/steps,
                x = waist_half_width + (bulb_radius - waist_half_width) * sin(t * 90),
                y = waist_y + t * (neck_length - waist_y))
            [x, y]
        ],
        [for (a = [-90:10:270])
            [bulb_radius * cos(a), neck_length + bulb_radius * sin(a)]
        ],
        [for (i = [steps:-1:1])
            let(t = i/steps,
                x = -(waist_half_width + (bulb_radius - waist_half_width) * sin(t * 90)),
                y = waist_y + t * (neck_length - waist_y))
            [x, y]
        ],
        [for (i = [steps:-1:0])
            let(t = i/steps,
                x = -(base_half_width - (base_half_width - waist_half_width) * sin(t * 90)),
                y = -edge_tolerance + t * (waist_y + edge_tolerance))
            [x, y]
        ]
    );
    
    polygon(points);
}

// --- PATTERN 7: T-SLOT SMOOTH (T-shape with concave stem) ---
// T-head locking but with concave hourglass stem - no harsh direction changes
// Stem curves inward (concave) creating smooth flow for printhead
module tslot_smooth_male_2d() {
    head_width = tooth_width;
    head_depth = tooth_depth * 0.3;
    stem_length = tooth_depth - head_depth;
    
    // Base width (where it meets plate)
    base_half_width = tooth_width * 0.3;
    // Waist (narrowest part of concave stem)
    waist_half_width = tooth_width * 0.15;
    waist_y = stem_length * 0.6;
    
    steps = 10;
    
    // Build the concave stem shape
    stem_points = concat(
        // Right side: base to waist (concave inward)
        [for (i = [0:steps]) 
            let(t = i/steps,
                x = base_half_width - (base_half_width - waist_half_width) * sin(t * 90),
                y = t * waist_y)
            [x, y]
        ],
        // Right side: waist swoops out to meet T-head
        [for (i = [1:steps])
            let(t = i/steps,
                x = waist_half_width + (head_width/2 - waist_half_width) * sin(t * 90),
                y = waist_y + t * (stem_length - waist_y))
            [x, y]
        ]
    );
    
    union() {
        // Concave stem
        polygon(concat(
            stem_points,
            // T-head top edge
            [[head_width/2, stem_length + head_depth],
             [-head_width/2, stem_length + head_depth]],
            // Left side mirror (reversed)
            [for (i = [len(stem_points)-1:-1:0])
                [-stem_points[i][0], stem_points[i][1]]
            ]
        ));
    }
}

module tslot_smooth_female_2d() {
    head_width = tooth_width + edge_tolerance * 2;
    head_depth = tooth_depth * 0.3 + edge_tolerance;
    stem_length = tooth_depth - (tooth_depth * 0.3);
    
    base_half_width = tooth_width * 0.3 + edge_tolerance;
    waist_half_width = tooth_width * 0.15 + edge_tolerance;
    waist_y = stem_length * 0.6;
    
    steps = 10;
    
    stem_points = concat(
        [for (i = [0:steps]) 
            let(t = i/steps,
                x = base_half_width - (base_half_width - waist_half_width) * sin(t * 90),
                y = -edge_tolerance + t * (waist_y + edge_tolerance))
            [x, y]
        ],
        [for (i = [1:steps])
            let(t = i/steps,
                x = waist_half_width + (head_width/2 - waist_half_width) * sin(t * 90),
                y = waist_y + t * (stem_length - waist_y))
            [x, y]
        ]
    );
    
    polygon(concat(
        stem_points,
        [[head_width/2, stem_length + head_depth],
         [-head_width/2, stem_length + head_depth]],
        [for (i = [len(stem_points)-1:-1:0])
            [-stem_points[i][0], stem_points[i][1]]
        ]
    ));
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
    else dovetail_female_2d(); // default
}

// 3D male tooth (extruded)
module male_tooth_3d(pattern, height) {
    linear_extrude(height = height)
    edge_tooth_male(pattern);
}

// 3D female cavity (extruded, for difference)
module female_cavity_3d(pattern, height) {
    translate([0, 0, -0.1])
    linear_extrude(height = height + 0.2)
    edge_tooth_female(pattern);
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
    
    // Generate edge pattern modules
    const edgePatternModules = this.generateEdgePatternModules(config);
    
    // Generate male/female edge code (with override support)
    const edgeCode = this.generateEdgeCode(segment, gridSize, plateHeight, edgePattern, config.edgeOverrides || []);
    
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
edge_pattern = "${edgePattern}";

/* [Edge Settings] */
has_male_right = ${segment.hasConnectorRight};
has_male_back = ${segment.hasConnectorBack};
has_female_left = ${segment.hasConnectorLeft};
has_female_front = ${segment.hasConnectorFront};

/* [Constants] */
clearance = 0.25;
socket_taper_height = socket_chamfer_height;
socket_bottom_inset = socket_chamfer_height / tan(socket_chamfer_angle);
socket_depth = socket_taper_height;
plate_height = socket_depth;

$fn = 32;

/* [Calculated] */
plate_width = width_units * grid_unit;
plate_depth = depth_units * grid_unit;

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
        for (gx = [0:width_units-1]) {
            for (gy = [0:depth_units-1]) {
                translate([gx * grid_unit, gy * grid_unit, 0])
                grid_socket();
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

module grid_socket() {
    socket_width = grid_unit - clearance * 2;
    socket_depth_size = grid_unit - clearance * 2;
    socket_corner_radius = 3.75;
    
    bottom_width = socket_width - socket_bottom_inset * 2;
    bottom_depth = socket_depth_size - socket_bottom_inset * 2;
    bottom_radius = max(0.5, socket_corner_radius - socket_bottom_inset);
    
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
    
    if (style == "magnet") {
        magnet_holes();
    }
    
    if (style == "screw") {
        screw_holes();
    }
    
    if (center_screw) {
        center_screw_hole();
    }
    
    if (weight_cavity || style == "weighted") {
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
    edgeOverrides: SegmentEdgeOverride[] = []
  ): { maleTeeth: string; femaleCavities: string } {
    const maleTeeth: string[] = [];
    const femaleCavities: string[] = [];
    
    // Helper to get tooth positions - at grid cell boundaries
    const getPositions = (units: number, forSingleUnit: boolean): number[] => {
      const positions: number[] = [];
      if (units === 1 && forSingleUnit) {
        // Single unit - put tooth at center
        positions.push(0.5 * gridSize);
      } else {
        // Multiple units - put teeth at grid boundaries (between cells)
        for (let i = 1; i < units; i++) {
          positions.push(i * gridSize);
        }
      }
      return positions;
    };

    // Get edge types (with override support)
    const rightEdgeType = this.getEdgeType(segment, 'right', edgeOverrides);
    const backEdgeType = this.getEdgeType(segment, 'back', edgeOverrides);
    const leftEdgeType = this.getEdgeType(segment, 'left', edgeOverrides);
    const frontEdgeType = this.getEdgeType(segment, 'front', edgeOverrides);
    
    // RIGHT EDGE
    if (rightEdgeType === 'male') {
      const positions = getPositions(segment.gridUnitsY, true);
      for (const y of positions) {
        maleTeeth.push(`
            // Right edge male tooth at Y=${y}
            translate([plate_width, ${y}, 0])
            rotate([0, 0, -90])
            male_tooth_3d("${edgePattern}", plate_height);`);
      }
    } else if (rightEdgeType === 'female') {
      const positions = getPositions(segment.gridUnitsY, true);
      for (const y of positions) {
        femaleCavities.push(`
        // Right edge female cavity at Y=${y}
        translate([plate_width, ${y}, 0])
        rotate([0, 0, -90])
        female_cavity_3d("${edgePattern}", plate_height);`);
      }
    }
    
    // BACK EDGE
    if (backEdgeType === 'male') {
      const positions = getPositions(segment.gridUnitsX, true);
      for (const x of positions) {
        maleTeeth.push(`
            // Back edge male tooth at X=${x}
            translate([${x}, plate_depth, 0])
            rotate([0, 0, 0])
            male_tooth_3d("${edgePattern}", plate_height);`);
      }
    } else if (backEdgeType === 'female') {
      const positions = getPositions(segment.gridUnitsX, true);
      for (const x of positions) {
        femaleCavities.push(`
        // Back edge female cavity at X=${x}
        translate([${x}, plate_depth, 0])
        rotate([0, 0, 0])
        female_cavity_3d("${edgePattern}", plate_height);`);
      }
    }
    
    // LEFT EDGE
    if (leftEdgeType === 'female') {
      const positions = getPositions(segment.gridUnitsY, true);
      for (const y of positions) {
        femaleCavities.push(`
        // Left edge female cavity at Y=${y}
        translate([0, ${y}, 0])
        rotate([0, 0, -90])
        female_cavity_3d("${edgePattern}", plate_height);`);
      }
    } else if (leftEdgeType === 'male') {
      const positions = getPositions(segment.gridUnitsY, true);
      for (const y of positions) {
        maleTeeth.push(`
            // Left edge male tooth at Y=${y}
            translate([0, ${y}, 0])
            rotate([0, 0, -90])
            male_tooth_3d("${edgePattern}", plate_height);`);
      }
    }
    
    // FRONT EDGE
    if (frontEdgeType === 'female') {
      const positions = getPositions(segment.gridUnitsX, true);
      for (const x of positions) {
        femaleCavities.push(`
        // Front edge female cavity at X=${x}
        translate([${x}, 0, 0])
        rotate([0, 0, 0])
        female_cavity_3d("${edgePattern}", plate_height);`);
      }
    } else if (frontEdgeType === 'male') {
      const positions = getPositions(segment.gridUnitsX, true);
      for (const x of positions) {
        maleTeeth.push(`
            // Front edge male tooth at X=${x}
            translate([${x}, 0, 0])
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
lip_style = "${config.lipStyle}";
dividers_x = ${config.dividersX};
dividers_y = ${config.dividersY};
finger_slide = ${config.fingerSlide};
finger_slide_style = "${config.fingerSlideStyle}";
finger_slide_radius = ${config.fingerSlideRadius};
label_enabled = ${config.labelEnabled};
corner_radius = ${config.cornerRadius};
prevent_bottom_overhangs = ${config.preventBottomOverhangs};
feet_corner_radius = ${config.feetCornerRadius};
grid_unit = ${config.gridSize};
foot_chamfer_angle = ${config.footChamferAngle};
foot_chamfer_height = ${config.footChamferHeight};
flat_base = "${config.flatBase}";
efficient_floor = "${config.efficientFloor}";
tapered_corner = "${config.taperedCorner}";
tapered_corner_size = ${config.taperedCornerSize};
wall_pattern = "${config.wallPattern}";
wall_pattern_spacing = ${config.wallPatternSpacing};

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
stacking_lip_height = 4.4;
gf_corner_radius = 3.75;  // Standard Gridfinity corner radius
clearance = 0.25;  // Gap from grid edge
$fn = 32;

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
    bottom_radius = max(0.5, foot_radius - foot_bottom_inset);
    
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
module walls_with_bottom_chamfer(width, depth, height, radius, chamfer) {
    // Create walls with a small 45-degree chamfer at the bottom edge
    // This prevents the overhang where the foot top meets the wall bottom
    hull() {
        // Bottom - slightly inset by chamfer amount
        translate([chamfer, chamfer, 0])
        rounded_rect_profile(width - chamfer * 2, depth - chamfer * 2, 0.01, max(0.5, radius - chamfer));
        
        // Just above chamfer - full size
        translate([0, 0, chamfer])
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
    
    // Chamfer size for overhang prevention (45-degree, 0.3mm)
    overhang_chamfer = 0.3;
    
    difference() {
        // Outer walls with rounded corners
        if (prevent_bottom_overhangs) {
            // Walls with small chamfer at bottom to prevent overhangs
            walls_with_bottom_chamfer(box_width, box_depth, wall_height, outer_radius, overhang_chamfer);
        } else {
            // Standard walls
            rounded_rect(box_width, box_depth, wall_height, outer_radius);
        }
        
        // Inner cavity with rounded corners
        translate([wall_thickness, wall_thickness, floor_thickness])
        rounded_rect(
            box_width - wall_thickness * 2,
            box_depth - wall_thickness * 2,
            wall_height,
            inner_radius
        );
        
        // Stacking lip cutout at top
        if (lip_style != "none") {
            lip_h = lip_style == "reduced" ? stacking_lip_height * 0.6 : 
                    lip_style == "minimum" ? stacking_lip_height * 0.4 : stacking_lip_height;
            translate([0, 0, wall_height - lip_h])
            stacking_lip_cutout(lip_h, outer_radius);
        }
        
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
    wall_pattern_grid(box_width - pattern_border * 2, wall_height - pattern_border * 2 - stacking_lip_height, pattern_depth + 0.1, pattern_cell, spacing);
    
    // Back wall pattern  
    translate([pattern_border, box_depth - pattern_depth, pattern_border])
    wall_pattern_grid(box_width - pattern_border * 2, wall_height - pattern_border * 2 - stacking_lip_height, pattern_depth + 0.1, pattern_cell, spacing);
    
    // Left wall pattern
    translate([-0.1, pattern_border, pattern_border])
    rotate([0, 90, 0])
    rotate([0, 0, 90])
    wall_pattern_grid(box_depth - pattern_border * 2, wall_height - pattern_border * 2 - stacking_lip_height, pattern_depth + 0.1, pattern_cell, spacing);
    
    // Right wall pattern
    translate([box_width - pattern_depth, pattern_border, pattern_border])
    rotate([0, 90, 0])
    rotate([0, 0, 90])
    wall_pattern_grid(box_depth - pattern_border * 2, wall_height - pattern_border * 2 - stacking_lip_height, pattern_depth + 0.1, pattern_cell, spacing);
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

module stacking_lip_cutout(lip_h, radius) {
    inset = 1.9;
    inner_r = max(0, radius - inset);
    difference() {
        rounded_rect(box_width, box_depth, lip_h + 1, radius);
        translate([inset, inset, 0])
        rounded_rect(box_width - inset * 2, box_depth - inset * 2, lip_h + 1, inner_r);
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
    
    translate([(box_width - tab_width) / 2, -0.1, wall_height - tab_height - stacking_lip_height])
    cube([tab_width, tab_depth + 0.1, tab_height]);
}

module dividers() {
    wall_height = box_height - base_height;
    inner_width = box_width - wall_thickness * 2;
    inner_depth = box_depth - wall_thickness * 2;
    divider_height = wall_height - floor_thickness - stacking_lip_height;
    
    // X dividers (vertical walls along Y axis)
    if (dividers_x > 0) {
        spacing = inner_width / (dividers_x + 1);
        for (i = [1:dividers_x]) {
            translate([wall_thickness + i * spacing - 0.6, wall_thickness, floor_thickness])
            cube([1.2, inner_depth, divider_height]);
        }
    }
    
    // Y dividers (vertical walls along X axis)
    if (dividers_y > 0) {
        spacing = inner_depth / (dividers_y + 1);
        for (i = [1:dividers_y]) {
            translate([wall_thickness, wall_thickness + i * spacing - 0.6, floor_thickness])
            cube([inner_width, 1.2, divider_height]);
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
// CRITICAL: Full cells must start at origin (0,0) so box can sit on them in preview
// When padding is "center", we still want full cells at origin, so we ignore near padding
// and put all padding on the far side. This ensures box alignment.
// For "near" and "far" padding modes, we can respect them, but for box alignment,
// we'll always start grid at origin and put padding on far side.
grid_offset_x = 0;  // Always start at origin for proper box alignment
grid_offset_y = 0;  // Always start at origin for proper box alignment

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
    // Position the plate so grid starts at origin
    // If there's padding on near side, translate plate to compensate
    plate_offset_x = use_fill_mode ? -padding_near_x : 0;
    plate_offset_y = use_fill_mode ? -padding_near_y : 0;
    
    translate([plate_offset_x, plate_offset_y, 0])
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
        
        // Full grid cells - start at origin (0,0) so box can sit on them
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
    bottom_radius = max(0.5, socket_corner_radius - socket_bottom_inset);
    
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
  private async renderScad(scadContent: string, prefix: string): Promise<{ stlUrl: string; scadContent: string; filename: string }> {
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
      
      await execAsync(cmd, { timeout: 120000 }); // 2 minute timeout

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
