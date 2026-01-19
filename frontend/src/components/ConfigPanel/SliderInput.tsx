interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function SliderInput({ label, value, min, max, step, unit, onChange }: SliderInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-sm text-slate-600 dark:text-slate-400">{label}</label>
        <span className="text-sm font-mono text-green-600 dark:text-green-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">
          {value.toFixed(step < 1 ? 2 : 0)}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
        title={`${label}: ${value.toFixed(step < 1 ? 2 : 0)}${unit ? ` ${unit}` : ''} (range: ${min}${unit ? ` ${unit}` : ''} - ${max}${unit ? ` ${unit}` : ''})`}
      />
    </div>
  );
}
