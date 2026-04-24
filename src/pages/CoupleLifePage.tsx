import { useMemo, useState } from "react";
import { format, isAfter, startOfDay } from "date-fns";
import { CalendarDays, Clock, Heart, Loader2, MapPin, Plus, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskDialog } from "@/components/TaskDialog";
import { useClientTags } from "@/hooks/useClientTags";
import { useTasks, type TaskInsert } from "@/hooks/useTasks";
import { buildCoupleLifeSuggestions, getRelativeDayLabel, type CoupleLifeSuggestion } from "@/lib/coupleLifeSuggestions";
import { cn } from "@/lib/utils";

const COUPLE_TAG_NAMES = ["couple life", "coppia"];

function taskDateTime(task: any) {
  if (!task.scheduled_date) return null;
  return new Date(`${task.scheduled_date}T${task.scheduled_start_time || "00:00:00"}`);
}

function formatTaskDate(task: any) {
  if (!task.scheduled_date) return "Unscheduled";
  const date = new Date(`${task.scheduled_date}T00:00:00`);
  const time = task.scheduled_start_time ? ` · ${task.scheduled_start_time.slice(0, 5)}` : "";
  return `${format(date, "EEE, MMM d")}${time}`;
}

export default function CoupleLifePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<Partial<TaskInsert> | undefined>();
  const { data: tasks, isLoading } = useTasks();
  const { data: tags } = useClientTags();

  const coupleTag = useMemo(
    () => tags?.find((tag) => COUPLE_TAG_NAMES.includes(tag.name.trim().toLowerCase())),
    [tags]
  );

  const coupleTasks = useMemo(
    () => (tasks || []).filter((task: any) => task.client_tag_id && task.client_tag_id === coupleTag?.id),
    [tasks, coupleTag]
  );

  const now = startOfDay(new Date());
  const upcoming = coupleTasks
    .filter((task: any) => task.status !== "done" && task.scheduled_date && !isAfter(now, new Date(`${task.scheduled_date}T00:00:00`)))
    .sort((a: any, b: any) => (taskDateTime(a)?.getTime() || 0) - (taskDateTime(b)?.getTime() || 0));
  const completed = coupleTasks
    .filter((task: any) => task.status === "done")
    .sort((a: any, b: any) => (taskDateTime(b)?.getTime() || 0) - (taskDateTime(a)?.getTime() || 0));
  const suggestions = buildCoupleLifeSuggestions(coupleTasks as any);

  const openSuggestion = (suggestion: CoupleLifeSuggestion) => {
    setInitialValues({
      title: suggestion.title,
      description: `${suggestion.description}\n\nReason: ${suggestion.reason}`,
      time_estimate: suggestion.durationMinutes,
      client_tag_id: coupleTag?.id || null,
      scheduled_date: suggestion.suggestedDate || null,
      scheduled_start_time: suggestion.suggestedDate ? "19:00:00" : null,
      reminder_minutes: null,
    });
    setDialogOpen(true);
  };

  const createBlankCoupleTask = () => {
    setInitialValues({ client_tag_id: coupleTag?.id || null, time_estimate: 90 });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-couple mb-2">
            <Heart className="h-5 w-5 fill-current" />
            <span className="text-sm font-medium">Couple Life</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Upcoming moments together</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {upcoming.length} upcoming · {completed.length} completed memories
            {upcoming[0]?.scheduled_date && ` · next ${getRelativeDayLabel(upcoming[0].scheduled_date)}`}
          </p>
        </div>
        <Button size="sm" onClick={createBlankCoupleTask} disabled={!coupleTag}>
          <Plus className="h-4 w-4 mr-1" /> New couple activity
        </Button>
      </div>

      {!coupleTag && (
        <Alert className="border-couple/30 bg-couple-soft">
          <Heart className="h-4 w-4" />
          <AlertTitle>Create a Couple Life tag</AlertTitle>
          <AlertDescription>
            Add a tag named “Coppia” or “Couple life” from Tags, then assign it to activities you do together.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <Card className="border-couple/30 bg-couple-soft">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming</CardTitle></CardHeader>
              <CardContent className="text-3xl font-bold">{upcoming.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Next plan</CardTitle></CardHeader>
              <CardContent className="text-sm font-medium">{upcoming[0] ? formatTaskDate(upcoming[0]) : "Nothing scheduled"}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Memories</CardTitle></CardHeader>
              <CardContent className="text-3xl font-bold">{completed.length}</CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Upcoming activities</h2>
              {upcoming.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {upcoming.slice(0, 6).map((task: any, index) => (
                    <Card key={task.id} className={cn("overflow-hidden", index === 0 && "border-couple/60")}>
                      <div className="h-1 bg-couple" />
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-semibold text-sm leading-snug">{task.title}</h3>
                          {task.scheduled_date && <Badge className="bg-couple text-couple-foreground">{getRelativeDayLabel(task.scheduled_date)}</Badge>}
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatTaskDate(task)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task.time_estimate}m</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card><CardContent className="p-6 text-sm text-muted-foreground">No upcoming couple activities yet.</CardContent></Card>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Mini timeline</h2>
              <Card>
                <CardContent className="p-4 space-y-4">
                  {upcoming.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="relative pl-6 before:absolute before:left-1.5 before:top-2 before:h-full before:w-px before:bg-border last:before:hidden">
                      <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-couple" />
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatTaskDate(task)}</p>
                    </div>
                  ))}
                  {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Create a plan to start the timeline.</p>}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Past memories</h2>
              <Card>
                <CardContent className="p-4 space-y-3">
                  {completed.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-couple mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{formatTaskDate(task)}</p>
                      </div>
                    </div>
                  ))}
                  {completed.length === 0 && <p className="text-sm text-muted-foreground">Done couple activities will appear here and improve suggestions.</p>}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Suggestions</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <Card key={suggestion.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-couple-accent mt-0.5 shrink-0" />
                        <div>
                          <h3 className="font-semibold text-sm leading-snug">{suggestion.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{suggestion.description}</p>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => openSuggestion(suggestion)} disabled={!coupleTag}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Create task
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={null} initialValues={initialValues} />
    </div>
  );
}