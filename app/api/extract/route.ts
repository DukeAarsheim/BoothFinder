import { AiNotConfiguredError, extractEvent } from "@/lib/extractor/extract";
import { SourceError, pdfToText, urlToText } from "@/lib/extractor/readSource";

const fail = (status: number, error: string) => Response.json({ error }, { status });

/**
 * POST multipart form with `file` (a PDF) or `url` (an event web page)
 * -> { fields, evidence } (lib/extractor/types.ts). Nothing is saved here; the
 * organizer checks the fields first, then POST /api/events saves them.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Send a PDF or a link.");
  }
  const file = form.get("file");
  const url = form.get("url");

  try {
    let text: string;
    if (file instanceof File) text = await pdfToText(file);
    else if (typeof url === "string" && url.trim()) ({ text } = await urlToText(url.trim()));
    else return fail(400, "Send a PDF or a link.");

    return Response.json(await extractEvent(text));
  } catch (error) {
    if (error instanceof SourceError) return fail(422, error.message);
    if (error instanceof AiNotConfiguredError) {
      return fail(503, "The AI reader isn't set up yet (the AI keys are missing on the server).");
    }
    console.error("extract failed:", error);
    return fail(502, "The AI couldn't read that just now. Try again in a moment.");
  }
}
