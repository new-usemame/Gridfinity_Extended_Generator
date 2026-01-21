# Bug Analysis: Missing 0.5mm Closing Wall for Half Cells

## Problem
The 0.5mm closing wall for half cells is not visible in the rendered baseplate, even though the code should be adding it.

## Code Flow Analysis

### Step 1: `splitBaseplateForPrinter` sets padding
```typescript
// Lines 520-543 in config.ts
} else if (segmentHasHalfCellX) {
  // Non-last segments with half cells
  const originalPaddingFarX = segmentPaddingFarX;  // Initially 0
  if (originalPaddingFarX < minWallThickness) {
    segmentPaddingFarX = minWallThickness;  // Sets to 0.5mm ✅
  }
}
```

**Result:** `segment.paddingFarX = 0.5mm` ✅

### Step 2: `generateSegmentScad` reads padding
```typescript
// Lines 1282-1285
const paddingFarX = segment.paddingFarX;  // Should be 0.5mm ✅
```

**Result:** `paddingFarX = 0.5mm` ✅

### Step 3: Calculate effective padding
```typescript
// Line 1320
const effectivePaddingFarX = (paddingFarX >= minWallThickness) 
    ? paddingFarX 
    : (hasHalfCellX ? Math.max(paddingFarX, minWallThickness) : paddingFarX);
```

**If `paddingFarX = 0.5`:** `effectivePaddingFarX = 0.5` ✅

### Step 4: Calculate outer width
```typescript
// Line 1322
const outerWidthMm = gridWidth + paddingNearX + effectivePaddingFarX;
// = gridWidth + 0 + 0.5 = gridWidth + 0.5 ✅
```

**Result:** `outerWidthMm = gridWidth + 0.5mm` ✅

### Step 5: Determine fill mode
```typescript
// Line 1360
const useFillMode = (paddingNearX + effectivePaddingFarX + paddingNearY + effectivePaddingFarY) > 0;
// = (0 + 0.5 + 0 + 0) > 0 = true ✅
```

**Result:** `useFillMode = true` ✅

### Step 6: Generate SCAD
```scad
// Line 1572
plate_width = use_fill_mode ? outer_width_mm : grid_width;
// = true ? (gridWidth + 0.5) : gridWidth
// = gridWidth + 0.5 ✅
```

**Expected Result:** `plate_width = gridWidth + 0.5mm` ✅

## Potential Issues

### Issue 1: Padding Not Set in `splitBaseplateForPrinter`

**Scenario:** Non-last segment with half cell, but the `else if` condition doesn't trigger.

**Check:** Is `segmentHasHalfCellX` correctly calculated?
```typescript
const segmentHasHalfCellX = gridUnitsX - Math.floor(gridUnitsX) >= 0.5;
```

**Potential Bug:** If `gridUnitsX = 1.5`, then `1.5 - 1 = 0.5`, so `0.5 >= 0.5 = true` ✅

**But:** What if `gridUnitsX = 1.499`? Then `1.499 - 1 = 0.499`, so `0.499 >= 0.5 = false` ❌

**Fix Needed:** Use `> 0.5` instead of `>= 0.5`, or better: `> 0.49` to account for floating point errors.

### Issue 2: Last Segment Logic Override

**Scenario:** Last segment with half cell goes through first `if` block, not the `else if`.

**Code:**
```typescript
if (sx === segmentsX - 1) {
  // Last segment
  if (originalPaddingFarX < minWallThickness) {
    segmentPaddingFarX = minWallThickness;  // Sets to 0.5mm ✅
  }
} else if (segmentHasHalfCellX) {
  // Non-last with half cell
  // ...
}
```

**This should work** - last segments get 0.5mm padding. ✅

### Issue 3: `useFillMode` Calculation Error

**Scenario:** Floating point precision issue.

**Check:** What if `effectivePaddingFarX = 0.499999999` due to floating point?
```typescript
const useFillMode = (0 + 0.499999999 + 0 + 0) > 0;  // Still true ✅
```

**Should be fine** - any value > 0 makes it true. ✅

