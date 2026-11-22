# Authored raised-heel common elastic-frame study scope

**Preliminary model review only.** The library functions
`buildRaisedHeelCommonAuthoredElasticFrameModel` and
`studyAuthoredRaisedHeelCommonElasticFrameReactions` use the existing
symmetric raised-heel common **centerline** graph. The input is
`family: 'common'` with a required, finite `heelHeightIn` of 1–48 inches.
The modeled bearings are level, the bottom chord is flat, there is no
overhang, and the horizontal span is capped at 50 ft (600 in). The heel
offset is a modeling coordinate, not a heel block, bearing seat, stock
dimension, or construction detail.

## Bind the frame and actions explicitly

- Supply one assignment per exact directed member with its original start
  and end IDs: positive finite area, second moment of area and elastic
  modulus, plus explicit start- and end-rotation release flags. Supply
  both shear modulus and effective shear area if modeling shear flexibility;
  there is no material, stiffness, or connection default.
- Supply explicit ideal support declarations at **`L` and `E`**, the two
  bottom bearing nodes. The upper heel nodes **`HL` and `HE`** are distinct,
  even though each shares the X coordinate of a bearing. A load may target
  an exact modeled upper node; that does not turn it into a support. Ideal
  bearing restraints are model inputs, not details or uplift approval.
- Provide signed authored source actions, the explicit signed factor for
  each combination term, and the modeled node used as moment origin.
  Preserve ordered member IDs and the original measure for a distributed
  action; a horizontal projection is not the actual member length. A
  weighted case is solved afresh, not assembled from previously reported
  reaction peaks. The reaction study is scoped to the entered case and
  moment origin, and does not infer site loading or code combinations.

## Keep the two analysis paths separate

The older `analyzePreliminaryRaisedHeelCommonTruss` uses illustrative uniform
area and elastic modulus in a pin-jointed axial model, with a left pin, a
right vertical roller, and an explicit nodal load case. The authored elastic
path uses the same centerline family but includes member bending stiffness,
with releases and ideal supports supplied by the caller and shear
flexibility only where specified. Matching geometry, net force, or overall
moment does not make the two models equivalent, or establish joint fixity,
internal force agreement, member adequacy, or physical bearing behavior.

Neither path selects lumber, sizes a member or connector, verifies bracing
or stability for design, checks an allowable or code limit, or grants
fabrication, equipment, or release authority. The authored functions are
library-only; they add no CLI, preview launch, or release workflow.
