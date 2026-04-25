import { useEffect, useRef, useState } from "react";
import { useTasks } from "./useTasks";
import { useUserSettings } from "./useUserSettings";
import { toast } from "sonner";

const FIRED_KEY = "fired_reminders_v1";
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000; // 24h

function loadFired(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveFired(map: Record<string, number>) {
  // prune entries older than 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) if (v > cutoff) cleaned[k] = v;
  localStorage.setItem(FIRED_KEY, JSON.stringify(cleaned));
}

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ?? null;
  } catch {
    return null;
  }
}

export async function fireNotification(
  title: string,
  body: string,
  tag: string,
  data?: Record<string, unknown>
) {
  // Prefer the service worker — required for reliable Android notifications
  // and for installed iOS PWAs.
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    const reg = await getSwRegistration();
    if (reg && "showNotification" in reg) {
      try {
        await reg.showNotification(title, {
          body,
          tag,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          data: { url: "/", ...(data || {}) },
        });
        return;
      } catch (err) {
        console.warn("SW showNotification failed, falling back:", err);
      }
    }
    // Fallback: direct Notification (works on desktop browsers)
    try {
      new Notification(title, { body, tag, icon: "/favicon.ico" });
      return;
    } catch {
      // fall through to toast
    }
  }
  // Final fallback: in-app toast (works only while page is open)
  toast(title, { description: body });
}

export function useReminders() {
  const { data: tasks } = useTasks();
  const { data: settings } = useUserSettings();
  const timersRef = useRef<number[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // clear any prior timers
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    if (!tasks || !settings?.notifications_enabled) return;

    const fired = loadFired();
    const now = Date.now();
    const defaultLead = settings.default_reminder_minutes ?? 10;

    for (const t of tasks) {
      if (t.status === "done") continue;
      if (!t.scheduled_date || !t.scheduled_start_time) continue;

      const lead = t.reminder_minutes ?? defaultLead;
      if (lead == null || lead < 0) continue;

      const start = new Date(`${t.scheduled_date}T${t.scheduled_start_time}`);
      if (isNaN(start.getTime())) continue;

      const fireAt = start.getTime() - lead * 60 * 1000;
      const delay = fireAt - now;

      // Skip past reminders or those further out than lookahead
      if (delay < -60 * 1000 || delay > LOOKAHEAD_MS) continue;

      const fireKey = `${t.id}:${start.getTime()}:${lead}`;
      if (fired[fireKey]) continue;

      const timer = window.setTimeout(() => {
        const startStr = t.scheduled_start_time?.slice(0, 5) ?? "";
        const inMin = Math.max(0, Math.round((start.getTime() - Date.now()) / 60000));
        void fireNotification(
          `⏰ ${t.title}`,
          inMin > 0 ? `Starts at ${startStr} (in ${inMin} min)` : `Starting now (${startStr})`,
          t.id
        );
        const updated = loadFired();
        updated[fireKey] = Date.now();
        saveFired(updated);
      }, Math.max(0, delay));

      timersRef.current.push(timer);
    }

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [tasks, settings, tick]);

  // Re-evaluate timers periodically and when the tab regains focus,
  // so reminders past the 24h lookahead window get scheduled in time
  // and devices waking from sleep recompute delays.
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const interval = window.setInterval(bump, 15 * 60 * 1000); // 15 min
    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", bump);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", bump);
    };
  }, []);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}
