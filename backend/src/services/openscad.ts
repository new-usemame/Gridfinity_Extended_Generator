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
    difference() {
        union() {
            // Main base block with 0.25mm clearance
            translate([0.25, 0.25, 0])
            cube([grid_unit - 0.5, grid_unit - 0.5, base_height]);
            
            // Stacking lip profile (the part that clicks into baseplates)
            translate([0.25, 0.25, 0])
            stacking_lip();
        }
        
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

module stacking_lip() {
    // Gridfinity standard stacking lip profile
    // Creates the chamfered edge that fits into baseplate sockets
    base_inset = 0.25;
    lip_size = grid_unit - 0.5;
    
    hull() {
        // Bottom - chamfered inward by 0.8mm
        translate([0.8, 0.8, 0])
        cube([lip_size - 1.6, lip_size - 1.6, 0.01]);
        
        // At 0.8mm height - still chamfered
        translate([0.8, 0.8, 0.7])
        cube([lip_size - 1.6, lip_size - 1.6, 0.01]);
        
        // At 2.15mm - full size (45° transition)
        translate([0, 0, 2.15])
        cube([lip_size, lip_size, 0.01]);
    }
    
    // Rest of base
    translate([0, 0, 2.15])
    cube([lip_size, lip_size, base_height - 2.15]);
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

/* [Configuration] */
width_units = ${config.width};
depth_units = ${config.depth};
style = "${config.style}";
magnet_diameter = ${config.magnetDiameter};
magnet_depth = ${config.magnetDepth};
screw_diameter = ${config.screwDiameter};
corner_radius = ${config.cornerRadius};

/* [Constants] */
grid_unit = 42;
plate_height = 4.65;
socket_depth = 2.6;
$fn = 32;

/* [Calculated] */
plate_width = width_units * grid_unit;
plate_depth = depth_units * grid_unit;

// Main module
gridfinity_baseplate();

module gridfinity_baseplate() {
    difference() {
        // Main plate
        baseplate_body();
        
        // Sockets for each grid unit
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
    // Socket that receives Gridfinity bin base
    socket_size = grid_unit - 0.5;
    
    translate([0.25, 0.25, plate_height - socket_depth]) {
        // Main socket
        hull() {
            // Top of socket - full size
            translate([0, 0, socket_depth - 0.01])
            cube([socket_size, socket_size, 0.01]);
            
            // Bottom of socket - chamfered
            translate([0.8, 0.8, 0])
            cube([socket_size - 1.6, socket_size - 1.6, 0.01]);
        }
    }
    
    // Magnet holes
    if (style == "magnet") {
        magnet_holes();
    }
    
    // Screw holes
    if (style == "screw") {
        screw_holes();
    }
    
    // Weighted cutout
    if (style == "weighted") {
        weight_cutout();
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
        cylinder(d = screw_diameter, h = plate_height + 0.2);
    }
}

module weight_cutout() {
    // Hollow out for weight or to save material
    inset = 6;
    translate([inset, inset, -0.1])
    cube([grid_unit - inset * 2, grid_unit - inset * 2, plate_height - 1]);
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
