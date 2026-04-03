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

const _svgPattern = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="400" viewBox="0 0 220 400"><defs><pattern id="g" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M10 0 L20 10 L10 20 L0 10 Z" fill="none" stroke="rgba(140,100,45,0.06)" stroke-width="0.3"/><circle cx="10" cy="10" r="0.7" fill="rgba(140,100,45,0.07)"/><circle cx="0" cy="0" r="0.7" fill="rgba(140,100,45,0.07)"/><circle cx="20" cy="0" r="0.7" fill="rgba(140,100,45,0.07)"/><circle cx="0" cy="20" r="0.7" fill="rgba(140,100,45,0.07)"/><circle cx="20" cy="20" r="0.7" fill="rgba(140,100,45,0.07)"/></pattern></defs><rect width="220" height="400" fill="url(#g)"/><path d="M12 0 Q18 25 12 50 Q6 75 12 100 Q18 125 12 150 Q6 175 12 200 Q18 225 12 250 Q6 275 12 300 Q18 325 12 350 Q6 375 12 400" fill="none" stroke="rgba(140,100,45,0.12)" stroke-width="1"/><ellipse cx="12" cy="50" rx="3.5" ry="6" transform="rotate(20 12 50)" fill="rgba(140,100,45,0.08)" stroke="rgba(140,100,45,0.12)" stroke-width="0.5"/><ellipse cx="12" cy="150" rx="3.5" ry="6" transform="rotate(-20 12 150)" fill="rgba(140,100,45,0.08)" stroke="rgba(140,100,45,0.12)" stroke-width="0.5"/><ellipse cx="12" cy="250" rx="3.5" ry="6" transform="rotate(20 12 250)" fill="rgba(140,100,45,0.08)" stroke="rgba(140,100,45,0.12)" stroke-width="0.5"/><ellipse cx="12" cy="350" rx="3.5" ry="6" transform="rotate(-20 12 350)" fill="rgba(140,100,45,0.08)" stroke="rgba(140,100,45,0.12)" stroke-width="0.5"/><circle cx="12" cy="0" r="1.5" fill="rgba(140,100,45,0.11)"/><circle cx="12" cy="100" r="1.5" fill="rgba(140,100,45,0.11)"/><circle cx="12" cy="200" r="1.5" fill="rgba(140,100,45,0.11)"/><circle cx="12" cy="300" r="1.5" fill="rgba(140,100,45,0.11)"/><circle cx="12" cy="400" r="1.5" fill="rgba(140,100,45,0.11)"/><path d="M208 0 Q202 25 208 50 Q214 75 208 100 Q202 125 208 150 Q214 175 208 200 Q202 225 208 250 Q214 275 208 300 Q202 325 208 350 Q214 375 208 400" fill="none" stroke="rgba(140,100,45,0.12)" stroke-width="1"/><ellipse cx="208" cy="50" rx="3.5" ry="6" transform="rotate(-20 208 50)" fill="rgba(140,100,45,0.08)" stroke="rgba(140,100,45,0.12)" stroke-width="0.5"/><ellipse cx="208" cy="150" rx="3.5" ry="6" transform="rotate(20 208 150)" fill="rgba(140,100,45,0.08)" stroke="rgba(140,100,45,0.12)" stroke-width="0.5"/><ellipse cx="208" cy="250" rx="3.5" ry="6" transform="rotate(-20 208 250)" fill="rgba(140,100,45,0.08)" stroke="rgba(140,100,45,0.12)" stroke-width="0.5"/><ellipse cx="208" cy="350" rx="3.5" ry="6" transform="rotate(20 208 350)" fill="rgba(140,100,45,0.08)" stroke="rgba(140,100,45,0.12)" stroke-width="0.5"/><circle cx="208" cy="0" r="1.5" fill="rgba(140,100,45,0.11)"/><circle cx="208" cy="100" r="1.5" fill="rgba(140,100,45,0.11)"/><circle cx="208" cy="200" r="1.5" fill="rgba(140,100,45,0.11)"/><circle cx="208" cy="300" r="1.5" fill="rgba(140,100,45,0.11)"/><circle cx="208" cy="400" r="1.5" fill="rgba(140,100,45,0.11)"/><path d="M68 0 C95 133 38 267 68 400" fill="none" stroke="rgba(140,100,45,0.14)" stroke-width="1.2" stroke-linecap="round"/><path d="M152 0 C125 133 182 267 152 400" fill="none" stroke="rgba(140,100,45,0.14)" stroke-width="1.2" stroke-linecap="round"/><path d="M74 40 Q83 31 79 21" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M75 80 Q64 71 60 61" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M74 120 Q83 111 80 101" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M71 160 Q60 151 57 141" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M63 240 Q52 231 55 221" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M60 280 Q69 271 66 261" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M59 320 Q48 311 51 301" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M61 360 Q70 351 67 341" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M146 40 Q137 31 141 21" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M145 80 Q156 71 160 61" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M146 120 Q137 111 140 101" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M149 160 Q160 151 163 141" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M157 240 Q168 231 165 221" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M160 280 Q151 271 154 261" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M161 320 Q172 311 169 301" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M159 360 Q150 351 153 341" fill="none" stroke="rgba(140,100,45,0.09)" stroke-width="0.5" stroke-linecap="round"/><path d="M74 40 Q84 30 91 36 Q84 46 74 40Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M75 80 Q62 70 56 76 Q62 86 75 80Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M74 120 Q84 110 91 116 Q84 126 74 120Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M71 160 Q58 150 52 156 Q58 166 71 160Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M63 240 Q50 230 44 236 Q50 246 63 240Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M60 280 Q70 270 77 276 Q70 286 60 280Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M59 320 Q46 310 40 316 Q46 326 59 320Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M61 360 Q71 350 78 356 Q71 366 61 360Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M146 40 Q136 30 129 36 Q136 46 146 40Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M145 80 Q158 70 164 76 Q158 86 145 80Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M146 120 Q136 110 129 116 Q136 126 146 120Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M149 160 Q162 150 168 156 Q162 166 149 160Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M157 240 Q170 230 176 236 Q170 246 157 240Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M160 280 Q150 270 143 276 Q150 286 160 280Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M161 320 Q174 310 180 316 Q174 326 161 320Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><path d="M159 360 Q149 350 142 356 Q149 366 159 360Z" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.14)" stroke-width="0.5"/><ellipse cx="110" cy="44" rx="3" ry="5.5" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><ellipse cx="110" cy="44" rx="3" ry="5.5" transform="rotate(90 110 50)" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><circle cx="110" cy="50" r="2" fill="rgba(140,100,45,0.13)"/><ellipse cx="85" cy="74" rx="2.5" ry="4.5" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><ellipse cx="85" cy="74" rx="2.5" ry="4.5" transform="rotate(90 85 80)" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><circle cx="85" cy="80" r="1.5" fill="rgba(140,100,45,0.13)"/><ellipse cx="135" cy="74" rx="2.5" ry="4.5" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><ellipse cx="135" cy="74" rx="2.5" ry="4.5" transform="rotate(90 135 80)" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><circle cx="135" cy="80" r="1.5" fill="rgba(140,100,45,0.13)"/><ellipse cx="110" cy="104" rx="2.5" ry="4.5" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><ellipse cx="110" cy="104" rx="2.5" ry="4.5" transform="rotate(90 110 110)" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><circle cx="110" cy="110" r="1.5" fill="rgba(140,100,45,0.13)"/><line x1="110" y1="56" x2="85" y2="74" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><line x1="110" y1="56" x2="135" y2="74" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><line x1="85" y1="86" x2="110" y2="104" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><line x1="135" y1="86" x2="110" y2="104" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><line x1="85" y1="80" x2="68" y2="80" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><line x1="135" y1="80" x2="152" y2="80" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><ellipse cx="110" cy="284" rx="2.5" ry="4.5" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><ellipse cx="110" cy="284" rx="2.5" ry="4.5" transform="rotate(90 110 290)" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><circle cx="110" cy="290" r="1.5" fill="rgba(140,100,45,0.13)"/><ellipse cx="85" cy="314" rx="2.5" ry="4.5" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><ellipse cx="85" cy="314" rx="2.5" ry="4.5" transform="rotate(90 85 320)" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><circle cx="85" cy="320" r="1.5" fill="rgba(140,100,45,0.13)"/><ellipse cx="135" cy="314" rx="2.5" ry="4.5" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><ellipse cx="135" cy="314" rx="2.5" ry="4.5" transform="rotate(90 135 320)" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><circle cx="135" cy="320" r="1.5" fill="rgba(140,100,45,0.13)"/><ellipse cx="110" cy="344" rx="3" ry="5.5" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><ellipse cx="110" cy="344" rx="3" ry="5.5" transform="rotate(90 110 350)" fill="rgba(140,100,45,0.09)" stroke="rgba(140,100,45,0.12)" stroke-width="0.4"/><circle cx="110" cy="350" r="2" fill="rgba(140,100,45,0.13)"/><line x1="110" y1="296" x2="85" y2="314" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><line x1="110" y1="296" x2="135" y2="314" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><line x1="85" y1="326" x2="110" y2="344" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><line x1="135" y1="326" x2="110" y2="344" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><line x1="85" y1="320" x2="68" y2="320" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><line x1="135" y1="320" x2="152" y2="320" stroke="rgba(140,100,45,0.07)" stroke-width="0.3"/><circle cx="50" cy="30" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="170" cy="30" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="38" cy="65" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="182" cy="65" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="30" cy="110" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="190" cy="110" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="35" cy="145" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="185" cy="145" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="30" cy="200" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="190" cy="200" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="35" cy="255" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="185" cy="255" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="30" cy="290" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="190" cy="290" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="38" cy="335" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="182" cy="335" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="50" cy="370" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="170" cy="370" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="95" cy="135" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="125" cy="135" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="95" cy="265" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="125" cy="265" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="110" cy="140" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="110" cy="260" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="55" cy="200" r="0.8" fill="rgba(140,100,45,0.08)"/><circle cx="165" cy="200" r="0.8" fill="rgba(140,100,45,0.08)"/></svg>`;
const FLORAL_BG = `url("data:image/svg+xml,${encodeURIComponent(_svgPattern)}")`;

const sidebarStyle: React.CSSProperties = {
  backgroundImage: `${FLORAL_BG}, linear-gradient(180deg, #e8d9b8 0%, #dfd0a8 50%, #d9c89a 100%)`,
  backgroundRepeat: "repeat-y, no-repeat",
  backgroundSize: "100% auto, 100% 100%",
  backgroundPosition: "center, center",
  borderRight: "1px solid rgba(184, 147, 106, 0.40)",
  boxShadow: "inset 0 2px 8px rgba(184, 147, 106, 0.12)",
};

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
          "w-64 min-h-screen fixed left-0 top-0 pt-24 flex flex-col z-50 transition-transform duration-300 overflow-hidden",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={sidebarStyle}
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
                        ? "text-primary-700"
                        : "hover:bg-primary-100 hover:text-text-primary"
                    )}
                    style={
                      isActive
                        ? { background: "rgba(184, 147, 106, 0.25)", color: "#6b4a1e", fontWeight: 700 }
                        : { color: "#5c3d18" }
                    }
                  >
                    <Icon size={20} />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className="px-4 py-6"
          style={{ borderTop: "1px solid rgba(184, 147, 106, 0.15)" }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium"
            style={{ color: "#5c3d18" }}
          >
            <LogOut size={20} />
            <span>{t("dash_sidebar_logout")}</span>
          </button>
        </div>
      </div>
    </>
  );
}
