"use client";

import { Bell, Settings, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { getInitials } from "@/lib/utils";

export function TopBar({
  doctorName,
  onMenuToggle,
}: {
  doctorName?: string;
  onMenuToggle?: () => void;
}) {
  const signOut = useAuthStore((s) => s.signOut);
  const { t } = useLanguage();
  const router = useRouter();

  const name = doctorName || "Doctor";
  const initials = getInitials(name);
  const displayName = name.startsWith("Dr.") ? name : `Dr. ${name.split(" ")[0]}`;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

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
          <Link
            href="/dashboard/settings"
            className="text-text-secondary hover:text-text-primary transition-colors hidden md:block"
          >
            <Settings size={24} />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-300 rounded-full flex items-center justify-center text-white font-semibold text-xs md:text-sm">
              {initials.slice(0, 2)}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-text-primary">{displayName}</div>
              <div className="text-xs text-text-secondary">{t("topbar_online")}</div>
            </div>
          </div>
          <div className="border-l border-primary-200 pl-3 md:pl-4 hidden sm:block">
            <button
              onClick={handleSignOut}
              className="text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-2"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium hidden md:inline">{t("topbar_signout")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
