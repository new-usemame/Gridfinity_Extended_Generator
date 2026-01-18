import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BoxConfig, BaseplateConfig } from '../types/config.js';

const execAsync = promisify(exec);

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
feet_corner_radius = ${config.feetCornerRadius};
grid_unit = ${config.gridSize};
foot_lower_taper_height = ${config.footLowerTaperHeight};
foot_riser_height = ${config.footRiserHeight};
foot_upper_taper_height = ${config.footUpperTaperHeight};
foot_bottom_diameter = ${config.footBottomDiameter};
flat_base = "${config.flatBase}";
efficient_floor = "${config.efficientFloor}";
tapered_corner = "${config.taperedCorner}";
tapered_corner_size = ${config.taperedCornerSize};
wall_pattern = "${config.wallPattern}";
wall_pattern_spacing = ${config.wallPatternSpacing};

/* [Constants] */
// Simple taper foot height - ONE smooth taper from bottom to top (no riser)
// foot_lower_taper_height controls the foot taper height
// foot_upper_taper_height controls the chamfer to box walls height
foot_taper_height = foot_lower_taper_height + foot_riser_height;  // Combined into one taper
// Chamfer height - transition from foot top to box walls
lip_chamfer_height = foot_upper_taper_height + 1.8;
// Total base height
base_height = foot_taper_height + lip_chamfer_height;
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
    // Base with stacking feet (simple taper)
    gridfinity_base();
    
    // Chamfer from foot top to box walls
    translate([0, 0, foot_taper_height])
    gridfinity_single_chamfer();
    
    // Box walls - start after the chamfer
    translate([0, 0, base_height])
    gridfinity_walls();
}

// Rounded rectangle module for corner rounding
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

// Chamfer - smooth transition from foot top to box walls
module gridfinity_single_chamfer() {
    // Use the standard Gridfinity corner radius or user override
    outer_radius = corner_radius > 0 ? corner_radius : gf_corner_radius;
    foot_radius = feet_corner_radius > 0 ? feet_corner_radius : gf_corner_radius;
    
    // The foot top size (what the simple taper foot ends at)
    foot_full_size = grid_unit - clearance * 2;  // 41.5mm
    foot_top_size = foot_full_size - foot_upper_taper_height * 2;
    foot_top_radius = max(0.5, foot_radius - foot_upper_taper_height);
    
