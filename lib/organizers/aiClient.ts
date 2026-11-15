import "server-only";

// Calls an OpenAI-compatible chat API. Groq, OpenAI and xAI (Grok) all use this
// format, so the provider is chosen by env vars alone:
//   AI_BASE_URL  e.g. https://api.groq.com/openai/v1 (Groq) or https://api.openai.com/v1
//   AI_MODEL     a chat model name from that provider's docs
//   AI_API_KEY   secret, server only (never NEXT_PUBLIC_)

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Why a call failed, safe to show the user (never contains the key). */
export type AiErrorReason =
  | "not_configured"
  | "bad_base_url"
  | "bad_key"
  | "bad_model_or_url"
  | "rate_limited"
  | "provider_error"
  | "network"
  | "empty_reply";

export class AiError extends Error {
  constructor(
    public reason: AiErrorReason,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Env values pasted into a dashboard often pick up stray spaces, quotes or a
 * trailing slash. Clean them so a copy-paste slip doesn't break the assistant.
 */
function cleanEnv(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

export function getAiConfig() {
  const apiKey = cleanEnv(process.env.AI_API_KEY);
  const baseUrl = cleanEnv(process.env.AI_BASE_URL).replace(/\/+$/, "");
  const model = cleanEnv(process.env.AI_MODEL);
  if (!apiKey || !baseUrl || !model) return null;
  return { apiKey, baseUrl, model };
}

/** Sends the conversation and returns the assistant's reply text. */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const config = getAiConfig();
  if (!config) {
    throw new AiError(
      "not_configured",
      "AI_API_KEY, AI_BASE_URL and AI_MODEL must all be set",
    );
  }

  let url: URL;
  try {
    url = new URL(`${config.baseUrl}/chat/completions`);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    throw new AiError(
      "bad_base_url",
      "AI_BASE_URL isn't a valid web address (it should start with https://)",
    );
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model: config.model, messages, temperature: 0.4 }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    console.error("AI provider unreachable:", error);
    throw new AiError("network", `Couldn't reach ${url.host}`);
  }

  if (!res.ok) {
    // Log the provider's message for whoever reads the server logs, but only
    // pass a short, key-free reason back to the browser.
    const detail = await res.text().catch(() => "");
    console.error(`AI provider error ${res.status}: ${detail.slice(0, 500)}`);
    if (res.status === 401 || res.status === 403) {
      throw new AiError("bad_key", `The AI provider rejected the API key (${res.status})`);
    }
    if (res.status === 404 || res.status === 400) {
      throw new AiError(
        "bad_model_or_url",
        `The AI provider didn't accept the model or URL (${res.status}); check AI_MODEL and AI_BASE_URL`,
      );
    }
    if (res.status === 429) {
      throw new AiError("rate_limited", "The AI provider's rate limit was hit (429)");
    }
    throw new AiError("provider_error", `The AI provider returned an error (${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new AiError("empty_reply", "The AI provider returned an empty reply");
  return reply;
}
