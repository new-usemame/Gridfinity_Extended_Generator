// Gridfinity Basic Cup - Extended with Corner Rounding
// Based on ostat/gridfinity_extended_openscad
// Modified to add corner_radius parameter for easier printing
// License: GPL-3.0

/* [Box Dimensions] */
// Width in grid units (0.5 to 8)
width_units = 1; // [0.5:0.5:8]
// Depth in grid units (0.5 to 8)
depth_units = 1; // [0.5:0.5:8]
// Height in grid units (1 to 10)
height_units = 3; // [1:1:10]

/* [Wall Settings] */
// Wall thickness in mm
wall_thickness = 0.95; // [0.8:0.05:2.4]
// Floor thickness in mm
floor_thickness = 0.7; // [0.7:0.1:2.0]

/* [Magnets] */
// Enable magnet holes
magnet_enabled = true;
// Magnet diameter in mm
magnet_diameter = 6; // [3:0.5:10]
// Magnet depth in mm
magnet_depth = 2; // [1:0.5:5]

/* [Screws] */
// Enable screw holes
screw_enabled = false;
// Screw diameter in mm
screw_diameter = 3; // [2:0.5:6]

/* [Features] */
// Enable finger slide cutout
finger_slide = false;
// Position of finger slide
finger_slide_position = "front"; // [front, back, left, right]

/* [Label] */
// Enable label tab
label_enabled = false;
// Position of label tab
label_position = "front"; // [front, back, left, right]
// Label width percentage
label_width_percent = 100; // [20:5:100]

/* [Dividers] */
// Number of X dividers
dividers_x = 0; // [0:1:10]
// Number of Y dividers
dividers_y = 0; // [0:1:10]

/* [Style] */
// Lip style
lip_style = "standard"; // [none, standard, reduced]
// Base style
base_style = "standard"; // [standard, efficient, filled]

/* [Corner Rounding - NEW] */
// Corner radius in mm (0 = sharp corners)
corner_radius = 0; // [0:0.25:5]

// Constants
grid_unit = 42;
base_height = 5;
lip_height = 4.75;
stacking_lip = 2.15;

// Calculated dimensions
box_width = width_units * grid_unit;
box_depth = depth_units * grid_unit;
box_height = height_units * 7 + base_height;

// Rounded rectangle module
module rounded_rect(w, d, h, r) {
    if (r > 0) {
        hull() {
            translate([r, r, 0]) cylinder(h=h, r=r, $fn=32);
            translate([w-r, r, 0]) cylinder(h=h, r=r, $fn=32);
            translate([r, d-r, 0]) cylinder(h=h, r=r, $fn=32);
            translate([w-r, d-r, 0]) cylinder(h=h, r=r, $fn=32);
        }
    } else {
        cube([w, d, h]);
    }
}

// Base profile for Gridfinity stacking
module gridfinity_base_profile() {
    polygon(points=[
        [0, 0],
        [0.8, 0],
        [0.8, 0.8],
        [2.15, 2.15],
        [2.15, base_height],
        [0, base_height]
    ]);
}

// Single grid base
module grid_base(r=0) {
    difference() {
        union() {
            // Main base block
            translate([0.25, 0.25, 0])
            rounded_rect(grid_unit - 0.5, grid_unit - 0.5, base_height, r > 0 ? min(r, 2) : 0);
            
            // Stacking lip profile
            translate([grid_unit/2, grid_unit/2, 0])
            rotate_extrude($fn=64)
            translate([grid_unit/2 - 2.4, 0, 0])
            gridfinity_base_profile();
        }
        
        // Magnet holes
        if (magnet_enabled) {
            for (x = [4.8, grid_unit - 4.8])
            for (y = [4.8, grid_unit - 4.8])
            translate([x, y, -0.1])
            cylinder(d=magnet_diameter, h=magnet_depth + 0.1, $fn=32);
        }
        
        // Screw holes
        if (screw_enabled) {
            for (x = [4.8, grid_unit - 4.8])
            for (y = [4.8, grid_unit - 4.8])
            translate([x, y, -0.1])
            cylinder(d=screw_diameter, h=base_height + 0.2, $fn=32);
        }
    }
}

