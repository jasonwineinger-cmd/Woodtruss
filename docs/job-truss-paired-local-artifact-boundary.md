# Paired local design and inspection artifacts

`reviewJobTrussInspectionPairedArtifactBytes` extends the
[documentary job/truss intake and private inspection record check](inspection-private-record-byte-boundary.md)
to two separately identified local artifacts. Supply the exact expected
and observed intake for one job, one truss and one design revision. The
caller supplies an independent `expectedDesignArtifactId`, not a design
artifact identity inferred from the inspection record.

The design artifact must match its expected ID, design revision and
design SHA-256. The inspection artifact must separately match its
expected inspection record ID, the same design revision and its own
expected SHA-256. These checks do not replace the exact intake, its
separate signature reference, or its reported-correction hold. A design
file is not an inspection record, and neither serves as the other's
byte evidence.

## All-or-nothing local byte identity

Both inputs are caller-supplied private byte views. The helper takes
owned copies of both selected ranges before awaiting either digest;
it does not hash unused bytes in their backing buffers. The paired
result establishes byte identity only if both checks pass. A missing,
invalid or mismatching side does not return partial success. The helper
does not fetch or open a document by ID or locator and does not return
private bytes.

## What remains unverified

Digest agreement does not authenticate the design, prove that a truss
was inspected, validate a signature, or verify that a correction was
completed and reinspected. It does not assess engineering adequacy or
establish permission to possess, use or share either document. It does
not authorize shipping, fabrication or machine release. Synthetic
examples exercise identity checks only; they are not plant QA records.
