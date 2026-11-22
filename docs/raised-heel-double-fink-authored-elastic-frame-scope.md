# Authored raised-heel Double Fink elastic-frame study scope

**Preliminary model review only.** The library functions
`buildRaisedHeelDoubleFinkAuthoredElasticFrameModel` and
`studyAuthoredRaisedHeelDoubleFinkElasticFrameReactions` use the generic
symmetric raised-heel Double Fink centerline graph: eight bays, 18 nodes,
and 33 directed members. This is a schematic `family: 'common'` model, not
a supplier drawing or an as-built record. It uses a flat bottom chord,
level bearings, a horizontal span of 8–50 ft and a 1–48 in centerline heel
offset. The top pitch must be positive and no greater than 18:12, with
nondegenerate chord separation. Overhangs and a sloping bottom chord are
not supported.

## Explicit model and signed load inputs

- Supply each exact ordered member's ID and directed start and end IDs.
  Declare positive finite area, second moment of area and elastic modulus,
  both end-rotation release flags, and paired shear modulus and effective
  shear area if using the shear-flexible model. The study does not select
  stock, stiffness, or joint behavior.
- Supply explicit ideal restraints at the bottom bearing nodes `L` and
  `E`. The raised top heel nodes `HL` and `HE` are separate, even though
  each shares the X coordinate of its bearing. They are not alternative
  support positions. The centerline offset and end webs do not establish
  bearing contact, heel block or connection details, or uplift capacity.
- Supply the original signed actions, exact source references, explicit
  factors for each authored combination, and a named modeled node for
  the moment origin. Each combination is solved on the same authored
  frame, not assembled from independently reported peaks. Distributed
  actions preserve their declared member-length or horizontal-projection
  basis; the two are not interchangeable. The review does not select
  loads, factors, or an equipment process.

## Separate from reference and design workflows

The existing `--double-fink-reference` CLI remains a separate, zero-heel,
geometry-only display. This raised-heel reaction study is library-only;
it is not a CLI feature, product or project import, or reproduction of
a manufacturer design. Computed reactions describe only the supplied
idealized frame and weighted actions. They do not establish structural
adequacy, real bearing behavior, lumber or connector sizing, bracing,
code compliance, or fabrication and machine-release authority.
