# Authored Double Fink joint balance

`studyAuthoredDoubleFinkElasticFrameJointBalance` is a library-only
equilibrium review for the [ordinary symmetric Double Fink centerline
frame](double-fink-authored-elastic-frame-scope.md). It uses the same
explicit model and signed combinations as the
[section-cut study](double-fink-authored-section-cut-boundary.md): model
ID and revision, roof, directed member assignments with releases, ideal
supports, source actions and weighted combinations. It takes
`caseJoints: [{ caseId, nodeIds }]` in authored combination order instead
of `caseCuts`. Each row selects exact modeled node IDs, retaining the
chosen order. It does not infer connections from coincident geometry.

## Balance one modeled node

For each selected node on a freshly solved case, include every incident
member's inside endpoint section vector. Use the member's directed local
axial and transverse axes to map its signed axial and shear components
to global force. The vector acts on the joint with positive mapping
at the modeled member start and negative mapping at its end. Apply the
same start/end sign to the section bending moment. These moments are
about the selected node, not a moment transported to another station.

Add the explicit physical nodal force and couple from that weighted
case, and the solved support reaction at the node, as separate terms.
Member loads affect the recovered inside section actions. Do not then
add their equivalent nodal vectors as if they were another physical
load applied at the joint; that would count them twice. A passing
balance means the signed terms recover equilibrium in the modeled frame.

## What joint balance cannot verify

This is a point-joint equilibrium check in an ideal elastic model, not
a connector demand or capacity check. It does not distribute loads
among plates or teeth, resolve real member contact or connection
eccentricity, or verify restraint, lumber or fastener adequacy. It
does not use supplier drawings, validate an installed connection,
or authorize design, sizing, fabrication or manufacturing. The separate
geometry-only CLI is unchanged.
