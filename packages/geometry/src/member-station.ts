// Planar centerline coordinates only; not a connection or force-transfer model.
type PointIn = Readonly<{ x: number; y: number }>;

export type MemberStationInput = Readonly<{
  startIn: PointIn;
  endIn: PointIn;
  pointIn: PointIn;
}>;

type LongitudinalPosition = 'before-start' | 'at-start-station' |
  'interior-station' | 'at-end-station' | 'after-end';
type TransversePosition = 'negative-normal' | 'on-axis' | 'positive-normal';

// Absolute numerical comparison threshold in inches. Not a construction or
// connection tolerance and never used to alter the returned coordinates.
const NUMERICAL_TOLERANCE_IN = 1e-8;

export function locateAuthoredMemberStation({startIn, endIn, pointIn}: MemberStationInput) {
  if (![startIn,endIn,pointIn].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))) {
    throw new RangeError('Member and attachment coordinates must be finite');
  }
  const dx = endIn.x-startIn.x;
  const dy = endIn.y-startIn.y;
  const lengthIn = Math.hypot(dx,dy);
  if (!(lengthIn>2*NUMERICAL_TOLERANCE_IN && lengthIn<=600)) {
    throw new RangeError('Member centerline exceeds 50 ft or its endpoints cannot be distinguished');
  }
  const axis = {x:dx/lengthIn,y:dy/lengthIn};
  const normal = {x:-axis.y,y:axis.x};
  const px = pointIn.x-startIn.x;
  const py = pointIn.y-startIn.y;
  const stationFromStartIn = axis.x*px+axis.y*py;
  const signedNormalOffsetIn = normal.x*px+normal.y*py;
  const stationFromEndIn = stationFromStartIn-lengthIn;
  const projectedPointIn = {
    x:startIn.x+axis.x*stationFromStartIn,
    y:startIn.y+axis.y*stationFromStartIn,
  };
  if (![stationFromStartIn,stationFromEndIn,signedNormalOffsetIn,projectedPointIn.x,projectedPointIn.y]
      .every(Number.isFinite)) {
    throw new RangeError('Attachment station cannot be represented');
  }
  const tol = NUMERICAL_TOLERANCE_IN;
  const longitudinal:LongitudinalPosition = stationFromStartIn < -tol ? 'before-start'
    : Math.abs(stationFromStartIn)<=tol ? 'at-start-station'
    : stationFromEndIn>tol ? 'after-end'
    : Math.abs(stationFromEndIn)<=tol ? 'at-end-station' : 'interior-station';
  const transverse:TransversePosition = signedNormalOffsetIn < -tol ? 'negative-normal'
    : signedNormalOffsetIn > tol ? 'positive-normal' : 'on-axis';
  return {lengthIn,stationFromStartIn,stationFromEndIn,signedNormalOffsetIn,projectedPointIn,
    longitudinal,transverse,comparisonToleranceIn:tol,graphAttachmentEstablished:false,
    loadTransferEstablished:false,fabricationAuthorized:false} as const;
}
