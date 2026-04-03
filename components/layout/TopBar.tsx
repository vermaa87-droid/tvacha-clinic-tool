"use client";

import { Bell, Menu } from "lucide-react";
import { Logo } from "./Logo";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/lib/language-context";
import { getInitials } from "@/lib/utils";

export function TopBar({
  doctorName,
  onMenuToggle,
}: {
  doctorName?: string;
  onMenuToggle?: () => void;
}) {
  const { t } = useLanguage();

  const name = doctorName || "Doctor";
  const initials = getInitials(name);
  const displayName = name.startsWith("Dr.") ? name : `Dr. ${name.split(" ")[0]}`;

  return (
    <div className="bg-primary-50 border-b border-primary-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 text-text-secondary hover:text-text-primary md:hidden"
          >
            <Menu size={24} />
          </button>
          <Logo />
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <LanguageToggle />
          <button className="text-text-secondary hover:text-text-primary transition-colors relative">
            <Bell size={20} className="md:w-6 md:h-6" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-300 rounded-full flex items-center justify-center text-white font-semibold text-xs md:text-sm">
              {initials.slice(0, 2)}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-text-primary">{displayName}</div>
              <div className="text-xs text-text-secondary">{t("topbar_online")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
