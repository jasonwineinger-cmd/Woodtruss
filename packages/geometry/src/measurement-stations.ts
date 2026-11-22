// Geometric station registration only. A shared station does not establish a
// coincident joint, measurement direction, interpolation, or a deflection value.
type PointIn = Readonly<{ x: number; y: number }>;
type Mark = Readonly<{ id: string; positionIn: PointIn }>;
type Station = Readonly<{ id: string; stationIn: number; signedOffsetIn: number }>;
type Association =
  | { kind: 'same-longitudinal-station-only'; referenceIds: string[] }
  | { kind: 'strictly-bracketed-only'; beforeIds: string[]; afterIds: string[] }
  | { kind: 'unbracketed' };

export type MeasurementStationInput = Readonly<{
  originBearingIn: PointIn;
  endBearingIn: PointIn;
  references: readonly Mark[];
  gages: readonly Mark[];
}>;

const MAX_SPAN_IN = 600;
// Numerical tie tolerance, not an installation, survey, or gage accuracy limit.
const EPS_IN = 1e-8;

export function registerMeasurementStations(input: MeasurementStationInput) {
  const { originBearingIn: o, endBearingIn: e } = input;
  const check = (p: PointIn) => {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new RangeError('Point coordinates must be finite');
  };
  check(o);
  check(e);
  const dx = e.x - o.x;
  const dy = e.y - o.y;
  const spanIn = Math.hypot(dx, dy);
  if (!(spanIn > EPS_IN && spanIn <= MAX_SPAN_IN)) {
    throw new RangeError('Bearing span must be positive and no longer than 50 ft');
  }
  const axis = {x: dx / spanIn, y: dy / spanIn};
  const normal = {x: -axis.y, y: axis.x};
  function project(marks: readonly Mark[]): Station[] {
    const ids = new Set<string>();
    return marks.map(({id, positionIn: p}) => {
      if (!id.trim() || ids.has(id)) throw new RangeError('Mark identifiers must be nonempty and unique per set');
      ids.add(id);
      check(p);
      const x = p.x - o.x;
      const y = p.y - o.y;
      const stationIn = x * axis.x + y * axis.y;
      const signedOffsetIn = x * normal.x + y * normal.y;
      if (!Number.isFinite(signedOffsetIn) || !Number.isFinite(stationIn) ||
          stationIn < -EPS_IN || stationIn > spanIn + EPS_IN) {
        throw new RangeError('Station must project within the ordered bearing span');
      }
      return {id, stationIn, signedOffsetIn};
    });
  }
  const references = project(input.references).sort((a,b) => a.stationIn - b.stationIn);
  const gages = project(input.gages).map(gage => {
    const peers = (s: number) => references.filter(r=>Math.abs(s-r.stationIn)<=EPS_IN).map(r=>r.id).sort();
    const same = peers(gage.stationIn);
    let association: Association;
    if (same.length > 0) {
      association = {kind:'same-longitudinal-station-only', referenceIds:same};
    } else {
      const before = references.filter(r=>r.stationIn<gage.stationIn).at(-1);
      const after = references.find(r=>r.stationIn>gage.stationIn);
      association = before && after
        ? {kind:'strictly-bracketed-only', beforeIds:peers(before.stationIn), afterIds:peers(after.stationIn)}
        : {kind:'unbracketed'};
    }
    return {...gage, association};
  });
  return {spanIn, originBearingIn:{...o}, axis, normal, references, gages,
    jointEquivalenceEstablished:false, displacementPredicted:false, fabricationAuthorized:false} as const;
}
