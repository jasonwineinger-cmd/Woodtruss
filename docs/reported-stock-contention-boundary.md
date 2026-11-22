# Reported stock contention boundary

The library-only `auditReportedStockContention` examines a single bounded scenario of up to 250 member needs and 500 reported offers. It asks how many needs could be covered simultaneously, using at most one need per reported whole stock piece. The maximum matching count and the difference from the requested number of needs describe that scenario only. A shortfall does not identify particular members that must go uncovered: several different matchings can yield the same count.

The calculation uses all existing evidence-screened eligible member/offer links, not only the offers on each member’s individual Pareto frontier. An eligible offer that looks worse for a single member can still matter when multiple members compete for the same stock. Offers that alias the same `stockRecordId` share one reported count when they agree on the exact reference identity, stock length and piece count. Contradictory aliases put the review on hold instead of increasing or reconciling the reported count.

The audit counts hypothetical coverage, not assignments. It does not return a purchasing choice, allocate or reserve inventory, nest cuts into a piece, or verify that stock exists or is available. A full match does not establish strength, code compliance, suitability for fabrication, or authority to release.
