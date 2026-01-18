// Box/Bin Configuration
export interface BoxConfig {
  // Dimensions (in grid units)
  width: number;
  depth: number;
  height: number;
  
  // Wall and floor
  wallThickness: number;
  floorThickness: number;
  
  // Magnets
  magnetEnabled: boolean;
  magnetDiameter: number;
  magnetDepth: number;
  magnetEasyRelease: 'off' | 'auto' | 'inner' | 'outer';
  
  // Screw holes
  screwEnabled: boolean;
  screwDiameter: number;
  
  // Finger slide
  fingerSlide: boolean;
  fingerSlideStyle: 'none' | 'rounded' | 'chamfered';
  fingerSlideRadius: number;
  fingerSlidePosition: 'front' | 'back' | 'left' | 'right';
  
  // Label
  labelEnabled: boolean;
  labelPosition: 'front' | 'back' | 'left' | 'right';
  labelWidth: number;
  
  // Dividers
  dividersX: number;
  dividersY: number;
  
  // Lip style
  lipStyle: 'none' | 'standard' | 'reduced' | 'minimum';
  
  // Base style
  flatBase: 'off' | 'stackable' | 'rounded';
  efficientFloor: 'off' | 'on' | 'rounded' | 'smooth';
  
  // Tapered corner
  taperedCorner: 'none' | 'rounded' | 'chamfered';
  taperedCornerSize: number;
  
  // Wall pattern
  wallPattern: 'none' | 'hexgrid' | 'grid' | 'voronoi' | 'brick';
  wallPatternSpacing: number;
  
  // Corner radius (for the outer box)
  cornerRadius: number;
  
  // Feet options
  feetCornerRadius: number;
  gridSize: number;  // Grid unit size in mm (standard is 42mm)
  
  // Foot chamfer/taper options
  footLowerTaperHeight: number;  // Height of bottom taper (0 = vertical/no taper)
  footRiserHeight: number;       // Height of vertical riser section
  footUpperTaperHeight: number;  // Height of upper taper
  footBottomDiameter: number;    // Starting diameter at bottom (larger = less steep)
}

// Baseplate Configuration
export interface BaseplateConfig {
  // Dimensions (in grid units)
  width: number;
  depth: number;
  
  // Style
  style: 'default' | 'magnet' | 'weighted' | 'screw';
  plateStyle: 'default' | 'cnclaser';
  
  // Magnet configuration
  magnetDiameter: number;
  magnetDepth: number;
  magnetZOffset: number;
  magnetTopCover: number;
  
  // Screw configuration  
  screwDiameter: number;
  centerScrew: boolean;
  
  // Weight cavity
  weightCavity: boolean;
  
  // Bottom taper
  removeBottomTaper: boolean;
  
  // Corner radius
  cornerRadius: number;
  cornerSegments: number;
  
  // Grid size
  gridSize: number;
  
  // Socket chamfer/taper options (inverse of foot profile)
  socketLowerTaperHeight: number;  // Height of bottom taper (0 = vertical/no taper)
  socketRiserHeight: number;       // Height of vertical riser section
  socketUpperTaperHeight: number;  // Height of upper taper
}

// Default configurations
export const defaultBoxConfig: BoxConfig = {
  width: 2,
  depth: 2,
  height: 3,
  wallThickness: 0.95,
  floorThickness: 0.7,
  magnetEnabled: false,
  magnetDiameter: 6.5,
  magnetDepth: 2.4,
  magnetEasyRelease: 'auto',
  screwEnabled: false,
  screwDiameter: 3,
  fingerSlide: false,
  fingerSlideStyle: 'rounded',
  fingerSlideRadius: 8,
  fingerSlidePosition: 'front',
  labelEnabled: false,
  labelPosition: 'front',
  labelWidth: 100,
  dividersX: 0,
  dividersY: 0,
  lipStyle: 'standard',
  flatBase: 'off',
  efficientFloor: 'off',
  taperedCorner: 'none',
  taperedCornerSize: 10,
  wallPattern: 'none',
  wallPatternSpacing: 2,
  cornerRadius: 3.75,
  feetCornerRadius: 3.75,
  gridSize: 42,
  footLowerTaperHeight: 0.8,  // Standard: 0.8mm (set to 0 for vertical)
  footRiserHeight: 1.8,        // Standard: 1.8mm
  footUpperTaperHeight: 2.15,  // Standard: 2.15mm
  footBottomDiameter: 1.6      // Standard: 1.6mm (larger = less steep angle)
};

export const defaultBaseplateConfig: BaseplateConfig = {
  width: 3,
  depth: 3,
  style: 'default',
  plateStyle: 'default',
  magnetDiameter: 6.5,
  magnetDepth: 2.4,
  magnetZOffset: 0,
  magnetTopCover: 0,
  screwDiameter: 3,
  centerScrew: false,
  weightCavity: false,
  removeBottomTaper: false,
  cornerRadius: 3.75,
  cornerSegments: 32,
  gridSize: 42,
  socketLowerTaperHeight: 0.7,  // Standard: 0.7mm (set to 0 for vertical)
  socketRiserHeight: 1.8,        // Standard: 1.8mm
  socketUpperTaperHeight: 2.15   // Standard: 2.15mm
};
