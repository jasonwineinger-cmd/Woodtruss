type StockParetoOffer = { offerId: string; areaIn2: number; unusedLengthIn: number };

/** Keep offers not strictly dominated in either of the two minimizing
 * objectives. This ranks neither eligibility nor structural suitability. */
export function stockParetoFrontierOfferIds(rows: readonly StockParetoOffer[]): string[] {
  if (!Array.isArray(rows)) throw new Error("Expected an array of stock offer objectives");
  const seen = new Set<string>();
  const entries: StockParetoOffer[] = [];
  for (const row of rows) {
    if (!row) throw new Error("Missing stock offer objectives");
    const { offerId, areaIn2, unusedLengthIn } = row;
    if (typeof offerId !== "string" || !offerId.trim() || seen.has(offerId) ||
        !Number.isFinite(areaIn2) || areaIn2 <= 0 || !Number.isFinite(unusedLengthIn) || unusedLengthIn < 0) {
      throw new Error("Stock offers require unique IDs and finite, usable objectives");
    }
    seen.add(offerId);
    entries.push({ offerId, areaIn2, unusedLengthIn });
  }
  const ordered = [...entries].sort((a, b) => a.areaIn2 - b.areaIn2 || a.unusedLengthIn - b.unusedLengthIn);
  let smallerAreaMinUnused = Infinity;
  const frontier = new Set<string>();
  for (let i = 0; i < ordered.length;) {
    const area = ordered[i].areaIn2;
    const groupMinUnused = ordered[i].unusedLengthIn;
    // Equal objective pairs within this group never dominate each other.
    // An equal unused length from a strictly smaller area does dominate.
    do {
      const row = ordered[i++];
      if (row.unusedLengthIn === groupMinUnused && groupMinUnused < smallerAreaMinUnused) frontier.add(row.offerId);
    } while (i < ordered.length && ordered[i].areaIn2 === area);
    smallerAreaMinUnused = Math.min(smallerAreaMinUnused, groupMinUnused);
  }
  return entries.filter(row => frontier.has(row.offerId)).map(row => row.offerId);
}
