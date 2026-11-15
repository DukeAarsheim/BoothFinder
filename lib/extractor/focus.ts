/**
 * Fits source documents into a fixed prompt size. Pure.
 *
 * AI providers limit how much text one request (and one minute) may hold, and a
 * vendor handbook can run to tens of pages. Rather than cutting each document
 * off at a character count, this keeps the opening lines for context and then
 * the lines most likely to state vendor terms (fees, dates, deadlines, booth
 * details) with their neighbours, in their original order.
 *
 * Verification (./verify.ts) still checks quotes against the FULL document, so
 * trimming here can only cause a fact to be missed, never invented.
 */

const HEAD_CHARS = 1200;
const GAP = "[…]";

const SIGNALS: [pattern: RegExp, weight: number][] = [
  [/\$\s?\d/, 4],
  [/\b\d{1,3}\s?(%|percent)/i, 3],
  [/\b(booth|space|stall|10\s?['’]?\s?x\s?10|canopy)\b/i, 2],
  [/\b(vendors?|exhibitors?|concession(aire)?s?)\b/i, 2],
  [/\b(fees?|rates?|deposit|deadline|due|appl(y|ication|ications)|waitlist)\b/i, 2],
  [/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b|\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/i, 2],
  [/\b(attendance|attendees|visitors|electric(ity|al)?|power|insurance|permit|hours|a\.?m\.?|p\.?m\.?)\b/i, 1],
  [/\b(fair|festival|market|faire|expo)\b/i, 1],
];

const scoreLine = (line: string) =>
  SIGNALS.reduce((score, [pattern, weight]) => (pattern.test(line) ? score + weight : score), 0);

/** Returns `text` unchanged when it fits; otherwise its most relevant lines, within `budget` characters. */
export function focusText(text: string, budget: number): string {
  if (text.length <= budget) return text;

  // Very long lines (a PDF page with no breaks) are split so they can be picked apart.
  const lines = text.split("\n").flatMap((line) => line.match(/.{1,400}(\s|$)|.{1,400}/g) ?? [line]);
  const keep = new Set<number>();
  let used = 0;
  const take = (i: number) => {
    if (i < 0 || i >= lines.length || keep.has(i)) return true;
    const cost = lines[i].length + 1;
    if (used + cost > budget) return false;
    keep.add(i);
    used += cost;
    return true;
  };

  // The opening lines name the event and set the year.
  for (let i = 0, head = 0; i < lines.length && head < Math.min(HEAD_CHARS, budget / 4); i++) {
    head += lines[i].length + 1;
    if (!take(i)) break;
  }

  const ranked = lines
    .map((line, i) => ({ i, score: scoreLine(line) }))
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i);
  for (const { i } of ranked) {
    // A fee line is often meaningless without the heading above or the note below it.
    if (!take(i)) continue;
    take(i - 1);
    take(i + 1);
  }

  const out: string[] = [];
  let previous = -1;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (i !== previous + 1) out.push(GAP);
    out.push(lines[i].trimEnd());
    previous = i;
  }
  if (previous !== lines.length - 1) out.push(GAP);
  return out.join("\n");
}

/**
 * Splits `budget` characters across documents: short ones get what they need,
 * and the remainder is shared among the long ones.
 */
export function shareBudget(lengths: number[], budget: number): number[] {
  const shares = lengths.map(() => 0);
  let remaining = budget;
  // Shortest first: whatever a short document doesn't need rolls over to the longer ones.
  const order = lengths.map((_, i) => i).sort((x, y) => lengths[x] - lengths[y]);
  order.forEach((i, k) => {
    const give = Math.min(lengths[i], Math.floor(remaining / (order.length - k)));
    shares[i] = give;
    remaining -= give;
  });
  return shares;
}
