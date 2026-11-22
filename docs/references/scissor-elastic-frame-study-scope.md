# Scissor elastic-frame study: preliminary scope

The study uses the existing symmetric scissor centerline topology: top and bottom chords and explicit web members between level bearing nodes `L` and `E`. It does not extend that topology to raised heels, overhangs, offset bearings, or asymmetric layouts. The horizontal study limit is exactly 50 ft (600 in), not a capacity rating. A case extending farther remains out of scope.

## Model and load inputs

- Supply a separate positive finite area `A` (in²), second moment `I` (in⁴), and modulus `E` (psi) for every directed centerline member. Bind each row to the exact member ID and start/end nodes; an end release belongs to the member end at that named node, not to all members intersecting it. State both rotational-release flags explicitly. A released end is an ideal zero moment transfer, not a connector rating. Optional shear is also explicit: supply a positive finite shear modulus and effective shear area where modeled. Omission is the no-shear member formulation, not a selected wood property. These are analysis inputs, not stock, grade, plate, or fabrication selections.
- Use the exact L/E support declarations for this study. The reference setup is `L` restraining horizontal and vertical translation and `E` restraining vertical translation only, with neither support fixing joint rotation. A member end release does not change those support declarations. Reactions are actions at ideal restraints; a downward reaction under an uplift state is not proof of contact, bearing, a hold-down, or resistance to sliding.
- Solve signed, explicitly supplied actions on the same linear frame. For explicitly weighted inputs, retain each source case, signed factor, and force basis or station with the combined case. Reassemble the physical actions and solve again; do not weight previously selected peaks. No default snow, wind, occupancy, or code combination is implied.

## What a numerical check establishes

The pre-existing pin-jointed scissor path is a separate axial-only idealization on the same schematic topology. It takes uniform illustrative area and modulus, explicit nodal loads, and ideal pin/roller bearings. An elastic frame can carry member bending where end fixity and loads permit it; identical topology and matching support reactions do not imply identical internal moment, rotation, or axial-force distribution.

For an independent weighted-load equilibrium check on the stated two-support setup, sum the actual signed forces and couples about `L` (counterclockwise positive). The predicted vertical reaction at `E` is the negative applied moment divided by the horizontal L–E span; `L` supplies the remaining vertical resultant and all horizontal reaction. Check these signed reactions against the fresh solve. The formula follows only from this ideal support arrangement and does not establish internal stress or rigidity. Compare any claimed member behavior separately with an independent analytic fixture that uses the same section properties, member direction, end releases, shear treatment and loads. Balanced reactions alone are not that check.

This review establishes neither serviceability limits nor capacity, uplift anchorage, buckling or lateral restraint, lumber grades, connector plates, site loads, or code compliance. It is not a source of cut dimensions, manufacturing data, or release authority.
