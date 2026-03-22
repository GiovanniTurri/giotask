import { useState, useEffect } from "react";
import { useLlmConfig, useUpdateLlmConfig } from "@/hooks/useLlmConfig";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Cloud, Monitor, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
        <p className="text-sm text-muted-foreground mt-1">Configure AI provider for intelligent task scheduling</p>
      </div>

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
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">API Endpoint</Label>
            <Input
              value={form.local_api_endpoint}
              onChange={(e) => update("local_api_endpoint", e.target.value)}
              placeholder="http://localhost:11434/v1/chat/completions"
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