// Main box body
module box_body() {
    difference() {
        // Outer shell
        rounded_rect(box_width, box_depth, box_height, corner_radius);
        
        // Inner cavity
        translate([wall_thickness, wall_thickness, floor_thickness])
        rounded_rect(
            box_width - wall_thickness*2, 
            box_depth - wall_thickness*2, 
            box_height, 
            corner_radius > 0 ? max(0, corner_radius - wall_thickness) : 0
        );
        
        // Stacking lip cutout at top
        if (lip_style != "none") {
            lip_h = lip_style == "reduced" ? lip_height * 0.6 : lip_height;
            translate([0, 0, box_height - lip_h])
            difference() {
                cube([box_width, box_depth, lip_h + 1]);
                translate([stacking_lip, stacking_lip, 0])
                rounded_rect(
                    box_width - stacking_lip*2,
                    box_depth - stacking_lip*2,
                    lip_h + 1,
                    corner_radius > 0 ? max(0, corner_radius - stacking_lip) : 0
                );
            }
        }
    }
}

// Finger slide cutout
module finger_slide_cut() {
    if (finger_slide) {
        slide_width = box_width * 0.6;
        slide_depth = 15;
        slide_height = box_height * 0.5;
        
        if (finger_slide_position == "front") {
            translate([(box_width - slide_width)/2, -1, box_height - slide_height])
            rotate([-30, 0, 0])
            cube([slide_width, slide_depth, slide_height]);
        } else if (finger_slide_position == "back") {
            translate([(box_width - slide_width)/2, box_depth - slide_depth + 1, box_height - slide_height])
            rotate([30, 0, 0])
            cube([slide_width, slide_depth, slide_height]);
        } else if (finger_slide_position == "left") {
            translate([-1, (box_depth - slide_width)/2, box_height - slide_height])
            rotate([0, 30, 0])
            cube([slide_depth, slide_width, slide_height]);
        } else if (finger_slide_position == "right") {
            translate([box_width - slide_depth + 1, (box_depth - slide_width)/2, box_height - slide_height])
            rotate([0, -30, 0])
            cube([slide_depth, slide_width, slide_height]);
        }
    }
}

// Label tab
module label_tab() {
    if (label_enabled) {
        tab_width = (box_width - wall_thickness*2) * (label_width_percent / 100);
        tab_height = 12;
        tab_depth = 1.2;
        
        if (label_position == "front") {
            translate([(box_width - tab_width)/2, -0.1, box_height - tab_height - lip_height])
            cube([tab_width, tab_depth + 0.1, tab_height]);
        } else if (label_position == "back") {
            translate([(box_width - tab_width)/2, box_depth - tab_depth, box_height - tab_height - lip_height])
            cube([tab_width, tab_depth + 0.1, tab_height]);
        } else if (label_position == "left") {
            translate([-0.1, (box_depth - tab_width)/2, box_height - tab_height - lip_height])
            cube([tab_depth + 0.1, tab_width, tab_height]);
        } else if (label_position == "right") {
            translate([box_width - tab_depth, (box_depth - tab_width)/2, box_height - tab_height - lip_height])
            cube([tab_depth + 0.1, tab_width, tab_height]);
        }
    }
}

// Dividers
module dividers() {
    if (dividers_x > 0 || dividers_y > 0) {
        inner_width = box_width - wall_thickness*2;
        inner_depth = box_depth - wall_thickness*2;
        divider_height = box_height - floor_thickness - lip_height;
        
        // X dividers
        if (dividers_x > 0) {
            spacing_x = inner_width / (dividers_x + 1);
            for (i = [1:dividers_x]) {
                translate([wall_thickness + i * spacing_x - 0.6, wall_thickness, floor_thickness])
                cube([1.2, inner_depth, divider_height]);
            }
        }
        
        // Y dividers
        if (dividers_y > 0) {
            spacing_y = inner_depth / (dividers_y + 1);
            for (i = [1:dividers_y]) {
                translate([wall_thickness, wall_thickness + i * spacing_y - 0.6, floor_thickness])
                cube([inner_width, 1.2, divider_height]);
            }
        }
    }
}

// Complete box
module gridfinity_box() {
    union() {
        // Base grid
        for (x = [0:width_units-1])
        for (y = [0:depth_units-1])
        translate([x * grid_unit, y * grid_unit, 0])
        grid_base(corner_radius);
        
        // Box body
        difference() {
            union() {
                box_body();
                label_tab();
            }
            finger_slide_cut();
        }
        
        // Dividers
        dividers();
    }
}

// Render
gridfinity_box();
