# Explicit authored elastic-frame displacement samples

`studyAuthoredElasticFrameCombinationDisplacements` is a library-only
review for `frame: { nodes, members, supports }` supplied by the caller.
Use exact modeled node coordinates, directed member endpoints, explicit
elastic properties and end releases, and ideal Cartesian or inclined
restraints. The numeric horizontal extent, maximum node X minus minimum
node X, must not exceed 600 in. This is not a limit on actual member
length or an allowable span.

Supply signed source actions and explicit combination factors, and
select exact modeled nodes and directed member stations for the cases
being reviewed. Each case is solved afresh from the weighted physical
actions, not by combining reported displacements or peaks.

| Selection | Meaning |
| --- | --- |
| Modeled node | Signed global horizontal and vertical translations in inches. A modeled joint rotation is in radians. Where releases leave no shared rotational degree of freedom, joint rotation is null, not zero. |
| Directed member station | Signed local axial and transverse translations in inches and section rotation in radians. The station is in inches from the exact member start. Section rotation at a released end is a member result, not the missing joint rotation. |

Keep the case, node or ordered member endpoints, station and original
coordinate basis with every result. On an inclined member, local
transverse translation is not global vertical translation. For example,
if the member rises to the right with local axial unit vector
`(cos θ, sin θ)`, then global vertical displacement is
`u sin θ + v cos θ`, not simply the local transverse value `v`.

These are requested samples from an ideal model, not a search for
governing deflection, a comparison fitted to field gauges, verification
of bearing or uplift behavior, or a capacity or design check. The
review does not authorize fabrication or machine release.
