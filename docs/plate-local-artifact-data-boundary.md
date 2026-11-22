# Local plate reference data and artifact boundary

The plate-reference review compares caller-authored evidence against an
explicit expected scope. It first snapshots accepted plain data, then
validates that detached snapshot. The accepted input fields are specific
to each review, not a place to attach claims of authority, additional
metadata or instructions. Unexpected own properties, inherited
substitutes for required keys, non-plain record prototypes, and
accessors are outside the record contract. An accessor is not called
to obtain evidence. JavaScript reflection can still invoke arbitrary
Proxy traps; this is not a sandbox for hostile executable objects.

## Local bytes

The [dated and scoped report reviews](references/plate-resistance-mechanism-and-label-boundary.md)
accept caller-supplied local bytes for a separately declared exact report.
The verifier copies only the selected `Uint8Array` view, including its
offset and length, not its entire backing buffer. It owns that copy
before the first asynchronous wait for SHA-256. Changes to the caller's
view after the check starts cannot change the bytes being digested.
Shared backing memory is rejected, along with unavailable, empty or
out-of-scope byte inputs. An unavailable digest or a mismatch holds
the review. Private artifact bytes are not returned. A report URL in
reference metadata does not cause the verifier to fetch anything.

## What a match means

A match establishes local byte identity against the declared digest and
agreement with the supplied scope. It does not extract or verify table
values, authenticate an issuer or manufacturer, check a signature or
current report status, or establish permission to possess or use the
document. It establishes neither applicability nor connector capacity.
It does not select a plate or press, verify engineering, or release
fabrication or a machine workflow.
