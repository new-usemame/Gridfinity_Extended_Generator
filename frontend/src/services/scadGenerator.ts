/**
 * SCAD Generator Service - Client-side SCAD code generation
 * Ported from backend/src/services/openscad.ts for local generation mode
 */

import {
  BoxConfig,
  BaseplateConfig,
  SegmentInfo,
  SplitResult,
  EdgeType,
  SegmentEdgeOverride,
  calculateGridFromMm,
  splitBaseplateForPrinter,
} from '../types/config';

// Get edge type for a segment (with override support)
function getEdgeType(
  segment: SegmentInfo,
  edge: 'left' | 'right' | 'front' | 'back',
  edgeOverrides: SegmentEdgeOverride[]
): EdgeType {
  // Check for override
  const override = edgeOverrides.find(
    (o) => o.segmentX === segment.segmentX && o.segmentY === segment.segmentY
  );
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
function generateEdgeCode(
  segment: SegmentInfo,
  gridSize: number,
  _plateHeight: number,
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
  const rightEdgeType = getEdgeType(segment, 'right', edgeOverrides);
  const backEdgeType = getEdgeType(segment, 'back', edgeOverrides);
  const leftEdgeType = getEdgeType(segment, 'left', edgeOverrides);
  const frontEdgeType = getEdgeType(segment, 'front', edgeOverrides);

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
    femaleCavities: femaleCavities.join('\n'),
  };
}

