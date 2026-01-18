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
screw_enabled = ${config.screwEnabled};
screw_diameter = ${config.screwDiameter};
lip_style = "${config.lipStyle}";
dividers_x = ${config.dividersX};
dividers_y = ${config.dividersY};
finger_slide = ${config.fingerSlide};
label_enabled = ${config.labelEnabled};

/* [Constants] */
grid_unit = 42;
base_height = 5;
stacking_lip_height = 4.4;
$fn = 32;

/* [Calculated] */
box_width = width_units * grid_unit;
box_depth = depth_units * grid_unit;
box_height = height_units * 7 + base_height;

// Main module
gridfinity_box();

module gridfinity_box() {
    // Base with stacking profile
    gridfinity_base();
    
    // Box walls
    translate([0, 0, base_height])
    gridfinity_walls();
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

module gridfinity_foot() {
    // Official Gridfinity base profile dimensions:
    // gf_cupbase_lower_taper_height = 0.8 (bottom 45° chamfer)
    // gf_cupbase_riser_height = 1.8 (vertical section)
    // gf_cupbase_upper_taper_height = 2.15 (upper 45° taper)
    // Total base height = 0.8 + 1.8 + 2.15 + 0.25 = 5mm
    
    lower_taper = 0.8;
    riser = 1.8;
    upper_taper = 2.15;
    clearance = 0.25;  // Gap from grid edge
    
    // Corner radius for the foot (standard is 3.75mm but we use 4mm for simplicity with cube approximation)
    foot_full_size = grid_unit - clearance * 2;  // 41.5mm
    
    // The foot profile tapers from a small point at bottom to full size at top
    // At z=0: inset by lower_taper (0.8mm) on each side = starts small
    // At z=0.8: same size (end of lower taper)
    // At z=0.8 to z=2.6: vertical riser section
    // At z=2.6: starts upper taper
    // At z=4.75 (2.6 + 2.15): full size
    
