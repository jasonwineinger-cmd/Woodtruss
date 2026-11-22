# Preliminary reported length budget

`reviewPreliminaryReportedLengthBudget` is a fabrication-package library
review of nominal length arithmetic. The caller supplies one reported stock record, a list of 1–1,024 hypothetically accounted pieces, and
their allowances. It does not verify inventory or choose pieces.

- Enter lengths as exact integer ticks, where one tick is 1/64 inch. Supply
  distinct record identifiers within the review; do not reuse an identifier
  for a separate item.
- For (n) pieces supply exactly (n-1) strictly positive separation rows.
  A single piece therefore has no separation rows.
- Supply both end rows. Each records its own offcut and kerf lengths as
  nonnegative values. Enter zero explicitly where applicable; missing
  allowances are not zero.
- Add piece lengths, separations and both ends' offcuts and kerfs once. Compare
  that sum to the caller-reported source length. Equality leaves zero
  unaccounted ticks; a deficit of one tick is a deficit, with no rounding
  allowance. The repository’s 50-foot truss-span limit is unchanged; it is not
  a limit on this diagnostic integer range or a stock or machine capability.

The library takes exact `stockRecordId`, `stockLengthTicks`, `pieces`, `separators` and `endTrims`. Pieces have a `pieceRecordId` and `lengthTicks`; separators have a `separatorRecordId` and `kerfTicks`. Both `endTrims.leading` and `endTrims.trailing` require a `trimRecordId`, `offcutTicks` and `kerfTicks`. The signed margin is reported stock minus required length. Below-zero margins describe shortages rather than malformed input; a malformed or overflowing ledger returns only a hold without the amounts or identifiers.

For arithmetic corroboration only, Alpine's [ALS 4.0 XE Product Manual,
M1026-R2, section 3.3.3](https://alpineitw.com/wp-content/uploads/2023/06/M1026-R2_Alpine-ALS-4.0-XE__English.pdf)
gives two 96-inch pieces and three ¼-inch allowances, totaling 192¾ inches.
With those stated amounts and no additional offcut, the total is 12,336 ticks:
12,336 ticks balance exactly and 12,335 are one tick short. These are the
assumptions of that example, not default kerf, trim, or controller settings.
Manuals for other controller models or revisions are not interchangeable.

A nominal balance does not establish stock dimensions, piece fit, structural
suitability, or production readiness. This review supplies no cut positions,
sequence, optimizer, purchasing recommendation, shop instruction, machine
output, or fabrication authorization.
