"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";

const RefreshContext = createContext<number>(0);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState === "visible") {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setTick((t) => t + 1);
        }
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return (
    <RefreshContext.Provider value={tick}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefreshTick() {
  return useContext(RefreshContext);
}
