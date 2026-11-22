# Authored Double Fink elastic-frame study scope

**Preliminary model review only.** The library functions
`buildDoubleFinkAuthoredElasticFrameModel` and
`studyAuthoredDoubleFinkElasticFrameReactions` use the existing generic
Double-Fink-style common centerline graph. The symmetric eight-bay graph
has 16 nodes and 29 directed members. Its level bearing span is 8–50 ft;
the bottom chord is flat, with no raised heel, overhang, or offset
bearing. This reference is not a supplier drawing, an as-built survey,
or a specification for manufactured member dimensions.

## Author model and load inputs explicitly

- Specify `family: 'common'`, the span, and the top-chord pitch. Bind
  one assignment to every exact member ID and its ordered start and end
  node IDs. Supply positive finite area, second moment of area, elastic
  modulus, and expressly declare both end-rotation release flags. Supply
  shear modulus and effective shear area together if using the optional
  shear-flexible model. No stock, stiffness, or fixity is inferred.
- Supply ideal supports at the actual bearing nodes `L` and `E`.
  Upper and lower interior nodes are not alternative bearing IDs.
  Preserve the authored restraint directions; a modeled reaction is
  not a bearing or uplift capacity.
- Supply the original signed source actions, explicit factors for each
  authored combination, and an exact modeled node as the moment origin.
  Actual-member and horizontal-projected intensities are distinct
  input bases. Each signed combination is solved afresh on the same
  authored frame, rather than assembled from separate reported peaks.
  A failed case is withheld, not recorded as a zero reaction.

## Distinguish the two entry points

The existing `--double-fink-reference` CLI displays centerline geometry
only. The authored elastic functions are separate and library-only.
They require member bending stiffness, release and support assumptions,
and authored actions, and report preliminary signed reactions only
for that modeled basis. They do not add a CLI mode or a supplier
or project import.

Neither path derives site loads or code combinations, verifies physical
joint behavior, sizes lumber or plates, or produces equipment or
fabrication instructions. Geometry or equilibrium agreement is not
engineering approval or release eligibility.
