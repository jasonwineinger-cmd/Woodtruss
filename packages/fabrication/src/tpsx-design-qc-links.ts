import { snapshotElasticFrameReviewData } from "../../analysis/src/elastic-frame-reviewed-plain-data.js";
import { countTpsxDesignQcJointLinks } from "./tpsx-design-qc-joint-links.js";

const version = "0.9.4";
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0 &&
  value.length <= 512 && value.trim() === value && !/\p{Cc}/u.test(value);
const quantity = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
function exact<K extends string>(value: unknown, fields: readonly K[]): value is Record<K, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === fields.length && fields.every(key => Object.hasOwn(value,key));
}
function identifiers(value: unknown, key: string, min: number) {
  if (!Array.isArray(value) || value.length < min || value.length > 10_000) return null;
  const ids = new Set<string>();
  for (const row of value as unknown[]) {
    if (!exact(row,[key])) return null;
    const id = row[key];
    if (!text(id) || ids.has(id)) return null;
    ids.add(id);
  }
  return ids;
}
const noAuthority = {
  archiveVerified: false, designVerified: false, structuralAdequacyVerified: false,
  plateCapacityVerified: false, signatureVerified: false, physicalInspectionVerified: false,
  repairClosureVerified: false, shippingAuthorized: false, fabricationAuthorized: false,
  machineReleaseAuthorized: false,
} as const;
const hold = (reason: string) => ({ status: "HOLD_TPSX_DESIGN_QC_LINKS" as const, outstanding: [reason], ...noAuthority });

/** Review identity links in a caller-projected, narrowly scoped design-side
 * v0.9.4 record. Never read archives or derive acceptance from these records. */
export function reviewTpsxDesignQcLinks(input: unknown) {
  try {
    const data = snapshotElasticFrameReviewData(input);
    if (!exact(data,["manifest","component","qc"])) return hold("Exact design-side link projection is required");
    const {manifest,component,qc} = data;
    if (!exact(manifest,["FormatVersion","Components"]) ||
        !exact(component,["FormatVersion","TrussId","TrussName","Members","Plates","Plating"]) ||
        !exact(qc,["FormatVersion","TrussId","TrussName","JointQC","MemberQC"]))
      return hold("Manifest, component and quality-control projection fields must be exact");
    if (manifest.FormatVersion !== version || component.FormatVersion !== version || qc.FormatVersion !== version ||
        !text(component.TrussId) || !text(component.TrussName) ||
        component.TrussId !== qc.TrussId || component.TrussName !== qc.TrussName)
      return hold("The version and selected component identity must agree");
    if (!Array.isArray(manifest.Components) || !manifest.Components.length || manifest.Components.length > 10_000)
      return hold("A bounded WoodTruss manifest is required");
    const listedIds = new Set<string>(), listedNames = new Set<string>();
    let matched = false;
    for (const entry of manifest.Components as unknown[]) {
      if (!exact(entry,["ComponentId","ComponentName","ComponentType","Quantity"]) ||
          !text(entry.ComponentId) || !text(entry.ComponentName) || entry.ComponentType !== "WoodTruss" ||
          !quantity(entry.Quantity) || listedIds.has(entry.ComponentId) || listedNames.has(entry.ComponentName))
        return hold("Manifest entries must have unique WoodTruss identities and positive integral quantities");
      listedIds.add(entry.ComponentId);
      listedNames.add(entry.ComponentName);
      if (entry.ComponentId === component.TrussId && entry.ComponentName === component.TrussName) matched = true;
    }
    if (!matched) return hold("The manifest must identify the same selected component ID and name");
    const memberIds = identifiers(component.Members,"MemberId",2), plateIds = identifiers(component.Plates,"PlateId",1);
    if (!memberIds || !plateIds || !Array.isArray(component.Plating) ||
        !component.Plating.length || component.Plating.length > 10_000)
      return hold("Component members, plates and placements must be unique and bounded");
    const plating = new Set<string>();
    for (const place of component.Plating as unknown[]) {
      if (!exact(place,["PlatingId","PlateId","TrussFace"]) || !text(place.PlatingId) || plating.has(place.PlatingId) ||
          !text(place.PlateId) || !plateIds.has(place.PlateId) ||
          (place.TrussFace !== "FrontBack" && place.TrussFace !== "TopBottom"))
        return hold("Placements must cite a declared plate and an explicit supported face group");
      plating.add(place.PlatingId);
    }
    const counts = countTpsxDesignQcJointLinks(qc.JointQC,qc.MemberQC,memberIds,plating);
    if (!counts) return hold("Joint, placement and member references lack exact unique coverage");
    return { status: "TPSX_DESIGN_QC_LINKS_MATCH_ONLY" as const, outstanding: [], ...counts, ...noAuthority };
  } catch {
    return hold("The design-side link projection was malformed or uncheckable");
  }
}
