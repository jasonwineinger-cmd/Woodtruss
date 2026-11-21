import type { LoadEnvelope } from "../../analysis/src/envelope.js";
import { validateLumberCatalog, type LumberCatalog } from "./catalog.js";

type AxisAssumption = {
  unbracedLengthIn: number;
  effectiveLengthFactor: number;
  /** Caller-supplied restraint basis, not independently verified. */
  restraintBasis: string;
};

export interface AxialStabilityStudyInput {
  memberId: string;
  referenceValueId: string;
  modulus: "catalog-mean" | "catalog-minimum";
  /** Axes pass through the centroid of the actual rectangular section. */
  aboutWidthAxis: AxisAssumption;
  aboutDepthAxis: AxisAssumption;
}

const positiveFinite = (n: number) => Number.isFinite(n) && n > 0;

/** Signed-envelope demand and ideal elastic column references only.
 * Neither assumed restraint nor catalog values are verified by this calculation.
 * In particular, the Euler references are not timber column capacities. */
export function studyPreliminaryAxialStability(
  envelope: LoadEnvelope, catalog: LumberCatalog, input: AxialStabilityStudyInput,
) {
  if (envelope.status !== "PRELIMINARY_NOT_ENGINEERED") throw new Error("Unsupported envelope status");
  validateLumberCatalog(catalog);
  if (!input.memberId?.trim() || !Object.hasOwn(envelope.memberForces, input.memberId))
    throw new Error("Unknown member in the force envelope");
  const force = envelope.memberForces[input.memberId];
  if (!force || ![force.minLb,force.maxLb].every(Number.isFinite) || force.minLb > force.maxLb ||
      typeof force.governingMinCase !== "string" || !force.governingMinCase.trim() ||
      typeof force.governingMaxCase !== "string" || !force.governingMaxCase.trim())
    throw new Error("Invalid member force envelope");
  const wood = catalog.records.find(row => row.referenceValueId === input.referenceValueId);
  if (!wood) throw new Error("Unknown lumber reference");
  if (input.modulus !== "catalog-mean" && input.modulus !== "catalog-minimum")
    throw new Error("Select the modulus basis explicitly");
  const E = input.modulus === "catalog-mean" ? wood.ePsi : wood.eMinPsi;
  const b = wood.actualWidthIn, h = wood.actualDepthIn, areaIn2 = b*h;
  if (!positiveFinite(areaIn2)) throw new Error("Invalid actual section area");
  const axis = (assumption: AxisAssumption, momentOfInertiaIn4: number) => {
    if (!assumption || !positiveFinite(assumption.unbracedLengthIn) ||
        !positiveFinite(assumption.effectiveLengthFactor) ||
        typeof assumption.restraintBasis !== "string" || !assumption.restraintBasis.trim())
      throw new Error("Each section axis needs an explicit positive length, factor and restraint basis");
    const effectiveLengthIn = assumption.unbracedLengthIn * assumption.effectiveLengthFactor;
    const radiusOfGyrationIn = Math.sqrt(momentOfInertiaIn4/areaIn2);
    const elasticSlenderness = effectiveLengthIn/radiusOfGyrationIn;
    const idealEulerReferenceLb = Math.PI**2 * E * momentOfInertiaIn4/effectiveLengthIn**2;
    if (![momentOfInertiaIn4,effectiveLengthIn,radiusOfGyrationIn,elasticSlenderness,idealEulerReferenceLb].every(positiveFinite))
      throw new Error("Nonfinite or unrepresentable elastic reference");
    return { momentOfInertiaIn4, radiusOfGyrationIn, effectiveLengthIn, elasticSlenderness,
      idealEulerReferenceLb, unbracedLengthIn: assumption.unbracedLengthIn,
      effectiveLengthFactor: assumption.effectiveLengthFactor, restraintBasis: assumption.restraintBasis };
  };
  const tensionDemandLb = Math.max(0,force.maxLb), compressionDemandLb = Math.max(0,-force.minLb);
  const tensionStressPsi = tensionDemandLb/areaIn2, compressionStressPsi = compressionDemandLb/areaIn2;
  if (![tensionStressPsi,compressionStressPsi].every(Number.isFinite)) throw new Error("Nonfinite axial stress");
  return {
    status: "PRELIMINARY_NOT_ENGINEERED" as const,
    memberId: input.memberId, referenceValueId: wood.referenceValueId, catalogId: catalog.catalogId,
    areaIn2, tensionDemandLb, compressionDemandLb, tensionStressPsi, compressionStressPsi,
    tensionCase: tensionDemandLb > 0 ? force.governingMaxCase : null,
    compressionCase: compressionDemandLb > 0 ? force.governingMinCase : null,
    modulusBasis: input.modulus,
    aboutWidthAxis: axis(input.aboutWidthAxis, b*h**3/12),
    aboutDepthAxis: axis(input.aboutDepthAxis, h*b**3/12),
    approvedForStructuralUse: false as const,
    warnings: [
      "Ideal elastic reference only, not an NDS column capacity, pass/fail result or member selection.",
      "Supplied restraint, section and modulus are not independently verified.",
      "Wood adjustment factors, combined loading, bracing, connections and design adequacy stay unverified.",
    ],
  };
}
