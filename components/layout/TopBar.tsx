"use client";

import { Bell, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { useAuthStore } from "@/lib/store";
import { getInitials } from "@/lib/utils";

export function TopBar({ doctorName }: { doctorName?: string }) {
  const signOut = useAuthStore((s) => s.signOut);
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
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-6">
          <button className="text-text-secondary hover:text-text-primary transition-colors relative">
            <Bell size={24} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <Link href="/dashboard/settings" className="text-text-secondary hover:text-text-primary transition-colors">
            <Settings size={24} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-300 rounded-full flex items-center justify-center text-white font-semibold">
              {initials.slice(0, 2)}
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary">
                {displayName}
              </div>
              <div className="text-xs text-text-secondary">Online</div>
            </div>
          </div>
          <div className="border-l border-primary-200 pl-6">
            <button
              onClick={handleSignOut}
              className="text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-2"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
