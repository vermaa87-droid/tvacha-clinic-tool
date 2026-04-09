"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Logo() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const inner = (
    <>
      <svg
        viewBox="18 -2 64 102"
        fill="none"
        className="w-7 h-7 md:w-10 md:h-10 text-primary-500"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Drop outline */}
        <path d="M50 0 Q22 44 22 62 Q22 90 50 96 Q78 90 78 62 Q78 44 50 0 Z" stroke="currentColor" strokeWidth="3" fill="none"/>
        <path d="M50 0 Q22 44 22 62 Q22 90 50 96 Q78 90 78 62 Q78 44 50 0 Z" fill="currentColor" opacity="0.07"/>
        <ellipse cx="39" cy="20" rx="5" ry="8" fill="currentColor" opacity="0.1" transform="rotate(-18 39 20)"/>
        {/* Back helix strand */}
        <path d="M63 20 C63 20, 56 24, 50 32 S37 44, 50 50 S63 56, 50 64 S37 72, 50 82" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
        {/* Base pair rungs */}
        <line x1="41" y1="25" x2="59" y2="25" stroke="currentColor" strokeWidth="1.2" opacity="0.55"/>
        <line x1="45" y1="29" x2="55" y2="29" stroke="currentColor" strokeWidth="1.1" opacity="0.5"/>
        <line x1="44" y1="36" x2="56" y2="36" stroke="currentColor" strokeWidth="1.2" opacity="0.55"/>
        <line x1="40" y1="40" x2="60" y2="40" stroke="currentColor" strokeWidth="1.2" opacity="0.55"/>
        <line x1="38" y1="44" x2="62" y2="44" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
        <line x1="42" y1="47" x2="58" y2="47" stroke="currentColor" strokeWidth="1.1" opacity="0.5"/>
        <line x1="43" y1="53" x2="57" y2="53" stroke="currentColor" strokeWidth="1.1" opacity="0.5"/>
        <line x1="39" y1="57" x2="61" y2="57" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
        <line x1="43" y1="61" x2="57" y2="61" stroke="currentColor" strokeWidth="1.1" opacity="0.45"/>
        <line x1="44" y1="67" x2="56" y2="67" stroke="currentColor" strokeWidth="1" opacity="0.45"/>
        <line x1="42" y1="71" x2="58" y2="71" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
        <line x1="44" y1="75" x2="56" y2="75" stroke="currentColor" strokeWidth="1" opacity="0.35"/>
        <line x1="47" y1="79" x2="53" y2="79" stroke="currentColor" strokeWidth="0.9" opacity="0.3"/>
        {/* Front helix strand */}
        <path d="M37 20 C37 20, 44 24, 50 32 S63 44, 50 50 S37 56, 50 64 S63 72, 50 82" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
        {/* Crossing dots */}
        <circle cx="50" cy="32" r="2.2" fill="currentColor" opacity="0.7"/>
        <circle cx="50" cy="50" r="2.2" fill="currentColor" opacity="0.65"/>
        <circle cx="50" cy="64" r="2" fill="currentColor" opacity="0.55"/>
        <circle cx="50" cy="82" r="1.8" fill="currentColor" opacity="0.45"/>
      </svg>
      <div>
        <div className="font-serif font-bold text-base md:text-lg text-text-primary">
          Tvacha
          <span className="ml-1 text-primary-500">Clinic</span>
        </div>
        <div className="text-xs font-semibold text-text-secondary tracking-widest hidden md:block">
          INTELLIGENCE INFRASTRUCTURE
        </div>
      </div>
    </>
  );

  if (isDashboard) {
    return <div className="flex items-center gap-2">{inner}</div>;
  }

  if (isAuthPage) {
    return <div className="flex items-center gap-2">{inner}</div>;
  }

  return (
    <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
      {inner}
    </Link>
  );
}
