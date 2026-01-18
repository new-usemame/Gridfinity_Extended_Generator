// Rounded Corners Module for Gridfinity Generator
// Utility functions for adding rounded/filleted corners
// License: GPL-3.0

// Rounded rectangle - 2D
module rounded_rect_2d(w, d, r) {
    if (r > 0 && r < min(w, d) / 2) {
        hull() {
            translate([r, r]) circle(r=r, $fn=32);
            translate([w-r, r]) circle(r=r, $fn=32);
            translate([r, d-r]) circle(r=r, $fn=32);
            translate([w-r, d-r]) circle(r=r, $fn=32);
        }
    } else {
        square([w, d]);
    }
}

// Rounded rectangle - 3D (extruded)
module rounded_rect_3d(w, d, h, r, fn=32) {
    if (r > 0 && r < min(w, d) / 2) {
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

// Rounded cube - all edges rounded
module rounded_cube(size, r, fn=32) {
    w = is_list(size) ? size[0] : size;
    d = is_list(size) ? size[1] : size;
    h = is_list(size) ? size[2] : size;
    
    if (r > 0 && r < min(w, d, h) / 2) {
        hull() {
            // Bottom corners
            translate([r, r, r]) sphere(r=r, $fn=fn);
            translate([w-r, r, r]) sphere(r=r, $fn=fn);
            translate([r, d-r, r]) sphere(r=r, $fn=fn);
            translate([w-r, d-r, r]) sphere(r=r, $fn=fn);
            // Top corners
            translate([r, r, h-r]) sphere(r=r, $fn=fn);
            translate([w-r, r, h-r]) sphere(r=r, $fn=fn);
            translate([r, d-r, h-r]) sphere(r=r, $fn=fn);
            translate([w-r, d-r, h-r]) sphere(r=r, $fn=fn);
        }
    } else {
        cube([w, d, h]);
    }
}

// Chamfered rectangle - 3D
module chamfered_rect_3d(w, d, h, chamfer) {
    if (chamfer > 0 && chamfer < min(w, d) / 2) {
        hull() {
            // Bottom layer with chamfer
            translate([chamfer, 0, 0]) cube([w - 2*chamfer, d, 0.01]);
            translate([0, chamfer, 0]) cube([w, d - 2*chamfer, 0.01]);
            // Top layer with chamfer
            translate([chamfer, 0, h-0.01]) cube([w - 2*chamfer, d, 0.01]);
            translate([0, chamfer, h-0.01]) cube([w, d - 2*chamfer, 0.01]);
        }
    } else {
        cube([w, d, h]);
    }
}

// Corner cut for subtracting from sharp corners
module corner_cut(r, h, fn=32) {
    if (r > 0) {
        difference() {
            cube([r + 0.1, r + 0.1, h]);
            translate([r, r, -0.1])
            cylinder(r=r, h=h + 0.2, $fn=fn);
        }
    }
}

// Fillet along an edge (for subtractive filleting)
module edge_fillet(length, r, fn=32) {
    if (r > 0) {
        difference() {
            cube([r + 0.1, r + 0.1, length]);
            translate([r, r, -0.1])
            cylinder(r=r, h=length + 0.2, $fn=fn);
        }
    }
}

// Round all 4 vertical edges of a rectangular prism
module round_vertical_edges(w, d, h, r, fn=32) {
    difference() {
        cube([w, d, h]);
        
        if (r > 0) {
            // Corner at origin
            translate([-0.1, -0.1, -0.1])
            corner_cut(r, h + 0.2, fn);
            
            // Corner at +X
            translate([w + 0.1, -0.1, -0.1])
            rotate([0, 0, 90])
            corner_cut(r, h + 0.2, fn);
            
            // Corner at +Y
            translate([-0.1, d + 0.1, -0.1])
            rotate([0, 0, -90])
            corner_cut(r, h + 0.2, fn);
            
            // Corner at +X+Y
            translate([w + 0.1, d + 0.1, -0.1])
            rotate([0, 0, 180])
            corner_cut(r, h + 0.2, fn);
        }
    }
}

// Example usage
// rounded_rect_3d(42, 42, 10, 3);
// rounded_cube([42, 42, 10], 2);
// chamfered_rect_3d(42, 42, 10, 2);
// round_vertical_edges(42, 42, 10, 3);
