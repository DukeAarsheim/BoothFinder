import "server-only";

import { geocodeEvent } from "./geocode";
import { eventsWithoutCoordinates, setEventCoordinates } from "./store";

/**
 * Gives map coordinates to events that have none: ones added on the Add event
 * screen or by hand, and discoveries whose source named only a county. The map's
 * built-in city table covers the Central Coast only, so without this an event
 * anywhere else is listed but never pinned.
 *
 * Only a California result is saved. An event that can't be placed is left as
 * it is and tried again next time.
 */
export async function placeUnpinnedEvents(limit = 12): Promise<{ checked: number; placed: number }> {
  const events = await eventsWithoutCoordinates(limit);
  let placed = 0;
  for (const event of events) {
    const geo = await geocodeEvent(event);
    if (!geo || geo.state !== "California") continue;
    await setEventCoordinates(event.id, {
      latitude: geo.latitude,
      longitude: geo.longitude,
      // Fill in the county only when the event had none.
      ...(!event.county && geo.county ? { county: geo.county } : {}),
    });
    placed++;
  }
  return { checked: events.length, placed };
}
