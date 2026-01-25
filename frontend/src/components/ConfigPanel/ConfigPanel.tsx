import { useState, useMemo, useCallback } from 'react';
import { BoxConfig, BaseplateConfig, calculateGridFromMm, splitBaseplateForPrinter, SplitResult, EdgeType, SegmentEdgeOverride } from '../../types/config';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';
import { SelectInput } from './SelectInput';
import { NumberInput } from './NumberInput';

interface ConfigPanelProps {
  type: 'box' | 'baseplate' | 'combined';
  mode: 'easy' | 'pro' | 'expert';
  boxConfig: BoxConfig;
  baseplateConfig: BaseplateConfig;
  onBoxConfigChange: (config: BoxConfig) => void;
  onBaseplateConfigChange: (config: BaseplateConfig) => void;
}

export function ConfigPanel({
  type,
  mode,
  boxConfig,
  baseplateConfig,
  onBoxConfigChange,
  onBaseplateConfigChange
}: ConfigPanelProps) {
  if (type === 'combined') {
    // Combined editor is intended for Easy/Pro modes. Expert stays tabbed.
    if (mode === 'pro') {
      return (
        <div className="space-y-2.5">
          <ProBoxConfigPanel
            config={boxConfig}
            baseplateConfig={baseplateConfig}
            onChange={onBoxConfigChange}
            onBaseplateConfigChange={onBaseplateConfigChange}
          />
          <ProBaseplateConfigPanel
            config={baseplateConfig}
            onChange={onBaseplateConfigChange}
          />
        </div>
      );
    }

    // Easy mode (placeholder until specified)
    return (
      <div className="space-y-2.5">
        <EasyBoxConfigPanel config={boxConfig} onChange={onBoxConfigChange} />
        <EasyBaseplateConfigPanel config={baseplateConfig} onChange={onBaseplateConfigChange} />
      </div>
    );
  }

  if (type === 'box') {
    if (mode === 'expert') {
      return (
        <BoxConfigPanel config={boxConfig} onChange={onBoxConfigChange} />
      );
    } else if (mode === 'pro') {
      return (
        <ProBoxConfigPanel 
          config={boxConfig} 
          baseplateConfig={baseplateConfig}
          onChange={onBoxConfigChange}
          onBaseplateConfigChange={onBaseplateConfigChange}
        />
      );
    } else {
      // Easy mode
      return (
        <EasyBoxConfigPanel config={boxConfig} onChange={onBoxConfigChange} />
      );
    }
  }

  // Baseplate
  if (mode === 'expert') {
    return (
      <BaseplateConfigPanel config={baseplateConfig} onChange={onBaseplateConfigChange} />
    );
  } else if (mode === 'pro') {
    return (
      <ProBaseplateConfigPanel 
        config={baseplateConfig}
        onChange={onBaseplateConfigChange}
      />
    );
  } else {
    // Easy mode
    return (
      <EasyBaseplateConfigPanel config={baseplateConfig} onChange={onBaseplateConfigChange} />
    );
  }
}

