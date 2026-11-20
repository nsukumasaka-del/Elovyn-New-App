import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/store-api";

const warningSeconds = 60;
const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

export function useIdleTimeout() {
  const { pathname } = useLocation();
  const { user, signOut } = useStore();
  const [warningOpen, setWarningOpen] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const resetActivityRef = useRef<() => void>(() => undefined);

  const timeoutMs = pathname.startsWith("/admin") || user?.role === "admin"
    ? 15 * 60 * 1000
    : 30 * 60 * 1000;

  useEffect(() => {
    if (!user) {
      setWarningOpen(false);
      return;
    }

    let lastRecordedActivity = Date.now();
    let lastSessionRefresh = Date.now();
    let warningTimer = 0;
    let expiryTimer = 0;
    let disposed = false;

    const clearTimers = () => {
      window.clearTimeout(warningTimer);
      window.clearTimeout(expiryTimer);
    };
    const schedule = () => {
      clearTimers();
      const remaining = Math.max(0, timeoutMs - (Date.now() - lastActivityRef.current));
      warningTimer = window.setTimeout(() => setWarningOpen(true), Math.max(0, remaining - warningSeconds * 1000));
      expiryTimer = window.setTimeout(() => {
        if (disposed) return;
        void signOut("inactivity").catch((error: Error) => {
          toast.error(`Could not complete server sign-out: ${error.message}`);
        });
      }, remaining);
    };
    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      setWarningOpen(false);
      schedule();
    };
    const onActivity = () => {
      const now = Date.now();
      if (now - lastRecordedActivity < 1000) return;
      lastRecordedActivity = now;
      resetActivity();
      if (now - lastSessionRefresh >= 5 * 60 * 1000) {
        lastSessionRefresh = now;
        void apiRequest<{ user: typeof user }>("/auth/me")
          .then(({ user: sessionUser }) => {
            if (!sessionUser) {
              return signOut("inactivity").catch((error: Error) => {
                toast.error(`Could not complete server sign-out: ${error.message}`);
              });
            }
            return undefined;
          })
          .catch((error: Error) => toast.error(`Could not refresh your session: ${error.message}`));
      }
    };

    resetActivityRef.current = resetActivity;
    lastActivityRef.current = Date.now();
    schedule();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));
    return () => {
      disposed = true;
      clearTimers();
      resetActivityRef.current = () => undefined;
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, onActivity));
    };
  }, [signOut, timeoutMs, user?.id]);

  async function staySignedIn() {
    resetActivityRef.current();
    try {
      const { user: sessionUser } = await apiRequest<{ user: typeof user }>("/auth/me");
      if (!sessionUser) await signOut("inactivity");
    } catch (error) {
      toast.error(error instanceof Error ? `Could not refresh your session: ${error.message}` : "Could not refresh your session.");
    }
  }

  async function signOutNow() {
    try {
      await signOut();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setWarningOpen(false);
    }
  }

  return { warningOpen, staySignedIn, signOutNow };
}
