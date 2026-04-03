"use client";

interface RadioPillsProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function RadioPills({ options, value, onChange, error }: RadioPillsProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[44px]"
            style={
              value === opt.value
                ? { background: "#b8936a", borderColor: "#b8936a", color: "#fff" }
                : { background: "#fff", borderColor: "#b8936a", color: "#b8936a" }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
