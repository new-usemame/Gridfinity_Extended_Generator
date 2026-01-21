# Baseplate Outer Walls Generation

This document explains how baseplate outer walls are generated in different scenarios.

## Core Wall Generation Module

All baseplates use the same `rounded_rect_plate()` module to create the outer walls:

```scad
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
```

The key is how `plate_width` and `plate_depth` are calculated in each scenario.

---

## 1. Normal Mode (Grid Units)

**Configuration:** `sizingMode = 'grid_units'`

### Calculation Flow

```typescript
// From generateBaseplateScad()
widthUnits = config.width;           // e.g., 3
depthUnits = config.depth;           // e.g., 3
outerWidthMm = config.width * config.gridSize;   // 3 * 42 = 126mm
outerDepthMm = config.depth * config.gridSize;  // 3 * 42 = 126mm
paddingNearX = 0;
paddingFarX = 0;
paddingNearY = 0;
paddingFarY = 0;
useFillMode = false;
```

### SCAD Code Generated

```scad
/* [Calculated] */
grid_width = width_units * grid_unit;      // 3 * 42 = 126mm
grid_depth = depth_units * grid_unit;     // 3 * 42 = 126mm

// Total plate size (grid + padding)
plate_width = use_fill_mode ? outer_width_mm : grid_width;   // = 126mm
plate_depth = use_fill_mode ? outer_depth_mm : grid_depth;   // = 126mm

// Grid offset (where the grid starts within the plate)
grid_offset_x = use_fill_mode ? padding_near_x : 0;  // = 0
grid_offset_y = use_fill_mode ? padding_near_y : 0;   // = 0
```

### Wall Generation

```scad
module gridfinity_baseplate() {
    difference() {
        // Main plate body - EXACTLY matches grid size
        rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
        // ... socket cutouts ...
    }
}
```

**Result:**
- `plate_width = grid_width` (no padding)
- `plate_depth = grid_depth` (no padding)
- Grid starts at `(0, 0)` - no offset
- Walls are exactly at grid boundaries
- **No outer walls beyond grid** - plate edge IS the grid edge

**Visual:**
```
┌─────────────────┐
│  Grid Cell      │ ← Wall is at grid boundary
│  (42mm)         │
└─────────────────┘
```

---

## 2. Fill Area Mode

**Configuration:** `sizingMode = 'fill_area_mm'`

### Calculation Flow

```typescript
// From generateBaseplateScad()
const calc = calculateGridFromMm(
    config.targetWidthMm,   // e.g., 200mm
    config.targetDepthMm,   // e.g., 200mm
    config.gridSize,        // 42mm
    config.allowHalfCellsX, // true
    config.allowHalfCellsY, // true
    config.paddingAlignment  // 'center'
);

widthUnits = calc.gridUnitsX;        // e.g., 4.5 (4 full + 1 half)
depthUnits = calc.gridUnitsY;        // e.g., 4.5
outerWidthMm = config.targetWidthMm; // 200mm (exact target)
outerDepthMm = config.targetDepthMm; // 200mm
paddingNearX = calc.paddingNearX;    // e.g., 5.0mm (centered)
paddingFarX = calc.paddingFarX;      // e.g., 5.0mm
paddingNearY = calc.paddingNearY;    // e.g., 5.0mm
paddingFarY = calc.paddingFarY;      // e.g., 5.0mm
useFillMode = true;
```

**Example Calculation:**
- Target: 200mm × 200mm
- Grid size: 42mm
- Full cells: `floor(200/42) = 4`
- Remainder: `200 - (4 * 42) = 32mm`
- Half cell threshold: `42/2 = 21mm`
- Since `32mm >= 21mm`: Add half cell
- Grid units: `4 + 0.5 = 4.5`
- Grid coverage: `4.5 * 42 = 189mm`
- Total padding: `200 - 189 = 11mm`
- Padding per side (center): `11/2 = 5.5mm` → `5.0mm` and `6.0mm` (exact split)

### SCAD Code Generated

