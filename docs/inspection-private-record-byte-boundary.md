# Private job-truss inspection record byte boundary

The library-only async `reviewJobTrussInspectionRecordBytes` accepts an
exact `{ intake, artifact }` request. It adds local byte comparison to the
existing `reviewJobTrussInspectionIntake` documentary review. The existing
documentary API is unchanged and does not read record bytes.

- The documentary intake must already match the independently expected job,
  truss and design revision, its separate inspection and signature references,
  and the required preliminary and detailed faces. This byte check does not
  override any held discrepancy, correction or missing evidence.
- The artifact is exactly `{ inspectionRecordId, designRevision, bytes }`.
  The artifact ID and revision must match the independent expectation in
  the intake, not merely a claim in the supplied evidence. The expected
  SHA-256 is the inspection record's separately supplied digest, not the
  design artifact digest. Use independently obtained expected evidence;
  copying the expectation from the artifact defeats the comparison.
- Supply a nonempty, nonshared `Uint8Array` view of at most 16 MiB. Only
  the bytes within that view are compared; adjoining backing-buffer bytes
  are outside scope. A malformed, unmatched or unreadable artifact is held.

A match reports byte agreement only. It does not parse an inspection form,
interpret its contents, validate a signature, independently confirm any
credential or physical inspection, verify a repair, or establish code
compliance or structural adequacy. The response does not echo private bytes,
hashes, record IDs, revision labels or signature references. It grants no
shipping, fabrication or machine-release authority.
