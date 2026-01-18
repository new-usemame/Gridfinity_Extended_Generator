interface NumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function NumberInput({ label, value, min, max, step, unit, onChange }: NumberInputProps) {
  const handleChange = (newValue: number) => {
    const clampedValue = Math.min(max, Math.max(min, newValue));
    onChange(clampedValue);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-400">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleChange(value - step)}
          disabled={value <= min}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        
        <div className="flex-1 relative">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => handleChange(parseFloat(e.target.value) || min)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center text-white font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
              {unit}
            </span>
          )}
        </div>
        
        <button
          type="button"
          onClick={() => handleChange(value + step)}
          disabled={value >= max}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
