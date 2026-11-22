# Authored Double Fink section cuts

`studyAuthoredDoubleFinkElasticFrameSectionCuts` is a library-only review
of the [generic Double Fink elastic frame](double-fink-authored-elastic-frame-scope.md).
It uses the ordinary symmetric, flat-bottom, eight-bay centerline graph
with level bearings and an 8–50 ft span. Raised heels, overhangs and
supplier-specific layouts are outside this API. No private or public
supplier drawing is used as a model.

## Request a cut on a named, solved case

Supply the model ID and revision, roof, explicit member assignments
and releases, ideal supports, signed source actions and explicit weighted
combinations. The input fields are `modelId`, `modelRevision`, `roof`,
`memberAssignments`, `supports`, `sources`, `combinations` and
`caseCuts`. Define cuts separately for each combination. Each member
selection names `memberId`, `startNodeId` and `endNodeId` in its exact
modeled order, then supplies `cuts` with `stationIn` and `side`. A station
is measured in inches from that member's modeled start, not from either
bearing or from the edge of a piece of lumber.

The solver freshly applies each combination's signed factors to the
physical actions. It reports one co-located signed local axial force,
shear and bending moment (`axialLb`, `shearLb`, `momentLbIn`) for each
requested station and side, not weighted extrema from separate solves.

- Use `left` or `right` at a retained interior concentrated-action
  station, meaning the limit from smaller or larger directed station,
  respectively. Do not average across a jump.
- Exact cancellation of coincident signed actions can leave an authored
  point station in the combined model. Request its declared side as
  usual; the two limits agree when the net point action is zero.
- Use `continuous` away from a declared point and at either member end.
  An end value is the limit from inside the member, not an external
  node-on-member action or an extrapolated value.

## What the result does not establish

The result is `PRELIMINARY_NOT_ENGINEERED` with
`fabricationAuthorized: false`. It covers only the prescribed model,
loads and directed cuts. An analysis section is not a shop cut or a
connector-demand vector. The readout does not size lumber or plates,
evaluate capacity or field conditions, establish a design envelope, or
authorize fabrication. The geometry-only Double Fink CLI is unchanged.