```scad
/* [Calculated] */
grid_width = width_units * grid_unit;      // 4.5 * 42 = 189mm
grid_depth = depth_units * grid_unit;     // 4.5 * 42 = 189mm

// Total plate size (grid + padding)
plate_width = use_fill_mode ? outer_width_mm : grid_width;   // = 200mm
plate_depth = use_fill_mode ? outer_depth_mm : grid_depth;   // = 200mm

// Grid offset (where the grid starts within the plate)
grid_offset_x = use_fill_mode ? padding_near_x : 0;  // = 5.0mm
grid_offset_y = use_fill_mode ? padding_near_y : 0;   // = 5.0mm
```

### Wall Generation

```scad
module gridfinity_baseplate() {
    difference() {
        // Main plate body - EXTENDS beyond grid with padding
        rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
        // ... socket cutouts positioned at grid_offset ...
    }
}
```

**Result:**
- `plate_width = outer_width_mm` (includes padding)
- `plate_depth = outer_depth_mm` (includes padding)
- Grid starts at `(padding_near_x, padding_near_y)` - offset by padding
- **Outer walls extend beyond grid** - padding creates walls on all sides
- Half cells on far edges are covered by padding walls

**Visual:**
```
┌─────────────────────────────────┐
│ Padding (5mm)                   │ ← Outer wall (padding)
│  ┌───────────────────────────┐  │
│  │ Grid Cell (42mm)           │  │
│  │ Grid Cell (42mm)           │  │
│  │ Grid Cell (42mm)           │  │
│  │ Grid Cell (42mm)           │  │
│  │ Half Cell (21mm)           │  │
│  └───────────────────────────┘  │
│ Padding (6mm)                   │ ← Outer wall (padding)
└─────────────────────────────────┘
Total: 200mm (5 + 189 + 6)
```

---

## 3. Print Bed Splitting Mode

**Configuration:** `splitEnabled = true`

### Calculation Flow

Each segment is calculated individually:

```typescript
// From generateSegmentScad()
const widthUnits = segment.gridUnitsX;      // Can be fractional (e.g., 7.5)
const depthUnits = segment.gridUnitsY;     // Can be fractional (e.g., 7.5)
const gridWidth = widthUnits * gridSize;   // 7.5 * 42 = 315mm
const gridDepth = depthUnits * gridSize;  // 7.5 * 42 = 315mm

// Get padding from segment info (calculated by splitBaseplateForPrinter)
const paddingNearX = segment.paddingNearX;  // Only first segment in X
const paddingFarX = segment.paddingFarX;    // Only last segment in X
const paddingNearY = segment.paddingNearY;  // Only first segment in Y
const paddingFarY = segment.paddingFarY;     // Only last segment in Y

// CRITICAL: Handle half cells on far edges
const hasHalfCellX = widthUnits - Math.floor(widthUnits) >= 0.5;
const hasHalfCellY = depthUnits - Math.floor(depthUnits) >= 0.5;
const minWallThickness = 0.5;

// Ensure minimum wall for half cells or last segments
const effectivePaddingFarX = (paddingFarX >= minWallThickness) 
    ? paddingFarX 
    : (hasHalfCellX ? Math.max(paddingFarX, minWallThickness) : paddingFarX);
const effectivePaddingFarY = (paddingFarY >= minWallThickness) 
    ? paddingFarY 
    : (hasHalfCellY ? Math.max(paddingFarY, minWallThickness) : paddingFarY);

const outerWidthMm = gridWidth + paddingNearX + effectivePaddingFarX;
const outerDepthMm = gridDepth + paddingNearY + effectivePaddingFarY;
const useFillMode = (paddingNearX + effectivePaddingFarX + paddingNearY + effectivePaddingFarY) > 0;
```

### Segment Padding Rules

1. **First segment in X/Y:** Gets `paddingNearX/Y` (from fill mode or minimum 0.5mm)
2. **Last segment in X/Y:** Gets `paddingFarX/Y` (from fill mode or minimum 0.5mm)
3. **Middle segments:** No padding (0mm)
4. **Half cells on far edge:** Minimum 0.5mm padding added if not already present

### SCAD Code Generated

