// Translation entry point. The English dict is re-exported eagerly (so every
// route's first paint renders correctly) while Hindi is exposed only via a
// lazy loader — the language context dynamically imports ./i18n/hi the first
// time a user switches to Hindi, so the ~74 KB Hindi text never ships for
// English-only visitors.
//
// Consumers that only need the key type (`TranslationKey`) pay nothing at
// runtime, since `import type` is erased by the compiler.

import { en, type EnTranslations } from "./i18n/en";

export { en };
export type { EnTranslations };

export type Language = "en" | "hi";
export type TranslationKey = keyof EnTranslations;

export async function loadHindi(): Promise<EnTranslations> {
  const mod = await import("./i18n/hi");
  return mod.hi;
}
