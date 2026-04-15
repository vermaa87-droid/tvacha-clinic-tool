"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  en,
  loadHindi,
  type EnTranslations,
  type Language,
  type TranslationKey,
} from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

/**
 * English lives in the initial client bundle so t() always has something
 * sensible to return. Hindi is dynamic-imported on first switch and cached
 * in state. Returning English as the fallback while Hindi is in-flight
 * keeps first paint visually stable (no flash-of-keys).
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [hiDict, setHiDict] = useState<EnTranslations | null>(null);

  // Restore saved preference once on mount. If the user last picked Hindi,
  // kick off the lazy import immediately so their switch is instant.
  useEffect(() => {
    const saved = localStorage.getItem("tvacha-lang") as Language | null;
    if (saved === "hi") {
      setLanguageState("hi");
      loadHindi().then(setHiDict);
    } else if (saved === "en") {
      setLanguageState("en");
    }
  }, []);

  // If the user switches to Hindi while the dict is missing, fetch it.
  useEffect(() => {
    if (language === "hi" && !hiDict) {
      loadHindi().then(setHiDict);
    }
  }, [language, hiDict]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("tvacha-lang", lang);
    } catch {
      /* private-mode / disabled storage */
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      if (language === "hi" && hiDict) return hiDict[key] ?? en[key] ?? key;
      return en[key] ?? key;
    },
    [language, hiDict]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
