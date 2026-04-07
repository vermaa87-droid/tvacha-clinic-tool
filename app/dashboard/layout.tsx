"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuthStore } from "@/lib/store";
import { VerificationPending } from "@/components/VerificationPending";
import { RefreshProvider } from "@/lib/RefreshContext";
import { ToastProvider } from "@/components/ui/Toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, doctor, loading, initialized } = useAuthStore();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.push("/login");
    }
  }, [initialized, loading, user, router]);

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
    <div className="flex h-screen bg-primary-50">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col md:ml-64">
        <TopBar
          doctorName={doctor?.full_name}
          onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
        />
        <div className="flex-1 overflow-auto">
          <div className="w-full px-4 md:px-8 py-4 md:py-8">
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
