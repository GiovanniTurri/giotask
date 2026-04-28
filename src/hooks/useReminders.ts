import { useEffect, useRef } from "react";
import { useTasks } from "./useTasks";
import { useUserSettings } from "./useUserSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    try {
      new Notification(title, { body, tag, icon: "/favicon.ico" });
      return;
    } catch {
      // fall through to toast
    }
  }
  toast(title, { description: body });
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

/**
 * Sync the server-side reminder_queue from the current tasks list.
 * Real notification delivery is handled by:
 *   1. The `send-due-reminders` edge function (cron, every minute)
 *   2. Web Push to the device's service worker — works even when the app is closed.
 */
export function useReminders() {
  const { data: tasks } = useTasks();
  const { data: settings } = useUserSettings();
  const lastSyncKeyRef = useRef<string>("");

  useEffect(() => {
    if (!tasks || !settings) return;

    const enabled = settings.notifications_enabled !== false;
    const defaultLead = settings.default_reminder_minutes ?? 10;

    type DesiredEntry = {
      task_id: string;
      fire_at: string;
      title: string;
      body: string;
      tag: string;
    };

    const desired: DesiredEntry[] = [];
    const now = Date.now();

    if (enabled) {
      for (const t of tasks) {
        if (t.status === "done") continue;
        if (!t.scheduled_date || !t.scheduled_start_time) continue;
        const lead = t.reminder_minutes ?? defaultLead;
        if (lead == null || lead < 0) continue;
        const start = new Date(`${t.scheduled_date}T${t.scheduled_start_time}`);
        if (isNaN(start.getTime())) continue;
        const fireAt = new Date(start.getTime() - lead * 60 * 1000);
        // Skip reminders too far in the past (>15 min)
        if (fireAt.getTime() < now - 15 * 60 * 1000) continue;

        const startStr = t.scheduled_start_time.slice(0, 5);
        desired.push({
          task_id: t.id,
          fire_at: fireAt.toISOString(),
          title: `⏰ ${t.title}`,
          body: lead > 0 ? `Starts at ${startStr} (in ${lead} min)` : `Starting now (${startStr})`,
          tag: t.id,
        });
      }
    }

    // Idempotency: only sync when the desired set changes
    const syncKey = JSON.stringify(
      desired.map((d) => `${d.task_id}|${d.fire_at}|${d.title}|${d.body}`).sort()
    );
    if (syncKey === lastSyncKeyRef.current) return;
    lastSyncKeyRef.current = syncKey;

    void (async () => {
      try {
        const taskIds = Array.from(new Set(tasks.map((t) => t.id)));

        // Load existing pending entries for these tasks
        const { data: existing, error: exErr } = await supabase
          .from("reminder_queue")
          .select("id,task_id,fire_at,title,body,tag,sent_at")
          .in("task_id", taskIds.length ? taskIds : ["00000000-0000-0000-0000-000000000000"])
          .is("sent_at", null);
        if (exErr) {
          console.warn("reminder_queue read failed", exErr);
          return;
        }

        const desiredKey = (d: { task_id: string; fire_at: string }) =>
          `${d.task_id}|${new Date(d.fire_at).toISOString()}`;
        const desiredMap = new Map(desired.map((d) => [desiredKey(d), d]));
        const existingMap = new Map(
          (existing ?? []).map((e) => [
            `${e.task_id}|${new Date(e.fire_at).toISOString()}`,
            e,
          ])
        );

        // Delete pending entries that are no longer desired
        const toDelete = (existing ?? []).filter(
          (e) => !desiredMap.has(`${e.task_id}|${new Date(e.fire_at).toISOString()}`)
        );
        if (toDelete.length > 0) {
          await supabase
            .from("reminder_queue")
            .delete()
            .in(
              "id",
              toDelete.map((e) => e.id)
            );
        }

        // Insert / update desired entries
        const toUpsert = desired.filter((d) => {
          const ex = existingMap.get(desiredKey(d));
          return !ex || ex.title !== d.title || ex.body !== d.body || ex.tag !== d.tag;
        });
        if (toUpsert.length > 0) {
          const { error: upErr } = await supabase
            .from("reminder_queue")
            .upsert(toUpsert, { onConflict: "task_id,fire_at" });
          if (upErr) console.warn("reminder_queue upsert failed", upErr);
        }
      } catch (err) {
        console.warn("Reminder sync failed", err);
      }
    })();
  }, [tasks, settings]);
}
