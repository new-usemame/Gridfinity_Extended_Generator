# Gridfinity Generator Analysis

## How the Generator Works

### Architecture Flow

1. **Frontend (React/TypeScript)**
   - User configures box/baseplate parameters via UI
   - Sends config to backend via `/api/generate` endpoint
   - Displays generated STL in Three.js preview

2. **Backend (Node.js/Express)**
   - Receives config from frontend
   - `OpenSCADService` generates OpenSCAD code from config
   - Executes OpenSCAD CLI to render SCAD → STL file
   - Returns STL file URL to frontend

3. **OpenSCAD Rendering**
   - Generated SCAD code is written to temp file
   - OpenSCAD CLI renders to STL (can take seconds to minutes)
   - STL file saved to `backend/generated/` directory
   - File served via static file endpoint

### Key Components

- **`backend/src/routes/generate.ts`**: API endpoint handler
- **`backend/src/services/openscad.ts`**: Core generation logic (2924 lines)
- **`frontend/src/pages/Generator/Generator.tsx`**: Frontend UI
- **`frontend/src/types/config.ts`**: Configuration interfaces

---

## All Calculations

### 1. Grid Unit Conversions

**Box Dimensions:**
```typescript
box_width = width_units * grid_unit        // Default: 42mm per unit
box_depth = depth_units * grid_unit
box_height = height_units * 7 + base_height  // 7mm per height unit + base
```

**Baseplate Dimensions:**
```typescript
grid_width = width_units * grid_unit
grid_depth = depth_units * grid_unit
```

### 2. Fill Area Mode Calculations (`calculateGridFromMm`)

**Grid Cell Calculation:**
```typescript
fullCellsX = Math.floor(targetWidthMm / gridSize)
remainderX = targetWidthMm - (fullCellsX * gridSize)
hasHalfCellX = allowHalfCellsX && remainderX >= (gridSize / 2)
gridUnitsX = fullCellsX + (hasHalfCellX ? 0.5 : 0)
gridCoverageMmX = gridUnitsX * gridSize
totalPaddingX = targetWidthMm - gridCoverageMmX
```

**Padding Distribution (Center Alignment):**
```typescript
paddingNearX = Math.round((totalPaddingX / 2) * 1000) / 1000
paddingFarX = totalPaddingX - paddingNearX  // Ensures exact equality
```

### 3. Foot/Socket Chamfer Calculations

**Bottom Inset from Angle:**
```typescript
// For foot (box)
foot_bottom_inset = foot_chamfer_height / tan(foot_chamfer_angle)

// For socket (baseplate)
socket_bottom_inset = socket_chamfer_height / tan(socket_chamfer_angle)
```

**Foot Size Calculation:**
```typescript
foot_full_size = grid_unit - clearance * 2  // 42 - 0.5 = 41.5mm
bottom_size = foot_full_size - foot_bottom_inset * 2
```

**Socket Size Calculation:**
```typescript
socket_width = cell_width - clearance * 2
bottom_width = socket_width - socket_bottom_inset * 2
```

### 4. Lip Calculations

**Lip Taper Heights (Proportional Distribution):**
```typescript
gf_lip_riser_height = 1.8  // Fixed vertical riser
gf_lip_height = 1.2         // Fixed top lip
gf_lip_taper_total = lip_chamfer_height - gf_lip_riser_height - gf_lip_height
gf_lip_lower_taper_height = gf_lip_taper_total * 0.27  // ~16% proportion
gf_lip_upper_taper_height = gf_lip_taper_total * 0.73   // ~43% proportion
```

**Critical Matching:**
```typescript
gf_lip_upper_taper_angle = foot_chamfer_angle  // MUST match for stacking
```

### 5. Base Height Calculation

```typescript
base_height = foot_taper_height  // Simple taper only
// Standard: 4.75mm total (0.8 + 1.8 + 2.15 from Gridfinity Extended)
```

### 6. Wall Overhang Prevention

**Chamfer Inset:**
```typescript
chamfer_inset = chamfer_height / tan(chamfer_angle)
// Applied at bottom of walls to prevent overhangs where feet meet walls
```

### 7. Perfect Fit Lip Triangle

**Triangle Height:**
```typescript
triangle_height = wall_thickness * tan(foot_chamfer_angle)
// Creates 90-degree right triangle on top edge
```

### 8. Baseplate Segment Splitting (`splitBaseplateForPrinter`)

**Max Segment Size:**
```typescript
maxPaddingX = Math.max(paddingNearX, paddingFarX)
maxSegmentUnitsX = Math.floor((printerBedWidth - maxPaddingX) / gridSize)
safeMaxSegmentUnitsX = Math.max(1, maxSegmentUnitsX)
```

**Segment Count:**
```typescript
segmentsX = Math.ceil(effectiveGridUnitsX / safeMaxSegmentUnitsX)
segmentsY = Math.ceil(effectiveGridUnitsY / safeMaxSegmentUnitsY)
```

**Segment Grid Units:**
```typescript
// For last segment (preserves half cells)
gridUnitsX = endX - startX  // May be fractional

// For non-last segments
gridUnitsX = Math.floor(endX - startX)  // Must be integer
```

**Segment Dimensions:**
```typescript
segmentWidthMm = gridUnitsX * gridSize + paddingNearX + paddingFarX
segmentDepthMm = gridUnitsY * gridSize + paddingNearY + paddingFarY
```

