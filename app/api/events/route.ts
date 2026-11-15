import { cleanFields } from "@/lib/extractor/clean";
import { cleanExtras, createdVia } from "@/lib/host/eventExtras";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const fail = (status: number, error: string) => Response.json({ error }, { status });

/**
 * POST { fields, sourceUrl, createdVia } -> { id }. Saves a listing from the
 * add-event screen, whether the organizer typed it in or checked what the AI
 * read. `fields` is the whole form. Every value is re-validated here
 * (cleanFields for the details the extractor reads, cleanExtras for the rest),
 * so the browser can't write anything the form couldn't.
 */
export async function POST(request: Request) {
  let body: { fields?: unknown; sourceUrl?: unknown; createdVia?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Bad request.");
  }

  const fields = cleanFields(body.fields);
  if (!fields.name) return fail(422, "Add the event's name before publishing.");
  const { apply_url: sourceUrl } = cleanFields({ apply_url: body.sourceUrl });

  const supabase = getSupabaseAdmin();
  if (!supabase) return fail(503, "Publishing isn't set up yet (the database key is missing on the server).");

  const { event_type, ...rest } = fields;
  const { data, error } = await supabase
    .from("events")
    .insert({
      ...rest,
      ...cleanExtras(body.fields),
      name: fields.name,
      event_type: event_type ?? "other",
      source_url: sourceUrl,
      created_via: createdVia(body.createdVia),
      is_sample: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("event insert failed:", error.message);
    return fail(500, "We couldn't publish the listing. Your details are still here.");
  }
  return Response.json({ id: data.id }, { status: 201 });
}
