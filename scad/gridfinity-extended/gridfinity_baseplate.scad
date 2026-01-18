// Gridfinity Baseplate - Extended with Corner Rounding
// Based on ostat/gridfinity_extended_openscad
// Modified to add corner_radius parameter for easier printing
// License: GPL-3.0

/* [Baseplate Dimensions] */
// Width in grid units (1 to 10)
width_units = 3; // [1:1:10]
// Depth in grid units (1 to 10)
depth_units = 3; // [1:1:10]

/* [Style] */
// Baseplate style
style = "default"; // [default, magnet, weighted, screw]
// Lid option
lid_option = "none"; // [none, flat, halfPitch]

/* [Magnets/Screws] */
// Magnet diameter in mm
magnet_diameter = 6; // [3:0.5:10]
// Magnet depth in mm
magnet_depth = 2; // [1:0.5:5]
// Screw diameter in mm
screw_diameter = 3; // [2:0.5:6]

/* [Corner Rounding - NEW] */
// Corner radius in mm (0 = sharp corners)
corner_radius = 0; // [0:0.25:5]
// Number of segments for rounded corners (higher = smoother)
corner_segments = 32; // [8:4:64]

// Constants
grid_unit = 42;
plate_height = 4.65;
socket_depth = 2.15;

// Calculated dimensions
plate_width = width_units * grid_unit;
plate_depth = depth_units * grid_unit;

// Rounded rectangle module with configurable segments
module rounded_rect(w, d, h, r, fn=32) {
    if (r > 0) {
        hull() {
            translate([r, r, 0]) cylinder(h=h, r=r, $fn=fn);
            translate([w-r, r, 0]) cylinder(h=h, r=r, $fn=fn);
            translate([r, d-r, 0]) cylinder(h=h, r=r, $fn=fn);
            translate([w-r, d-r, 0]) cylinder(h=h, r=r, $fn=fn);
        }
    } else {
        cube([w, d, h]);
    }
}

// Socket profile for bin connection
module socket_profile() {
    polygon(points=[
        [0, 0],
        [2.6, 0],
        [2.6, 0.7],
        [1.9, 0.7],
        [0.7, 1.9],
        [0.7, socket_depth],
        [0, socket_depth]
    ]);
}

// Single grid socket
module grid_socket() {
    translate([grid_unit/2, grid_unit/2, plate_height - socket_depth])
    rotate_extrude($fn=64)
    translate([grid_unit/2 - 2.6, 0, 0])
    socket_profile();
}

// Magnet hole
module magnet_hole() {
    cylinder(d=magnet_diameter, h=magnet_depth + 0.1, $fn=32);
}

// Screw hole with countersink
module screw_hole() {
    union() {
        cylinder(d=screw_diameter, h=plate_height + 0.2, $fn=32);
        // Countersink
        translate([0, 0, plate_height - 1])
        cylinder(d1=screw_diameter, d2=screw_diameter*2, h=1.1, $fn=32);
    }
}

// Weighted base cutout (for filling with weights)
module weight_cutout() {
    hull() {
        translate([8, 8, -0.1]) cylinder(d=8, h=plate_height - 1, $fn=32);
        translate([grid_unit-8, 8, -0.1]) cylinder(d=8, h=plate_height - 1, $fn=32);
        translate([8, grid_unit-8, -0.1]) cylinder(d=8, h=plate_height - 1, $fn=32);
        translate([grid_unit-8, grid_unit-8, -0.1]) cylinder(d=8, h=plate_height - 1, $fn=32);
    }
}

// Single grid cell
module grid_cell(x_pos, y_pos) {
    translate([x_pos * grid_unit, y_pos * grid_unit, 0]) {
        difference() {
            // Base plate cell
            cube([grid_unit, grid_unit, plate_height]);
            
            // Socket cutout
            grid_socket();
            
            // Style-specific cutouts
            if (style == "magnet") {
                for (mx = [4.8, grid_unit - 4.8])
                for (my = [4.8, grid_unit - 4.8])
                translate([mx, my, -0.1])
                magnet_hole();
            }
            
            if (style == "screw") {
                for (sx = [4.8, grid_unit - 4.8])
                for (sy = [4.8, grid_unit - 4.8])
                translate([sx, sy, -0.1])
                screw_hole();
            }
            
            if (style == "weighted") {
                weight_cutout();
            }
        }
    }
}

// Corner rounding cutout module
module corner_round_cut(r, h) {
    if (r > 0) {
        difference() {
            cube([r + 0.1, r + 0.1, h + 0.2]);
            translate([r, r, -0.1])
            cylinder(r=r, h=h + 0.4, $fn=corner_segments);
        }
    }
}

// Main baseplate
module gridfinity_baseplate() {
    difference() {
        union() {
            // Generate all grid cells
            for (x = [0:width_units-1])
            for (y = [0:depth_units-1])
            grid_cell(x, y);
        }
        
        // Round outer corners if enabled
        if (corner_radius > 0) {
            // Bottom-left corner
            translate([-0.1, -0.1, -0.1])
            corner_round_cut(corner_radius, plate_height);
            
            // Bottom-right corner
            translate([plate_width + 0.1, -0.1, -0.1])
            rotate([0, 0, 90])
            corner_round_cut(corner_radius, plate_height);
            
            // Top-left corner
            translate([-0.1, plate_depth + 0.1, -0.1])
            rotate([0, 0, -90])
            corner_round_cut(corner_radius, plate_height);
            
            // Top-right corner
            translate([plate_width + 0.1, plate_depth + 0.1, -0.1])
            rotate([0, 0, 180])
            corner_round_cut(corner_radius, plate_height);
        }
    }
    
    // Lid plate options
    if (lid_option == "flat") {
        translate([0, 0, plate_height])
        rounded_rect(plate_width, plate_depth, 1.2, corner_radius, corner_segments);
    }
    
    if (lid_option == "halfPitch") {
        translate([0, 0, plate_height])
        difference() {
            rounded_rect(plate_width, plate_depth, 2.5, corner_radius, corner_segments);
            
            // Half-pitch grid pattern cutouts
            for (x = [0:width_units*2-1])
            for (y = [0:depth_units*2-1])
            translate([x * grid_unit/2 + grid_unit/4, y * grid_unit/2 + grid_unit/4, 1.2])
            cylinder(d=grid_unit/2 - 2, h=2, $fn=32);
        }
    }
}

// Render
gridfinity_baseplate();