    translate([clearance, clearance, 0])
    hull() {
        // Bottom point - inset by lower_taper + upper_taper = 2.95mm on each side
        // Actually per spec: bottom starts at 1.6mm diameter corners
        // For a square approximation, inset = (full_size - 1.6) / 2 ≈ 20mm inset
        // But that's for rounded corners. For our cube approximation:
        bottom_inset = lower_taper + upper_taper;  // 2.95mm total inset at bottom
        
        // z=0: smallest point
        translate([bottom_inset, bottom_inset, 0])
        cube([foot_full_size - bottom_inset * 2, foot_full_size - bottom_inset * 2, 0.01]);
        
        // z=0.8: after lower taper (45°), expanded by 0.8mm
        translate([upper_taper, upper_taper, lower_taper])
        cube([foot_full_size - upper_taper * 2, foot_full_size - upper_taper * 2, 0.01]);
        
        // z=2.6: end of riser, start of upper taper
        translate([upper_taper, upper_taper, lower_taper + riser])
        cube([foot_full_size - upper_taper * 2, foot_full_size - upper_taper * 2, 0.01]);
        
        // z=4.75: full size (end of upper taper)
        translate([0, 0, lower_taper + riser + upper_taper])
        cube([foot_full_size, foot_full_size, 0.01]);
        
        // z=5: top of base (with 0.25 clearance height)
        translate([0, 0, base_height - 0.01])
        cube([foot_full_size, foot_full_size, 0.01]);
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
    
    difference() {
        // Outer walls
        cube([box_width, box_depth, wall_height]);
        
        // Inner cavity
        translate([wall_thickness, wall_thickness, floor_thickness])
        cube([
            box_width - wall_thickness * 2,
            box_depth - wall_thickness * 2,
            wall_height
        ]);
        
        // Stacking lip cutout at top
        if (lip_style != "none") {
            lip_h = lip_style == "reduced" ? stacking_lip_height * 0.6 : stacking_lip_height;
            translate([0, 0, wall_height - lip_h])
            stacking_lip_cutout(lip_h);
        }
        
        // Finger slide
        if (finger_slide) {
            finger_slide_cutout();
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

module stacking_lip_cutout(lip_h) {
    inset = 1.9;
    difference() {
        cube([box_width, box_depth, lip_h + 1]);
        translate([inset, inset, 0])
        cube([box_width - inset * 2, box_depth - inset * 2, lip_h + 1]);
    }
}

module finger_slide_cutout() {
    wall_height = box_height - base_height;
    slide_width = box_width * 0.6;
    slide_depth = 15;
    slide_height = wall_height * 0.5;
    
    translate([(box_width - slide_width) / 2, -1, wall_height - slide_height])
    rotate([-30, 0, 0])
    cube([slide_width, slide_depth, slide_height]);
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
magnet_diameter = ${config.magnetDiameter};
magnet_depth = ${config.magnetDepth};
screw_diameter = ${config.screwDiameter};
corner_radius = ${config.cornerRadius};

/* [Constants - Official Gridfinity Spec] */
grid_unit = 42;
clearance = 0.25;  // Gap between bin and socket walls

// Socket profile (inverse of bin foot) - from gridfinity_constants.scad
// gf_baseplate_lower_taper_height = 0.7
// gf_baseplate_riser_height = 1.8  
// gf_baseplate_upper_taper_height = 2.15
lower_taper = 0.7;
riser_height = 1.8;
upper_taper = 2.15;
socket_depth = lower_taper + riser_height + upper_taper;  // 4.65mm total

// The baseplate is just the socket frame - no solid floor underneath
// Sockets are OPEN (go all the way through)
plate_height = socket_depth;

$fn = 32;

/* [Calculated] */
plate_width = width_units * grid_unit;
plate_depth = depth_units * grid_unit;

// Main module
gridfinity_baseplate();

module gridfinity_baseplate() {
    difference() {
        // Main plate body
        baseplate_body();
        
        // Socket cutouts for each grid unit
        for (gx = [0:width_units-1]) {
            for (gy = [0:depth_units-1]) {
                translate([gx * grid_unit, gy * grid_unit, 0])
                grid_socket();
            }
        }
        
        // Corner rounding
        if (corner_radius > 0) {
            corner_cuts();
        }
    }
}

module baseplate_body() {
    cube([plate_width, plate_depth, plate_height]);
}

module grid_socket() {
    // Socket that receives Gridfinity bin foot
    // Profile is inverse of bin foot - full size at top, tapers down
    // OPEN SOCKET - goes all the way through!
    
    socket_full_size = grid_unit - clearance * 2;  // 41.5mm at top
    
    // The socket is an open hole with chamfered profile
    // Cut from top all the way through to bottom
    
    translate([clearance, clearance, -0.1]) {
        hull() {
            // Top of socket - full size (41.5mm)
            translate([0, 0, plate_height])
            cube([socket_full_size, socket_full_size, 0.2]);
            
            // After upper taper (at z = lower_taper + riser_height)
            // Inset by upper_taper (2.15mm) on each side
            translate([upper_taper, upper_taper, lower_taper + riser_height])
            cube([socket_full_size - upper_taper * 2, socket_full_size - upper_taper * 2, 0.01]);
            
            // After riser, start of lower taper (at z = lower_taper)
            translate([upper_taper, upper_taper, lower_taper])
            cube([socket_full_size - upper_taper * 2, socket_full_size - upper_taper * 2, 0.01]);
            
            // Bottom - goes all the way through (z=0 and below)
            // The smallest opening at the bottom
            total_inset = upper_taper + lower_taper;
            translate([total_inset, total_inset, 0])
            cube([socket_full_size - total_inset * 2, socket_full_size - total_inset * 2, 0.2]);
        }
    }
    
    // Magnet holes - these add rings around the socket openings
    if (style == "magnet") {
        magnet_holes();
    }
    
    // Screw holes
    if (style == "screw") {
        screw_holes();
    }
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
    
    for (pos = positions) {
        translate([pos[0], pos[1], -0.1])
        cylinder(d = magnet_diameter, h = magnet_depth + 0.2);
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

module corner_cuts() {
    // Cut corners for rounded appearance
    r = corner_radius;
    
    // Bottom-left
    translate([-0.1, -0.1, -0.1])
    difference() {
        cube([r + 0.1, r + 0.1, plate_height + 0.2]);
        translate([r, r, -0.1])
        cylinder(r = r, h = plate_height + 0.4);
    }
    
    // Bottom-right
    translate([plate_width - r, -0.1, -0.1])
    difference() {
        cube([r + 0.1, r + 0.1, plate_height + 0.2]);
        translate([0, r, -0.1])
        cylinder(r = r, h = plate_height + 0.4);
    }
    
    // Top-left
    translate([-0.1, plate_depth - r, -0.1])
    difference() {
        cube([r + 0.1, r + 0.1, plate_height + 0.2]);
        translate([r, 0, -0.1])
        cylinder(r = r, h = plate_height + 0.4);
    }
    
    // Top-right
    translate([plate_width - r, plate_depth - r, -0.1])
    difference() {
        cube([r + 0.1, r + 0.1, plate_height + 0.2]);
        translate([0, 0, -0.1])
        cylinder(r = r, h = plate_height + 0.4);
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
