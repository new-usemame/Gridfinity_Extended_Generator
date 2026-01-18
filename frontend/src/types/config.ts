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
  
  // Screw holes
  screwEnabled: boolean;
  screwDiameter: number;
  
  // Features
  fingerSlide: boolean;
  fingerSlidePosition: 'front' | 'back' | 'left' | 'right';
  
  // Label
  labelEnabled: boolean;
  labelPosition: 'front' | 'back' | 'left' | 'right';
  labelWidth: number;
  
  // Dividers
  dividersX: number;
  dividersY: number;
  
  // Lip style
  lipStyle: 'none' | 'standard' | 'reduced';
  
  // Base style
  baseStyle: 'standard' | 'efficient' | 'filled';
  
  // Corner radius
  cornerRadius: number;
}

// Baseplate Configuration
export interface BaseplateConfig {
  // Dimensions (in grid units)
  width: number;
  depth: number;
  
  // Style
  style: 'default' | 'magnet' | 'weighted' | 'screw';
  
  // Lid options
  lidOption: 'none' | 'flat' | 'halfPitch';
  
  // Magnet/Screw configuration
  magnetDiameter: number;
  magnetDepth: number;
  screwDiameter: number;
  
  // Corner radius (NEW feature)
  cornerRadius: number;
  cornerSegments: number;
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
  cornerRadius: 0
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

// Generation result type
export interface GenerationResult {
  stlUrl: string;
  scadContent: string;
  filename: string;
}
