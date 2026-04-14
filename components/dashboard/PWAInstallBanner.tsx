"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

const DISMISSED_KEY = "tvacha-pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PWAInstallBanner() {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    if (dismissed) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full border-b"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-separator)",
          }}
          role="region"
          aria-label="Install app"
        >
          <div className="w-full max-w-full px-3 sm:px-4 md:px-8 py-2.5 flex items-center gap-3">
            <div
              className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(184,147,106,0.12)" }}
            >
              <Download className="w-4 h-4" style={{ color: "#b8936a" }} />
            </div>
            <p
              className="flex-1 text-sm leading-snug"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t("pwa_install_message")}
            </p>
            <button
              onClick={handleInstall}
              className="flex-shrink-0 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#b8936a" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#a6825d")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#b8936a")}
            >
              {t("pwa_install_button")}
            </button>
            <button
              onClick={handleDismiss}
              aria-label={t("pwa_install_dismiss")}
              className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "rgba(184,147,106,0.08)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
