import { useState, useMemo } from 'react';
import { BoxConfig, BaseplateConfig, calculateGridFromMm, calculateSplitting } from '../../types/config';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';
import { SelectInput } from './SelectInput';
import { NumberInput } from './NumberInput';

interface ConfigPanelProps {
  type: 'box' | 'baseplate';
  boxConfig: BoxConfig;
  baseplateConfig: BaseplateConfig;
  onBoxConfigChange: (config: BoxConfig) => void;
  onBaseplateConfigChange: (config: BaseplateConfig) => void;
}

export function ConfigPanel({
  type,
  boxConfig,
  baseplateConfig,
  onBoxConfigChange,
  onBaseplateConfigChange
}: ConfigPanelProps) {
  if (type === 'box') {
    return (
      <BoxConfigPanel config={boxConfig} onChange={onBoxConfigChange} />
    );
  }

  return (
    <BaseplateConfigPanel config={baseplateConfig} onChange={onBaseplateConfigChange} />
  );
}

function BoxConfigPanel({ config, onChange }: { config: BoxConfig; onChange: (config: BoxConfig) => void }) {
  const update = <K extends keyof BoxConfig>(key: K, value: BoxConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="p-4 space-y-3">
      {/* Dimensions Section */}
      <CollapsibleSection title="Dimensions" icon="📐" defaultOpen>
        <SliderInput
          label="Width"
          value={config.width}
          min={0.5}
          max={8}
          step={0.5}
          unit="units"
          onChange={(v) => update('width', v)}
        />
        <SliderInput
          label="Depth"
          value={config.depth}
          min={0.5}
          max={8}
          step={0.5}
          unit="units"
          onChange={(v) => update('depth', v)}
        />
        <SliderInput
          label="Height"
          value={config.height}
          min={1}
          max={10}
          step={1}
          unit="units"
          onChange={(v) => update('height', v)}
        />
        <NumberInput
          label="Grid Unit Size"
          value={config.gridSize}
          min={30}
          max={60}
          step={1}
          unit="mm"
          onChange={(v) => update('gridSize', v)}
        />
        <p className="text-xs text-slate-500">
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
        <SliderInput
          label="Corner Radius"
          value={config.cornerRadius}
          min={0}
          max={5}
          step={0.25}
          unit="mm"
          onChange={(v) => update('cornerRadius', v)}
        />
        <p className="text-xs text-slate-500">
          Rounds the vertical edges (corners viewed from above). Standard: 3.75mm.
        </p>
        <ToggleInput
          label="Prevent Bottom Overhangs"
          value={config.preventBottomOverhangs}
          onChange={(v) => update('preventBottomOverhangs', v)}
        />
        <p className="text-xs text-slate-500">
          Adds small chamfer where feet meet box walls to prevent printing overhangs.
        </p>
      </CollapsibleSection>

      {/* Feet Options Section */}
      <CollapsibleSection title="Feet (Base)" icon="🦶">
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
        <SliderInput
          label="Feet Corner Radius"
          value={config.feetCornerRadius}
          min={0}
          max={5}
          step={0.25}
          unit="mm"
          onChange={(v) => update('feetCornerRadius', v)}
        />
        <p className="text-xs text-slate-500">
          Rounds the corners of the feet. Standard is 3.75mm.
        </p>
        
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-xs font-semibold text-slate-400 mb-3">FOOT CHAMFER</h4>
          <SliderInput
            label="Chamfer Angle"
            value={config.footChamferAngle}
            min={30}
            max={75}
            step={1}
            unit="°"
            onChange={(v) => update('footChamferAngle', v)}
          />
          <p className="text-xs text-slate-500">
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
          <p className="text-xs text-slate-500">
            Total height of the foot chamfer. Standard: 4.75mm.
          </p>
        </div>
      </CollapsibleSection>

      {/* Floor Section */}
      <CollapsibleSection title="Floor" icon="🏠">
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
        <p className="text-xs text-slate-500">
          Efficient floor reduces material by only printing under the walls.
        </p>
      </CollapsibleSection>

      {/* Magnets & Screws Section */}
      <CollapsibleSection title="Magnets & Screws" icon="🧲">
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

      {/* Lip Style Section */}
      <CollapsibleSection title="Lip Style" icon="🔝">
        <SelectInput
          label="Stacking Lip"
          value={config.lipStyle}
          options={[
            { value: 'standard', label: 'Standard (Full)' },
            { value: 'reduced', label: 'Reduced' },
            { value: 'minimum', label: 'Minimum' },
            { value: 'none', label: 'None (Non-stackable)' }
          ]}
          onChange={(v) => update('lipStyle', v as BoxConfig['lipStyle'])}
        />
        <p className="text-xs text-slate-500">
          Standard lip allows bins to stack. Reduced/minimum lips provide easier access.
        </p>
      </CollapsibleSection>

      {/* Finger Slide Section */}
      <CollapsibleSection title="Finger Slide" icon="👆">
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
      <CollapsibleSection title="Tapered Corners" icon="📐">
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
        <p className="text-xs text-slate-500">
          Tapered internal corners make it easier to grab items from the bin.
        </p>
      </CollapsibleSection>

      {/* Wall Pattern Section */}
      <CollapsibleSection title="Wall Pattern" icon="⬡">
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
        <p className="text-xs text-slate-500">
          Wall patterns reduce material usage and add visual interest.
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
      </CollapsibleSection>

      {/* Label Tab Section */}
      <CollapsibleSection title="Label Tab" icon="🏷️">
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

  return (
    <div className="p-4 space-y-3">
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
            <p className="text-xs text-slate-500">
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
            
            <div className="mt-3 pt-3 border-t border-slate-700">
              <h4 className="text-xs font-semibold text-slate-400 mb-2">FILL OPTIONS</h4>
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
              <div className="mt-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                <h4 className="text-xs font-semibold text-emerald-400 mb-2">CALCULATED GRID</h4>
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
        <p className="text-xs text-slate-500">
          Standard Gridfinity is 42mm. Must match your bins.
        </p>
      </CollapsibleSection>

      {/* Style Section */}
      <CollapsibleSection title="Plate Style" icon="🎨" defaultOpen>
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
        <p className="text-xs text-slate-500">
          Removing bottom taper creates flat socket bottoms for CNC/laser cutting.
        </p>
      </CollapsibleSection>

      {/* Magnets Section */}
      {(config.style === 'magnet' || config.style === 'default') && (
        <CollapsibleSection title="Magnets" icon="🧲">
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
          <p className="text-xs text-slate-500">
            Z Offset raises magnets for glue-in. Top Cover creates ceiling to capture magnets.
          </p>
        </CollapsibleSection>
      )}

      {/* Screws Section */}
      {(config.style === 'screw' || config.style === 'default') && (
        <CollapsibleSection title="Screw Holes" icon="🔩">
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
          <p className="text-xs text-slate-500">
            Center screw allows mounting baseplate to surface.
          </p>
        </CollapsibleSection>
      )}

      {/* Weight Cavity Section */}
      <CollapsibleSection title="Weight Cavity" icon="⚖️">
        <ToggleInput
          label="Enable Weight Cavity"
          value={config.weightCavity}
          onChange={(v) => update('weightCavity', v)}
        />
        <p className="text-xs text-slate-500">
          Creates hollow space to add weights (lead, steel balls) for stability.
        </p>
      </CollapsibleSection>

      {/* Corner Rounding Section */}
      <CollapsibleSection title="Corner Rounding" icon="⭕">
        <SliderInput
          label="Corner Radius"
          value={config.cornerRadius}
          min={0}
          max={5}
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
        <p className="text-xs text-slate-500">
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
        <p className="text-xs text-slate-500">
          When enabled, socket chamfer automatically matches foot chamfer for proper fit.
        </p>
        {!config.syncSocketWithFoot && (
          <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <p className="text-xs text-yellow-400">
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
          <p className="text-xs text-slate-500">
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
          <p className="text-xs text-slate-500">
            Should match foot chamfer height. Standard: 4.75mm.
          </p>
        </div>
      </CollapsibleSection>

      {/* Printer Bed Splitting Section */}
      <CollapsibleSection title="Printer Bed Splitting" icon="✂️">
        <ToggleInput
          label="Enable Splitting"
          value={config.enableSplitting}
          onChange={(v) => update('enableSplitting', v)}
        />
        <p className="text-xs text-slate-500">
          Split large baseplates into segments that fit on your printer bed. Segments connect with puzzle-piece connectors.
        </p>
        
        {config.enableSplitting && (
          <>
            <NumberInput
              label="Printer Bed Width"
              value={config.printerBedWidth}
              min={100}
              max={500}
              step={5}
              unit="mm"
              onChange={(v) => update('printerBedWidth', v)}
            />
            <NumberInput
              label="Printer Bed Depth"
              value={config.printerBedDepth}
              min={100}
              max={500}
              step={5}
              unit="mm"
              onChange={(v) => update('printerBedDepth', v)}
            />
            <SliderInput
              label="Connector Tolerance"
              value={config.connectorTolerance}
              min={0.1}
              max={0.5}
              step={0.05}
              unit="mm"
              onChange={(v) => update('connectorTolerance', v)}
            />
            <p className="text-xs text-slate-500">
              Clearance between puzzle connectors. Lower = tighter fit. Default: 0.2mm.
            </p>
            
            {/* Splitting Preview */}
            {(() => {
              const widthUnits = config.sizingMode === 'fill_area_mm' 
                ? Math.floor(calculateGridFromMm(config.targetWidthMm, config.targetDepthMm, config.gridSize, config.allowHalfCellsX, config.allowHalfCellsY, config.paddingAlignment).gridUnitsX)
                : Math.floor(config.width);
              const depthUnits = config.sizingMode === 'fill_area_mm'
                ? Math.floor(calculateGridFromMm(config.targetWidthMm, config.targetDepthMm, config.gridSize, config.allowHalfCellsX, config.allowHalfCellsY, config.paddingAlignment).gridUnitsY)
                : Math.floor(config.depth);
              
              const splitting = calculateSplitting(
                widthUnits,
                depthUnits,
                config.gridSize,
                config.printerBedWidth,
                config.printerBedDepth
              );
              
              if (splitting.needsSplitting) {
                return (
                  <div className="mt-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <h4 className="text-xs font-semibold text-emerald-400 mb-2">SPLITTING PREVIEW</h4>
                    <div className="space-y-1 text-xs">
                      <p className="text-slate-300">
                        <span className="text-slate-500">Segments:</span>{' '}
                        <span className="font-mono text-emerald-300">
                          {splitting.segmentsX} × {splitting.segmentsY}
                        </span>{' '}
                        ({splitting.segments.length} total)
                      </p>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Largest segment:</span>{' '}
                        <span className="font-mono">
                          {Math.max(...splitting.segments.map(s => s.widthMm)).toFixed(0)}mm × {Math.max(...splitting.segments.map(s => s.depthMm)).toFixed(0)}mm
                        </span>
                      </p>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Connectors:</span>{' '}
                        <span className="text-emerald-300">
                          Puzzle-piece style (male/female tabs)
                        </span>
                      </p>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-400">
                      ✓ Baseplate fits on printer bed. No splitting needed.
                    </p>
                  </div>
                );
              }
            })()}
          </>
        )}
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  icon: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h3>
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-slate-700/50">
          {children}
        </div>
      )}
    </div>
  );
}
