# Generator Mode System Specification

Three modes: **Easy**, **Pro**, **Expert**. Mode selector in top bar. Switching modes only changes the UI sidebar - **all config values persist** when switching between modes.

---

## Pro Mode Controls

### Box Section
| # | Control | Expert Field(s) |
|---|---------|-----------------|
| 2a | Width, Depth, Height | `width`, `depth`, `height` |
| 2b | Grid Unit Size | `gridSize` |
| 2c | Wall Thickness | `wallThickness` |
| 2d | Floor Thickness | `floorThickness` |
| 2e | Bevel Floor-Wall Edge | `innerEdgeBevel` |
| 2f | Corner Radius | `cornerRadius` + `feetCornerRadius` |
| 2g | Lip Style | `lipStyle` |
| 2h-i | Dividers X, Y | `dividersX`, `dividersY` |
| 2j | Divider Height | `dividerHeight` |
| 2k | Bevel Divider-Floor Edge | `dividerFloorBevel` |

### Baseplate Section (Fill Area mode only)
| # | Control | Expert Field(s) |
|---|---------|-----------------|
| 3a | Sizing Mode | Fixed to `'fill_area_mm'` |
| 3b | Target Width | `targetWidthMm` |
| 3c | Target Depth | `targetDepthMm` |
| 3d | Allow Half Cells (Width) | `allowHalfCellsX` |
| 3e | Allow Half Cells (Depth) | `allowHalfCellsY` |
| 3f | Padding Alignment | `paddingAlignment` |
| 3g | Grid Unit Size | `gridSize` |
| 3h | Corner Radius | `cornerRadius` |

### Printer Bed Splitting
Same controls as Expert (baseplate only, box splitting coming soon)

### Feet (Base) - Unified Controls
| # | Control | Expert Field(s) it sets |
|---|---------|-------------------------|
| 5a | Corner Radius | `footBottomCornerRadius` + `socketBottomCornerRadius` |
| 5b | Foot Taper Angle | `footChamferAngle` + `lipChamferAngle` + `socketChamferAngle` + `bottomOverhangChamferAngle` |
| 5c | Foot Taper Height | `footChamferHeight` + `lipChamferHeight` + `socketChamferHeight` |

---

## Hardcoded in Easy/Pro Mode

| Field | Value | Notes |
|-------|-------|-------|
| `preventBottomOverhangs` | `true` | Always on for print quality |
| `cornerSegments` | `32` | Fixed smooth curves |
| `flatBase` | `'off'` | Standard Stackable |
| `syncSocketWithFoot` | `true` | Socket auto-matches foot |

---

## Mode Switching Behavior

- Switching modes **does NOT reset values**
- Pro mode controls set multiple Expert fields simultaneously
- Switch to Expert to see/fine-tune individual values
- Values set in Expert persist when switching back to Pro