### Issue 4: SCAD Variable Not Used Correctly

**Scenario:** `outer_width_mm` is calculated but `plate_width` uses wrong variable.

**Check SCAD:**
```scad
outer_width_mm = ${outerWidthMm.toFixed(2)};  // e.g., 63.50
plate_width = use_fill_mode ? outer_width_mm : grid_width;
```

**This looks correct** ✅

### Issue 5: Socket Cutout Extends Too Far

**Scenario:** The socket cutout for half cell extends beyond where it should, cutting into the wall.

**Check:** Half cell socket position
```scad
// Half cell on X edge
translate([grid_offset_x + full_cells_x * grid_unit, ...])
grid_socket(half_cell_size, grid_unit);
```

**Position:** `grid_offset_x + full_cells_x * grid_unit`
- If `width_units = 1.5`, `full_cells_x = 1`
- Position = `0 + 1 * 42 = 42mm`
- Half cell extends to: `42 + 21 = 63mm` ✅

**Socket cutout:** Should end at 63mm ✅
**Plate extends to:** `63 + 0.5 = 63.5mm` ✅
**Wall should be:** 63mm to 63.5mm ✅

**BUT:** What if `grid_offset_x > 0` (fill mode)? Then the calculation changes!

### Issue 6: Grid Offset Not Accounted For

**CRITICAL BUG FOUND!**

**Scenario:** When `use_fill_mode = true`, `grid_offset_x = padding_near_x`.

**Problem:**
- Half cell socket ends at: `grid_offset_x + width_units * grid_unit`
- If `grid_offset_x = 5mm` and `width_units = 1.5`:
  - Half cell ends at: `5 + 1.5 * 42 = 5 + 63 = 68mm`
- Plate extends to: `outer_width_mm = grid_width + padding_near_x + padding_far_x`
  - `grid_width = 1.5 * 42 = 63mm`
  - `outer_width_mm = 63 + 5 + 0.5 = 68.5mm`
- Wall should be: 68mm to 68.5mm ✅

**Wait, that should work...** But let me check the actual calculation:

```typescript
const outerWidthMm = gridWidth + paddingNearX + effectivePaddingFarX;
```

**If `paddingNearX = 5mm` and `effectivePaddingFarX = 0.5mm`:**
- `outerWidthMm = 63 + 5 + 0.5 = 68.5mm` ✅

**In SCAD:**
```scad
grid_width = 1.5 * 42 = 63mm
outer_width_mm = 68.5mm
plate_width = 68.5mm  // ✅ Correct
```

**Half cell ends at:**
```scad
grid_offset_x + width_units * grid_unit = 5 + 1.5 * 42 = 68mm
```

**Wall:** 68mm to 68.5mm = 0.5mm ✅

**This should work!** So the issue must be elsewhere.

## Most Likely Issue: Floating Point Precision

**Hypothesis:** The half cell detection uses `>= 0.5`, which might fail due to floating point precision.

**Example:**
- `gridUnitsX = 1.5` (exactly)
- `Math.floor(1.5) = 1`
- `1.5 - 1 = 0.5`
- `0.5 >= 0.5 = true` ✅

**But what if:**
- `gridUnitsX = 1.499999999` (due to calculation)
- `Math.floor(1.499999999) = 1`
- `1.499999999 - 1 = 0.499999999`
- `0.499999999 >= 0.5 = false` ❌

**Fix:**
```typescript
// Instead of:
const hasHalfCellX = widthUnits - Math.floor(widthUnits) >= 0.5;

// Use:
const hasHalfCellX = (widthUnits - Math.floor(widthUnits)) > 0.49;
// Or better:
const fractionalPart = widthUnits - Math.floor(widthUnits);
const hasHalfCellX = fractionalPart >= 0.5 - 0.001;  // Account for floating point error
```

## Recommended Fix

1. **Improve half cell detection** to account for floating point errors
2. **Add explicit check** in `generateSegmentScad` to ensure padding is added even if detection fails
3. **Add validation** to verify `plate_width > grid_width` when half cells exist
