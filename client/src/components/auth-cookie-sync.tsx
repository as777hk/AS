"use client";
import { useEffect } from "react";
import { authClient, syncAuthCookie } from "@/lib/auth-client";
export function AuthCookieSync() {
  const { data: session } = authClient.useSession();
  useEffect(() => {
    if (!session?.user?.id) return;
    const refresh = () => {
      if (document.visibilityState === "visible") syncAuthCookie().catch(() => undefined);
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = window.setInterval(refresh, 10 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(interval);
    };
  }, [session?.user?.id]);
  return null;
}
