/** Contact addresses are explicitly supplied by organizers, never inferred from URLs. */
export function organizerEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return email.length <= 254 &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}$/i.test(
      email,
    )
    ? email
    : null;
}

export function organizerMailto(
  email: unknown,
  eventName: string,
): string | null {
  const address = organizerEmail(email);
  if (!address) return null;
  return `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(`Vendor inquiry: ${eventName}`)}&body=${encodeURIComponent(`Hello,\n\nI'm interested in vending at ${eventName}. Could you share more about vendor availability and the application process?\n\nThank you!`)}`;
}

export function eventWebUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