### 9. Half Cell Detection

```typescript
hasHalfCellX = widthUnits - Math.floor(widthUnits) >= 0.5
hasHalfCellY = depthUnits - Math.floor(depthUnits) >= 0.5
halfCellSize = gridSize / 2  // 21mm
```

### 10. Connector Edge Pattern Calculations

**Tooth Positioning:**
```typescript
// For width_units > 1: teeth at grid boundaries [1, 2, ..., width_units-1]
// For width_units = 1: single tooth at 0.5 * grid_unit (center)
```

**Wineglass Pattern:**
```typescript
// Aspect ratio controls bulb shape
// 1.0 = circular, <1.0 = taller, >1.0 = wider
```

**Roof Intensity:**
```typescript
peakHeight = (connectorRoofIntensity / 100) * toothDepth
roofStartHeight = plateHeight - (connectorRoofDepth / 100) * plateHeight
```

### 11. Wall Pattern Grid

```typescript
cols = floor(width / (cell_size + spacing))
rows = floor(height / (cell_size + spacing))
offset_x = (width - cols * (cell_size + spacing) + spacing) / 2
offset_y = (height - rows * (cell_size + spacing) + spacing) / 2
```

### 12. Divider Positioning

```typescript
// X dividers
divider_spacing_x = (box_width - wall_thickness * 2) / (dividers_x + 1)
divider_x_pos = wall_thickness + divider_spacing_x * (i + 1)

// Y dividers
divider_spacing_y = (box_depth - wall_thickness * 2) / (dividers_y + 1)
divider_y_pos = wall_thickness + divider_spacing_y * (i + 1)
```

### 13. Inner Radius Calculation

```typescript
outer_radius = corner_radius > 0 ? corner_radius : 3.75  // Standard Gridfinity
inner_radius = max(0, outer_radius - wall_thickness)
```

### 14. Magnet/Screw Hole Positions

```typescript
// Standard positions (4 corners per grid unit)
positions = [
  [4.8, 4.8],
  [4.8, grid_unit - 4.8],
  [grid_unit - 4.8, 4.8],
  [grid_unit - 4.8, grid_unit - 4.8]
]
```

### 15. Grid Offset (Fill Mode)

```typescript
grid_offset_x = use_fill_mode ? padding_near_x : 0
grid_offset_y = use_fill_mode ? padding_near_y : 0
// Positions grid cells within plate when padding is used
```

### 16. Minimum Wall Thickness

```typescript
minWallThickness = 0.5  // Ensures closing walls on segments
// Applied to first/last segments even if padding was 0
```

---

## Integration with Gridfinity Extended

### Level of Integration: **Partial/Reference-Based**

The generator does **NOT** directly include or use Gridfinity Extended modules. Instead, it:

1. **References Constants** (but hardcodes them):
   - Uses same dimensions from `gridfinity_constants.scad`:
     - `gf_pitch = 42mm` (grid unit size)
     - `gf_zpitch = 7mm` (height unit)
     - `gf_cup_corner_radius = 3.75mm`
     - `gf_taper_angle = 45°`
     - Magnet diameter: 6.5mm, depth: 2.4mm
     - Magnet position: 4.8mm from corners
     - Screw diameter: 3mm

2. **Reimplements Geometry**:
   - Foot profile: Recreated with simple taper (not using `module_gridfinity_cup_base.scad`)
   - Socket profile: Recreated to match foot (not using baseplate modules)
   - Lip styles: Recreated (supports "normal", "reduced", "minimum", "perfect_fit")
   - Wall geometry: Custom implementation

3. **Compatibility Features**:
   - ✅ Uses same grid size (42mm)
   - ✅ Uses same corner radius (3.75mm)
   - ✅ Uses same height units (7mm)
   - ✅ Supports same lip styles (maps "standard" → "normal")
   - ✅ Magnet/screw positions match
   - ✅ Foot/socket dimensions match for proper fit

4. **What's NOT Integrated**:
   - ❌ Does not `include` or `use` Gridfinity Extended modules
   - ❌ Does not use `module_gridfinity_cup.scad`
   - ❌ Does not use `module_gridfinity_cup_base.scad`
   - ❌ Does not use `module_gridfinity_baseplate.scad`
   - ❌ Does not use any reusable modules from `scad/gridfinity-extended/modules/`
   - ❌ Custom edge patterns (dovetail, puzzle, wineglass) are unique to this generator

5. **Why This Approach?**:
   - **Standalone**: Works with standard OpenSCAD (no dependencies)
   - **Simplified**: Single-file SCAD output (easier to debug/modify)
   - **Customizable**: Full control over geometry generation
   - **Compatible**: Results match Gridfinity Extended dimensions

### Gridfinity Extended Files in Repository

The repository includes the full Gridfinity Extended project in `scad/gridfinity-extended/`:
- 59 module files
- 17 combined/demo files
- Constants file with official specs
- But these are **NOT used** by the generator - they're just included in the repo

### Summary

**Integration Level: ~30%**
- Uses same constants/dimensions: ✅
- Compatible output: ✅
- Reuses modules: ❌
- Direct code integration: ❌

The generator is **compatible** with Gridfinity Extended (bins fit on baseplates, dimensions match), but it's a **standalone reimplementation** rather than a wrapper around the existing modules.
