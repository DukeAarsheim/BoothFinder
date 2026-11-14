import { AiError } from "@/lib/organizers/aiClient";
import { extractEvent } from "@/lib/extractor/extract";
import { SourceError, fileToText, pastedText, urlToText } from "@/lib/extractor/readSource";

const fail = (status: number, error: string) => Response.json({ error }, { status });

/** Plain-language reasons, safe to show organizers (never the key or raw provider text). */
const AI_MESSAGES: Record<AiError["reason"], [number, string]> = {
  not_configured: [503, "The AI reader isn't set up yet (the AI keys are missing on the server)."],
  bad_base_url: [503, "The AI reader is misconfigured (check AI_BASE_URL)."],
  bad_key: [503, "The AI provider rejected our API key. Ask Duke to check AI_API_KEY."],
  bad_model_or_url: [503, "The AI provider didn't accept the model. Ask Duke to check AI_MODEL."],
  rate_limited: [429, "The AI is busy right now. Wait a few seconds and try again."],
  provider_error: [502, "The AI couldn't read that just now. Try again in a moment."],
  network: [502, "We couldn't reach the AI just now. Try again in a moment."],
  empty_reply: [502, "The AI's answer came back garbled. Try again."],
};

/**
 * POST multipart form with one of: `file` (a PDF or text file), `url` (an
 * event page or a link to a PDF), or `text` (pasted text, e.g. an email or a
 * Google Form) -> { fields, evidence } (lib/extractor/types.ts). Nothing is
 * saved here; the organizer checks the fields, then POST /api/events saves them.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Send a PDF, a link, or some text.");
  }
  const file = form.get("file");
  const url = form.get("url");
  const text = form.get("text");

  try {
    let source: string;
    if (file instanceof File) source = await fileToText(file);
    else if (typeof url === "string" && url.trim()) ({ text: source } = await urlToText(url.trim()));
    else if (typeof text === "string" && text.trim()) source = pastedText(text);
    else return fail(400, "Send a PDF, a link, or some text.");

    return Response.json(await extractEvent(source));
  } catch (error) {
    if (error instanceof SourceError) return fail(422, error.message);
    if (error instanceof AiError) {
      console.error(`extract: ${error.reason}: ${error.message}`);
      const [status, message] = AI_MESSAGES[error.reason];
      return fail(status, message);
    }
    console.error("extract failed:", error);
    return fail(502, "The AI couldn't read that just now. Try again in a moment.");
  }
}