    // Chamfer from foot top size to full box size
    hull() {
        // Bottom - matches top of foot taper (per unit, inset from grid)
        for (gx = [0:width_units-1]) {
            for (gy = [0:depth_units-1]) {
                translate([gx * grid_unit + clearance + foot_upper_taper_height, 
                           gy * grid_unit + clearance + foot_upper_taper_height, 0])
                rounded_rect_profile(foot_top_size, foot_top_size, 0.01, foot_top_radius);
            }
        }
        
        // Top - full box size (flush with walls)
        translate([0, 0, lip_chamfer_height - 0.01])
        rounded_rect_profile(box_width, box_depth, 0.02, outer_radius);
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
    // SIMPLE TAPER foot profile - ONE smooth taper from bottom to top
    // No intermediate riser section - just bottom point to top
    // The chamfer to box walls is handled by gridfinity_single_chamfer()
    
    upper_taper = foot_upper_taper_height;
    
    // Use user-specified feet corner radius, default to standard 3.75mm
    foot_radius = feet_corner_radius > 0 ? feet_corner_radius : gf_corner_radius;
    foot_full_size = grid_unit - clearance * 2;  // 41.5mm
    
    // Top size (where chamfer starts) - accounts for upper taper width
    top_size = foot_full_size - upper_taper * 2;
    top_radius = max(0.5, foot_radius - upper_taper);
    
    // Bottom size - user specified or calculated
    bottom_size = foot_bottom_diameter;
    bottom_inset = (foot_full_size - bottom_size) / 2;
    bottom_radius = max(0.5, foot_radius * (bottom_size / foot_full_size));
    
    translate([clearance, clearance, 0])
    hull() {
        // Bottom point - small
        translate([bottom_inset, bottom_inset, 0])
        rounded_rect_profile(bottom_size, bottom_size, 0.01, bottom_radius);
        
        // Top of foot - ONE smooth taper to here (no riser)
        translate([upper_taper, upper_taper, foot_taper_height - 0.01])
        rounded_rect_profile(top_size, top_size, 0.02, top_radius);
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

module gridfinity_walls() {
    wall_height = box_height - base_height;
    // Use the standard Gridfinity corner radius or user override
    outer_radius = corner_radius > 0 ? corner_radius : gf_corner_radius;
    inner_radius = max(0, outer_radius - wall_thickness);
    
    difference() {
        // Outer walls with rounded corners
        rounded_rect(box_width, box_depth, wall_height, outer_radius);
        
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
    return `// Gridfinity Baseplate Generator
// Compatible with standard OpenSCAD
// Socket profile matches bin foot for proper fit

/* [Configuration] */
width_units = ${config.width};
depth_units = ${config.depth};
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
socket_lower_taper_height = ${config.socketLowerTaperHeight};
socket_riser_height = ${config.socketRiserHeight};
socket_upper_taper_height = ${config.socketUpperTaperHeight};

/* [Constants - Official Gridfinity Spec] */
clearance = 0.25;  // Gap between bin and socket walls

// Socket profile - SIMPLE TAPER matching bin foot
// One smooth taper from bottom to top (no riser)
lower_taper = socket_lower_taper_height;
riser_height = socket_riser_height;
upper_taper = socket_upper_taper_height;

// Socket taper depth: combined into ONE simple taper
socket_taper_depth = lower_taper + riser_height;  // Combined taper
// Plus the chamfer opening at top
socket_depth = socket_taper_depth + upper_taper;

// The baseplate is just the socket frame - no solid floor underneath
// Sockets are OPEN (go all the way through)
plate_height = socket_depth;

$fn = 32;

/* [Calculated] */
plate_width = width_units * grid_unit;
plate_depth = depth_units * grid_unit;

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
    difference() {
        // Main plate body with rounded corners
        rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
        
        // Socket cutouts for each grid unit
        for (gx = [0:width_units-1]) {
            for (gy = [0:depth_units-1]) {
                translate([gx * grid_unit, gy * grid_unit, 0])
                grid_socket();
            }
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

module grid_socket() {
    // Socket that receives Gridfinity bin foot
    // SIMPLE TAPER profile matching bin foot - no riser section
    // OPEN SOCKET - goes all the way through!
    // 
    // This matches the foot profile:
    // - Foot has: ONE simple taper (bottom to top) -> chamfer to box walls
    // - Socket has: chamfer opening (top) -> ONE simple taper (to bottom)
    
    socket_full_size = grid_unit - clearance * 2;  // 41.5mm at top
    socket_corner_radius = 3.75;  // Standard Gridfinity corner radius for sockets
    
    // Size at top of taper (bottom of chamfer)
    taper_top_size = socket_full_size - upper_taper * 2;
    taper_top_radius = max(0.5, socket_corner_radius - upper_taper);
    
    // Size at bottom - narrow point
    total_taper_inset = upper_taper + socket_taper_depth;
    bottom_size = socket_full_size - total_taper_inset * 2;
    bottom_radius = max(0.5, socket_corner_radius - total_taper_inset);
    
    // The socket is an open hole with simple taper profile
    translate([clearance, clearance, -0.1]) {
        hull() {
            // Top of socket - full size (41.5mm) - chamfer opens to here
            translate([0, 0, plate_height])
            socket_rounded_rect(socket_full_size, socket_full_size, 0.2, socket_corner_radius);
            
            // Bottom of chamfer / top of taper
            translate([upper_taper, upper_taper, socket_taper_depth])
            socket_rounded_rect(taper_top_size, taper_top_size, 0.01, taper_top_radius);
            
            // Bottom of socket - ONE simple taper to here (no riser)
            if (!remove_bottom_taper) {
                translate([total_taper_inset, total_taper_inset, 0])
                socket_rounded_rect(bottom_size, bottom_size, 0.2, bottom_radius);
            } else {
                // No bottom taper - vertical walls at taper_top width
                translate([upper_taper, upper_taper, 0])
                socket_rounded_rect(taper_top_size, taper_top_size, 0.2, taper_top_radius);
            }
        }
    }
    
    // Magnet holes
    if (style == "magnet") {
        magnet_holes();
    }
    
    // Screw holes (corner)
    if (style == "screw") {
        screw_holes();
    }
    
    // Center screw hole
    if (center_screw) {
        center_screw_hole();
    }
    
    // Weight cavity
    if (weight_cavity || style == "weighted") {
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
