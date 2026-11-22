# Catalog-bound Double Fink section demands

`reviewDoubleFinkCatalogBoundSectionDemands` is a library-only review
of selected section demands on the [ordinary symmetric Double Fink
centerline model](double-fink-authored-elastic-frame-scope.md). Its
input is `{ study, catalog, assignments, expectedSources, receipts }`.
`study` is the exact authored model and signed weighted cases for the
[section-cut study](double-fink-authored-section-cut-boundary.md),
including directed members and stations. The function runs that
analysis afresh; it does not accept a cached demand report.

The catalog evidence covers the union of the member IDs selected for
section cuts across all cases. It does not assign or verify catalog
evidence for other members in the solved frame. For each selected
member, retain its model and revision, exact member ID and ordered
endpoints, gross rectangular area and second moment of area, and
explicit catalog and section-axis assignment. The two bending axes of
a non-square rectangle are not interchangeable. The review
does not infer a different axis from geometry or look up a stock
substitute.

The selected elastic stiffness is bound to catalog mean `E`. A
stability reference `Emin` is not a substitute for that selected
elastic model input. The [modulus provenance
check](catalog-elastic-modulus-provenance-boundary.md) compares the
expected and received documentary records for that exact assignment
and reference row. It does not verify publication bytes, authenticate
the source, or establish whether the published scope is applicable.

## Limits

The reported signed axial force, shear and moment belong together to
one solved case, directed station and side on the returned model ID and
revision. Stiffness and releases of members outside the selected union
can still change those results. That evidence is not a
material test, a whole-model design review, a member or plate capacity,
a connector demand, or an allowable deflection or strength check.
No actual stock or plate is selected. No engineering approval,
fabrication, or machine release is authorized.
