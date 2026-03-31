"use client";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        viewBox="0 0 44 50"
        fill="none"
        className="w-8 h-8 text-primary-500"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M22 28 L22 48"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M10 6 L10 24 Q10 30 22 30 Q34 30 34 24 L34 6"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M4 6 L40 6"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <div>
        <div className="font-serif font-bold text-lg text-text-primary">
          Tvacha
          <span className="ml-1 text-primary-500">Clinic</span>
        </div>
        <div className="text-xs font-semibold text-text-secondary tracking-widest">
          INTELLIGENCE INFRASTRUCTURE
        </div>
      </div>
    </div>
  );
}
