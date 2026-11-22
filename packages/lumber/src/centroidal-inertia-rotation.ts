export interface CentroidalAreaInertia {
  ixIn4: number;
  iyIn4: number;
  /** Signed integral of x*y about the supplied centroid, not its negative. */
  ixyIn4: number;
}
export interface CentroidalInertiaRotationInput {
  sectionId: string;
  tensorBasisId: string;
  tensor: CentroidalAreaInertia;
  /** Rotation of the reference axes about the same centroid, counterclockwise. */
  axesRotationDegrees: number;
}

const identity = (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.trim() === s;

function positiveDefinite({ ixIn4, iyIn4, ixyIn4 }: CentroidalAreaInertia) {
  if (![ixIn4, iyIn4, ixyIn4].every(Number.isFinite) || ixIn4 <= 0 || iyIn4 <= 0) return false;
  // Compare to sqrt(Ix*Iy) without forming the potentially overflowing product Ix*Iy.
  // Divide by the larger root first so a valid cross term cannot overflow.
  return Math.abs(ixyIn4) / Math.sqrt(Math.max(ixIn4, iyIn4)) < Math.sqrt(Math.min(ixIn4, iyIn4));
}

function rotate(tensor: CentroidalAreaInertia, theta: number): CentroidalAreaInertia {
  const { ixIn4, iyIn4, ixyIn4 } = tensor;
  if (theta === 0 || Math.abs(theta) === 180) return { ixIn4, iyIn4, ixyIn4 };
  if (Math.abs(theta) === 90) return { ixIn4: iyIn4, iyIn4: ixIn4, ixyIn4: ixyIn4 === 0 ? 0 : -ixyIn4 };

  const radians = theta * (Math.PI / 180);
  if (radians === 0) throw new Error("Angle cannot be represented in the working numeric range");
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const cc = c * c;
  const ss = s * s;
  const cs = c * s;
  // Scale to avoid unsafe sums and preserve sign of the off-diagonal.
  const scale = Math.max(ixIn4, iyIn4);
  const x = ixIn4 / scale;
  const y = iyIn4 / scale;
  const xy = ixyIn4 / scale;
  if (x === 0 || y === 0 || (xy === 0 && ixyIn4 !== 0)) {
    throw new Error("Input tensor components cannot be retained in the working numeric range");
  }
  return {
    ixIn4: scale * (x * cc + y * ss - xy * (2 * cs)),
    iyIn4: scale * (x * ss + y * cc + xy * (2 * cs)),
    ixyIn4: scale * (xy * (cc - ss) + (x - y) * cs),
  };
}

/** Geometric reference-axis transformation. Not a principal-axis, section
 * strength, installed orientation, material or engineering approval check. */
export function rotateAuthoredCentroidalInertia(input: CentroidalInertiaRotationInput) {
  const { sectionId, tensorBasisId, tensor, axesRotationDegrees } = input;
  if (!identity(sectionId) || !identity(tensorBasisId) || !tensor ||
      !Number.isFinite(axesRotationDegrees) || Math.abs(axesRotationDegrees) > 180) {
    throw new Error("An explicit section and tensor basis plus an axis rotation within ±180 degrees are required");
  }
  if (!positiveDefinite(tensor)) throw new Error("Expected a finite positive-definite centroidal area inertia tensor");
  const sourceTensor = { ixIn4: tensor.ixIn4, iyIn4: tensor.iyIn4, ixyIn4: tensor.ixyIn4 };
  const rotatedTensor = rotate(sourceTensor, axesRotationDegrees);
  if (!positiveDefinite(rotatedTensor)) {
    throw new Error("Rotated tensor cannot be represented as positive-definite in the working numeric range");
  }
  return {
    status: "PRELIMINARY_GEOMETRY_ONLY" as const, sectionId, tensorBasisId, axesRotationDegrees,
    sourceTensor, rotatedTensor,
    signConvention: "Ix integrates y², Iy integrates x², and Ixy integrates x*y; positive angles rotate the axes counterclockwise.",
    sourceTensorIndependentlyVerified: false as const,
    approvedForStructuralUse: false as const,
  };
}
