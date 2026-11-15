import type { EventInsert } from "@/lib/types";
import { organizerEmail } from "@/lib/vendor/eventContact";
import { cleanFields } from "@/lib/extractor/clean";
import { cleanExtras, createdVia } from "@/lib/host/eventExtras";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/http/rateLimit";
import { readLimitedBody } from "@/lib/http/limitedBody";

const fail = (status: number, error: string) =>
  Response.json({ error }, { status });

/**
 * POST { fields, sourceUrl, createdVia } -> { id }. Saves a listing from the
 * add-event screen, whether the organizer typed it in or checked what the AI
 * read. `fields` is the whole form. Every value is re-validated here
 * (cleanFields for the details the extractor reads, cleanExtras for the rest),
 * so the browser can't write anything the form couldn't.
 */
export async function POST(request: Request) {
  const limited = await rateLimit(request, "publish");
  if (limited) return limited;
  let body: { fields?: unknown; sourceUrl?: unknown; createdVia?: unknown };
  try {
    const bytes = await readLimitedBody(request, 64 * 1024);
    if (!bytes) return fail(413, "The listing is too large.");
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail(400, "Bad request.");
    body = parsed;
  } catch {
    return fail(400, "Bad request.");
  }

  const rawEmail =
    body.fields &&
    typeof body.fields === "object" &&
    "organizer_email" in body.fields
      ? body.fields.organizer_email
      : null;
  const email = organizerEmail(rawEmail);
  if (rawEmail != null && rawEmail !== "" && !email)
    return fail(
      422,
      "Enter a valid organizer contact email, or leave it blank.",
    );
  const fields = cleanFields(body.fields);
  if (!fields.name) return fail(422, "Add the event's name before publishing.");
  const { apply_url: sourceUrl } = cleanFields({ apply_url: body.sourceUrl });

  const supabase = getSupabaseAdmin();
  if (!supabase)
    return fail(
      503,
      "Publishing isn't set up yet (the database key is missing on the server).",
    );

  const { event_type, ...rest } = fields;
  const listing: EventInsert = {
    ...rest,
    // Omit when blank so publishing still works before the contact migration is applied.
    ...(email ? { organizer_email: email } : {}),
    ...cleanExtras(body.fields),
    name: fields.name,
    event_type: event_type ?? "other",
    source_url: sourceUrl,
    created_via: createdVia(body.createdVia),
    is_sample: false,
  };
  const { data, error } = await supabase
    .from("events")
    .insert(listing)
    .select("id")
    .single();

  if (error) {
    console.error("event insert failed:", error.message);
    if (email && (error.code === "PGRST204" || error.code === "42703")) {
      return fail(
        503,
        "Organizer email storage isn't ready yet. Please ask the project owner to apply the organizer email migration, then retry. Your details are still here.",
      );
    }
    return fail(
      500,
      "We couldn't publish the listing. Your details are still here.",
    );
  }
  return Response.json({ id: data.id }, { status: 201 });
}
