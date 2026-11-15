import "server-only";

// Calls an OpenAI-compatible chat API and returns the reply text. The provider is
// chosen by env vars alone, the same three the organizer assistant uses:
//   AI_BASE_URL  e.g. https://api.openai.com/v1 or https://api.groq.com/openai/v1
//   AI_MODEL     a chat model name from that provider's docs
//   AI_API_KEY   secret, server only (never NEXT_PUBLIC_)

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI_API_KEY, AI_BASE_URL and AI_MODEL must all be set.");
  }
}

/** The provider's rate limit was hit and waiting didn't clear it. Stop asking for now. */
export class AiRateLimitError extends Error {
  constructor() {
    super("The AI provider's rate limit was reached (429).");
  }
}

/** The request holds more text than the provider accepts at once. */
export class AiRequestTooLargeError extends Error {
  constructor() {
    super("The AI provider says the request is too large (413).");
  }
}

/** Longest single wait for a rate limit to clear before giving up on the page. */
const MAX_RATE_LIMIT_WAIT_MS = 45_000;

export function isAiConfigured() {
  return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.AI_MODEL);
}

/** Sends a system + user prompt and returns the model's JSON reply as text. */
export async function completeJson(system: string, user: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL?.replace(/\/+$/, "");
  const model = process.env.AI_MODEL;
  if (!apiKey || !baseUrl || !model) throw new AiNotConfiguredError();

  const call = (jsonMode: boolean) =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });

  let res = await call(true);
  // A model without JSON mode answers 400; ask again without it (the prompt still asks for JSON).
  if (res.status === 400) res = await call(false);

  // Rate limited: wait as long as the provider asks (within reason) and try again.
  for (let attempt = 0; res.status === 429 && attempt < 2; attempt++) {
    const seconds = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 8000;
    if (wait > MAX_RATE_LIMIT_WAIT_MS) break;
    await new Promise((resolve) => setTimeout(resolve, wait + 250));
    res = await call(true);
  }

  if (!res.ok) {
    // Log the provider's detail here; callers only see the status.
    const detail = await res.text().catch(() => "");
    console.error(`AI provider error ${res.status}: ${detail.slice(0, 500)}`);
    if (res.status === 429) throw new AiRateLimitError();
    if (res.status === 413) throw new AiRequestTooLargeError();
    throw new Error(`The AI provider returned an error (${res.status}).`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("The AI provider returned an empty reply.");
  return reply;
}
