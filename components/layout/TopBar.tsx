"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Menu, Stethoscope, CheckCircle2 } from "lucide-react";
import { Logo } from "./Logo";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLanguage } from "@/lib/language-context";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getInitials } from "@/lib/utils";
import { useMutationQueue } from "@/lib/mutation-queue";
import Link from "next/link";

interface Notification {
  id: string;
  patientName: string;
  createdAt: string;
}

export function TopBar({
  doctorName,
  onMenuToggle,
}: {
  doctorName?: string;
  onMenuToggle?: () => void;
}) {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const mutationProcessing = useMutationQueue((s) => s.processing);
  const name = doctorName || "Doctor";
  const initials = getInitials(name);
  const displayName = name.startsWith("Dr.") ? name : `Dr. ${name.split(" ")[0]}`;

  // Fetch pending-diagnosis patients as notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("patients")
      .select("id, name, created_at")
      .eq("linked_doctor_id", user.id)
      .eq("treatment_status", "pending_diagnosis")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[topbar] notifications fetch error:", error);
      return;
    }
    setNotifications(
      (data ?? []).map((p) => ({
        id: p.id,
        patientName: p.name,
        createdAt: p.created_at,
      }))
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const onFocus = () => fetchNotifications();
    window.addEventListener("focus", onFocus);

    const channel = supabase
      .channel("topbar-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "patients",
          filter: `linked_doctor_id=eq.${user.id}`,
        },
        fetchNotifications
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const hasNotifications = notifications.length > 0;

  return (
    <div className="bg-primary-50 border-b border-primary-200 sticky top-0 z-40">
      <div className="px-3 sm:px-4 md:px-8 py-2 md:py-4 flex items-center justify-between min-w-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-text-primary md:hidden"
          >
            <Menu size={24} />
          </button>
          <Logo />
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:block"><LanguageToggle /></div>
          <ThemeToggle />

          {/* Background sync indicator */}
          {mutationProcessing && (
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" title="Syncing..." />
          )}

          {/* Notification bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => { setOpen((prev) => !prev); fetchNotifications(); }}
              className="text-text-secondary hover:text-text-primary transition-colors relative"
            >
              <Bell size={20} className="md:w-6 md:h-6" />
              {hasNotifications && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Dropdown */}
            {open && (
              <div
                className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 rounded-xl border shadow-lg overflow-hidden"
                style={{
                  background: "var(--dropdown-bg)",
                  borderColor: "var(--dropdown-border)",
                  boxShadow: "var(--dropdown-shadow)",
                }}
              >
                {/* Header */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid var(--color-separator)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Notifications
                  </span>
                  {hasNotifications && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(184,147,106,0.18)", color: "var(--sidebar-active-color)" }}
                    >
                      {notifications.length}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="max-h-80 overflow-y-auto">
                  {hasNotifications ? (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href="/dashboard/ready-for-diagnosis"
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-primary-100/50 transition-colors"
                        style={{ borderBottom: "1px solid var(--color-separator)" }}
                      >
                        <div
                          className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(184,147,106,0.15)" }}
                        >
                          <Stethoscope size={16} style={{ color: "var(--sidebar-active-color)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                            New patient ready for diagnosis
                          </p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-secondary)" }}>
                            {n.patientName}
                          </p>
                        </div>
                        <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                          {formatTime(n.createdAt)}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-10 text-center">
                      <CheckCircle2
                        size={32}
                        className="mx-auto mb-3"
                        style={{ color: "#b8936a" }}
                      />
                      <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                        You&apos;re all caught up!
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                        No pending patients at the moment.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer — only when there are notifications */}
                {hasNotifications && (
                  <Link
                    href="/dashboard/ready-for-diagnosis"
                    onClick={() => setOpen(false)}
                    className="block text-center text-sm font-medium py-2.5 hover:bg-primary-100/50 transition-colors"
                    style={{
                      color: "var(--sidebar-active-color)",
                      borderTop: "1px solid var(--color-separator)",
                    }}
                  >
                    View all pending patients
                  </Link>
                )}
              </div>
            )}
          </div>

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
