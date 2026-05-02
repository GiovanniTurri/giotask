import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGoogleCalendarConnections,
  useConnectGoogleCalendar,
  useDisconnectGoogleCalendar,
  useListGoogleCalendars,
  useUpdateSelectedCalendars,
  useSyncGoogleCalendar,
  useUpdateMirrorSettings,
  useBackfillMirror,
} from "@/hooks/useGoogleCalendar";
import {
  CalendarDays,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  Check,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function GoogleCalendarSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: connections, isLoading } = useGoogleCalendarConnections();
  const connect = useConnectGoogleCalendar();
  const disconnect = useDisconnectGoogleCalendar();
  const listCalendars = useListGoogleCalendars();
  const updateSelected = useUpdateSelectedCalendars();
  const sync = useSyncGoogleCalendar();
  const updateMirror = useUpdateMirrorSettings();
  const backfill = useBackfillMirror();

  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState<Record<string, string>>({});

  // Handle OAuth callback params
  useEffect(() => {
    const gcal = searchParams.get("gcal");
    if (gcal) {
      if (gcal.includes("success=true")) {
        toast.success("Google Calendar connected successfully!");
      } else if (gcal.includes("error=")) {
        const error = new URLSearchParams(gcal).get("error");
        toast.error(`Google Calendar connection failed: ${error}`);
      }
      searchParams.delete("gcal");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleConnect = async () => {
    try {
      const url = await connect.mutateAsync();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await disconnect.mutateAsync(id);
      toast.success("Google Calendar disconnected");
      setCalendars([]);
      setActiveConnectionId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleLoadCalendars = async (connectionId: string) => {
    try {
      const cals = await listCalendars.mutateAsync(connectionId);
      setCalendars(cals);
      setActiveConnectionId(connectionId);
      const conn = connections?.find((c) => c.id === connectionId);
      setSelectedIds((conn?.selected_calendars as string[]) || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveCalendars = async () => {
    if (!activeConnectionId) return;
    try {
      await updateSelected.mutateAsync({
        connectionId: activeConnectionId,
        calendarIds: selectedIds,
      });
      toast.success("Calendar selection saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSync = async (connectionId?: string) => {
    try {
      const result = await sync.mutateAsync(connectionId);
      toast.success(`Synced ${result.synced} events`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleCalendar = (calId: string) => {
    setSelectedIds((prev) =>
      prev.includes(calId) ? prev.filter((id) => id !== calId) : [...prev, calId]
    );
  };

  const hasWriteScope = (conn: any) =>
    typeof conn?.granted_scopes === "string" &&
    conn.granted_scopes.includes("calendar.events");

  const handleToggleMirror = async (conn: any, enabled: boolean) => {
    try {
      const targetCal = conn.mirror_target_calendar_id || "primary";
      await updateMirror.mutateAsync({
        connectionId: conn.id,
        mirror_enabled: enabled,
        mirror_target_calendar_id: targetCal,
      });
      toast.success(enabled ? "Mirroring enabled" : "Mirroring disabled");
      if (enabled) {
        try {
          const result = await backfill.mutateAsync(conn.id);
          if (result?.upserted) {
            toast.success(`Backfilled ${result.upserted} task${result.upserted === 1 ? "" : "s"} as Focus blocks`);
          }
        } catch (e: any) {
          toast.error(e.message || "Backfill failed");
        }
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveMirrorOptions = async (conn: any, patch: { target?: string; label?: string }) => {
    try {
      await updateMirror.mutateAsync({
        connectionId: conn.id,
        mirror_target_calendar_id: patch.target,
        mirror_label: patch.label,
      });
      toast.success("Mirror settings saved");
      if (conn.mirror_enabled) {
        await backfill.mutateAsync(conn.id);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-5">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">Google Calendar</Label>
      </div>

      {connections && connections.length > 0 ? (
        <div className="space-y-4">
          {connections.map((conn) => {
            const writeOk = hasWriteScope(conn);
            const target = (conn as any).mirror_target_calendar_id || "primary";
            const label =
              labelDraft[conn.id] ?? ((conn as any).mirror_label || "Focus");
            const showCalsForThis =
              activeConnectionId === conn.id && calendars.length > 0;
            return (
              <div key={conn.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{conn.google_email}</p>
                    {conn.last_synced_at && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {format(new Date(conn.last_synced_at), "MMM d, h:mm a")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(conn.id)}
                      disabled={sync.isPending}
                    >
                      {sync.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1">Sync</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(conn.id)}
                      disabled={disconnect.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Calendar Selection */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadCalendars(conn.id)}
                  disabled={listCalendars.isPending}
                >
                  {listCalendars.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <CalendarDays className="h-3.5 w-3.5 mr-1" />
                  )}
                  Select Calendars
                </Button>

                {showCalsForThis && (
                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-xs text-muted-foreground">
                      Choose calendars to import:
                    </Label>
                    {calendars.map((cal) => (
                      <div key={cal.id} className="flex items-center gap-2">
                        <Checkbox
                          id={cal.id}
                          checked={selectedIds.includes(cal.id)}
                          onCheckedChange={() => toggleCalendar(cal.id)}
                        />
                        <label
                          htmlFor={cal.id}
                          className="text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: cal.backgroundColor }}
                          />
                          {cal.summary}
                          {cal.primary && (
                            <span className="text-xs text-muted-foreground">(Primary)</span>
                          )}
                        </label>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      onClick={handleSaveCalendars}
                      disabled={updateSelected.isPending}
                    >
                      {updateSelected.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5 mr-1" />
                      )}
                      Save Selection
                    </Button>
                  </div>
                )}

                {/* Mirror Tasks → Focus Blocks */}
                <div className="border-t pt-3 space-y-3">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm font-medium">
                          Mirror tasks as Focus blocks
                        </Label>
                        <Switch
                          checked={!!(conn as any).mirror_enabled}
                          onCheckedChange={(v) => handleToggleMirror(conn, v)}
                          disabled={!writeOk || updateMirror.isPending || backfill.isPending}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Writes a private "{label}" event to this account whenever a task is
                        scheduled. The real task name stays hidden.
                      </p>
                    </div>
                  </div>

                  {!writeOk && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <p>
                          This account was connected with read-only access. To mirror tasks,
                          reconnect and grant write permission.
                        </p>
                        <Button size="sm" variant="outline" onClick={handleConnect}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Reconnect with write access
                        </Button>
                      </div>
                    </div>
                  )}

                  {writeOk && (conn as any).mirror_enabled && (
                    <div className="space-y-3 pl-7">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Target calendar
                        </Label>
                        <Select
                          value={target}
                          onValueChange={(v) =>
                            handleSaveMirrorOptions(conn, { target: v })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary calendar</SelectItem>
                            {(activeConnectionId === conn.id ? calendars : []).map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.summary}
                                {c.primary ? " (Primary)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {activeConnectionId !== conn.id && (
                          <p className="text-[11px] text-muted-foreground">
                            Click "Select Calendars" above to load more options.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Event label</Label>
                        <div className="flex gap-2">
                          <Input
                            value={label}
                            onChange={(e) =>
                              setLabelDraft((d) => ({ ...d, [conn.id]: e.target.value }))
                            }
                            placeholder="Focus"
                            maxLength={50}
                            className="h-9"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleSaveMirrorOptions(conn, { label: label.trim() || "Focus" })
                            }
                            disabled={updateMirror.isPending || backfill.isPending}
                          >
                            {(updateMirror.isPending || backfill.isPending) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <Button variant="outline" size="sm" onClick={handleConnect} disabled={connect.isPending}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Connect Another Account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Connect your Google Calendar to see events alongside your tasks, and optionally
            mirror your scheduled tasks as private "Focus" blocks.
          </p>
          <Button variant="outline" size="sm" onClick={handleConnect} disabled={connect.isPending}>
            {connect.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
            )}
            Connect Google Calendar
          </Button>
        </div>
      )}
    </Card>
  );
}