// Generate OpenSCAD modules for edge patterns (male + female)
function generateEdgePatternModules(config: BaseplateConfig): string {
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
module dovetail_male_2d() {
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
    
    translate([-neck_width/2, 0])
    square([neck_width, neck_length]);
    
    translate([0, neck_length])
    circle(r = bulb_radius, $fn = 24);
}

module puzzle_female_2d() {
    neck_width = tooth_width * 0.5 + edge_tolerance * 2;
    bulb_radius = tooth_width * 0.4 + edge_tolerance;
    neck_length = tooth_depth - (tooth_width * 0.4);
    
    translate([-neck_width/2, -edge_tolerance])
    square([neck_width, neck_length + edge_tolerance]);
    
    translate([0, neck_length])
    circle(r = bulb_radius, $fn = 24);
}

// --- PATTERN 5: T-SLOT (T-shaped hook) ---
module tslot_male_2d() {
    stem_width = tooth_width * 0.4;
    head_width = tooth_width;
    head_depth = tooth_depth * 0.35;
    stem_depth = tooth_depth - head_depth;
    
    translate([-stem_width/2, 0])
    square([stem_width, stem_depth]);
    
    translate([-head_width/2, stem_depth])
    square([head_width, head_depth]);
}

module tslot_female_2d() {
    stem_width = tooth_width * 0.4 + edge_tolerance * 2;
    head_width = tooth_width + edge_tolerance * 2;
    head_depth = tooth_depth * 0.35 + edge_tolerance;
    stem_depth = tooth_depth - (tooth_depth * 0.35);
    
    translate([-stem_width/2, -edge_tolerance])
    square([stem_width, stem_depth + edge_tolerance]);
    
    translate([-head_width/2, stem_depth])
    square([head_width, head_depth + edge_tolerance]);
}

// --- PATTERN 6: PUZZLE SMOOTH ---
function concave_x(t, wide, narrow) = wide - (wide - narrow) * sin(t * 90);

module puzzle_smooth_male_2d() {
    bulb_r = tooth_width * 0.4;
    neck_len = tooth_depth - bulb_r;
    base_hw = tooth_width * 0.4;
    waist_hw = tooth_width * 0.2;
    waist_y = neck_len * 0.5;
    
    union() {
        difference() {
            translate([-base_hw, 0])
            square([base_hw * 2, waist_y]);
            
            translate([base_hw + (base_hw - waist_hw) * 0.6, waist_y * 0.5])
            scale([1, 2])
            circle(r = (base_hw - waist_hw) * 1.2, $fn = 32);
            
            translate([-(base_hw + (base_hw - waist_hw) * 0.6), waist_y * 0.5])
            scale([1, 2])
            circle(r = (base_hw - waist_hw) * 1.2, $fn = 32);
        }
        
        hull() {
            translate([0, waist_y])
            square([waist_hw * 2, 0.01], center = true);
            
            translate([0, neck_len - bulb_r * 0.3])
            circle(r = bulb_r * 0.7, $fn = 32);
        }
        
        translate([0, neck_len])
        circle(r = bulb_r, $fn = 32);
    }
}

module puzzle_smooth_female_2d() {
    bulb_r = tooth_width * 0.4 + edge_tolerance;
    neck_len = tooth_depth - (tooth_width * 0.4);
    base_hw = tooth_width * 0.4 + edge_tolerance;
    waist_hw = tooth_width * 0.2 + edge_tolerance;
    waist_y = neck_len * 0.5;
    
    union() {
        difference() {
            translate([-base_hw, -edge_tolerance])
            square([base_hw * 2, waist_y + edge_tolerance]);
            
            translate([base_hw + (base_hw - waist_hw) * 0.6, waist_y * 0.5])
            scale([1, 2])
            circle(r = (base_hw - waist_hw) * 1.2 - edge_tolerance * 0.5, $fn = 32);
            
            translate([-(base_hw + (base_hw - waist_hw) * 0.6), waist_y * 0.5])
            scale([1, 2])
            circle(r = (base_hw - waist_hw) * 1.2 - edge_tolerance * 0.5, $fn = 32);
        }
        
        hull() {
            translate([0, waist_y])
            square([waist_hw * 2, 0.01], center = true);
            
            translate([0, neck_len - bulb_r * 0.3])
            circle(r = bulb_r * 0.7, $fn = 32);
        }
        
        translate([0, neck_len])
        circle(r = bulb_r, $fn = 32);
    }
}

// --- PATTERN 7: T-SLOT SMOOTH ---
module tslot_smooth_male_2d() {
    head_w = tooth_width;
    head_h = tooth_depth * 0.3;
    stem_len = tooth_depth - head_h;
    base_hw = tooth_width * 0.3;
    waist_hw = tooth_width * 0.15;
    waist_y = stem_len * 0.6;
    
    union() {
        difference() {
            translate([-base_hw, 0])
            square([base_hw * 2, waist_y]);
            
            translate([base_hw + (base_hw - waist_hw) * 0.5, waist_y * 0.5])
            scale([1, 1.8])
            circle(r = (base_hw - waist_hw) * 1.1, $fn = 32);
            
            translate([-(base_hw + (base_hw - waist_hw) * 0.5), waist_y * 0.5])
            scale([1, 1.8])
            circle(r = (base_hw - waist_hw) * 1.1, $fn = 32);
        }
        
        hull() {
            translate([0, waist_y])
            square([waist_hw * 2, 0.01], center = true);
            
            translate([0, stem_len - 0.01])
            square([head_w, 0.02], center = true);
        }
        
        translate([-head_w/2, stem_len])
        square([head_w, head_h]);
    }
}

module tslot_smooth_female_2d() {
    head_w = tooth_width + edge_tolerance * 2;
    head_h = tooth_depth * 0.3 + edge_tolerance;
    stem_len = tooth_depth - (tooth_depth * 0.3);
    base_hw = tooth_width * 0.3 + edge_tolerance;
    waist_hw = tooth_width * 0.15 + edge_tolerance;
    waist_y = stem_len * 0.6;
    
    union() {
        difference() {
            translate([-base_hw, -edge_tolerance])
            square([base_hw * 2, waist_y + edge_tolerance]);
            
            translate([base_hw + (base_hw - waist_hw) * 0.5, waist_y * 0.5])
            scale([1, 1.8])
            circle(r = (base_hw - waist_hw) * 1.1 - edge_tolerance * 0.3, $fn = 32);
            
            translate([-(base_hw + (base_hw - waist_hw) * 0.5), waist_y * 0.5])
            scale([1, 1.8])
            circle(r = (base_hw - waist_hw) * 1.1 - edge_tolerance * 0.3, $fn = 32);
        }
        
        hull() {
            translate([0, waist_y])
            square([waist_hw * 2, 0.01], center = true);
            
            translate([0, stem_len - 0.01])
            square([head_w, 0.02], center = true);
        }
        
        translate([-head_w/2, stem_len])
        square([head_w, head_h]);
    }
}

// ===========================================
// PATTERN SELECTOR MODULES
// ===========================================

module edge_tooth_male(pattern) {
    if (pattern == "dovetail") dovetail_male_2d();
    else if (pattern == "rectangular") rectangular_male_2d();
    else if (pattern == "triangular") triangular_male_2d();
    else if (pattern == "puzzle") puzzle_male_2d();
    else if (pattern == "tslot") tslot_male_2d();
    else if (pattern == "puzzle_smooth") puzzle_smooth_male_2d();
    else if (pattern == "tslot_smooth") tslot_smooth_male_2d();
    else dovetail_male_2d();
}

module edge_tooth_female(pattern) {
    if (pattern == "dovetail") dovetail_female_2d();
    else if (pattern == "rectangular") rectangular_female_2d();
    else if (pattern == "triangular") triangular_female_2d();
    else if (pattern == "puzzle") puzzle_female_2d();
    else if (pattern == "tslot") tslot_female_2d();
    else if (pattern == "puzzle_smooth") puzzle_smooth_female_2d();
    else if (pattern == "tslot_smooth") tslot_smooth_female_2d();
    else dovetail_female_2d();
}

module male_tooth_3d(pattern, height) {
    linear_extrude(height = height)
    edge_tooth_male(pattern);
}

module female_cavity_3d(pattern, height) {
    translate([0, 0, -0.1])
    linear_extrude(height = height + 0.2)
    edge_tooth_female(pattern);
}
`;
}

/**
 * Generate Box SCAD code
 */
export function generateBoxScad(config: BoxConfig): string {
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
foot_taper_height = foot_chamfer_height;
foot_bottom_inset = foot_chamfer_height / tan(foot_chamfer_angle);
base_height = foot_taper_height;
stacking_lip_height = 4.4;
gf_corner_radius = 3.75;
clearance = 0.25;
$fn = 32;

/* [Calculated] */
box_width = width_units * grid_unit;
box_depth = depth_units * grid_unit;
box_height = height_units * 7 + base_height;

gridfinity_box();

module gridfinity_box() {
    gridfinity_base();
    translate([0, 0, base_height])
    gridfinity_walls();
}

module rounded_rect(width, depth, height, radius) {
    if (radius <= 0) {
        cube([width, depth, height]);
    } else {
        r = min(radius, min(width, depth) / 2);
        hull() {
            translate([r, r, 0]) cylinder(r = r, h = height);
            translate([width - r, r, 0]) cylinder(r = r, h = height);
            translate([r, depth - r, 0]) cylinder(r = r, h = height);
            translate([width - r, depth - r, 0]) cylinder(r = r, h = height);
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
    difference() {
        gridfinity_foot();
        if (magnet_enabled) magnet_holes();
        if (screw_enabled) screw_holes();
    }
}

module rounded_rect_profile(width, depth, height, radius) {
    if (radius <= 0) {
        cube([width, depth, height]);
    } else {
        r = min(radius, min(width, depth) / 2 - 0.01);
        hull() {
            translate([r, r, 0]) cylinder(r = r, h = height, $fn = $fn);
            translate([width - r, r, 0]) cylinder(r = r, h = height, $fn = $fn);
            translate([r, depth - r, 0]) cylinder(r = r, h = height, $fn = $fn);
            translate([width - r, depth - r, 0]) cylinder(r = r, h = height, $fn = $fn);
        }
    }
}

module gridfinity_foot() {
    foot_radius = feet_corner_radius > 0 ? feet_corner_radius : gf_corner_radius;
    foot_full_size = grid_unit - clearance * 2;
    bottom_size = foot_full_size - foot_bottom_inset * 2;
    bottom_radius = max(0.5, foot_radius - foot_bottom_inset);
    
    translate([clearance, clearance, 0])
    hull() {
        translate([foot_bottom_inset, foot_bottom_inset, 0])
        rounded_rect_profile(bottom_size, bottom_size, 0.01, bottom_radius);
        translate([0, 0, foot_taper_height - 0.01])
        rounded_rect_profile(foot_full_size, foot_full_size, 0.02, foot_radius);
    }
}

module magnet_holes() {
    positions = [[4.8, 4.8], [4.8, grid_unit - 4.8], [grid_unit - 4.8, 4.8], [grid_unit - 4.8, grid_unit - 4.8]];
    for (pos = positions) {
        translate([pos[0], pos[1], -0.1])
        cylinder(d = magnet_diameter, h = magnet_depth + 0.1);
    }
}

module screw_holes() {
    positions = [[4.8, 4.8], [4.8, grid_unit - 4.8], [grid_unit - 4.8, 4.8], [grid_unit - 4.8, grid_unit - 4.8]];
    for (pos = positions) {
        translate([pos[0], pos[1], -0.1])
        cylinder(d = screw_diameter, h = base_height + 0.2);
    }
}

module walls_with_bottom_chamfer(width, depth, height, radius, chamfer) {
    hull() {
        translate([chamfer, chamfer, 0])
        rounded_rect_profile(width - chamfer * 2, depth - chamfer * 2, 0.01, max(0.5, radius - chamfer));
        translate([0, 0, chamfer])
        rounded_rect_profile(width, depth, 0.01, radius);
        translate([0, 0, height - 0.01])
        rounded_rect_profile(width, depth, 0.02, radius);
    }
}

module gridfinity_walls() {
    wall_height = box_height - base_height;
    outer_radius = corner_radius > 0 ? corner_radius : gf_corner_radius;
    inner_radius = max(0, outer_radius - wall_thickness);
    overhang_chamfer = 0.3;
    
    difference() {
        if (prevent_bottom_overhangs) {
            walls_with_bottom_chamfer(box_width, box_depth, wall_height, outer_radius, overhang_chamfer);
        } else {
            rounded_rect(box_width, box_depth, wall_height, outer_radius);
        }
        
        translate([wall_thickness, wall_thickness, floor_thickness])
        rounded_rect(box_width - wall_thickness * 2, box_depth - wall_thickness * 2, wall_height, inner_radius);
        
        if (lip_style != "none") {
            lip_h = lip_style == "reduced" ? stacking_lip_height * 0.6 : 
                    lip_style == "minimum" ? stacking_lip_height * 0.4 : stacking_lip_height;
            translate([0, 0, wall_height - lip_h])
            stacking_lip_cutout(lip_h, outer_radius);
        }
        
        if (finger_slide) finger_slide_cutout();
        if (tapered_corner != "none") tapered_corner_cutouts(wall_height, outer_radius);
        if (wall_pattern != "none") wall_pattern_cutouts(wall_height);
    }
    
    if (label_enabled) label_tab();
    if (dividers_x > 0 || dividers_y > 0) dividers();
}

module tapered_corner_cutouts(wall_height, outer_radius) {
    taper_size = tapered_corner_size;
    taper_height = wall_height * 0.6;
    setback = outer_radius > 0 ? outer_radius : gf_corner_radius;
    
    for (pos = [[setback, setback], [box_width - setback, setback], 
                [setback, box_depth - setback], [box_width - setback, box_depth - setback]]) {
        translate([pos[0], pos[1], wall_height - taper_height])
        if (tapered_corner == "rounded") {
            cylinder(r1 = 0, r2 = taper_size, h = taper_height + 0.1);
        } else {
            linear_extrude(height = taper_height + 0.1, scale = taper_size / 0.1)
            square(0.1, center = true);
        }
    }
}

module wall_pattern_cutouts(wall_height) {
    pattern_depth = wall_thickness * 0.6;
    pattern_border = 5;
    pattern_cell = 10;
    spacing = wall_pattern_spacing;
    
    translate([pattern_border, -0.1, pattern_border])
    wall_pattern_grid(box_width - pattern_border * 2, wall_height - pattern_border * 2 - stacking_lip_height, pattern_depth + 0.1, pattern_cell, spacing);
    
    translate([pattern_border, box_depth - pattern_depth, pattern_border])
    wall_pattern_grid(box_width - pattern_border * 2, wall_height - pattern_border * 2 - stacking_lip_height, pattern_depth + 0.1, pattern_cell, spacing);
    
    translate([-0.1, pattern_border, pattern_border])
    rotate([0, 90, 0]) rotate([0, 0, 90])
    wall_pattern_grid(box_depth - pattern_border * 2, wall_height - pattern_border * 2 - stacking_lip_height, pattern_depth + 0.1, pattern_cell, spacing);
    
    translate([box_width - pattern_depth, pattern_border, pattern_border])
    rotate([0, 90, 0]) rotate([0, 0, 90])
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
                translate([cell_size/2, cell_size/2, 0])
                cylinder(r = cell_size / 2, h = depth, $fn = 6);
            } else if (wall_pattern == "grid") {
                cube([cell_size, cell_size, depth]);
            } else if (wall_pattern == "voronoi") {
                translate([cell_size/2, cell_size/2, 0])
                cylinder(r = cell_size / 2 * 0.8, h = depth, $fn = 16);
            } else {
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
        rotate([-30, 0, 0])
        hull() {
            translate([r, 0, 0]) cylinder(r = r, h = slide_depth);
            translate([slide_width - r, 0, 0]) cylinder(r = r, h = slide_depth);
            translate([0, 0, slide_height]) cube([slide_width, slide_depth, 0.1]);
        }
    } else if (finger_slide_style == "chamfered") {
        rotate([-30, 0, 0])
        polyhedron(
            points = [[0, 0, 0], [slide_width, 0, 0], [slide_width, slide_depth, 0], [0, slide_depth, 0],
                      [0, 0, slide_height], [slide_width, 0, slide_height], [slide_width, slide_depth, slide_height], [0, slide_depth, slide_height]],
            faces = [[0,1,2,3], [4,5,6,7], [0,1,5,4], [1,2,6,5], [2,3,7,6], [3,0,4,7]]
        );
    } else {
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
    
    if (dividers_x > 0) {
        spacing = inner_width / (dividers_x + 1);
        for (i = [1:dividers_x]) {
            translate([wall_thickness + i * spacing - 0.6, wall_thickness, floor_thickness])
            cube([1.2, inner_depth, divider_height]);
        }
    }
    
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

/**
 * Generate Baseplate SCAD code
 */
export function generateBaseplateScad(config: BaseplateConfig): string {
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

  return `// Gridfinity Baseplate Generator
// Compatible with standard OpenSCAD
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

/* [Constants] */
clearance = 0.25;
socket_taper_height = socket_chamfer_height;
socket_bottom_inset = socket_chamfer_height / tan(socket_chamfer_angle);
socket_depth = socket_taper_height;
plate_height = socket_depth;

$fn = 32;

/* [Calculated] */
grid_width = width_units * grid_unit;
grid_depth = depth_units * grid_unit;
plate_width = use_fill_mode ? outer_width_mm : grid_width;
plate_depth = use_fill_mode ? outer_depth_mm : grid_depth;
grid_offset_x = 0;
grid_offset_y = 0;

gridfinity_baseplate();

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

module gridfinity_baseplate() {
    plate_offset_x = use_fill_mode ? -padding_near_x : 0;
    plate_offset_y = use_fill_mode ? -padding_near_y : 0;
    
    translate([plate_offset_x, plate_offset_y, 0])
    difference() {
        rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
        
        full_cells_x = floor(width_units);
        full_cells_y = floor(depth_units);
        has_half_x = width_units - full_cells_x >= 0.5;
        has_half_y = depth_units - full_cells_y >= 0.5;
        half_cell_size = grid_unit / 2;
        
        for (gx = [0:full_cells_x-1]) {
            for (gy = [0:full_cells_y-1]) {
                translate([grid_offset_x + gx * grid_unit, grid_offset_y + gy * grid_unit, 0])
                grid_socket(grid_unit, grid_unit);
            }
        }
        
        if (has_half_x) {
            for (gy = [0:full_cells_y-1]) {
                translate([grid_offset_x + full_cells_x * grid_unit, grid_offset_y + gy * grid_unit, 0])
                grid_socket(half_cell_size, grid_unit);
            }
        }
        
        if (has_half_y) {
            for (gx = [0:full_cells_x-1]) {
                translate([grid_offset_x + gx * grid_unit, grid_offset_y + full_cells_y * grid_unit, 0])
                grid_socket(grid_unit, half_cell_size);
            }
        }
        
        if (has_half_x && has_half_y) {
            translate([grid_offset_x + full_cells_x * grid_unit, grid_offset_y + full_cells_y * grid_unit, 0])
            grid_socket(half_cell_size, half_cell_size);
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
    socket_width = cell_width - clearance * 2;
    socket_depth_size = cell_depth - clearance * 2;
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
    
    is_full_cell = cell_width >= grid_unit - 0.1 && cell_depth >= grid_unit - 0.1;
    
    if (style == "magnet" && is_full_cell) magnet_holes();
    if (style == "screw" && is_full_cell) screw_holes();
    if (center_screw && is_full_cell) center_screw_hole();
    if ((weight_cavity || style == "weighted") && is_full_cell) weight_cavity_cutout();
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
    positions = [[4.8, 4.8], [4.8, grid_unit - 4.8], [grid_unit - 4.8, 4.8], [grid_unit - 4.8, grid_unit - 4.8]];
    
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
    positions = [[4.8, 4.8], [4.8, grid_unit - 4.8], [grid_unit - 4.8, 4.8], [grid_unit - 4.8, grid_unit - 4.8]];
    
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

/**
 * Generate segment SCAD with interlocking male/female edges
 */
export function generateSegmentScad(
  config: BaseplateConfig,
  segment: SegmentInfo
): string {
  const widthUnits = segment.gridUnitsX;
  const depthUnits = segment.gridUnitsY;
  const plateHeight = config.socketChamferHeight;
  const gridSize = config.gridSize;
  const edgePattern = config.edgePattern;

  const edgePatternModules = generateEdgePatternModules(config);
  const edgeCode = generateEdgeCode(
    segment,
    gridSize,
    plateHeight,
    edgePattern,
    config.edgeOverrides || []
  );

  return `// Gridfinity Baseplate Segment [${segment.segmentX}, ${segment.segmentY}]
// Part of a split baseplate system with interlocking male/female edges
// Edge pattern: ${edgePattern}

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

gridfinity_segment();

module gridfinity_segment() {
    difference() {
        union() {
            rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
            ${edgeCode.maleTeeth}
        }
        
        for (gx = [0:width_units-1]) {
            for (gy = [0:depth_units-1]) {
                translate([gx * grid_unit, gy * grid_unit, 0])
                grid_socket();
            }
        }
        
        ${edgeCode.femaleCavities}
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
                translate([0, 0, 0])
                socket_rounded_rect(socket_width, socket_depth_size, 0.2, socket_corner_radius);
            }
        }
    }
    
    if (style == "magnet") magnet_holes();
    if (style == "screw") screw_holes();
    if (center_screw) center_screw_hole();
    if (weight_cavity || style == "weighted") weight_cavity_cutout();
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
    positions = [[4.8, 4.8], [4.8, grid_unit - 4.8], [grid_unit - 4.8, 4.8], [grid_unit - 4.8, grid_unit - 4.8]];
    
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
    positions = [[4.8, 4.8], [4.8, grid_unit - 4.8], [grid_unit - 4.8, 4.8], [grid_unit - 4.8, grid_unit - 4.8]];
    
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

/**
 * Generate combined preview showing all segments laid out together
 */
export function generateCombinedPreviewScad(
  config: BaseplateConfig,
  splitInfo: SplitResult
): string {
  const gridSize = config.gridSize;
  const gap = 5;
  const edgePattern = config.edgePattern;

  let segmentPlacements = '';
  const edgeOverrides = config.edgeOverrides || [];

  for (let sy = 0; sy < splitInfo.segmentsY; sy++) {
    for (let sx = 0; sx < splitInfo.segmentsX; sx++) {
      const segment = splitInfo.segments[sy][sx];

      const leftEdge = getEdgeType(segment, 'left', edgeOverrides);
      const rightEdge = getEdgeType(segment, 'right', edgeOverrides);
      const frontEdge = getEdgeType(segment, 'front', edgeOverrides);
      const backEdge = getEdgeType(segment, 'back', edgeOverrides);

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

  const edgePatternModules = generateEdgePatternModules(config);

  return `// Gridfinity Baseplate - Combined Preview
// Shows all ${splitInfo.totalSegments} segments laid out with ${gap}mm gaps
// Edge pattern: ${edgePattern}

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

$fn = 24;

${edgePatternModules}

${segmentPlacements}

module segment_base(width_units, depth_units, left_edge, right_edge, front_edge, back_edge) {
    plate_width = width_units * grid_unit;
    plate_depth = depth_units * grid_unit;
    
    difference() {
        union() {
            rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
            
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
        
        for (gx = [0:width_units-1]) {
            for (gy = [0:depth_units-1]) {
                translate([gx * grid_unit, gy * grid_unit, 0])
                grid_socket();
            }
        }
        
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

/**
 * Calculate split info for baseplate segmentation
 */
export function calculateSplitInfo(config: BaseplateConfig): SplitResult {
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

  return splitBaseplateForPrinter(
    totalGridUnitsX,
    totalGridUnitsY,
    config.printerBedWidth,
    config.printerBedDepth,
    config.gridSize,
    config.connectorEnabled
  );
}
