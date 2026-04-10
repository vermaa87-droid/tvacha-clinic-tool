"use client";

interface CheckboxPillsProps {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
}

export function CheckboxPills({ options, values, onChange, error }: CheckboxPillsProps) {
  const toggle = (v: string) => {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = values.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[44px]"
              style={
                selected
                  ? { background: "#b8936a", borderColor: "#b8936a", color: "#fff" }
                  : { background: "#fff", borderColor: "#b8936a", color: "#b8936a" }
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