// Pro Mode Box Panel
function ProBoxConfigPanel({ 
  config, 
  baseplateConfig,
  onChange,
  onBaseplateConfigChange
}: { 
  config: BoxConfig; 
  baseplateConfig: BaseplateConfig;
  onChange: (config: BoxConfig) => void;
  onBaseplateConfigChange: (config: BaseplateConfig) => void;
}) {
  // Enforce hardcoded values
  const enforceHardcoded = useCallback((newConfig: BoxConfig): BoxConfig => {
    return {
      ...newConfig,
      preventBottomOverhangs: true,
      flatBase: 'off',
    };
  }, []);

  const update = <K extends keyof BoxConfig>(key: K, value: BoxConfig[K]) => {
    const updated = enforceHardcoded({ ...config, [key]: value });
    onChange(updated);
  };

  // Update multiple fields for unified controls
  const updateCornerRadius = (value: number) => {
    const updated = enforceHardcoded({
      ...config,
      cornerRadius: value,
      feetCornerRadius: value,
    });
    onChange(updated);
  };

  const updateFootTaperAngle = (value: number) => {
    const updated = enforceHardcoded({
      ...config,
      footChamferAngle: value,
      lipChamferAngle: value,
      bottomOverhangChamferAngle: value,
    });
    onChange(updated);
    // Also update socket chamfer angle in baseplate
    onBaseplateConfigChange({
      ...baseplateConfig,
      socketChamferAngle: value,
      syncSocketWithFoot: true,
    });
  };

  const updateFootTaperHeight = (value: number) => {
    const updated = enforceHardcoded({
      ...config,
      footChamferHeight: value,
      lipChamferHeight: value,
    });
    onChange(updated);
    // Also update socket chamfer height in baseplate
    onBaseplateConfigChange({
      ...baseplateConfig,
      socketChamferHeight: value,
      syncSocketWithFoot: true,
    });
  };

  const updateFootCornerRadius = (value: number) => {
    const updated = enforceHardcoded({
      ...config,
      footBottomCornerRadius: value,
    });
    onChange(updated);
    // Also update socket bottom corner radius in baseplate
    onBaseplateConfigChange({
      ...baseplateConfig,
      socketBottomCornerRadius: value,
      syncSocketWithFoot: true,
    });
  };

  return (
    <div className="p-3 space-y-2.5">
      {/* Box Section */}
      <CollapsibleSection title="Box" icon="📦">
        {/* 2a: Width, Depth, Height */}
        <SliderInput
          label="Width"
          value={config.width}
          min={0.5}
          max={20}
          step={0.5}
          unit="units"
          onChange={(v) => update('width', v)}
        />
        <SliderInput
          label="Depth"
          value={config.depth}
          min={0.5}
          max={20}
          step={0.5}
          unit="units"
          onChange={(v) => update('depth', v)}
        />
        <SliderInput
          label="Height"
          value={config.height}
          min={1}
          max={25}
          step={1}
          unit="units"
          onChange={(v) => update('height', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Each height unit is 7mm. Standard Gridfinity specification.
        </p>
        
        {/* 2b: Grid Unit Size */}
        <NumberInput
          label="Grid Unit Size"
          value={config.gridSize}
          min={30}
          max={60}
          step={1}
          unit="mm"
          onChange={(v) => update('gridSize', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Standard Gridfinity is 42mm.
        </p>

        {/* 2c: Wall Thickness */}
        <SliderInput
          label="Wall Thickness"
          value={config.wallThickness}
          min={0.8}
          max={2.4}
          step={0.05}
          unit="mm"
          onChange={(v) => update('wallThickness', v)}
        />

        {/* 2d: Floor Thickness */}
        <SliderInput
          label="Floor Thickness"
          value={config.floorThickness}
          min={0.7}
          max={2}
          step={0.1}
          unit="mm"
          onChange={(v) => update('floorThickness', v)}
        />

        {/* 2e: Bevel Floor-Wall Edge */}
        <ToggleInput
          label="Bevel Floor-Wall Edge"
          value={config.innerEdgeBevel}
          onChange={(v) => update('innerEdgeBevel', v)}
        />

        {/* 2f: Corner Radius (sets both cornerRadius and feetCornerRadius) */}
        <SliderInput
          label="Corner Radius"
          value={config.cornerRadius}
          min={0}
          max={5}
          step={0.25}
          unit="mm"
          onChange={updateCornerRadius}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Rounds the vertical edges and the corner radius of the top of the feet. Standard: 3.75mm.
        </p>

        {/* 2h-i: Dividers X, Y */}
        <NumberInput
          label="Dividers X (Left-Right)"
          value={config.dividersX}
          min={0}
          max={10}
          step={1}
          onChange={(v) => update('dividersX', v)}
        />
        <NumberInput
          label="Dividers Y (Front-Back)"
          value={config.dividersY}
          min={0}
          max={10}
          step={1}
          onChange={(v) => update('dividersY', v)}
        />

        {/* 2j: Divider Height */}
        {(config.dividersX > 0 || config.dividersY > 0) && (
          <>
            <SliderInput
              label="Divider Height"
              value={config.dividerHeight}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => update('dividerHeight', v)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Adjust the height of dividers as a percentage of available space (from floor to lip).
            </p>
          </>
        )}

        {/* 2k: Bevel Divider-Floor Edge */}
        {(config.dividersX > 0 || config.dividersY > 0) && (
          <ToggleInput
            label="Bevel Divider-Floor Edge"
            value={config.dividerFloorBevel}
            onChange={(v) => update('dividerFloorBevel', v)}
          />
        )}
      </CollapsibleSection>

      {/* Feet (Base) - Unified Controls */}
      <CollapsibleSection title="Feet (Base)" icon="👣">
        {/* 5a: Corner Radius (sets both footBottomCornerRadius and socketBottomCornerRadius) */}
        <SliderInput
          label="Corner Radius"
          value={config.footBottomCornerRadius}
          min={0}
          max={10}
          step={0.25}
          unit="mm"
          onChange={updateFootCornerRadius}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Corner radius of the bottom of the foot and socket.
        </p>

        {/* 5b: Foot Taper Angle (sets footChamferAngle, lipChamferAngle, socketChamferAngle, bottomOverhangChamferAngle) */}
        <SliderInput
          label="Foot Taper Angle"
          value={config.footChamferAngle}
          min={30}
          max={75}
          step={1}
          unit="°"
          onChange={updateFootTaperAngle}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          45° = standard. Higher = steeper taper. Lower = gentler taper.
        </p>

        {/* 5c: Foot Taper Height (sets footChamferHeight, lipChamferHeight, socketChamferHeight) */}
        <SliderInput
          label="Foot Taper Height"
          value={config.footChamferHeight}
          min={2}
          max={8}
          step={0.25}
          unit="mm"
          onChange={updateFootTaperHeight}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Total height of the foot, lip, and socket chamfer. Standard: 4.75mm.
        </p>
      </CollapsibleSection>
    </div>
  );
}

// Pro Mode Baseplate Panel
function ProBaseplateConfigPanel({ 
  config, 
  onChange 
}: { 
  config: BaseplateConfig; 
  onChange: (config: BaseplateConfig) => void;
}) {
  // Enforce hardcoded values
  const enforceHardcoded = useCallback((newConfig: BaseplateConfig): BaseplateConfig => {
    return {
      ...newConfig,
      sizingMode: 'fill_area_mm', // Fixed to fill_area_mm in Pro mode
      cornerSegments: 32,
      syncSocketWithFoot: true,
    };
  }, []);

  const update = <K extends keyof BaseplateConfig>(key: K, value: BaseplateConfig[K]) => {
    const updated = enforceHardcoded({ ...config, [key]: value });
    onChange(updated);
  };

  // Calculate grid preview for fill_area_mm mode
  const gridCalc = useMemo(() => {
    return calculateGridFromMm(
      config.targetWidthMm,
      config.targetDepthMm,
      config.gridSize,
      config.allowHalfCellsX,
      config.allowHalfCellsY,
      config.paddingAlignment
    );
  }, [config.targetWidthMm, config.targetDepthMm, config.gridSize, 
      config.allowHalfCellsX, config.allowHalfCellsY, config.paddingAlignment]);

  // Calculate split preview
  const splitCalc = useMemo(() => {
    if (!config.splitEnabled) return null;
    
    const totalUnitsX = Math.floor(gridCalc.gridUnitsX);
    const totalUnitsY = Math.floor(gridCalc.gridUnitsY);
    
    return splitBaseplateForPrinter(
      totalUnitsX,
      totalUnitsY,
      config.printerBedWidth,
      config.printerBedDepth,
      config.gridSize,
      config.connectorEnabled,
      gridCalc.gridUnitsX,
      gridCalc.gridUnitsY,
      gridCalc.gridCoverageMmX,
      gridCalc.gridCoverageMmY,
      gridCalc.paddingNearX,
      gridCalc.paddingFarX,
      gridCalc.paddingNearY,
      gridCalc.paddingFarY
    );
  }, [config.splitEnabled, config.printerBedWidth, config.printerBedDepth, config.gridSize, 
      config.connectorEnabled, gridCalc]);

  return (
    <div className="p-3 space-y-2.5">
      {/* Baseplate Section (Fill Area mode only) */}
      <CollapsibleSection title="Baseplate" icon="📏">
        {/* 3a: Sizing Mode - Fixed to fill_area_mm (no control) */}
        <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">
          Sizing Mode: Fill Area (mm) - Fixed in Pro mode
        </p>

        {/* 3b: Target Width */}
        <NumberInput
          label="Target Width"
          value={config.targetWidthMm}
          min={42}
          max={1000}
          step={1}
          unit="mm"
          onChange={(v) => update('targetWidthMm', v)}
        />

        {/* 3c: Target Depth */}
        <NumberInput
          label="Target Depth"
          value={config.targetDepthMm}
          min={42}
          max={1000}
          step={1}
          unit="mm"
          onChange={(v) => update('targetDepthMm', v)}
        />
        
        {/* 3d: Allow Half Cells (Width) */}
        <ToggleInput
          label="Allow Half Cells (Width)"
          value={config.allowHalfCellsX}
          onChange={(v) => update('allowHalfCellsX', v)}
        />

        {/* 3e: Allow Half Cells (Depth) */}
        <ToggleInput
          label="Allow Half Cells (Depth)"
          value={config.allowHalfCellsY}
          onChange={(v) => update('allowHalfCellsY', v)}
        />

        {/* 3f: Padding Alignment */}
        <SelectInput
          label="Padding Alignment"
          value={config.paddingAlignment}
          options={[
            { value: 'center', label: 'Center (Equal padding both sides)' },
            { value: 'near', label: 'Near (Padding on left/front)' },
            { value: 'far', label: 'Far (Padding on right/back)' }
          ]}
          onChange={(v) => update('paddingAlignment', v as BaseplateConfig['paddingAlignment'])}
        />

        {/* 3g: Grid Unit Size */}
        <NumberInput
          label="Grid Unit Size"
          value={config.gridSize}
          min={30}
          max={60}
          step={1}
          unit="mm"
          onChange={(v) => update('gridSize', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Standard Gridfinity is 42mm. Must match your bins.
        </p>

        {/* 3h: Corner Radius */}
        <SliderInput
          label="Corner Radius"
          value={config.cornerRadius}
          min={0}
          max={20}
          step={0.25}
          unit="mm"
          onChange={(v) => update('cornerRadius', v)}
        />

        {/* Grid Calculation Preview */}
        {gridCalc && (
          <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">CALCULATED GRID</h4>
            <div className="space-y-1 text-xs">
              <p className="text-slate-300">
                <span className="text-slate-500">Grid size:</span>{' '}
                <span className="font-mono text-emerald-300">
                  {gridCalc.gridUnitsX} x {gridCalc.gridUnitsY}
                </span>{' '}
                units
                {(gridCalc.hasHalfCellX || gridCalc.hasHalfCellY) && (
                  <span className="text-amber-400 ml-1">
                    ({gridCalc.hasHalfCellX && 'half-X'}{gridCalc.hasHalfCellX && gridCalc.hasHalfCellY && ', '}{gridCalc.hasHalfCellY && 'half-Y'})
                  </span>
                )}
              </p>
              <p className="text-slate-300">
                <span className="text-slate-500">Grid coverage:</span>{' '}
                <span className="font-mono">{gridCalc.gridCoverageMmX.toFixed(1)}mm x {gridCalc.gridCoverageMmY.toFixed(1)}mm</span>
              </p>
              {(gridCalc.totalPaddingX > 0 || gridCalc.totalPaddingY > 0) && (
                <p className="text-slate-300">
                  <span className="text-slate-500">Edge padding:</span>{' '}
                  <span className="font-mono text-amber-300">
                    {gridCalc.paddingNearX.toFixed(1)}/{gridCalc.paddingFarX.toFixed(1)}mm (L/R), {gridCalc.paddingNearY.toFixed(1)}/{gridCalc.paddingFarY.toFixed(1)}mm (F/B)
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Printer Bed Splitting - Same as Expert */}
      <CollapsibleSection title="Printer Bed Splitting" icon="✂️">
        <ToggleInput
          label="Enable Splitting"
          value={config.splitEnabled}
          onChange={(v) => update('splitEnabled', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Split large baseplates into smaller segments that fit on your 3D printer bed.
        </p>

        {config.splitEnabled && (
          <>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">PRINTER BED SIZE</h4>
              <NumberInput
                label="Bed Width"
                value={config.printerBedWidth}
                min={50}
                max={1000}
                step={5}
                unit="mm"
                onChange={(v) => update('printerBedWidth', v)}
              />
              <NumberInput
                label="Bed Depth"
                value={config.printerBedDepth}
                min={50}
                max={1000}
                step={5}
                unit="mm"
                onChange={(v) => update('printerBedDepth', v)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Common sizes: Ender 3 (220x220), Prusa MK3 (250x210), Bambu X1 (256x256)
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">INTERLOCKING EDGES</h4>
              <ToggleInput
                label="Enable Interlocking Edges"
                value={config.connectorEnabled}
                onChange={(v) => {
                  const updates: Partial<BaseplateConfig> = { connectorEnabled: v };
                  if (v && !config.edgePattern) {
                    updates.edgePattern = 'wineglass';
                    updates.toothDepth = 6;
                  }
                  onChange(enforceHardcoded({ ...config, ...updates }));
                }}
              />
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Add male/female interlocking edges between segments - snaps together without separate connectors.
              </p>
              
              {config.connectorEnabled && (
                <>
                  <SelectInput
                    label="Edge Pattern"
                    value={config.edgePattern}
                    options={[
                      { value: 'wineglass', label: '1. Wine Glass (Swoopy Bulb)' },
                      { value: 'dovetail', label: '2. Dovetail (Trapezoidal)' },
                      { value: 'rectangular', label: '3. Rectangular (Square)' },
                      { value: 'triangular', label: '4. Triangular (Sawtooth)' },
                      { value: 'puzzle', label: '5. Puzzle (Jigsaw Bulb)' },
                      { value: 'tslot', label: '6. T-Slot (T-Hook)' },
                      { value: 'puzzle_smooth', label: '7. Puzzle Smooth (Concave)' },
                      { value: 'tslot_smooth', label: '8. T-Slot Smooth (Concave)' }
                    ]}
                    onChange={(v) => {
                      const pattern = v as BaseplateConfig['edgePattern'];
                      const updates: Partial<BaseplateConfig> = { edgePattern: pattern };
                      if (pattern === 'wineglass') {
                        updates.toothDepth = 6;
                      }
                      onChange(enforceHardcoded({ ...config, ...updates }));
                    }}
                  />
                  <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded text-xs text-slate-600 dark:text-slate-400">
                    {config.edgePattern === 'dovetail' && '▷ Trapezoidal teeth - wider at tip than base (classic woodworking style)'}
                    {config.edgePattern === 'rectangular' && '▷ Simple square blocks that interlock'}
                    {config.edgePattern === 'triangular' && '▷ Pointed zigzag pattern (sawtooth)'}
                    {config.edgePattern === 'puzzle' && '▷ Round bulbous tabs like jigsaw puzzle pieces'}
                    {config.edgePattern === 'tslot' && '▷ T-shaped hooks that lock in place'}
                    {config.edgePattern === 'puzzle_smooth' && '▷ Puzzle bulb with concave hourglass stem - smooth for 3D printing'}
                    {config.edgePattern === 'tslot_smooth' && '▷ T-slot with concave stem - no sharp corners'}
                    {config.edgePattern === 'wineglass' && '▷ Wine glass shape - concave stem flowing into rounded bulb top'}
                  </div>
                  
                  <SliderInput
                    label="Tooth Depth"
                    value={config.toothDepth}
                    min={1}
                    max={20}
                    step={0.5}
                    unit="mm"
                    onChange={(v) => update('toothDepth', v)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Overall height of the connector shape.
                  </p>
                  
                  <SliderInput
                    label="Tooth Width"
                    value={config.toothWidth}
                    min={2}
                    max={20}
                    step={0.5}
                    unit="mm"
                    onChange={(v) => update('toothWidth', v)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Width of each tooth at the base.
                  </p>
                  
                  {(config.edgePattern === 'puzzle_smooth' || 
                    config.edgePattern === 'tslot_smooth' || 
                    config.edgePattern === 'wineglass') && (
                    <>
                      <SliderInput
                        label="Concave Depth"
                        value={config.concaveDepth ?? 50}
                        min={0}
                        max={100}
                        step={5}
                        unit="%"
                        onChange={(v) => update('concaveDepth', v)}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        How deep the inward swoop curves. 0% = nearly straight, 100% = deep hourglass.
                      </p>
                    </>
                  )}
                  
                  {config.edgePattern === 'wineglass' && (
                    <>
                      <SliderInput
                        label="Bulb Shape (Circular vs Ovular)"
                        value={config.wineglassAspectRatio ?? 1.0}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        unit=""
                        onChange={(v) => update('wineglassAspectRatio', v)}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        1.0 = circular, &lt;1.0 = taller (ovular vertically), &gt;1.0 = wider (ovular horizontally).
                      </p>
                    </>
                  )}
                  
                  <SliderInput
                    label="Roof Peak Intensity"
                    value={config.connectorRoofIntensity ?? 0}
                    min={0}
                    max={200}
                    step={5}
                    unit="%"
                    onChange={(v) => update('connectorRoofIntensity', v)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Adds a peaked "^" roof to connector tops. 0% = flat, 100% = standard peak height, up to 200% for more intense peaks.
                  </p>
                  
                  {config.connectorRoofIntensity > 0 && (
                    <>
                      <SliderInput
                        label="Roof Depth"
                        value={config.connectorRoofDepth ?? 0}
                        min={0}
                        max={100}
                        step={5}
                        unit="%"
                        onChange={(v) => update('connectorRoofDepth', v)}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        How far down from the top the roof starts. 0% = roof at very top, 100% = roof at base.
                      </p>
                    </>
                  )}
                  
                  <SliderInput
                    label="Fit Tolerance"
                    value={config.connectorTolerance}
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    unit="mm"
                    onChange={(v) => update('connectorTolerance', v)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Typical FDM tolerance: 0.3mm. Increase if fit is too tight.
                  </p>
                </>
              )}
            </div>

            {/* Split Calculation Preview */}
            {splitCalc && (
              <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                <h4 className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2">SPLIT PREVIEW</h4>
                <div className="space-y-1 text-xs">
                  {splitCalc.needsSplit ? (
                    <>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Segments:</span>{' '}
                        <span className="font-mono text-cyan-300">
                          {splitCalc.segmentsX} x {splitCalc.segmentsY}
                        </span>{' '}
                        ({splitCalc.totalSegments} pieces)
                      </p>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Max segment size:</span>{' '}
                        <span className="font-mono">
                          {splitCalc.maxSegmentUnitsX} x {splitCalc.maxSegmentUnitsY} units
                        </span>
                      </p>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Segment dimensions:</span>{' '}
                        <span className="font-mono">
                          {(splitCalc.maxSegmentUnitsX * config.gridSize).toFixed(0)}mm x {(splitCalc.maxSegmentUnitsY * config.gridSize).toFixed(0)}mm
                        </span>
                      </p>
                      {config.connectorEnabled && (
                        <p className="text-emerald-400 mt-2">
                          Interlocking edges enabled - click edges below to customize
                        </p>
                      )}
                      
                      {/* Interactive segment edge editor */}
                      {config.connectorEnabled && (
                        <SegmentEdgeEditor 
                          splitInfo={splitCalc}
                          config={config}
                          onChange={onChange}
                        />
                      )}
                      
                      {/* Simple grid preview when connectors disabled */}
                      {!config.connectorEnabled && (
                        <div className="mt-3 p-2 bg-slate-200 dark:bg-slate-800 rounded">
                          <p className="text-slate-600 dark:text-slate-500 text-[10px] mb-1">Segment Layout:</p>
                          <div 
                            className="grid gap-1" 
                            style={{ 
                              gridTemplateColumns: `repeat(${splitCalc.segmentsX}, 1fr)`,
                              maxWidth: '150px'
                            }}
                          >
                            {splitCalc.segments.flat().map((seg, i) => (
                              <div 
                                key={i}
                                className="bg-cyan-600/30 border border-cyan-500/50 rounded text-[8px] text-center py-1 text-cyan-300"
                              >
                                {seg.gridUnitsX}x{seg.gridUnitsY}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-emerald-400">
                      No splitting needed - baseplate fits on printer bed!
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CollapsibleSection>
    </div>
  );
}

// Easy Mode Placeholders
function EasyBoxConfigPanel({ }: { config: BoxConfig; onChange: (config: BoxConfig) => void }) {
  return (
    <div className="p-3 space-y-2.5">
      <CollapsibleSection title="Easy Mode (Box)" icon="📦">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Easy mode controls will be specified separately.
        </p>
      </CollapsibleSection>
    </div>
  );
}

function EasyBaseplateConfigPanel({ }: { config: BaseplateConfig; onChange: (config: BaseplateConfig) => void }) {
  return (
    <div className="p-3 space-y-2.5">
      <CollapsibleSection title="Easy Mode (Baseplate)" icon="📏">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Easy mode controls will be specified separately.
        </p>
      </CollapsibleSection>
    </div>
  );
}

function BoxConfigPanel({ config, onChange }: { config: BoxConfig; onChange: (config: BoxConfig) => void }) {
  const update = <K extends keyof BoxConfig>(key: K, value: BoxConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="p-3 space-y-2.5">
      {/* Dimensions Section */}
      <CollapsibleSection title="Dimensions" icon="📐" defaultOpen>
        <SliderInput
          label="Width"
          value={config.width}
          min={0.5}
          max={20}
          step={0.5}
          unit="units"
          onChange={(v) => update('width', v)}
        />
        <SliderInput
          label="Depth"
          value={config.depth}
          min={0.5}
          max={20}
          step={0.5}
          unit="units"
          onChange={(v) => update('depth', v)}
        />
        <SliderInput
          label="Height"
          value={config.height}
          min={1}
          max={25}
          step={1}
          unit="units"
          onChange={(v) => update('height', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Each height unit is 7mm. Standard Gridfinity specification.
        </p>
        <NumberInput
          label="Grid Unit Size"
          value={config.gridSize}
          min={30}
          max={60}
          step={1}
          unit="mm"
          onChange={(v) => update('gridSize', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Standard Gridfinity is 42mm.
        </p>
      </CollapsibleSection>

      {/* Wall & Floor Section */}
      <CollapsibleSection title="Wall & Floor" icon="🧱">
        <SliderInput
          label="Wall Thickness"
          value={config.wallThickness}
          min={0.8}
          max={2.4}
          step={0.05}
          unit="mm"
          onChange={(v) => update('wallThickness', v)}
        />
        <SliderInput
          label="Floor Thickness"
          value={config.floorThickness}
          min={0.7}
          max={2}
          step={0.1}
          unit="mm"
          onChange={(v) => update('floorThickness', v)}
        />
        <ToggleInput
          label="Bevel Floor-Wall Edge"
          value={config.innerEdgeBevel}
          onChange={(v) => update('innerEdgeBevel', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Applies the same corner radius style to the floor-wall edge junction, matching the existing inner corner radius for a consistent look.
        </p>
        <SliderInput
          label="Corner Radius"
          value={config.cornerRadius}
          min={0}
          max={5}
          step={0.25}
          unit="mm"
          onChange={(v) => update('cornerRadius', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Rounds the vertical edges (corners viewed from above) and the corner radius of the top of the feet. Standard: 3.75mm.
        </p>
        <ToggleInput
          label="Prevent Bottom Overhangs"
          value={config.preventBottomOverhangs}
          onChange={(v) => update('preventBottomOverhangs', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Adds small chamfer where feet meet box walls to prevent printing overhangs.
        </p>
        {config.preventBottomOverhangs && (
          <>
            <SliderInput
              label="Chamfer Angle"
              value={config.bottomOverhangChamferAngle}
              min={30}
              max={75}
              step={1}
              unit="°"
              onChange={(v) => update('bottomOverhangChamferAngle', v)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-500">
              45° = standard. Higher = steeper chamfer. Lower = gentler chamfer.
            </p>
          </>
        )}
      </CollapsibleSection>

      {/* Feet Options Section */}
      <CollapsibleSection title="Feet (Base)" icon="👣">
        <SelectInput
          label="Base Style"
          value={config.flatBase}
          options={[
            { value: 'off', label: 'Standard (Stackable)' },
            { value: 'stackable', label: 'Gridfinity Stackable' },
            { value: 'rounded', label: 'Rounded (Non-stackable)' }
          ]}
          onChange={(v) => update('flatBase', v as BoxConfig['flatBase'])}
        />
        
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">FOOT CHAMFER</h4>
          <SliderInput
            label="Chamfer Angle"
            value={config.footChamferAngle}
            min={30}
            max={75}
            step={1}
            unit="°"
            onChange={(v) => update('footChamferAngle', v)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            45° = standard. Higher = steeper taper. Lower = gentler taper.
          </p>
          <SliderInput
            label="Chamfer Height"
            value={config.footChamferHeight}
            min={2}
            max={8}
            step={0.25}
            unit="mm"
            onChange={(v) => update('footChamferHeight', v)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Total height of the foot chamfer. Standard: 4.75mm.
          </p>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">LIP CHAMFER</h4>
          <SliderInput
            label="Lip Angle"
            value={config.lipChamferAngle}
            min={30}
            max={75}
            step={1}
            unit="°"
            onChange={(v) => update('lipChamferAngle', v)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            45° = standard. Higher = steeper taper. Lower = gentler taper.
          </p>
          <SliderInput
            label="Chamfer Height"
            value={config.lipChamferHeight}
            min={2}
            max={8}
            step={0.25}
            unit="mm"
            onChange={(v) => update('lipChamferHeight', v)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Total height of the lip chamfer. Standard: 4.4mm.
          </p>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">FOOT CORNER RADIUS</h4>
          <SliderInput
            label="Bottom Corner Radius"
            value={config.footBottomCornerRadius}
            min={0}
            max={10}
            step={0.25}
            unit="mm"
            onChange={(v) => update('footBottomCornerRadius', v)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Corner radius of the bottom of the foot. The top corner radius is controlled by the Wall & Floor Corner Radius slider.
          </p>
        </div>
      </CollapsibleSection>

      {/* Lip Style Section */}
      <CollapsibleSection title="Lip Style" icon="🔝">
        <SelectInput
          label="Stacking Lip"
          value={config.lipStyle}
          options={[
            { value: 'perfect_fit', label: 'Perfect Fit Lip' },
            { value: 'standard', label: 'Standard (Full)' },
            { value: 'reduced', label: 'Reduced' },
            { value: 'minimum', label: 'Minimum' },
            { value: 'none', label: 'None (Non-stackable)' }
          ]}
          onChange={(v) => update('lipStyle', v as BoxConfig['lipStyle'])}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Standard lip allows bins to stack. Reduced/minimum lips provide easier access.
        </p>
      </CollapsibleSection>

      {/* Dividers Section */}
      <CollapsibleSection title="Dividers" icon="▦">
        <NumberInput
          label="Dividers X (Left-Right)"
          value={config.dividersX}
          min={0}
          max={10}
          step={1}
          onChange={(v) => update('dividersX', v)}
        />
        <NumberInput
          label="Dividers Y (Front-Back)"
          value={config.dividersY}
          min={0}
          max={10}
          step={1}
          onChange={(v) => update('dividersY', v)}
        />
        {(config.dividersX > 0 || config.dividersY > 0) && (
          <>
            <SliderInput
              label="Divider Height"
              value={config.dividerHeight}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => update('dividerHeight', v)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Adjust the height of dividers as a percentage of available space (from floor to lip).
            </p>
            <ToggleInput
              label="Bevel Divider-Floor Edge"
              value={config.dividerFloorBevel}
              onChange={(v) => update('dividerFloorBevel', v)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Applies the same corner radius style to the divider-floor edge junction, matching the existing inner corner radius.
            </p>
          </>
        )}
      </CollapsibleSection>

      {/* Work in Progress Section */}
      <div className="mt-4 pt-4 border-t-2 border-slate-300 dark:border-slate-600">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 italic">Work in Progress</h2>
        <div className="space-y-2.5">
          {/* Floor Section */}
          <CollapsibleSection title="Floor" icon="🏠" wip>
            <SelectInput
              label="Floor Type"
              value={config.efficientFloor}
              options={[
                { value: 'off', label: 'Solid Floor' },
                { value: 'on', label: 'Efficient (Saves Material)' },
                { value: 'rounded', label: 'Rounded Efficient' },
                { value: 'smooth', label: 'Smooth Efficient' }
              ]}
              onChange={(v) => update('efficientFloor', v as BoxConfig['efficientFloor'])}
            />
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Efficient floor reduces material by only printing under the walls.
            </p>
          </CollapsibleSection>

          {/* Magnets & Screws Section */}
          <CollapsibleSection title="Magnets & Screws" icon="🧲" wip>
            <ToggleInput
              label="Enable Magnets"
              value={config.magnetEnabled}
              onChange={(v) => update('magnetEnabled', v)}
            />
            {config.magnetEnabled && (
              <>
                <NumberInput
                  label="Magnet Diameter"
                  value={config.magnetDiameter}
                  min={3}
                  max={10}
                  step={0.1}
                  unit="mm"
                  onChange={(v) => update('magnetDiameter', v)}
                />
                <NumberInput
                  label="Magnet Depth"
                  value={config.magnetDepth}
                  min={1}
                  max={5}
                  step={0.1}
                  unit="mm"
                  onChange={(v) => update('magnetDepth', v)}
                />
                <SelectInput
                  label="Easy Release"
                  value={config.magnetEasyRelease}
                  options={[
                    { value: 'off', label: 'Off' },
                    { value: 'auto', label: 'Auto' },
                    { value: 'inner', label: 'Inner' },
                    { value: 'outer', label: 'Outer' }
                  ]}
                  onChange={(v) => update('magnetEasyRelease', v as BoxConfig['magnetEasyRelease'])}
                />
              </>
            )}
            <ToggleInput
              label="Enable Screw Holes"
              value={config.screwEnabled}
              onChange={(v) => update('screwEnabled', v)}
            />
            {config.screwEnabled && (
              <NumberInput
                label="Screw Diameter"
                value={config.screwDiameter}
                min={2}
                max={6}
                step={0.5}
                unit="mm"
                onChange={(v) => update('screwDiameter', v)}
              />
            )}
          </CollapsibleSection>

          {/* Finger Slide Section */}
          <CollapsibleSection title="Finger Slide" icon="👆" wip>
            <ToggleInput
              label="Enable Finger Slide"
              value={config.fingerSlide}
              onChange={(v) => update('fingerSlide', v)}
            />
            {config.fingerSlide && (
              <>
                <SelectInput
                  label="Slide Style"
                  value={config.fingerSlideStyle}
                  options={[
                    { value: 'rounded', label: 'Rounded' },
                    { value: 'chamfered', label: 'Chamfered' },
                    { value: 'none', label: 'Rectangular' }
                  ]}
                  onChange={(v) => update('fingerSlideStyle', v as BoxConfig['fingerSlideStyle'])}
                />
                <SliderInput
                  label="Slide Radius"
                  value={config.fingerSlideRadius}
                  min={4}
                  max={20}
                  step={1}
                  unit="mm"
                  onChange={(v) => update('fingerSlideRadius', v)}
                />
                <SelectInput
                  label="Position"
                  value={config.fingerSlidePosition}
                  options={[
                    { value: 'front', label: 'Front' },
                    { value: 'back', label: 'Back' },
                    { value: 'left', label: 'Left' },
                    { value: 'right', label: 'Right' }
                  ]}
                  onChange={(v) => update('fingerSlidePosition', v as BoxConfig['fingerSlidePosition'])}
                />
              </>
            )}
          </CollapsibleSection>

          {/* Tapered Corners Section */}
          <CollapsibleSection title="Tapered Corners" icon="📐" wip>
            <SelectInput
              label="Corner Style"
              value={config.taperedCorner}
              options={[
                { value: 'none', label: 'None' },
                { value: 'rounded', label: 'Rounded' },
                { value: 'chamfered', label: 'Chamfered' }
              ]}
              onChange={(v) => update('taperedCorner', v as BoxConfig['taperedCorner'])}
            />
            {config.taperedCorner !== 'none' && (
              <SliderInput
                label="Taper Size"
                value={config.taperedCornerSize}
                min={5}
                max={20}
                step={1}
                unit="mm"
                onChange={(v) => update('taperedCornerSize', v)}
              />
            )}
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Tapered internal corners make it easier to grab items from the bin.
            </p>
          </CollapsibleSection>

          {/* Wall Pattern Section */}
          <CollapsibleSection title="Wall Pattern" icon="⬡" wip>
            <SelectInput
              label="Pattern Style"
              value={config.wallPattern}
              options={[
                { value: 'none', label: 'None (Solid)' },
                { value: 'hexgrid', label: 'Hexagon Grid' },
                { value: 'grid', label: 'Square Grid' },
                { value: 'voronoi', label: 'Voronoi' },
                { value: 'brick', label: 'Brick Pattern' }
              ]}
              onChange={(v) => update('wallPattern', v as BoxConfig['wallPattern'])}
            />
            {config.wallPattern !== 'none' && (
              <SliderInput
                label="Pattern Spacing"
                value={config.wallPatternSpacing}
                min={1}
                max={5}
                step={0.5}
                unit="mm"
                onChange={(v) => update('wallPatternSpacing', v)}
              />
            )}
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Wall patterns reduce material usage and add visual interest.
            </p>
          </CollapsibleSection>

          {/* Label Tab Section */}
          <CollapsibleSection title="Label Tab" icon="🏷️" wip>
            <ToggleInput
              label="Enable Label Tab"
              value={config.labelEnabled}
              onChange={(v) => update('labelEnabled', v)}
            />
            {config.labelEnabled && (
              <>
                <SelectInput
                  label="Position"
                  value={config.labelPosition}
                  options={[
                    { value: 'front', label: 'Front' },
                    { value: 'back', label: 'Back' },
                    { value: 'left', label: 'Left' },
                    { value: 'right', label: 'Right' }
                  ]}
                  onChange={(v) => update('labelPosition', v as BoxConfig['labelPosition'])}
                />
                <SliderInput
                  label="Label Width"
                  value={config.labelWidth}
                  min={20}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={(v) => update('labelWidth', v)}
                />
              </>
            )}
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

function BaseplateConfigPanel({ config, onChange }: { config: BaseplateConfig; onChange: (config: BaseplateConfig) => void }) {
  const update = <K extends keyof BaseplateConfig>(key: K, value: BaseplateConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  // Calculate grid preview for fill_area_mm mode
  const gridCalc = useMemo(() => {
    if (config.sizingMode !== 'fill_area_mm') return null;
    return calculateGridFromMm(
      config.targetWidthMm,
      config.targetDepthMm,
      config.gridSize,
      config.allowHalfCellsX,
      config.allowHalfCellsY,
      config.paddingAlignment
    );
  }, [config.sizingMode, config.targetWidthMm, config.targetDepthMm, config.gridSize, 
      config.allowHalfCellsX, config.allowHalfCellsY, config.paddingAlignment]);

  // Calculate split preview
  const splitCalc = useMemo(() => {
    if (!config.splitEnabled) return null;
    
    // Get total grid units based on sizing mode
    let totalUnitsX: number;
    let totalUnitsY: number;
    let actualGridUnitsX: number | undefined;
    let actualGridUnitsY: number | undefined;
    let gridCoverageMmX: number | undefined;
    let gridCoverageMmY: number | undefined;
    
    let paddingNearX: number | undefined;
    let paddingFarX: number | undefined;
    let paddingNearY: number | undefined;
    let paddingFarY: number | undefined;
    
    if (config.sizingMode === 'fill_area_mm' && gridCalc) {
      // Use floored values for totalUnits (for backwards compatibility)
      totalUnitsX = Math.floor(gridCalc.gridUnitsX);
      totalUnitsY = Math.floor(gridCalc.gridUnitsY);
      // Pass actual grid units from calculateGridFromMm (accounts for half cells)
      actualGridUnitsX = gridCalc.gridUnitsX;
      actualGridUnitsY = gridCalc.gridUnitsY;
      // Pass grid coverage (what needs to fit on the bed, excluding padding)
      gridCoverageMmX = gridCalc.gridCoverageMmX;
      gridCoverageMmY = gridCalc.gridCoverageMmY;
      // Pass padding values for distribution across segments
      paddingNearX = gridCalc.paddingNearX;
      paddingFarX = gridCalc.paddingFarX;
      paddingNearY = gridCalc.paddingNearY;
      paddingFarY = gridCalc.paddingFarY;
    } else {
      totalUnitsX = Math.floor(config.width);
      totalUnitsY = Math.floor(config.depth);
      // In grid_units mode, grid units are exact and coverage is units * gridSize
      actualGridUnitsX = config.width;
      actualGridUnitsY = config.depth;
      gridCoverageMmX = config.width * config.gridSize;
      gridCoverageMmY = config.depth * config.gridSize;
      // No padding in grid_units mode
      paddingNearX = 0;
      paddingFarX = 0;
      paddingNearY = 0;
      paddingFarY = 0;
    }
    
    return splitBaseplateForPrinter(
      totalUnitsX,
      totalUnitsY,
      config.printerBedWidth,
      config.printerBedDepth,
      config.gridSize,
      config.connectorEnabled,
      actualGridUnitsX,
      actualGridUnitsY,
      gridCoverageMmX,
      gridCoverageMmY,
      paddingNearX,
      paddingFarX,
      paddingNearY,
      paddingFarY
    );
  }, [config.splitEnabled, config.sizingMode, config.width, config.depth, 
      config.printerBedWidth, config.printerBedDepth, config.gridSize, 
      config.connectorEnabled, config.targetWidthMm, config.targetDepthMm, gridCalc]);

  return (
    <div className="p-3 space-y-2.5">
      {/* Sizing Mode Section */}
      <CollapsibleSection title="Sizing Mode" icon="📏" defaultOpen>
        <div className="flex gap-2 mb-4">
          <button
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              config.sizingMode === 'grid_units'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            onClick={() => update('sizingMode', 'grid_units')}
          >
            Grid Units
          </button>
          <button
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              config.sizingMode === 'fill_area_mm'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            onClick={() => update('sizingMode', 'fill_area_mm')}
          >
            Fill Area (mm)
          </button>
        </div>

        {config.sizingMode === 'grid_units' ? (
          <>
            <SliderInput
              label="Width"
              value={config.width}
              min={1}
              max={10}
              step={0.5}
              unit="units"
              onChange={(v) => update('width', v)}
            />
            <SliderInput
              label="Depth"
              value={config.depth}
              min={1}
              max={10}
              step={0.5}
              unit="units"
              onChange={(v) => update('depth', v)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Actual size: {(config.width * config.gridSize).toFixed(0)}mm x {(config.depth * config.gridSize).toFixed(0)}mm
            </p>
          </>
        ) : (
          <>
            <NumberInput
              label="Target Width"
              value={config.targetWidthMm}
              min={42}
              max={1000}
              step={1}
              unit="mm"
              onChange={(v) => update('targetWidthMm', v)}
            />
            <NumberInput
              label="Target Depth"
              value={config.targetDepthMm}
              min={42}
              max={1000}
              step={1}
              unit="mm"
              onChange={(v) => update('targetDepthMm', v)}
            />
            
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">FILL OPTIONS</h4>
              <ToggleInput
                label="Allow Half Cells (Width)"
                value={config.allowHalfCellsX}
                onChange={(v) => update('allowHalfCellsX', v)}
              />
              <ToggleInput
                label="Allow Half Cells (Depth)"
                value={config.allowHalfCellsY}
                onChange={(v) => update('allowHalfCellsY', v)}
              />
              <SelectInput
                label="Padding Alignment"
                value={config.paddingAlignment}
                options={[
                  { value: 'center', label: 'Center (Equal padding both sides)' },
                  { value: 'near', label: 'Near (Padding on left/front)' },
                  { value: 'far', label: 'Far (Padding on right/back)' }
                ]}
                onChange={(v) => update('paddingAlignment', v as BaseplateConfig['paddingAlignment'])}
              />
            </div>

            {/* Grid Calculation Preview */}
            {gridCalc && (
              <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">CALCULATED GRID</h4>
                <div className="space-y-1 text-xs">
                  <p className="text-slate-300">
                    <span className="text-slate-500">Grid size:</span>{' '}
                    <span className="font-mono text-emerald-300">
                      {gridCalc.gridUnitsX} x {gridCalc.gridUnitsY}
                    </span>{' '}
                    units
                    {(gridCalc.hasHalfCellX || gridCalc.hasHalfCellY) && (
                      <span className="text-amber-400 ml-1">
                        ({gridCalc.hasHalfCellX && 'half-X'}{gridCalc.hasHalfCellX && gridCalc.hasHalfCellY && ', '}{gridCalc.hasHalfCellY && 'half-Y'})
                      </span>
                    )}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-500">Grid coverage:</span>{' '}
                    <span className="font-mono">{gridCalc.gridCoverageMmX.toFixed(1)}mm x {gridCalc.gridCoverageMmY.toFixed(1)}mm</span>
                  </p>
                  {(gridCalc.totalPaddingX > 0 || gridCalc.totalPaddingY > 0) && (
                    <p className="text-slate-300">
                      <span className="text-slate-500">Edge padding:</span>{' '}
                      <span className="font-mono text-amber-300">
                        {gridCalc.paddingNearX.toFixed(1)}/{gridCalc.paddingFarX.toFixed(1)}mm (L/R), {gridCalc.paddingNearY.toFixed(1)}/{gridCalc.paddingFarY.toFixed(1)}mm (F/B)
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <NumberInput
          label="Grid Unit Size"
          value={config.gridSize}
          min={30}
          max={60}
          step={1}
          unit="mm"
          onChange={(v) => update('gridSize', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Standard Gridfinity is 42mm. Must match your bins.
        </p>
      </CollapsibleSection>

      {/* Printer Bed Splitting Section */}
      <CollapsibleSection title="Printer Bed Splitting" icon="✂️">
        <ToggleInput
          label="Enable Splitting"
          value={config.splitEnabled}
          onChange={(v) => update('splitEnabled', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Split large baseplates into smaller segments that fit on your 3D printer bed.
        </p>

        {config.splitEnabled && (
          <>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">PRINTER BED SIZE</h4>
              <NumberInput
                label="Bed Width"
                value={config.printerBedWidth}
                min={50}
                max={1000}
                step={5}
                unit="mm"
                onChange={(v) => update('printerBedWidth', v)}
              />
              <NumberInput
                label="Bed Depth"
                value={config.printerBedDepth}
                min={50}
                max={1000}
                step={5}
                unit="mm"
                onChange={(v) => update('printerBedDepth', v)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Common sizes: Ender 3 (220x220), Prusa MK3 (250x210), Bambu X1 (256x256)
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">INTERLOCKING EDGES</h4>
              <ToggleInput
                label="Enable Interlocking Edges"
                value={config.connectorEnabled}
                onChange={(v) => {
                  const updates: Partial<BaseplateConfig> = { connectorEnabled: v };
                  // When enabling, preselect the first edge pattern (wineglass)
                  if (v && !config.edgePattern) {
                    updates.edgePattern = 'wineglass';
                    updates.toothDepth = 6; // Default tooth depth for wineglass
                  }
                  onChange({ ...config, ...updates });
                }}
              />
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Add male/female interlocking edges between segments - snaps together without separate connectors.
              </p>
              
              {config.connectorEnabled && (
                <>
                  <SelectInput
                    label="Edge Pattern"
                    value={config.edgePattern}
                    options={[
                      { value: 'wineglass', label: '1. Wine Glass (Swoopy Bulb)' },
                      { value: 'dovetail', label: '2. Dovetail (Trapezoidal)' },
                      { value: 'rectangular', label: '3. Rectangular (Square)' },
                      { value: 'triangular', label: '4. Triangular (Sawtooth)' },
                      { value: 'puzzle', label: '5. Puzzle (Jigsaw Bulb)' },
                      { value: 'tslot', label: '6. T-Slot (T-Hook)' },
                      { value: 'puzzle_smooth', label: '7. Puzzle Smooth (Concave)' },
                      { value: 'tslot_smooth', label: '8. T-Slot Smooth (Concave)' }
                    ]}
                    onChange={(v) => {
                      const pattern = v as BaseplateConfig['edgePattern'];
                      const updates: Partial<BaseplateConfig> = { edgePattern: pattern };
                      // Set default tooth depth to 6mm for wineglass
                      if (pattern === 'wineglass') {
                        updates.toothDepth = 6;
                      }
                      onChange({ ...config, ...updates });
                    }}
                  />
                  <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded text-xs text-slate-600 dark:text-slate-400">
                    {config.edgePattern === 'dovetail' && '▷ Trapezoidal teeth - wider at tip than base (classic woodworking style)'}
                    {config.edgePattern === 'rectangular' && '▷ Simple square blocks that interlock'}
                    {config.edgePattern === 'triangular' && '▷ Pointed zigzag pattern (sawtooth)'}
                    {config.edgePattern === 'puzzle' && '▷ Round bulbous tabs like jigsaw puzzle pieces'}
                    {config.edgePattern === 'tslot' && '▷ T-shaped hooks that lock in place'}
                    {config.edgePattern === 'puzzle_smooth' && '▷ Puzzle bulb with concave hourglass stem - smooth for 3D printing'}
                    {config.edgePattern === 'tslot_smooth' && '▷ T-slot with concave stem - no sharp corners'}
                    {config.edgePattern === 'wineglass' && '▷ Wine glass shape - concave stem flowing into rounded bulb top'}
                  </div>
                  
                  <SliderInput
                    label="Tooth Depth"
                    value={config.toothDepth}
                    min={1}
                    max={20}
                    step={0.5}
                    unit="mm"
                    onChange={(v) => update('toothDepth', v)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Overall height of the connector shape.
                  </p>
                  
                  <SliderInput
                    label="Tooth Width"
                    value={config.toothWidth}
                    min={2}
                    max={20}
                    step={0.5}
                    unit="mm"
                    onChange={(v) => update('toothWidth', v)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Width of each tooth at the base.
                  </p>
                  
                  {/* Show concave depth slider only for smooth patterns */}
                  {(config.edgePattern === 'puzzle_smooth' || 
                    config.edgePattern === 'tslot_smooth' || 
                    config.edgePattern === 'wineglass') && (
                    <>
                      <SliderInput
                        label="Concave Depth"
                        value={config.concaveDepth ?? 50}
                        min={0}
                        max={100}
                        step={5}
                        unit="%"
                        onChange={(v) => update('concaveDepth', v)}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        How deep the inward swoop curves. 0% = nearly straight, 100% = deep hourglass.
                      </p>
                    </>
                  )}
                  
                  {/* Show aspect ratio slider only for wineglass pattern */}
                  {config.edgePattern === 'wineglass' && (
                    <>
                      <SliderInput
                        label="Bulb Shape (Circular vs Ovular)"
                        value={config.wineglassAspectRatio ?? 1.0}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        unit=""
                        onChange={(v) => update('wineglassAspectRatio', v)}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        1.0 = circular, &lt;1.0 = taller (ovular vertically), &gt;1.0 = wider (ovular horizontally).
                      </p>
                    </>
                  )}
                  
                  <SliderInput
                    label="Roof Peak Intensity"
                    value={config.connectorRoofIntensity ?? 0}
                    min={0}
                    max={200}
                    step={5}
                    unit="%"
                    onChange={(v) => update('connectorRoofIntensity', v)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Adds a peaked "^" roof to connector tops. 0% = flat, 100% = standard peak height, up to 200% for more intense peaks.
                  </p>
                  
                  {config.connectorRoofIntensity > 0 && (
                    <>
                      <SliderInput
                        label="Roof Depth"
                        value={config.connectorRoofDepth ?? 0}
                        min={0}
                        max={100}
                        step={5}
                        unit="%"
                        onChange={(v) => update('connectorRoofDepth', v)}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        How far down from the top the roof starts. 0% = roof at very top, 100% = roof at base.
                      </p>
                    </>
                  )}
                  
                  <SliderInput
                    label="Fit Tolerance"
                    value={config.connectorTolerance}
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    unit="mm"
                    onChange={(v) => update('connectorTolerance', v)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Typical FDM tolerance: 0.3mm. Increase if fit is too tight.
                  </p>
                </>
              )}
            </div>

            {/* Split Calculation Preview */}
            {splitCalc && (
              <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                <h4 className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2">SPLIT PREVIEW</h4>
                <div className="space-y-1 text-xs">
                  {splitCalc.needsSplit ? (
                    <>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Segments:</span>{' '}
                        <span className="font-mono text-cyan-300">
                          {splitCalc.segmentsX} x {splitCalc.segmentsY}
                        </span>{' '}
                        ({splitCalc.totalSegments} pieces)
                      </p>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Max segment size:</span>{' '}
                        <span className="font-mono">
                          {splitCalc.maxSegmentUnitsX} x {splitCalc.maxSegmentUnitsY} units
                        </span>
                      </p>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Segment dimensions:</span>{' '}
                        <span className="font-mono">
                          {(splitCalc.maxSegmentUnitsX * config.gridSize).toFixed(0)}mm x {(splitCalc.maxSegmentUnitsY * config.gridSize).toFixed(0)}mm
                        </span>
                      </p>
                      {config.connectorEnabled && (
                        <p className="text-emerald-400 mt-2">
                          Interlocking edges enabled - click edges below to customize
                        </p>
                      )}
                      
                      {/* Interactive segment edge editor */}
                      {config.connectorEnabled && (
                        <SegmentEdgeEditor 
                          splitInfo={splitCalc}
                          config={config}
                          onChange={onChange}
                        />
                      )}
                      
                      {/* Simple grid preview when connectors disabled */}
                      {!config.connectorEnabled && (
                        <div className="mt-3 p-2 bg-slate-200 dark:bg-slate-800 rounded">
                          <p className="text-slate-600 dark:text-slate-500 text-[10px] mb-1">Segment Layout:</p>
                          <div 
                            className="grid gap-1" 
                            style={{ 
                              gridTemplateColumns: `repeat(${splitCalc.segmentsX}, 1fr)`,
                              maxWidth: '150px'
                            }}
                          >
                            {splitCalc.segments.flat().map((seg, i) => (
                              <div 
                                key={i}
                                className="bg-cyan-600/30 border border-cyan-500/50 rounded text-[8px] text-center py-1 text-cyan-300"
                              >
                                {seg.gridUnitsX}x{seg.gridUnitsY}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-emerald-400">
                      No splitting needed - baseplate fits on printer bed!
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CollapsibleSection>

      {/* Outer Corner Rounding Section */}
      <CollapsibleSection title="Outer Corner Rounding" icon="⭕">
        <SliderInput
          label="Corner Radius"
          value={config.cornerRadius}
          min={0}
          max={20}
          step={0.25}
          unit="mm"
          onChange={(v) => update('cornerRadius', v)}
        />
        <SliderInput
          label="Corner Segments"
          value={config.cornerSegments}
          min={8}
          max={64}
          step={4}
          onChange={(v) => update('cornerSegments', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Higher segments = smoother curves but larger file size.
        </p>
      </CollapsibleSection>

      {/* Socket Chamfer Section */}
      <CollapsibleSection title="Socket Chamfer" icon="📐">
        <ToggleInput
          label="Sync with Foot Chamfer"
          value={config.syncSocketWithFoot}
          onChange={(v) => update('syncSocketWithFoot', v)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-500">
          When enabled, socket chamfer automatically matches foot chamfer for proper fit.
        </p>
        {!config.syncSocketWithFoot && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              ⚠️ Socket angle & height must match foot for proper fit!
            </p>
          </div>
        )}
        <div className={config.syncSocketWithFoot ? 'opacity-50 pointer-events-none' : ''}>
          <SliderInput
            label="Chamfer Angle"
            value={config.socketChamferAngle}
            min={30}
            max={75}
            step={1}
            unit="°"
            onChange={(v) => update('socketChamferAngle', v)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Should match foot chamfer angle. 45° = standard.
          </p>
          <SliderInput
            label="Chamfer Height"
            value={config.socketChamferHeight}
            min={2}
            max={8}
            step={0.25}
            unit="mm"
            onChange={(v) => update('socketChamferHeight', v)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Should match foot chamfer height. Standard: 4.75mm.
          </p>
          <SliderInput
            label="Bottom Corner Radius"
            value={config.socketBottomCornerRadius}
            min={0}
            max={10}
            step={0.25}
            unit="mm"
            onChange={(v) => update('socketBottomCornerRadius', v)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Corner radius of the bottom of the socket where the foot intersects. Automatically syncs with the foot's bottom corner radius.
          </p>
        </div>
      </CollapsibleSection>

      {/* Work in Progress Section */}
      <div className="mt-4 pt-4 border-t-2 border-slate-300 dark:border-slate-600">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 italic">Work in Progress</h2>
        <div className="space-y-2.5">
          {/* Style Section */}
          <CollapsibleSection title="Plate Style" icon="🎨" wip>
            <SelectInput
              label="Socket Style"
              value={config.style}
              options={[
                { value: 'default', label: 'Default (Open Sockets)' },
                { value: 'magnet', label: 'With Magnets' },
                { value: 'weighted', label: 'Weighted (Weight Cavity)' },
                { value: 'screw', label: 'With Screw Holes' }
              ]}
              onChange={(v) => update('style', v as BaseplateConfig['style'])}
            />
            <SelectInput
              label="Plate Type"
              value={config.plateStyle}
              options={[
                { value: 'default', label: 'Standard 3D Print' },
                { value: 'cnclaser', label: 'CNC / Laser Cut' }
              ]}
              onChange={(v) => update('plateStyle', v as BaseplateConfig['plateStyle'])}
            />
            <ToggleInput
              label="Remove Bottom Taper"
              value={config.removeBottomTaper}
              onChange={(v) => update('removeBottomTaper', v)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Removing bottom taper creates flat socket bottoms for CNC/laser cutting.
            </p>
          </CollapsibleSection>

          {/* Magnets Section */}
          {(config.style === 'magnet' || config.style === 'default') && (
            <CollapsibleSection title="Magnets" icon="🧲" wip>
              <NumberInput
                label="Magnet Diameter"
                value={config.magnetDiameter}
                min={3}
                max={10}
                step={0.1}
                unit="mm"
                onChange={(v) => update('magnetDiameter', v)}
              />
              <NumberInput
                label="Magnet Depth"
                value={config.magnetDepth}
                min={1}
                max={5}
                step={0.1}
                unit="mm"
                onChange={(v) => update('magnetDepth', v)}
              />
              <NumberInput
                label="Z Offset (Raise Magnet)"
                value={config.magnetZOffset}
                min={0}
                max={3}
                step={0.1}
                unit="mm"
                onChange={(v) => update('magnetZOffset', v)}
              />
              <NumberInput
                label="Top Cover (Capture)"
                value={config.magnetTopCover}
                min={0}
                max={2}
                step={0.1}
                unit="mm"
                onChange={(v) => update('magnetTopCover', v)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Z Offset raises magnets for glue-in. Top Cover creates ceiling to capture magnets.
              </p>
            </CollapsibleSection>
          )}

          {/* Screws Section */}
          {(config.style === 'screw' || config.style === 'default') && (
            <CollapsibleSection title="Screw Holes" icon="🔩" wip>
              <NumberInput
                label="Screw Diameter"
                value={config.screwDiameter}
                min={2}
                max={6}
                step={0.5}
                unit="mm"
                onChange={(v) => update('screwDiameter', v)}
              />
              <ToggleInput
                label="Center Screw Hole"
                value={config.centerScrew}
                onChange={(v) => update('centerScrew', v)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Center screw allows mounting baseplate to surface.
              </p>
            </CollapsibleSection>
          )}

          {/* Weight Cavity Section */}
          <CollapsibleSection title="Weight Cavity" icon="⚖️" wip>
            <ToggleInput
              label="Enable Weight Cavity"
              value={config.weightCavity}
              onChange={(v) => update('weightCavity', v)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Creates hollow space to add weights (lead, steel balls) for stability.
            </p>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

// Interactive segment edge editor
function SegmentEdgeEditor({ 
  splitInfo, 
  config, 
  onChange 
}: { 
  splitInfo: SplitResult; 
  config: BaseplateConfig; 
  onChange: (config: BaseplateConfig) => void;
}) {
  // Get edge type for a specific segment and edge
  const getEdgeType = useCallback((segX: number, segY: number, edge: 'left' | 'right' | 'front' | 'back'): EdgeType => {
    // Check for override
    const override = config.edgeOverrides.find(o => o.segmentX === segX && o.segmentY === segY);
    if (override) {
      if (edge === 'left') return override.leftEdge;
      if (edge === 'right') return override.rightEdge;
      if (edge === 'front') return override.frontEdge;
      if (edge === 'back') return override.backEdge;
    }
    
    // Default automatic assignment
    const segment = splitInfo.segments[segY]?.[segX];
    if (!segment) return 'none';
    
    // Default: right/back = male, left/front = female
    if (edge === 'right') return segment.hasConnectorRight ? 'male' : 'none';
    if (edge === 'back') return segment.hasConnectorBack ? 'male' : 'none';
    if (edge === 'left') return segment.hasConnectorLeft ? 'female' : 'none';
    if (edge === 'front') return segment.hasConnectorFront ? 'female' : 'none';
    return 'none';
  }, [config.edgeOverrides, splitInfo.segments]);

  // Cycle edge type: none -> male -> female -> none
  const cycleEdge = useCallback((segX: number, segY: number, edge: 'left' | 'right' | 'front' | 'back') => {
    const current = getEdgeType(segX, segY, edge);
    const next: EdgeType = current === 'none' ? 'male' : current === 'male' ? 'female' : 'none';
    
    // Find or create override for this segment
    const existingOverride = config.edgeOverrides.find(o => o.segmentX === segX && o.segmentY === segY);
    const segment = splitInfo.segments[segY]?.[segX];
    
    if (existingOverride) {
      // Update existing override
      const newOverrides = config.edgeOverrides.map(o => {
        if (o.segmentX === segX && o.segmentY === segY) {
          return { ...o, [`${edge}Edge`]: next };
        }
        return o;
      });
      onChange({ ...config, edgeOverrides: newOverrides });
    } else if (segment) {
      // Create new override with defaults + change
      const newOverride: SegmentEdgeOverride = {
        segmentX: segX,
        segmentY: segY,
        leftEdge: segment.hasConnectorLeft ? 'female' : 'none',
        rightEdge: segment.hasConnectorRight ? 'male' : 'none',
        frontEdge: segment.hasConnectorFront ? 'female' : 'none',
        backEdge: segment.hasConnectorBack ? 'male' : 'none',
        [`${edge}Edge`]: next
      } as SegmentEdgeOverride;
      onChange({ ...config, edgeOverrides: [...config.edgeOverrides, newOverride] });
    }
  }, [config, splitInfo.segments, getEdgeType, onChange]);

  // Reset all overrides to defaults
  const resetToDefaults = () => {
    onChange({ ...config, edgeOverrides: [] });
  };

  // Edge indicator colors
  const edgeColor = (type: EdgeType) => {
    if (type === 'male') return 'bg-blue-500';
    if (type === 'female') return 'bg-pink-500';
    return 'bg-slate-600';
  };

  const edgeLabel = (type: EdgeType) => {
    if (type === 'male') return 'M';
    if (type === 'female') return 'F';
    return '—';
  };

  return (
    <div className="mt-3 p-3 bg-slate-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-400 text-[10px]">Click edges to change (M=male, F=female)</p>
        {config.edgeOverrides.length > 0 && (
          <button 
            onClick={resetToDefaults}
            className="text-[10px] text-amber-400 hover:text-amber-300"
          >
            Reset
          </button>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex gap-3 mb-2 text-[9px]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-blue-500"></span>Male
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-pink-500"></span>Female
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-slate-600"></span>None
        </span>
      </div>
      
      {/* Segment grid with clickable edges - reversed Y so back is at top, front at bottom */}
      <div 
        className="grid gap-2" 
        style={{ 
          gridTemplateColumns: `repeat(${splitInfo.segmentsX}, 1fr)`,
          maxWidth: `${Math.min(splitInfo.segmentsX * 80, 300)}px`
        }}
      >
        {[...splitInfo.segments].reverse().flat().map((seg) => (
          <div 
            key={`${seg.segmentX}-${seg.segmentY}`}
            className="relative bg-slate-700/50 border border-slate-600 rounded p-2"
            style={{ aspectRatio: '1' }}
          >
            {/* Segment label */}
            <div className="absolute inset-0 flex items-center justify-center text-[9px] text-slate-400">
              [{seg.segmentX},{seg.segmentY}]
            </div>
            
            {/* Top edge (back) */}
            <button
              onClick={() => cycleEdge(seg.segmentX, seg.segmentY, 'back')}
              className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-3 rounded-sm text-[8px] text-white font-bold ${edgeColor(getEdgeType(seg.segmentX, seg.segmentY, 'back'))} hover:opacity-80 transition-opacity`}
              title={`Back edge: ${getEdgeType(seg.segmentX, seg.segmentY, 'back')}`}
            >
              {edgeLabel(getEdgeType(seg.segmentX, seg.segmentY, 'back'))}
            </button>
            
            {/* Bottom edge (front) */}
            <button
              onClick={() => cycleEdge(seg.segmentX, seg.segmentY, 'front')}
              className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-3 rounded-sm text-[8px] text-white font-bold ${edgeColor(getEdgeType(seg.segmentX, seg.segmentY, 'front'))} hover:opacity-80 transition-opacity`}
              title={`Front edge: ${getEdgeType(seg.segmentX, seg.segmentY, 'front')}`}
            >
              {edgeLabel(getEdgeType(seg.segmentX, seg.segmentY, 'front'))}
            </button>
            
            {/* Left edge */}
            <button
              onClick={() => cycleEdge(seg.segmentX, seg.segmentY, 'left')}
              className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-6 rounded-sm text-[8px] text-white font-bold ${edgeColor(getEdgeType(seg.segmentX, seg.segmentY, 'left'))} hover:opacity-80 transition-opacity flex items-center justify-center`}
              title={`Left edge: ${getEdgeType(seg.segmentX, seg.segmentY, 'left')}`}
            >
              {edgeLabel(getEdgeType(seg.segmentX, seg.segmentY, 'left'))}
            </button>
            
            {/* Right edge */}
            <button
              onClick={() => cycleEdge(seg.segmentX, seg.segmentY, 'right')}
              className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-6 rounded-sm text-[8px] text-white font-bold ${edgeColor(getEdgeType(seg.segmentX, seg.segmentY, 'right'))} hover:opacity-80 transition-opacity flex items-center justify-center`}
              title={`Right edge: ${getEdgeType(seg.segmentX, seg.segmentY, 'right')}`}
            >
              {edgeLabel(getEdgeType(seg.segmentX, seg.segmentY, 'right'))}
            </button>
          </div>
        ))}
      </div>
      
      <p className="text-[9px] text-slate-500 mt-2">
        Tip: Adjacent edges should be M+F pairs to interlock
      </p>
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  wip = false
}: { 
  title: string; 
  icon: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  wip?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30 overflow-hidden ${wip ? 'opacity-60' : ''}`}>
      <button
        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-200/50 dark:hover:bg-slate-700/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className={`text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 ${wip ? 'italic' : ''}`}>
          <span>{icon}</span>
          {title}
        </h3>
        <svg 
          className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-1.5 space-y-3 border-t border-slate-200/30 dark:border-slate-700/30">
          {children}
        </div>
      )}
    </div>
  );
}
