import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushStatus = "unsupported" | "denied" | "unsubscribed" | "subscribed" | "loading";

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [endpoint, setEndpoint] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined";

  const refresh = useCallback(async () => {
    if (!supported) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setEndpoint(sub.endpoint);
        setStatus("subscribed");
      } else {
        setEndpoint(null);
        setStatus("unsubscribed");
      }
    } catch {
      setStatus("unsubscribed");
    }
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;

    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setStatus(perm === "denied" ? "denied" : "unsubscribed");
      return false;
    }

    const { data, error } = await supabase.functions.invoke("get-vapid-public-key");
    if (error || !data?.publicKey) {
      console.error("Failed to fetch VAPID public key", error);
      return false;
    }
    const appServerKey = urlBase64ToUint8Array(data.publicKey);

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
    }

    const json = sub.toJSON();
    const { error: subErr } = await supabase.functions.invoke("push-subscribe", {
      body: {
        subscription: {
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        },
        userAgent: navigator.userAgent,
      },
    });
    if (subErr) {
      console.error("push-subscribe failed", subErr);
      return false;
    }
    setEndpoint(sub.endpoint);
    setStatus("subscribed");
    return true;
  }, [supported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const ep = sub.endpoint;
      await sub.unsubscribe();
      await supabase.functions.invoke("push-unsubscribe", { body: { endpoint: ep } });
    }
    setEndpoint(null);
    setStatus("unsubscribed");
    return true;
  }, [supported]);

  return { status, endpoint, supported, subscribe, unsubscribe, refresh };
}
