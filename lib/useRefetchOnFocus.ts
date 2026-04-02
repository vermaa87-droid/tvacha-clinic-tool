import { useEffect } from "react";

export function useRefetchOnFocus(refetchFn: () => void) {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        refetchFn();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refetchFn]);
}
