# Where is the 0.5mm Closing Wall?

## Physical Location

The closing wall for half cells appears as a **thin strip of plate material** extending beyond where the half cell socket ends.

### For Half Cells on X Edge (Right Side)

**Example:** Segment with `width_units = 1.5` (1 full cell + 1 half cell)

```
┌─────────────────────────────────────┐
│  Full Cell (42mm)                   │
│  ┌───────────────────────────────┐ │
│  │ Half Cell (21mm)              │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│  │← 0.5mm closing wall →│        │ ← HERE!
└─────────────────────────────────────┘
```

**Coordinates:**
- Half cell socket ends at: `grid_offset_x + width_units * grid_unit`
  - If no fill mode: `0 + 1.5 * 42 = 63mm`
  - If fill mode: `padding_near_x + 1.5 * 42`
- Plate extends to: `plate_width = grid_width + padding_far_x`
  - `grid_width = 1.5 * 42 = 63mm`
  - `padding_far_x = 0.5mm` (minimum for half cell)
  - `plate_width = 63 + 0.5 = 63.5mm`
- **Wall location:** From X=63mm to X=63.5mm (0.5mm thick)
- **Wall runs:** Entire Y depth (from Y=0 to Y=depth)

### For Half Cells on Y Edge (Back Side)

**Example:** Segment with `depth_units = 0.5` (only half cell)

```
┌─────────────────┐
│                 │
│  Half Cell      │
│  (21mm deep)    │
│                 │
├─────────────────┤
│ ← 0.5mm wall → │ ← HERE!
└─────────────────┘
```

**Coordinates:**
- Half cell socket ends at: `grid_offset_y + depth_units * grid_unit = 0 + 0.5 * 42 = 21mm`
- Plate extends to: `plate_depth = grid_depth + padding_far_y = 21 + 0.5 = 21.5mm`
- **Wall location:** From Y=21mm to Y=21.5mm (0.5mm thick)
- **Wall runs:** Entire X width (from X=0 to X=width)

## Why It's Hard to See

### 1. **Very Thin (0.5mm)**
- At typical preview zoom levels, 0.5mm is barely visible
- The wall is only 1.2% of a full grid cell (0.5mm / 42mm)
- In a 300mm × 250mm baseplate, 0.5mm is 0.17% of the width

### 2. **Same Height as Plate**
- The wall has the same height as the plate (`plate_height = socket_depth ≈ 4.75mm`)
- From a top-down view, you only see the edge, not the thickness
- It looks like just the plate edge, not a distinct wall

### 3. **Rounded Corners**
- The `rounded_rect_plate()` module uses rounded corners
- The wall blends into the corner radius
- At the corner, the wall might be even thinner due to rounding

### 4. **Rendering Resolution**
- STL previews may not show sub-millimeter features clearly
- OpenSCAD rendering with `$fn = 32` might smooth out very thin features
- Three.js preview might simplify geometry

## How to Verify It's There

### Method 1: Check Generated SCAD Code

Look for these values in the generated SCAD:

```scad
width_units = 1.5;  // Has half cell
padding_far_x = 0.5;  // Minimum wall added
grid_width = 63;  // 1.5 * 42
outer_width_mm = 63.5;  // 63 + 0.5
plate_width = 63.5;  // Extends beyond grid
```

### Method 2: Measure in CAD Software

1. Open the generated STL in a CAD viewer
2. Measure the plate width
3. Calculate: `plate_width - (width_units * grid_unit)`
4. Should equal `padding_far_x` (at least 0.5mm for half cells)

### Method 3: Visual Inspection (Zoomed In)

1. Zoom in very close to the edge where half cell ends
2. Look for a thin strip of material beyond the socket
3. The wall should be visible as a solid strip (not a cutout)

### Method 4: Check Debug Comments

The generated SCAD includes debug comments:

```scad
// DEBUG: Verify wall calculation for half cells
// For width_units=1.5, has_half_x=true, padding_far_x=0.50
// grid_width = 63.00mm, outer_width_mm = 63.50mm
// plate_width = 63.50mm
// Half cell ends at: grid_offset_x + width_units * grid_unit = 0 + 1.5 * 42 = 63mm
// Wall should extend from: 63mm to 63.50mm
// Wall thickness: 0.50mm
```

## Visual Representation

### Top View (Zoomed In on Edge)

```
Full Cell          Half Cell        Closing Wall
┌──────────┐      ┌──────┐         ┌─┐
│          │      │      │         │ │ 0.5mm
│  42mm    │      │ 21mm │         │ │ thick
│          │      │      │         │ │
└──────────┘      └──────┘         └─┘
  0-42mm           42-63mm          63-63.5mm
```

### Cross-Section View

```
Side View (looking at the edge):
                    ┌─────────────┐
                    │             │
                    │   Plate     │
                    │   Body      │
                    │             │
                    ├─────────────┤ ← Half cell socket ends here
                    │             │
                    │   Socket    │
                    │   Cutout    │
                    │             │
                    └─────────────┘
                    │← 0.5mm →│
                    └─────────┘ ← Closing wall (solid material)
```

## Code Location

The wall is created here in the SCAD:

```scad
module gridfinity_segment() {
    difference() {
        union() {
            // Main plate body - THIS creates the wall
            // plate_width extends beyond grid_width by padding_far_x
            rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
            // ...
        }
        // Socket cutouts - these stop at grid_width
        // Half cell socket ends at: grid_offset_x + width_units * grid_unit
        // But plate extends to: plate_width = grid_width + padding_far_x
        // So the wall is the difference: plate_width - (grid_offset_x + width_units * grid_unit)
        // ...
    }
}
```

## Summary

**The 0.5mm closing wall IS there**, but it's:
- ✅ **Functionally present** - The plate extends 0.5mm beyond the half cell
- ⚠️ **Visually subtle** - Only 0.5mm thick, hard to see at normal zoom
- ✅ **Geometrically correct** - Created by `plate_width > grid_width` when padding exists
- ✅ **Verified in code** - Both `splitBaseplateForPrinter` and `generateSegmentScad` enforce it

To see it clearly, you need to:
1. Zoom in very close to the edge
2. Use a CAD tool with precise measurement
3. Check the SCAD code debug comments
4. Look at the cross-section view, not just top-down
