# Explicit authored elastic-frame joint balance

`studyAuthoredElasticFrameCombinationJointBalance` reviews an ordinary two-dimensional elastic
frame supplied by the caller. It does not infer a truss family,
generate members, choose properties or interpret site information.
Supply `frame: { nodes, members, supports }` with exact node coordinates
in inches, directed member endpoints, elastic properties and end releases. Supports are
explicit: either Cartesian restraint flags or an authored inclined
axis and rotation restraint. A support in this model is not evidence
of physical restraint, bearing capacity or uplift resistance.

The numeric global horizontal extent, maximum node X minus minimum
node X, must be no more than 600 in (50 ft). This is a guard on the
coordinates as supplied. It is not an allowable structural span,
a bound on sloped member length, or a proof the modeled frame fits
a particular structural family.

## Check exact nodes in each authored case

Supply the model ID and revision, signed source actions and explicit
combination factors. Each
case selects distinct exact modeled node IDs in its own ordered
`caseJoints` row. The study solves each case afresh. For each selected
node, it recovers the inside endpoint section actions for all incident
members, then maps them to global force and moment using member
direction and the start/end sign.

The node balance includes the explicit physical nodal force and
couple and the solved support reaction. The section endpoints already
reflect member loads; do not add their equivalent nodal vectors as
another physical action. A passing residual tests mathematical
equilibrium in the supplied model, not independent measurements,
connection geometry or performance.

The existing family-specific adapters keep their own geometry and
input boundaries. Neither route establishes connector or plate
demands, sizing, structural adequacy, engineering approval,
fabrication or machine release.
