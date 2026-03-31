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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="w-64 bg-primary-50 border-r border-primary-200 min-h-screen fixed left-0 top-0 pt-24 flex flex-col">
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
  );
}
