import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

/** Shown to the organizer as-is, so keep the wording plain. */
export class SourceError extends Error {}

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
/** Enough for a long vendor packet, small enough to keep the AI call cheap. */
const MAX_TEXT_CHARS = 24_000;

const tidy = (text: string) =>
  text.replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim().slice(0, MAX_TEXT_CHARS);

const TEXT_TYPES = /^(text\/|application\/(json|xml|xhtml\+xml))/;
const TEXT_NAMES = /\.(txt|md|csv|html?|json|xml)$/i;

/** A dropped file: PDFs are parsed; plain-text files (.txt, .md, .csv, .html) are read as-is. */
export async function fileToText(file: File): Promise<string> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return pdfToText(file);
  if (TEXT_TYPES.test(file.type) || TEXT_NAMES.test(file.name)) {
    if (file.size > MAX_PDF_BYTES) throw new SourceError("That file is over 10 MB. Try a smaller one.");
    return pastedText(await file.text());
  }
  throw new SourceError(
    "We can read PDFs and text files. For a Word doc or an image, paste the text or a link instead.",
  );
}

/** Text the organizer pasted (an email, a Google Form, a flyer's wording). */
export function pastedText(text: string): string {
  const cleaned = tidy(text.replace(/<[^>]+>/g, " "));
  if (cleaned.length < 40) throw new SourceError("That's too short to read. Paste the full event details.");
  return cleaned;
}

export async function pdfToText(file: File): Promise<string> {
  if (file.size > MAX_PDF_BYTES) throw new SourceError("That PDF is over 10 MB. Try a smaller one.");
  let text: string;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    ({ text } = await extractText(pdf, { mergePages: true }));
  } catch {
    throw new SourceError("We couldn't open that file. Is it a PDF?");
  }
  text = tidy(text);
  if (text.length < 40) {
    throw new SourceError(
      "That PDF has no readable text (it may be a scan). Try the event page link instead.",
    );
  }
  return text;
}

/** Hosts that would let a pasted link reach inside our own network. */
const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i;

export async function urlToText(input: string): Promise<{ text: string; url: string }> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new SourceError("That doesn't look like a web address.");
  }
  if (!/^https?:$/.test(url.protocol) || PRIVATE_HOST.test(url.hostname)) {
    throw new SourceError("We can only read public web pages.");
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "BoothfinderBot/0.1 (student hackathon project)", Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new SourceError("We couldn't reach that page. Check the link, or upload the PDF instead.");
  }
  if (!res.ok) throw new SourceError(`That page didn't load (error ${res.status}).`);

  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/pdf")) {
    const blob = await res.blob();
    return { text: await pdfToText(new File([blob], "linked.pdf")), url: url.toString() };
  }
  if (!type.includes("html") && !type.includes("text")) {
    throw new SourceError("That link isn't a web page or a PDF.");
  }

  const html = (await res.text()).slice(0, MAX_PAGE_BYTES);
  const text = tidy(
    html
      .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|br)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&rsquo;|&apos;/g, "'")
      .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
      .replace(/&[a-z#0-9]+;/gi, " "),
  );
  if (text.length < 40) {
    throw new SourceError("We couldn't find readable text on that page. Try uploading the PDF.");
  }
  return { text, url: url.toString() };
}