```scad
/* [Calculated] */
grid_width = width_units * grid_unit;      // e.g., 7.5 * 42 = 315mm
grid_depth = depth_units * grid_unit;     // e.g., 7.5 * 42 = 315mm

// Total plate size (grid + padding)
outer_width_mm = ${outerWidthMm.toFixed(2)};  // e.g., 315 + 0 + 0.5 = 315.5mm
outer_depth_mm = ${outerDepthMm.toFixed(2)};   // e.g., 315 + 0 + 0.5 = 315.5mm
use_fill_mode = ${useFillMode};                // true if any padding > 0

plate_width = use_fill_mode ? outer_width_mm : grid_width;
plate_depth = use_fill_mode ? outer_depth_mm : grid_depth;

// Grid offset
grid_offset_x = use_fill_mode ? padding_near_x : 0;
grid_offset_y = use_fill_mode ? padding_near_y : 0;
```

### Wall Generation

```scad
module gridfinity_segment() {
    difference() {
        union() {
            // Main plate body - may extend beyond grid for closing walls
            rounded_rect_plate(plate_width, plate_depth, plate_height, corner_radius);
            // ... male connector teeth ...
        }
        // ... socket cutouts ...
        // ... female connector cavities ...
    }
}
```

### Scenarios

#### Scenario A: Middle Segment (No Padding)

**Example:** Segment [1, 0] in a 3×3 split
- `widthUnits = 5.0` (integer)
- `depthUnits = 5.0` (integer)
- `paddingNearX = 0` (not first)
- `paddingFarX = 0` (not last)
- `paddingNearY = 0` (not first)
- `paddingFarY = 0` (not last)
- `useFillMode = false`

**Result:**
- `plate_width = grid_width = 210mm` (5 * 42)
- `plate_depth = grid_depth = 210mm`
- **No outer walls beyond grid** - plate edge IS grid edge
- Connectors on left/right/front/back edges for interlocking

#### Scenario B: Last Segment with Half Cell

**Example:** Last segment in X direction
- `widthUnits = 1.5` (has half cell)
- `depthUnits = 5.0`
- `paddingNearX = 0` (not first)
- `paddingFarX = 0` (from original config, but...)
- `effectivePaddingFarX = 0.5` (minimum for half cell)
- `useFillMode = true`

**Result:**
- `grid_width = 1.5 * 42 = 63mm` (includes 21mm half cell)
- `outer_width_mm = 63 + 0 + 0.5 = 63.5mm`
- `plate_width = 63.5mm`
- **Closing wall extends from 63mm to 63.5mm** (0.5mm wall)
- Half cell ends at `grid_offset_x + 1.5 * 42 = 63mm`
- Wall extends from `63mm` to `63.5mm`

**Visual:**
```
┌─────────────────────────────┐
│ Grid Cell (42mm)            │
│ Half Cell (21mm)            │
│ └─┐                         │
│   │ 0.5mm closing wall      │ ← Outer wall (padding)
└───┴─────────────────────────┘
```

#### Scenario C: First Segment with Fill Mode Padding

**Example:** First segment in X, from fill mode
- `widthUnits = 4.0`
- `paddingNearX = 5.0` (from fill mode calculation)
- `paddingFarX = 0` (not last)
- `useFillMode = true`

**Result:**
- `grid_width = 4 * 42 = 168mm`
- `outer_width_mm = 168 + 5.0 + 0 = 173mm`
- `plate_width = 173mm`
- `grid_offset_x = 5.0mm`
- **5mm wall on left edge** (padding)
- Grid starts at X=5mm, ends at X=173mm

