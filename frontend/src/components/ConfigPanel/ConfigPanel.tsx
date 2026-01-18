import { BoxConfig, BaseplateConfig } from '../../types/config';
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
    <div className="p-4 space-y-6">
      {/* Dimensions Section */}
      <Section title="Dimensions" icon="📐">
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
      </Section>

      {/* Wall Settings Section */}
      <Section title="Wall & Floor" icon="🧱">
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
      </Section>

      {/* Magnets Section */}
      <Section title="Magnets" icon="🧲">
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
              step={0.5}
              unit="mm"
              onChange={(v) => update('magnetDiameter', v)}
            />
            <NumberInput
              label="Magnet Depth"
              value={config.magnetDepth}
              min={1}
              max={5}
              step={0.5}
              unit="mm"
              onChange={(v) => update('magnetDepth', v)}
            />
          </>
        )}
      </Section>

      {/* Screws Section */}
      <Section title="Screw Holes" icon="🔩">
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
      </Section>

      {/* Features Section */}
      <Section title="Features" icon="✨">
        <ToggleInput
          label="Finger Slide"
          value={config.fingerSlide}
          onChange={(v) => update('fingerSlide', v)}
        />
        {config.fingerSlide && (
          <SelectInput
            label="Slide Position"
            value={config.fingerSlidePosition}
            options={[
              { value: 'front', label: 'Front' },
              { value: 'back', label: 'Back' },
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' }
            ]}
            onChange={(v) => update('fingerSlidePosition', v as BoxConfig['fingerSlidePosition'])}
          />
        )}
        
        <ToggleInput
          label="Label Tab"
          value={config.labelEnabled}
          onChange={(v) => update('labelEnabled', v)}
        />
        {config.labelEnabled && (
          <>
            <SelectInput
              label="Label Position"
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
      </Section>

      {/* Dividers Section */}
      <Section title="Dividers" icon="▦">
        <NumberInput
          label="Dividers X"
          value={config.dividersX}
          min={0}
          max={10}
          step={1}
          onChange={(v) => update('dividersX', v)}
        />
        <NumberInput
          label="Dividers Y"
          value={config.dividersY}
          min={0}
          max={10}
          step={1}
          onChange={(v) => update('dividersY', v)}
        />
      </Section>

      {/* Style Section */}
      <Section title="Style" icon="🎨">
        <SelectInput
          label="Lip Style"
          value={config.lipStyle}
          options={[
            { value: 'none', label: 'None' },
            { value: 'standard', label: 'Standard' },
            { value: 'reduced', label: 'Reduced' }
          ]}
          onChange={(v) => update('lipStyle', v as BoxConfig['lipStyle'])}
        />
        <SelectInput
          label="Base Style"
          value={config.baseStyle}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'efficient', label: 'Efficient Floor' },
            { value: 'filled', label: 'Filled' }
          ]}
          onChange={(v) => update('baseStyle', v as BoxConfig['baseStyle'])}
        />
      </Section>

      {/* Corner & Base Section */}
      <Section title="Corner & Base" icon="⭕" highlight>
        <SliderInput
          label="Corner Radius"
          value={config.cornerRadius}
          min={0}
          max={5}
          step={0.25}
          unit="mm"
          onChange={(v) => update('cornerRadius', v)}
        />
        <p className="text-xs text-slate-500 mt-2">
          Rounded corners make printing easier and reduce sharp edges.
        </p>
        <SliderInput
          label="Base Chamfer"
          value={config.baseChamfer}
          min={0}
          max={2}
          step={0.1}
          unit="mm"
          onChange={(v) => update('baseChamfer', v)}
        />
        <p className="text-xs text-slate-500 mt-2">
          Tapers the bottom of the feet inward for easier insertion into baseplates.
        </p>
      </Section>
    </div>
  );
}

function BaseplateConfigPanel({ config, onChange }: { config: BaseplateConfig; onChange: (config: BaseplateConfig) => void }) {
  const update = <K extends keyof BaseplateConfig>(key: K, value: BaseplateConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Dimensions Section */}
      <Section title="Dimensions" icon="📐">
        <SliderInput
          label="Width"
          value={config.width}
          min={1}
          max={10}
          step={1}
          unit="units"
          onChange={(v) => update('width', v)}
        />
        <SliderInput
          label="Depth"
          value={config.depth}
          min={1}
          max={10}
          step={1}
          unit="units"
          onChange={(v) => update('depth', v)}
        />
      </Section>

      {/* Style Section */}
      <Section title="Style" icon="🎨">
        <SelectInput
          label="Baseplate Style"
          value={config.style}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'magnet', label: 'Magnet Holes' },
            { value: 'weighted', label: 'Weighted (Hollow)' },
            { value: 'screw', label: 'Screw Holes' }
          ]}
          onChange={(v) => update('style', v as BaseplateConfig['style'])}
        />
        <SelectInput
          label="Lid Option"
          value={config.lidOption}
          options={[
            { value: 'none', label: 'None' },
            { value: 'flat', label: 'Flat Lid' },
            { value: 'halfPitch', label: 'Half-Pitch Grid' }
          ]}
          onChange={(v) => update('lidOption', v as BaseplateConfig['lidOption'])}
        />
      </Section>

      {/* Magnet/Screw Configuration */}
      {(config.style === 'magnet' || config.style === 'screw') && (
        <Section title="Hardware" icon="🔧">
          {config.style === 'magnet' && (
            <>
              <NumberInput
                label="Magnet Diameter"
                value={config.magnetDiameter}
                min={3}
                max={10}
                step={0.5}
                unit="mm"
                onChange={(v) => update('magnetDiameter', v)}
              />
              <NumberInput
                label="Magnet Depth"
                value={config.magnetDepth}
                min={1}
                max={5}
                step={0.5}
                unit="mm"
                onChange={(v) => update('magnetDepth', v)}
              />
            </>
          )}
          {config.style === 'screw' && (
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
        </Section>
      )}

      {/* Corner Rounding Section - NEW FEATURE */}
      <Section title="Corner Rounding" icon="⭕" highlight>
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
        <p className="text-xs text-slate-500 mt-2">
          Rounded corners make printing easier and reduce sharp edges. Higher segments = smoother curves but larger file size.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, icon, children, highlight = false }: { title: string; icon: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-green-900/20 border border-green-500/30' : 'bg-slate-800/50 border border-slate-700/50'}`}>
      <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${highlight ? 'text-green-400' : 'text-slate-300'}`}>
        <span>{icon}</span>
        {title}
        {highlight && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">New</span>}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
