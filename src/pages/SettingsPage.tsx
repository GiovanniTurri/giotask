import { useState, useEffect } from "react";
import { useLlmConfig, useUpdateLlmConfig } from "@/hooks/useLlmConfig";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { requestNotificationPermission, fireNotification } from "@/hooks/useReminders";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Cloud, Monitor, Sparkles, Bell, BellOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { GoogleCalendarSettings } from "@/components/GoogleCalendarSettings";
import { PartnerProfileForm } from "@/components/PartnerProfileForm";
import { SecondBrainSettings } from "@/components/SecondBrainSettings";

export default function SettingsPage() {
  const { data: config, isLoading } = useLlmConfig();
  const updateConfig = useUpdateLlmConfig();

  const [form, setForm] = useState({
    active_provider: "lovable",
    cloud_api_endpoint: "",
    cloud_api_key: "",
    cloud_model: "",
    local_api_endpoint: "",
    local_model: "",
  });

  useEffect(() => {
    if (config) {
      setForm({
        active_provider: config.active_provider || "lovable",
        cloud_api_endpoint: config.cloud_api_endpoint || "",
        cloud_api_key: config.cloud_api_key || "",
        cloud_model: config.cloud_model || "",
        local_api_endpoint: config.local_api_endpoint || "",
        local_model: config.local_model || "",
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({ id: config.id, ...form });
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure AI provider and integrations</p>
      </div>

      {/* Google Calendar Integration */}
      <GoogleCalendarSettings />

      {/* Partner profile (used by Couple Life AI) */}
      <PartnerProfileForm />

      {/* Second brain (Obsidian import) */}
      <SecondBrainSettings />

      {/* Notifications */}
      <NotificationsCard />

      {/* Provider Selection */}
      <Card className="p-5 space-y-4">
        <Label className="text-sm font-semibold">Active AI Provider</Label>
        <Select value={form.active_provider} onValueChange={(v) => update("active_provider", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lovable">
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Lovable AI (Built-in)
              </span>
            </SelectItem>
            <SelectItem value="cloud">
              <span className="flex items-center gap-2">
                <Cloud className="h-3.5 w-3.5" /> Cloud LLM
              </span>
            </SelectItem>
            <SelectItem value="local">
              <span className="flex items-center gap-2">
                <Monitor className="h-3.5 w-3.5" /> Local LLM
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {form.active_provider === "lovable" && (
          <p className="text-xs text-muted-foreground">
            Uses the built-in AI gateway — no API key needed.
          </p>
        )}
      </Card>

      {/* Cloud LLM Config */}
      <Card className={`p-5 space-y-4 transition-opacity ${form.active_provider !== "cloud" ? "opacity-50" : ""}`}>
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold">Cloud LLM</Label>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">API Endpoint</Label>
            <Input
              value={form.cloud_api_endpoint}
              onChange={(e) => update("cloud_api_endpoint", e.target.value)}
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">API Key</Label>
            <Input
              type="password"
              value={form.cloud_api_key}
              onChange={(e) => update("cloud_api_key", e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Model</Label>
            <Input
              value={form.cloud_model}
              onChange={(e) => update("cloud_model", e.target.value)}
              placeholder="gpt-4"
            />
          </div>
        </div>
      </Card>

      {/* Local LLM Config */}
      <Card className={`p-5 space-y-4 transition-opacity ${form.active_provider !== "local" ? "opacity-50" : ""}`}>
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold">Local LLM</Label>
        </div>
        {form.active_provider === "local" && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-300">
            <strong>Important:</strong> Local LLM calls are made directly from your browser.
            Ensure your LLM server has <strong>CORS enabled</strong>.
            <br />
            <span className="text-muted-foreground">
              LM Studio: Go to Server settings → enable "Enable CORS".
              <br />
              Ollama: Set <code>OLLAMA_ORIGINS=*</code> environment variable before starting.
            </span>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">API Endpoint</Label>
            <Input
              value={form.local_api_endpoint}
              onChange={(e) => update("local_api_endpoint", e.target.value)}
              placeholder="http://localhost:1234/v1/chat/completions"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Model</Label>
            <Input
              value={form.local_model}
              onChange={(e) => update("local_model", e.target.value)}
              placeholder="llama3"
            />
          </div>
        </div>
      </Card>

      <Button onClick={handleSave} disabled={updateConfig.isPending}>
        {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
        Save Settings
      </Button>
    </div>
  );
}

function NotificationsCard() {
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const push = usePushSubscription();
  const [pushBusy, setPushBusy] = useState(false);

  // Detect iOS — Notifications only work there if installed to home screen (iOS 16.4+).
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  // @ts-expect-error - non-standard but widely supported
  const isStandalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone);
  const supported = typeof Notification !== "undefined";

  const enable = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") toast.success("Notifications enabled");
    else if (result === "denied") toast.error("Permission denied — enable in browser settings");
  };

  const setLead = async (v: string) => {
    if (!settings) return;
    await updateSettings.mutateAsync({ id: settings.id, default_reminder_minutes: Number(v) });
    toast.success("Default reminder updated");
  };

  const toggleEnabled = async (v: boolean) => {
    if (!settings) return;
    // When turning ON, auto-prompt for OS permission if still default.
    if (v && supported && Notification.permission === "default") {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== "granted") {
        toast.error("Allow notifications in your browser to receive reminders");
        // Still save the toggle so the user can fix permission later.
      }
    }
    await updateSettings.mutateAsync({ id: settings.id, notifications_enabled: v });
  };

  const sendTest = async () => {
    if (!supported) {
      toast.error("Notifications not supported on this device");
      return;
    }
    if (Notification.permission !== "granted") {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== "granted") {
        toast.error("Permission required to send a test");
        return;
      }
    }
    await fireNotification(
      "🔔 Test reminder",
      "If you see this, reminders are working on this device.",
      "test-notification"
    );
    toast.success("Test sent — check your notification tray");
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">Reminder Notifications</Label>
      </div>

      {!supported && isIOS && !isStandalone && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <strong>iOS requires installation</strong>
          <p>
            Tap the Share button in Safari → "Add to Home Screen", then open
            GioTask from the new home-screen icon. Notifications will become
            available there (iOS 16.4 or later).
          </p>
          <p className="text-muted-foreground">
            Inside a Safari or Chrome tab, iOS does not allow web notifications.
          </p>
        </div>
      )}

      {!supported && !isIOS && (
        <p className="text-xs text-muted-foreground">
          Your browser doesn't support notifications. Reminders will fall back to in-app toasts.
        </p>
      )}

      {supported && permission !== "granted" && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-2">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            {permission === "denied"
              ? "Notifications are blocked. Enable them in your browser settings, then reload."
              : "Allow browser notifications to receive reminders before tasks start."}
          </p>
          {permission === "default" && (
            <Button size="sm" variant="outline" onClick={enable}>
              <Bell className="h-3.5 w-3.5 mr-1" /> Enable notifications
            </Button>
          )}
        </div>
      )}

      {supported && permission === "granted" && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Bell className="h-3 w-3" /> Notifications enabled
          </p>
          <Button size="sm" variant="outline" onClick={sendTest}>
            Send test notification
          </Button>
        </div>
      )}

      {/* Background push delivery */}
      {push.supported && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" /> Background reminders (push)
            </Label>
            {push.status === "subscribed" ? (
              <span className="text-[11px] rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
                Active on this device
              </span>
            ) : (
              <span className="text-[11px] rounded-full bg-muted text-muted-foreground px-2 py-0.5">
                {push.status === "denied" ? "Blocked" : "Off"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Lets reminders arrive even when GioTask is closed or your phone is locked.
            Required for the reminder you set on a task to actually fire on time.
          </p>
          <div className="flex gap-2">
            {push.status !== "subscribed" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pushBusy || push.status === "denied"}
                onClick={async () => {
                  setPushBusy(true);
                  const ok = await push.subscribe();
                  setPushBusy(false);
                  if (ok) toast.success("Background reminders enabled on this device");
                  else toast.error("Could not enable background reminders");
                }}
              >
                {pushBusy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Bell className="h-3.5 w-3.5 mr-1" />}
                Enable on this device
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={pushBusy}
                onClick={async () => {
                  setPushBusy(true);
                  await push.unsubscribe();
                  setPushBusy(false);
                  toast.message("Background reminders disabled on this device");
                }}
              >
                Disable on this device
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="notif-toggle" className="text-sm flex items-center gap-1.5 cursor-pointer">
          {settings?.notifications_enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
          Send reminders
        </Label>
        <Switch
          id="notif-toggle"
          checked={!!settings?.notifications_enabled}
          onCheckedChange={toggleEnabled}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Default lead time (used when a task has no custom reminder)</Label>
        <Select
          value={String(settings?.default_reminder_minutes ?? 10)}
          onValueChange={setLead}
          disabled={!settings}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">At start time</SelectItem>
            <SelectItem value="5">5 min before</SelectItem>
            <SelectItem value="10">10 min before</SelectItem>
            <SelectItem value="15">15 min before</SelectItem>
            <SelectItem value="30">30 min before</SelectItem>
            <SelectItem value="60">1 hour before</SelectItem>
            <SelectItem value="1440">1 day before</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        For reminders to fire when the app is closed or the phone is locked,
        enable <strong>Background reminders</strong> above on each device.
        On iOS this requires installing GioTask to the Home Screen first
        (Share → Add to Home Screen, iOS 16.4+).
        Note: push notifications are blocked inside the Lovable editor preview —
        test on the published URL.
      </p>
    </Card>
  );
}
