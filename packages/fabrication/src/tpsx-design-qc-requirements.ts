import { snapshotElasticFrameReviewData } from "../../analysis/src/elastic-frame-reviewed-plain-data.js";
import { reviewTpsxDesignQcLinks } from "./tpsx-design-qc-links.js";
import { countTpsxDesignQcRequirementRows } from "./tpsx-design-qc-requirement-rows.js";

function exact<K extends string>(value: unknown, fields: readonly K[]): value is Record<K, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === fields.length && fields.every(key => Object.hasOwn(value, key));
}
const noAuthority = {
  archiveVerified: false, designVerified: false, structuralAdequacyVerified: false,
  plateCapacityVerified: false, signatureVerified: false, physicalInspectionVerified: false,
  repairClosureVerified: false, shippingAuthorized: false, fabricationAuthorized: false,
  machineReleaseAuthorized: false, requirementSemanticsVerified: false,
} as const;
const hold = (reason: string) => ({ status: "HOLD_TPSX_DESIGN_QC_REQUIREMENTS" as const, outstanding: [reason], ...noAuthority });

/** Bind literal design-side declarations to one exact scoped link projection.
 * Never convert areas to teeth, interpret zero, compare observed measurements,
 * or clear any review, engineering, inspection or release gate. */
export function reviewTpsxDesignQcRequirements(input: unknown) {
  try {
    const data = snapshotElasticFrameReviewData(input);
    if (!exact(data, ["links", "requirements"])) return hold("Exact design link and requirement projections are required");
    const { links, requirements } = data;
    if (!exact(requirements, ["FormatVersion", "TrussId", "TrussName", "DistanceUnit", "JointQC"]) ||
        !exact(links, ["manifest", "component", "qc"]) ||
        !exact(links.qc, ["FormatVersion", "TrussId", "TrussName", "JointQC", "MemberQC"]))
      return hold("Design link and requirement projection fields must be exact");
    const linked = reviewTpsxDesignQcLinks(links);
    if (linked.status !== "TPSX_DESIGN_QC_LINKS_MATCH_ONLY")
      return hold("The designated design linkage must establish complete exact identity coverage first");
    if (requirements.FormatVersion !== links.qc.FormatVersion || requirements.TrussId !== links.qc.TrussId ||
        requirements.TrussName !== links.qc.TrussName || requirements.DistanceUnit !== "Inches")
      return hold("Requirements must identify the exact linked component and declare the scoped distance unit");
    const counts = countTpsxDesignQcRequirementRows(links.qc.JointQC, requirements.JointQC);
    if (!counts || counts.jointCount !== linked.jointCount || counts.contactCount !== linked.contactCount)
      return hold("Requirement declarations must exactly cover each linked joint, placement and member");
    return { status: "TPSX_DESIGN_QC_REQUIREMENTS_BOUND_ONLY" as const, outstanding: [], ...counts, ...noAuthority };
  } catch {
    return hold("The design requirement projection was malformed or uncheckable");
  }
}
