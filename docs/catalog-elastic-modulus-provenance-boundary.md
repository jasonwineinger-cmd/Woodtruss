# Catalog elastic modulus provenance boundary

This library review adds a documentary source check after the
[catalog elastic stiffness audit](catalog-elastic-member-stiffness-boundary.md).
The audit compares authored member properties; this companion asks whether
each assigned modulus has its own matching source receipt. Neither path
chooses a modulus for a design check.

- Obtain the expected scope and source identities independently of the
  receipts being checked. Each receipt must match its exact assignment,
  catalog and stock row, including species group, grade, nominal and actual
  dimensions, publisher, edition and table. A similar product, equal numeric
  modulus, or matching reference label does not replace a record.
- Keep the chosen field explicit: `E` and `Emin` are not interchangeable.
  Check the receipt against the selected field and its declared NDS
  Supplement or Supplement-update artifact role, ID and SHA-256. Do not
  substitute the NDS rulebook, a differently scoped document, or a source
  locator alone. The checked psi value remains private intake data and is
  not repeated in the review result.
- For context only, the [Southern Pine Inspection Bureau’s January 2026
  Mechanically Graded Lumber Procedures](https://www.spib.org/pdfs/mgl_procedures_2026.pdf)
  are an example of a separate grading-program source. That role is not
  interchangeable with a declared NDS Supplement or its update. This
  note imports no values, factors, defaults or licensed reference data.

Matching means only that the supplied documentary records agree. The
check does not read or match publication bytes, independently verify a
publisher or license, determine applicability or adjustment factors, run
a solve, or establish design, structural, fabrication or release approval.

Each source row repeats the exact model ID and revision, member ID, ordered
start and end, and declared bending axis. Reusing an assignment record label
on another revision or axis cannot carry forward the old receipt.
