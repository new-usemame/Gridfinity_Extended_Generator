interface ToggleInputProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleInput({ label, value, onChange }: ToggleInputProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600 dark:text-slate-400">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${
          value ? 'bg-green-600 dark:bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