**Visual:**
```
┌─────────────────────────────────┐
│ 5mm padding                      │ ← Outer wall (padding)
│  ┌─────────────────────────────┐ │
│  │ Grid Cell (42mm)             │ │
│  │ Grid Cell (42mm)             │ │
│  │ Grid Cell (42mm)             │ │
│  │ Grid Cell (42mm)             │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

#### Scenario D: Last Segment with Fill Mode Padding

**Example:** Last segment in X, from fill mode
- `widthUnits = 3.5` (has half cell)
- `paddingNearX = 0` (not first)
- `paddingFarX = 6.0` (from fill mode)
- `effectivePaddingFarX = 6.0` (already >= 0.5mm)
- `useFillMode = true`

**Result:**
- `grid_width = 3.5 * 42 = 147mm` (includes 21mm half cell)
- `outer_width_mm = 147 + 0 + 6.0 = 153mm`
- `plate_width = 153mm`
- **6mm wall on right edge** (padding)
- Half cell ends at 147mm, wall extends to 153mm

---

## 4. Combined Preview (Split Mode)

**Special Case:** When generating combined preview of all segments

### Calculation Flow

```typescript
// From generateCombinedPreviewScad()
// Each segment is placed with gaps between them
const gap = 5; // mm between segments

// Position calculation
let posX = 0;
for (let i = 0; i < sx; i++) {
    const prevSegment = splitInfo.segments[sy][i];
    const prevSegmentWidth = prevSegment.gridUnitsX * gridSize + 
                             (prevSegment.paddingNearX || 0) + 
                             (prevSegment.paddingFarX || 0);
    posX += prevSegmentWidth + gap;
}
```

### Wall Generation

Each segment uses the same `segment_base()` module with calculated padding:

```scad
// Segment [sx, sy]
translate([posX, posY, 0])
segment_base(
    segment.gridUnitsX, 
    segment.gridUnitsY, 
    leftEdge, rightEdge, frontEdge, backEdge,
    paddingNearX, paddingFarX, paddingNearY, paddingFarY
);
```

**Result:**
- Each segment generates its own walls independently
- Segments are positioned with 5mm gaps for visualization
- Walls are generated per segment using the same logic as individual segments

---

## Summary Table

| Mode | `plate_width` | `plate_depth` | `grid_offset_x` | `grid_offset_y` | Outer Walls |
|------|---------------|---------------|-----------------|-----------------|-------------|
| **Normal** | `grid_width` | `grid_depth` | `0` | `0` | None (plate edge = grid edge) |
| **Fill Area** | `outer_width_mm` | `outer_depth_mm` | `padding_near_x` | `padding_near_y` | Padding on all sides |
| **Split - Middle** | `grid_width` | `grid_depth` | `0` | `0` | None (unless half cells) |
| **Split - First** | `grid_width + padding_near` | `grid_depth + padding_near` | `padding_near_x` | `padding_near_y` | Padding on near edge |
| **Split - Last** | `grid_width + padding_far` | `grid_depth + padding_far` | `0` | `0` | Padding on far edge (min 0.5mm if half cell) |
| **Split - First+Last** | `grid_width + padding_near + padding_far` | `grid_depth + padding_near + padding_far` | `padding_near_x` | `padding_near_y` | Padding on both edges |

## Key Formulas

### Basic Plate Dimensions
```scad
grid_width = width_units * grid_unit
grid_depth = depth_units * grid_unit
outer_width_mm = grid_width + padding_near_x + padding_far_x
outer_depth_mm = grid_depth + padding_near_y + padding_far_y
plate_width = use_fill_mode ? outer_width_mm : grid_width
plate_depth = use_fill_mode ? outer_depth_mm : grid_depth
```

### Grid Offset
```scad
grid_offset_x = use_fill_mode ? padding_near_x : 0
grid_offset_y = use_fill_mode ? padding_near_y : 0
```

### Half Cell Wall Requirement
```typescript
const hasHalfCell = (units - Math.floor(units)) >= 0.5;
const minWallThickness = 0.5;
const effectivePaddingFar = (paddingFar >= minWallThickness) 
    ? paddingFar 
    : (hasHalfCell ? Math.max(paddingFar, minWallThickness) : paddingFar);
```

## Critical Rules

1. **Normal Mode:** Plate size = Grid size exactly (no padding)
2. **Fill Mode:** Plate size = Target size (includes padding)
3. **Split Mode - Middle Segments:** No padding unless half cells require it
4. **Split Mode - First/Last Segments:** Get padding from fill mode OR minimum 0.5mm for closing walls
5. **Half Cells:** Always require minimum 0.5mm padding on far edge to create closing wall
6. **Grid Offset:** Only applied when `use_fill_mode = true` (padding exists)
