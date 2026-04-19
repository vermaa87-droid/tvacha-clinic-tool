"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuthStore } from "@/lib/store";
import { useDataCache } from "@/lib/data-cache";
import { VerificationPending } from "@/components/VerificationPending";
import { RefreshProvider } from "@/lib/RefreshContext";
import { ToastProvider } from "@/components/ui/Toast";
import { PWAInstallBanner } from "@/components/dashboard/PWAInstallBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, doctor, loading, initialized } = useAuthStore();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const prefetchAll = useDataCache((s) => s.prefetchAll);

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.push("/login");
    }
  }, [initialized, loading, user, router]);

  useEffect(() => {
    if (user) {
      prefetchAll(user.id);
    }
  }, [user, prefetchAll]);

  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (doctor && !doctor.is_verified) {
    return <VerificationPending doctor={doctor} />;
  }

  return (
    <div className="flex h-screen bg-primary-50 overflow-x-hidden">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col md:ml-64 min-w-0 overflow-x-hidden">
        <PWAInstallBanner />
        <TopBar
          doctorName={doctor?.full_name}
          onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
        />
        <div className="flex-1 overflow-y-auto overflow-x-clip">
          <div className="w-full max-w-full px-3 sm:px-4 md:px-8 py-3 md:py-8">
            <RefreshProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </RefreshProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
