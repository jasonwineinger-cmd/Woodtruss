/** Ordered basis for idealized in-plane support preflight, not a support model. */
export type InclinedSupportAxisInput =
  | Readonly<{ kind: 'direction'; dx: number; dy: number }>
  | Readonly<{ kind: 'angle-degrees'; ccwFromGlobalXDeg: number }>;

type GlobalVector = Readonly<{ x: number; y: number }>;
type AxisComponents = Readonly<{ alongFree: number; alongConstrainedNormal: number }>;

const clean = (x: number) => x === 0 ? 0 : x;

function finite(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError('Finite axis components are required');
}

export function createInclinedSupportAxis(input: InclinedSupportAxisInput) {
  let x: number;
  let y: number;
  if (input.kind === 'direction') {
    finite(input.dx,input.dy);
    const scale = Math.max(Math.abs(input.dx),Math.abs(input.dy));
    if (scale === 0) throw new RangeError('Support direction must be nonzero');
    // Normalize before hypot to avoid overflow/underflow for finite inputs.
    x = input.dx / scale;
    y = input.dy / scale;
    const length = Math.hypot(x,y);
    x /= length;
    y /= length;
  } else if (input.kind === 'angle-degrees') {
    const angle = input.ccwFromGlobalXDeg;
    if (!Number.isFinite(angle) || Math.abs(angle) > 360) {
      throw new RangeError('Author an angle in degrees within one turn of global +x');
    }
    const normalized = angle % 360;
    // Preserve exact zeros at the four cardinal directions.
    if (normalized === 0) [x,y] = [1,0];
    else if (normalized === 90 || normalized === -270) [x,y] = [0,1];
    else if (normalized === 180 || normalized === -180) [x,y] = [-1,0];
    else if (normalized === 270 || normalized === -90) [x,y] = [0,-1];
    else {
      const radians = angle * (Math.PI / 180);
      [x,y] = [Math.cos(radians),Math.sin(radians)];
    }
  } else {
    throw new RangeError('Unknown authored support axis kind');
  }

  // +normal is a CCW quarter-turn from the signed +free axis. No axis is
  // canonicalized: reversing authored direction reverses both signed components.
  const freeGlobal = Object.freeze({x:clean(x),y:clean(y)});
  const constrainedNormalGlobal = Object.freeze({x:clean(-y),y:clean(x)});

  return {
    freeGlobal,
    constrainedNormalGlobal,
    normalConvention: 'ccw-quarter-turn-from-positive-free-axis',
    physicalFixityInferred: false,
    bearingCapacityVerified: false,
    fabricationAuthorized: false,
    globalToLocal(global: GlobalVector): AxisComponents {
      finite(global.x,global.y);
      const alongFree = global.x*x + global.y*y;
      const alongConstrainedNormal = -global.x*y + global.y*x;
      finite(alongFree,alongConstrainedNormal);
      return {alongFree:clean(alongFree),alongConstrainedNormal:clean(alongConstrainedNormal)};
    },
    localToGlobal(local: AxisComponents): GlobalVector {
      finite(local.alongFree,local.alongConstrainedNormal);
      const gx = local.alongFree*x - local.alongConstrainedNormal*y;
      const gy = local.alongFree*y + local.alongConstrainedNormal*x;
      finite(gx,gy);
      return {x:clean(gx),y:clean(gy)};
    },
  } as const;
}
