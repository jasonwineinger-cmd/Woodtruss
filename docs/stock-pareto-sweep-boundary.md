# Preliminary stock Pareto sweep

For each member, the stock review compares eligible offers on two objectives: smaller actual section area and less unused stock length for that member's requested cut. An offer dominates another only when it is no worse on both objectives and strictly better on at least one. Distinct offers with identical objective pairs are not collapsed; if the pair survives dominance, all of its offers remain visible. Results retain their existing candidate order rather than exposing the sweep's sort order.

The sorting-and-sweep step replaces the pairwise dominance scan. For `n` eligible offers for one member, sorting takes O(n log n) and the sweep takes O(n). This describes the frontier algorithm, not end-to-end timing or a benchmark guarantee.

Eligibility checks still precede the frontier. In evidence-gated review, the comparison is computed from all candidates that pass the applicable evidence and schematic checks, not by filtering an already-computed schematic frontier. An offer on hold therefore cannot hide a documented alternative. Matching evidence is documentation only, not independent verification.

Each result is a geometric stock comparison for one member, not a stock recommendation, inventory allocation, reservation, or nesting/cutting optimization. It does not establish strength, code compliance, or authority to fabricate or release.
