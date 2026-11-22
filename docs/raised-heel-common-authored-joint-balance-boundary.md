# Authored raised-heel common joint balance

`studyAuthoredRaisedHeelCommonElasticFrameJointBalance` is a
library-only equilibrium review for the [level-bearing raised-heel
common frame](raised-heel-common-authored-elastic-frame-scope.md).
Its symmetric centerlines have a flat bottom chord, 1–48 in of
raised heel, and an 8–50 ft bearing span. Overhangs and offset
bearings are outside this scope.

The modeled upper heel nodes are `HL` and `HE`. An authored load
at either upper heel acts there, not at the corresponding lower
node. Only `L` and `E` are the modeled bearing nodes; the upper
heels do not establish bearing restraints or physical fixity.

## Request and balance the modeled joints

As in the [ordinary joint-balance study](double-fink-authored-joint-balance-boundary.md),
supply the model ID and revision, roof, exact directed member assignments,
explicit release flags, ideal support restraints, signed source actions
and weighted combinations. Supply `caseJoints: [{ caseId, nodeIds }]` in
authored combination order and select each exact node by its modeled ID.

The study freshly solves each weighted case. For every selected node,
it maps each incident member's inside endpoint section actions to the
global axes. The vector acts on the modeled joint with positive mapping
at the member start and negative mapping at the member end, including
the signed moment. Add the separately authored physical nodal force
and couple and the solved support reaction to check equilibrium. Do
not add equivalent nodal vectors from member loads a second time.

## Boundary

This is mathematical equilibrium for one authored frame and load case.
It is not a plate-demand vector, a physical connection or restraint
check, a site loading or capacity check, or verification of uplift
resistance. It provides no sizing, engineering approval, fabrication or
machine release.
