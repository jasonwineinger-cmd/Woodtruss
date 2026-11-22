# TPI in-plant inspection evidence boundary

**Review records only. Not an inspection finding, plant qualification, or fabrication or shipment release.**

The [TPI QA Program Tools](https://www.tpinst.org/qaprogramtools) link a [blank in-plant inspection form](https://www.tpinst.org/s/TPI-Inspection-Form_SECURE.pdf), a weekly log form, and a separate plant-specific QC manual template. Their publication does not establish that any actual truss, stock, facility, machine, or inspector has been checked or is qualified. A directory listing is not evidence of current plant status.

| Evidence | What to keep distinct |
|---|---|
| Preliminary inspection, Part I | Scope is **all joints on both faces**. The form covers lumber grade, truss dimensions, plate size and gauge, embedment and defects, plate position and rotation, and gaps at members. Preserve discrepancies and their comments; do not represent an unchecked face as a pass. |
| Detailed joint inspection, Part II | Identify the actual selected critical joint IDs and record both faces. Keep rotation, location, and member defects separate from method-specific tooth evidence. Distinguish the plate-placement method from tooth counting. The blank form marks the tooth-count line out when the placement method is used; not applicable means the item does not apply to the documented method, not unobserved, missing, or passed. The form alone does not determine which method is permitted for the joint. |
| Corrections and closure | List required repairs or corrections separately from the observation that each was completed, and keep the closure date. No corrections required is distinct from a correction that remains open or whose closure was not recorded. |
| Inspector record and weekly log | Keep the dated, inspector-signed individual record distinct from the weekly aggregate log for setup locations and shifts. A log entry is not individual inspection or correction proof. A recorded signature reference is not signature authentication. |

The companion library uses synthetic examples that bind job and truss IDs to the expected design revision and digest and keep the two faces distinct. Its record checks do not inspect stock, confirm a result or signature, determine design or code compliance, set inspection tolerances or frequencies, qualify equipment, or release work. An exact revision match does not prove an inspection occurred. Refer to the applicable ANSI/TPI 1 Chapter 3, authorized joint details, and the plant-specific process for actual inspection requirements; this note is not a replacement for them.


`reviewJobTrussInspectionIntake` compares separately declared identities and digests; it does not hash, read or authenticate the submitted inspection record. It requires two preliminary face attestations and two distinct detailed observations per independently specified joint in this software review subset. Its hold on open and reported-closed corrections is deliberate: there is no independent reinspection validator in this feature. A match changes neither the shop responsibility nor the software release gate.
