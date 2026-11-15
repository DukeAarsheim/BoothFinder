-- Optional organizer-supplied business contact, shown on the vendor event page.
-- Existing listings remain null until their organizer supplies a real address.
alter table public.events
  add column organizer_email text
  constraint events_organizer_email_length check (
    organizer_email is null or char_length(organizer_email) between 3 and 254
  );

comment on column public.events.organizer_email is
  'Organizer-supplied public contact email. Visible to vendors; never infer or invent it.';
-- Existing events read policies and RLS remain in effect; no new grants are needed.
