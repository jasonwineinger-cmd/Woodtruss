# Mono-pitch authored elastic-frame study scope

**Synthetic model review only.** The study uses the existing mono centerline graph: four equal horizontally projected bays, a rising top chord, and a flat bottom chord. It has nine nodes and fifteen directed members. The low chord junction shares bearing node `L`; at the high side, upper chord node `T4` is distinct from lower bearing node `E`, even though their horizontal coordinates agree. The horizontal L–E span is limited to 50 ft (600 in). No raised heel, overhang, or offset-bearing variant is implied.

## Author each model and load input

- Bind positive finite area `A`, second moment of area `I`, and elastic modulus to every exact directed member ID and ordered start and end node. Declare the rotational release at each end explicitly. A local end release is a model assumption at that member end, not proof of a physical hinge or joint fixity. If shear deformation is modeled, declare the relevant shear inputs separately; omission does not select a material property. Preserve the original member direction when interpreting signed end actions.
- Supply explicit ideal support declarations at the two distinct bearing nodes `L` and `E`. Keep the prescribed Cartesian directions or inclined restraint basis as authored, and interpret reactions in the corresponding basis or project them explicitly to common global axes. Do not apply `E`'s constraint at `T4`, infer another restraint, or translate an ideal reaction into contact, uplift anchorage, or bearing capacity.
- Use only explicitly authored signed actions, with their force basis and application joint or member station. For a weighted case, retain each original case and its signed factor, assemble the combined physical actions, and solve that case afresh. Do not weight previously reported peaks or imply any software-selected site load or code combination. Hold a case with invalid or unstable inputs rather than recording an assumed zero answer.

## Keep the pin baseline separate

The existing axial-only mono pin-joint baseline uses schematic centerlines and idealized nodal load transfer. The authored elastic frame instead has member bending stiffness and explicit releases, with shear deformation only where supplied. Shared geometry or agreement in overall equilibrium does not verify internal moments, rotations, or local member forces. Compare signed resultants in a common basis and compare member responses only for the exact same directed ends, load case, restraint choices, and section inputs.

This study does not supply site data, applicable code combinations, design checks, connection or bracing details, selection or optimization of members, repair instructions, or allowable movement. No output authorizes fabrication, equipment work, or release.
