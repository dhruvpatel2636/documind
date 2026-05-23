"use client";

import { useState, useEffect } from "react";
import { Settings, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiGet, apiPut } from "@/lib/api";
import { ChatbotSettings } from "@/types";
import { toast } from "@/hooks/use-toast";

const toneOptions = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
  { value: "detailed", label: "Detailed" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<ChatbotSettings>({
    chatbotName: "AI Assistant",
    systemPrompt: null,
    tone: "professional",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<{ settings: ChatbotSettings }>("/settings")
      .then(({ settings }) => setSettings(settings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { settings: updated } = await apiPut<{ settings: ChatbotSettings }>(
        "/settings",
        settings,
      );
      setSettings(updated);
      toast({ title: "Saved", description: "Settings updated successfully" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chatbot Identity</CardTitle>
              <CardDescription>
                Customize how your AI assistant presents itself
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Chatbot Name</label>
                <Input
                  value={settings.chatbotName}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, chatbotName: e.target.value }))
                  }
                  placeholder="AI Assistant"
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Response Tone</label>
                <div className="flex flex-wrap gap-2">
                  {toneOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          tone: value as ChatbotSettings["tone"],
                        }))
                      }
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        settings.tone === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Prompt</CardTitle>
              <CardDescription>
                Define custom instructions for your AI. Leave empty to use the
                default RAG prompt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.systemPrompt ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    systemPrompt: e.target.value || null,
                  }))
                }
                placeholder="You are a helpful assistant specialized in..."
                rows={6}
                maxLength={2000}
                className="resize-none"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {settings.systemPrompt?.length ?? 0}/2000 characters
              </p>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
