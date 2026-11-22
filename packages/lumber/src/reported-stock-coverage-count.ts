type CoverageInput = {
  availablePieces: readonly number[];
  eligibleStockIndices: readonly (readonly number[])[];
};
type Edge = { target: number; reverse: number; capacity: number };

/** Count coverage of explicit unit demands by authored candidate links and
 * piece counts only. No assignments, inventory reservations or approvals. */
export function countMaximumReportedStockCoverage({ availablePieces, eligibleStockIndices }: CoverageInput): number {
  if (!Array.isArray(availablePieces) || !Array.isArray(eligibleStockIndices) ||
      availablePieces.length > 500 || eligibleStockIndices.length > 250)
    throw new Error("Reported stock coverage exceeds the supported scope");
  const members = eligibleStockIndices.length, stocks = availablePieces.length;
  const source = 0, firstStock = 1 + members, sink = firstStock + stocks;
  const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  function add(from: number, target: number, capacity: number) {
    const forward = { target, reverse: graph[target].length, capacity };
    const back = { target: from, reverse: graph[from].length, capacity: 0 };
    graph[from].push(forward);
    graph[target].push(back);
  }
  for (let i = 0; i < stocks; i++) {
    const pieces = availablePieces[i];
    if (!Number.isSafeInteger(pieces) || pieces < 0) throw new Error("Invalid reported stock piece count");
    add(firstStock + i, sink, Math.min(pieces, members));
  }
  let linkCount = 0;
  for (let i = 0; i < members; i++) {
    const links = eligibleStockIndices[i];
    if (!Array.isArray(links) || links.length > stocks || (linkCount += links.length) > 30_000) {
      throw new Error("Invalid or excessive reported stock links");
    }
    const seen = new Set<number>();
    const member = 1 + i;
    add(source, member, 1);
    for (const stock of links) {
      if (!Number.isSafeInteger(stock) || stock < 0 || stock >= stocks || seen.has(stock)) {
        throw new Error("Unknown or repeated eligible stock index");
      }
      seen.add(stock);
      add(member, firstStock + stock, 1);
    }
  }
  let covered = 0;
  const previous = new Int32Array(sink + 1), via = new Int32Array(sink + 1), queue = new Int32Array(sink + 1);
  while (covered < members) {
    previous.fill(-1);
    previous[source] = source;
    queue[0] = source;
    let tail = 1;
    for (let head = 0; head < tail && previous[sink] < 0; head++) {
      const node = queue[head];
      for (const [index, edge] of graph[node].entries()) {
        if (edge.capacity <= 0 || previous[edge.target] >= 0) continue;
        previous[edge.target] = node;
        via[edge.target] = index;
        queue[tail++] = edge.target;
        if (edge.target === sink) break;
      }
    }
    if (previous[sink] < 0) break;
    // Every source-to-member edge has unit capacity. Reverse arcs allow
    // previous matches to be rearranged rather than imposing greedy order.
    for (let node = sink; node !== source; node = previous[node]) {
      const edge = graph[previous[node]][via[node]];
      edge.capacity--;
      graph[node][edge.reverse].capacity++;
    }
    covered++;
  }
  return covered;
}
