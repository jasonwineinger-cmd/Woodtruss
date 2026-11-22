# Authored mono-pitch elastic-frame displacement review

`studyAuthoredMonoElasticFrameDisplacements` is a library-only readout for the bounded synthetic [mono-pitch frame](mono-authored-elastic-frame-scope.md). It reads the requested node and member samples from the same freshly solved state, using the exact authored signed actions or explicit signed weighted case. A weighted case is solved from the combined physical actions, not assembled from earlier displacement results or selected peaks.

| Readout | Meaning |
|---|---|
| Selected node | Signed global horizontal and vertical translation (`ux`, `uy`, in inches) and modeled joint rotation (radians). If end releases leave no shared rotational degree of freedom at the joint, the rotation is null, not zero and not a member-section rotation. |
| Selected member station | Signed local axial and transverse translations (inches) and section rotation (radians), at the requested distance in inches from the exact ordered member start. A local transverse value is not global vertical displacement. Member-section rotation and joint rotation are distinct where an end is released. |

Keep each node ID and each directed member, ordered start and end, and station with its value. Do not reverse a member or reinterpret a sample in another coordinate basis without an explicit transformation. A selected station is a readout, not a search for maximum displacement.

The all-released, downward action at high node `T4` is a synthetic hand-check case. Compare the modeled displacement with the independent pin-jointed calculation under the same axial inputs and ideal restraints. This comparison does not validate arbitrary release patterns, bending or shear response, field gauge mappings, or support and uplift behavior. `T4` is not the high-side bearing node `E`.

No site loading, field measurement, allowable deflection, engineering acceptance, equipment decision, or fabrication release is implied.
