"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Table2,
  Users,
  Pill,
  Calendar,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";

export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const { t } = useLanguage();

  const navItems = [
    { labelKey: "dash_sidebar_dashboard" as const, href: "/dashboard", icon: Home },
    { labelKey: "dash_sidebar_register" as const, href: "/dashboard/register", icon: Table2 },
    { labelKey: "dash_sidebar_patients" as const, href: "/dashboard/patients", icon: Users },
    { labelKey: "dash_sidebar_prescriptions" as const, href: "/dashboard/prescriptions", icon: Pill },
    { labelKey: "dash_sidebar_appointments" as const, href: "/dashboard/appointments", icon: Calendar },
    { labelKey: "dash_sidebar_analytics" as const, href: "/dashboard/analytics", icon: BarChart3 },
    { labelKey: "dash_sidebar_cases" as const, href: "/dashboard/cases", icon: FileText },
    { labelKey: "dash_sidebar_settings" as const, href: "/dashboard/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const handleNavClick = () => {
    onMobileClose?.();
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} />
      )}

      <div
        className={cn(
          "w-64 bg-primary-50 border-r border-primary-200 min-h-screen fixed left-0 top-0 pt-24 flex flex-col z-50 transition-transform duration-300",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary md:hidden"
        >
          <X size={20} />
        </button>

        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
                (item.href === "/dashboard" && pathname === "/dashboard");

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium",
                      isActive
                        ? "bg-primary-200 text-primary-700"
                        : "text-text-secondary hover:bg-primary-100 hover:text-text-primary"
                    )}
                  >
                    <Icon size={20} />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-4 py-6 border-t border-primary-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium"
          >
            <LogOut size={20} />
            <span>{t("dash_sidebar_logout")}</span>
          </button>
        </div>
      </div>
    </>
  );
}
