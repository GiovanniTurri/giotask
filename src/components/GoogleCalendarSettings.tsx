import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useGoogleCalendarConnections,
  useConnectGoogleCalendar,
  useDisconnectGoogleCalendar,
  useListGoogleCalendars,
  useUpdateSelectedCalendars,
  useSyncGoogleCalendar,
} from "@/hooks/useGoogleCalendar";
import { CalendarDays, ExternalLink, Loader2, RefreshCw, Trash2, Check } from "lucide-react";
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

  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

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
      await updateSelected.mutateAsync({ connectionId: activeConnectionId, calendarIds: selectedIds });
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
          {connections.map((conn) => (
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

              {activeConnectionId === conn.id && calendars.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs text-muted-foreground">Choose calendars to import:</Label>
                  {calendars.map((cal) => (
                    <div key={cal.id} className="flex items-center gap-2">
                      <Checkbox
                        id={cal.id}
                        checked={selectedIds.includes(cal.id)}
                        onCheckedChange={() => toggleCalendar(cal.id)}
                      />
                      <label htmlFor={cal.id} className="text-sm flex items-center gap-2 cursor-pointer">
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
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={handleConnect} disabled={connect.isPending}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Connect Another Account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Connect your Google Calendar to see events alongside your tasks.
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
