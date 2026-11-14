import "server-only";

// Calls an OpenAI-compatible chat API. xAI (Grok) and OpenAI both use this
// format, so the provider is chosen by env vars alone:
//   AI_BASE_URL  e.g. https://api.x.ai/v1 (Grok) or https://api.openai.com/v1
//   AI_MODEL     a chat model name from that provider's docs
//   AI_API_KEY   secret, server only (never NEXT_PUBLIC_)

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class AiNotConfiguredError extends Error {}

export function getAiConfig() {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;
  if (!apiKey || !baseUrl || !model) return null;
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ""), model };
}

/** Sends the conversation and returns the assistant's reply text. */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const config = getAiConfig();
  if (!config) {
    throw new AiNotConfiguredError(
      "AI_API_KEY, AI_BASE_URL and AI_MODEL must all be set in .env.local",
    );
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ model: config.model, messages, temperature: 0.4 }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    // Don't forward the provider's raw error to the browser; log it here.
    const detail = await res.text().catch(() => "");
    console.error(`AI provider error ${res.status}: ${detail.slice(0, 500)}`);
    throw new Error(`The AI provider returned an error (${res.status}).`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("The AI provider returned an empty reply.");
  return reply;
}
