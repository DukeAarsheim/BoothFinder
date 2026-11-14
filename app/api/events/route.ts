import { cleanFields } from "@/lib/extractor/clean";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const fail = (status: number, error: string) => Response.json({ error }, { status });

/**
 * POST { fields, sourceUrl } -> { id }. Saves a listing the organizer has
 * checked on the create-event screen. Every value is re-validated here
 * (cleanFields), so the browser can't write anything the form couldn't.
 */
export async function POST(request: Request) {
  let body: { fields?: unknown; sourceUrl?: unknown };
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
      name: fields.name,
      event_type: event_type ?? "other",
      source_url: sourceUrl,
      created_via: "extractor",
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
