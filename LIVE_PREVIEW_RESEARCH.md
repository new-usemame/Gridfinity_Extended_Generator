# Live Preview Research: Real-Time Updates for Gridfinity Generator

## Current Architecture

**Flow:**
1. User changes slider → Config state updates
2. User clicks "Generate STL" button
3. Frontend sends config to backend `/api/generate`
4. Backend generates OpenSCAD code
5. OpenSCAD renders SCAD → STL file (takes seconds to minutes)
6. Frontend loads STL file
7. Three.js displays the model

**Bottleneck:** OpenSCAD rendering is CPU-intensive and slow, especially for complex models.

## Solution Options

### Option 1: Client-Side Three.js Parametric Geometry ⭐ (Recommended)

**Approach:** Generate simplified geometry directly in the browser using Three.js, bypassing OpenSCAD entirely for preview.

**Pros:**
- ✅ Instant visual feedback (no server round-trip)
- ✅ Works offline
- ✅ No server load
- ✅ Smooth slider interaction

**Cons:**
- ❌ Need to recreate Gridfinity geometry logic in JavaScript
- ❌ May not match OpenSCAD output exactly (preview vs. final)
- ❌ Complex features (connectors, edge patterns) are harder to implement

**Implementation Strategy:**
- Create a `ParametricGeometryGenerator` utility that builds Three.js BufferGeometry from config
- Focus on core shapes first (box walls, baseplate sockets)
- Use simplified versions for complex features (connectors, edge patterns)
- Keep OpenSCAD generation for final STL export (high accuracy)

**Performance:** ~10-50ms per update (very fast)

---

### Option 2: Debounced Auto-Regeneration (Easiest)

**Approach:** Automatically trigger generation after user stops dragging (debounce/throttle).

**Pros:**
- ✅ Minimal code changes
- ✅ Uses existing OpenSCAD pipeline (accurate)
- ✅ No need to recreate geometry logic

**Cons:**
- ❌ Still slow (OpenSCAD rendering time)
- ❌ Server load increases
- ❌ Not truly "live" (delayed by debounce + render time)

**Implementation:**
```typescript
// Debounce generation by 500ms after last slider change
useEffect(() => {
  const timer = setTimeout(() => {
    handleGenerate();
  }, 500);
  return () => clearTimeout(timer);
}, [boxConfig, baseplateConfig]);
```

**Performance:** 500ms delay + OpenSCAD render time (2-30+ seconds)

---

### Option 3: Progressive Rendering (Hybrid) ⭐⭐ (Best UX)

**Approach:** Combine simplified Three.js preview (instant) with background OpenSCAD generation (accurate).

**Pros:**
- ✅ Instant visual feedback (Three.js preview)
- ✅ Accurate final model (OpenSCAD)
- ✅ Best of both worlds

**Cons:**
- ❌ More complex to implement
- ❌ Need to maintain two geometry systems

**Implementation Strategy:**
1. **Immediate Preview:** Show simplified Three.js geometry as user drags slider
2. **Background Generation:** Queue OpenSCAD generation after user stops (debounced)
3. **Progressive Update:** Replace preview with accurate STL when ready
4. **Visual Indicator:** Show "Preview" vs "Final" state

**Performance:** 
- Preview: ~10-50ms (instant)
- Final: 2-30+ seconds (background)

---

### Option 4: WebAssembly OpenSCAD (Complex)

**Approach:** Compile OpenSCAD to WebAssembly and run in browser.

**Pros:**
- ✅ Accurate geometry (same as server)
- ✅ No server load
- ✅ Works offline

**Cons:**
- ❌ Very complex to implement
- ❌ Large bundle size (~10-50MB+)
- ❌ Still slower than Three.js (but faster than server round-trip)
- ❌ May not be feasible (OpenSCAD may not compile to WASM easily)

**Performance:** 100-500ms per update (faster than server, slower than Three.js)

---

## Recommended Implementation Plan

### Phase 1: Debounced Auto-Regeneration (Quick Win)
- Add debounced auto-generation (500ms delay)
- Add visual loading states
- **Time:** 1-2 hours
- **Impact:** Medium (better UX, but still slow)

### Phase 2: Simplified Three.js Preview (Major Improvement)
- Create `ParametricGeometryGenerator` utility
- Implement basic box/baseplate shapes in Three.js
- Show preview immediately, generate STL in background
- **Time:** 1-2 days
- **Impact:** High (instant feedback)

### Phase 3: Enhanced Preview (Polish)
- Add more complex features to preview (connectors, edge patterns)
- Progressive quality (low-res preview → high-res final)
- **Time:** 2-3 days
- **Impact:** Very High (near-perfect UX)

---

## Technical Details

### Three.js Parametric Geometry Generator

**Key Components:**
1. **Box Generator:**
   - Walls (rounded rectangles)
   - Base/foot (tapered sockets)
   - Dividers
   - Finger slides
   - Lip/chamfers

2. **Baseplate Generator:**
   - Socket grid (tapered holes)
   - Edge connectors (male/female patterns)
   - Corner rounding

**Geometry Building:**
```typescript
// Example: Generate box walls
function generateBoxWalls(config: BoxConfig): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // Build rounded rectangle path
  // Extrude to create walls
  // Apply transformations
  return geometry;
}
```

**Coordinate System:**
- OpenSCAD: X=right, Y=back, Z=up
- Three.js: X=right, Y=up, Z=front
- Need transformation matrix (already implemented in PreviewCanvas)

---

## Performance Considerations

### Preview Quality vs. Speed Trade-off

**Low Quality (Fast):**
- Lower `$fn` equivalent (fewer curve segments)
- Simplified edge patterns
- Fewer subdivisions
- **Update Time:** ~10-30ms

**Medium Quality (Balanced):**
- Moderate curve resolution
- Basic edge patterns
- **Update Time:** ~30-100ms

**High Quality (Final STL):**
- Full OpenSCAD rendering
- All features accurate
- **Update Time:** 2-30+ seconds

---

## User Experience Flow

### Current Flow:
```
Drag Slider → [No Feedback] → Click Generate → Wait 5-30s → See Result
```

### Proposed Flow (Progressive):
```
Drag Slider → [Instant Preview] → Stop Dragging → [Background Generation] → [Final Model Ready]
```

### Visual States:
- **Preview Mode:** Show simplified geometry, "Preview" badge
- **Generating:** Show loading spinner, "Generating..." badge
- **Final:** Show accurate STL, "Final" badge

---

## Implementation Priority

1. **High Priority:** Debounced auto-generation (quick win)
2. **High Priority:** Basic Three.js preview (box walls, baseplate sockets)
3. **Medium Priority:** Enhanced preview features
4. **Low Priority:** WebAssembly OpenSCAD (if feasible)

---

## Research Sources

- PyVista slider callbacks (Python 3D visualization)
- HoloViews DynamicMap (on-the-fly generation)
- Streamlit reactive programming model
- Three.js parametric geometry examples

---

## Next Steps

1. **Decision:** Choose implementation approach
2. **Prototype:** Build basic Three.js preview generator
3. **Test:** Measure performance and accuracy
4. **Iterate:** Enhance preview quality
5. **Deploy:** Add progressive rendering system
