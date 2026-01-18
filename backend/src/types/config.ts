// Box/Bin Configuration
export interface BoxConfig {
  // Dimensions (in grid units)
  width: number;        // 0.5 - 8 units
  depth: number;        // 0.5 - 8 units
  height: number;       // 1 - 10 units
  
  // Wall and floor
  wallThickness: number;    // 0.8 - 2.4 mm
  floorThickness: number;   // 0.7 - 2.0 mm
  
  // Magnets
  magnetEnabled: boolean;
  magnetDiameter: number;   // default 6mm
  magnetDepth: number;      // default 2mm
  
  // Screw holes
  screwEnabled: boolean;
  screwDiameter: number;    // default 3mm
  
  // Features
  fingerSlide: boolean;
  fingerSlidePosition: 'front' | 'back' | 'left' | 'right';
  
  // Label
  labelEnabled: boolean;
  labelPosition: 'front' | 'back' | 'left' | 'right';
  labelWidth: number;       // percentage 0-100
  
  // Dividers
  dividersX: number;        // 0-10
  dividersY: number;        // 0-10
  
  // Lip style
  lipStyle: 'none' | 'standard' | 'reduced';
  
  // Base style
  baseStyle: 'standard' | 'efficient' | 'filled';
  
  // Corner radius
  cornerRadius: number;     // 0 - 5mm, 0 = sharp corners
  
  // Base chamfer (taper on bottom of feet)
  baseChamfer: number;      // 0 - 2mm, tapers bottom of feet for easier baseplate fit
}

// Baseplate Configuration
export interface BaseplateConfig {
  // Dimensions (in grid units)
  width: number;        // 1 - 10 units
  depth: number;        // 1 - 10 units
  
  // Style
  style: 'default' | 'magnet' | 'weighted' | 'screw';
  
  // Lid options
  lidOption: 'none' | 'flat' | 'halfPitch';
  
  // Magnet/Screw configuration
  magnetDiameter: number;
  magnetDepth: number;
  screwDiameter: number;
  
  // Corner radius (NEW feature)
  cornerRadius: number;     // 0 - 5mm, 0 = sharp corners
  cornerSegments: number;   // Resolution for rounded corners
}

// Default configurations
export const defaultBoxConfig: BoxConfig = {
  width: 1,
  depth: 1,
  height: 3,
  wallThickness: 0.95,
  floorThickness: 0.7,
  magnetEnabled: true,
  magnetDiameter: 6,
  magnetDepth: 2,
  screwEnabled: false,
  screwDiameter: 3,
  fingerSlide: false,
  fingerSlidePosition: 'front',
  labelEnabled: false,
  labelPosition: 'front',
  labelWidth: 100,
  dividersX: 0,
  dividersY: 0,
  lipStyle: 'standard',
  baseStyle: 'standard',
  cornerRadius: 0,
  baseChamfer: 0.8
};

export const defaultBaseplateConfig: BaseplateConfig = {
  width: 3,
  depth: 3,
  style: 'default',
  lidOption: 'none',
  magnetDiameter: 6,
  magnetDepth: 2,
  screwDiameter: 3,
  cornerRadius: 0,
  cornerSegments: 32
};
