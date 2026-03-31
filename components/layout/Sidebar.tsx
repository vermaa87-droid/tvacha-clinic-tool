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

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Clinic Register", href: "/dashboard/register", icon: Table2 },
  { label: "My Patients", href: "/dashboard/patients", icon: Users },
  { label: "Prescriptions", href: "/dashboard/prescriptions", icon: Pill },
  { label: "Appointments", href: "/dashboard/appointments", icon: Calendar },
  { label: "Clinic Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Cases", href: "/dashboard/cases", icon: FileText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const handleNavClick = () => {
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "w-64 bg-primary-50 border-r border-primary-200 min-h-screen fixed left-0 top-0 pt-24 flex flex-col z-50 transition-transform duration-300",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Mobile close button */}
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
                    <span>{item.label}</span>
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
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
