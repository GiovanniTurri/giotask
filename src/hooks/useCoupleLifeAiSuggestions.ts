import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLlmConfig } from "@/hooks/useLlmConfig";
import {
  buildCoupleLifeAiMessages,
  coupleLifeIdeasTool,
  extractAssistantText,
  normalizeLlmEndpoint,
  parseCoupleLifeAiSuggestions,
  type CoupleLifeAiOptions,
  type CoupleLifeAiSuggestion,
  type CoupleLifeAiTaskContext,
  type PartnerProfileContext,
  type BrainNoteContext,
} from "@/lib/coupleLifeAiPrompt";
import { toast } from "sonner";

function singleMessageFallback(messages: { role: string; content: string }[]) {
  return [{ role: "user", content: messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n") }];
}

async function fetchPartnerContext(): Promise<PartnerProfileContext | null> {
  const { data } = await supabase.from("partner_profile").select("*").limit(1).single();
  if (!data) return null;
  return {
    display_name: data.display_name,
    birthday: data.birthday,
    anniversary_date: data.anniversary_date,
    languages: data.languages,
    loves: data.loves,
    dislikes: data.dislikes,
    food_restrictions: data.food_restrictions,
    budget_default: data.budget_default,
    mood_default: data.mood_default,
    love_language: data.love_language,
    gift_wishlist: data.gift_wishlist,
    favorite_places: data.favorite_places,
    clothing_sizes: data.clothing_sizes,
    favorite_brands_artists: data.favorite_brands_artists,
    notes: data.notes,
  };
}

async function fetchBrainContext(): Promise<BrainNoteContext[]> {
  const { data } = await supabase
    .from("brain_notes")
    .select("title, content, tags")
    .eq("is_partner_relevant", true)
    .order("updated_at", { ascending: false })
    .limit(8);
  if (!data) return [];
  return data.map((n) => ({ title: n.title, excerpt: (n.content || "").slice(0, 600), tags: n.tags || [] }));
}

export function useCoupleLifeAiSuggestions() {
  const [ideas, setIdeas] = useState<CoupleLifeAiSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: llmConfig } = useLlmConfig();

  const generate = async (tasks: CoupleLifeAiTaskContext[], options: CoupleLifeAiOptions) => {
    setIsGenerating(true);
    try {
      const provider = llmConfig?.active_provider || "lovable";

      if (provider === "local") {
        const [partner, brain] = await Promise.all([fetchPartnerContext(), fetchBrainContext()]);
        const messages = buildCoupleLifeAiMessages(tasks, options, partner, brain);
        const endpoint = normalizeLlmEndpoint(llmConfig?.local_api_endpoint);
        const model = llmConfig?.local_model || "llama3";
        const attempts = [
          { model, messages, tools: [coupleLifeIdeasTool], temperature: 0.8, stream: false },
          { model, messages: singleMessageFallback(messages), temperature: 0.8, stream: false },
        ];

        let response: Response | null = null;
        let lastErrorText = "";
        for (const payload of attempts) {
          response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (response.ok) break;
          lastErrorText = await response.text();
          if (!/tool|function|messages|content|role/i.test(lastErrorText)) break;
        }

        if (!response?.ok) throw new Error(`Local LLM returned ${response?.status ?? "unknown"}: ${lastErrorText || "Empty response"}`);
        const result = await response.json();
        const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
        const parsedIdeas = toolCall
          ? parseCoupleLifeAiSuggestions(JSON.parse(toolCall.function.arguments))
          : parseCoupleLifeAiSuggestions(extractAssistantText(result.choices?.[0]?.message?.content));
        setIdeas(parsedIdeas);
        toast.success("Creative ideas generated");
        return parsedIdeas;
      }

      const { data, error } = await supabase.functions.invoke("generate-couple-ideas", {
        body: { tasks, options },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const parsedIdeas = parseCoupleLifeAiSuggestions(data);
      setIdeas(parsedIdeas);
      toast.success("Creative ideas generated");
      return parsedIdeas;
    } catch (e: any) {
      toast.error(e.message || "Failed to generate creative ideas");
      return [];
    } finally {
      setIsGenerating(false);
    }
  };

  return { ideas, isGenerating, generate };
}
