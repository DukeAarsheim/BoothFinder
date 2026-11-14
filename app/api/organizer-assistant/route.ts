import { buildOrganizerSystemPrompt } from "@/lib/organizers/assistantPrompt";
import { AiError, chatCompletion, type ChatMessage } from "@/lib/organizers/aiClient";

// Limits keep one demo session from running up the AI bill.
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 2000;

type IncomingMessage = { role: "user" | "assistant"; content: string };

function parseMessages(body: unknown): IncomingMessage[] | null {
  if (!body || typeof body !== "object" || !("messages" in body)) return null;
  const messages = (body as { messages: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const parsed: IncomingMessage[] = [];
  for (const m of messages.slice(-MAX_MESSAGES)) {
    if (
      !m ||
      typeof m !== "object" ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.trim() === ""
    ) {
      return null;
    }
    parsed.push({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MESSAGE) });
  }
  // The conversation must end with the organizer's question.
  return parsed[parsed.length - 1].role === "user" ? parsed : null;
}

/** POST { messages: [{ role, content }] } -> { reply } */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  const messages = parseMessages(body);
  if (!messages) {
    return Response.json(
      { error: "Send a non-empty list of messages that ends with a user message." },
      { status: 400 },
    );
  }

  const conversation: ChatMessage[] = [
    { role: "system", content: buildOrganizerSystemPrompt() },
    ...messages,
  ];

  try {
    const reply = await chatCompletion(conversation);
    return Response.json({ reply });
  } catch (error) {
    if (error instanceof AiError && error.reason === "not_configured") {
      return Response.json(
        { error: "The AI assistant isn't set up yet.", code: "not_configured" },
        { status: 503 },
      );
    }
    console.error(error);
    // `detail` is a short, key-free reason (e.g. "rejected the API key (401)")
    // so a setup mistake can be diagnosed without access to the server logs.
    return Response.json(
      {
        error: "The assistant couldn't answer right now. Try again in a moment.",
        code: error instanceof AiError ? error.reason : "unknown",
        detail: error instanceof AiError ? error.message : undefined,
      },
      { status: 502 },
    );
  }
}
