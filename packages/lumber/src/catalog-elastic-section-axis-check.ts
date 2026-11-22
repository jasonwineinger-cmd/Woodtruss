import { bindRectangularFrameSection } from "./rectangular-frame-section-binding.js";

type CatalogSection = { actualWidthIn: number; actualDepthIn: number; ePsi: number; eMinPsi: number };
type ElasticMember = { areaIn2: number; secondMomentIn4: number; elasticModulusPsi: number };
const positive = (value: number) => Number.isFinite(value) && value > 0;

/** Compare an explicitly named axis and modulus to a gross rectangular
 * section. This is not a property assignment, sizing, or approval. */
export function catalogElasticSectionMatches(
  row: CatalogSection, member: ElasticMember, bendingAxis: unknown, modulusBasis: unknown,
): boolean {
  if ((bendingAxis !== "about-width" && bendingAxis !== "about-depth") ||
      (modulusBasis !== "catalog-mean" && modulusBasis !== "catalog-minimum")) return false;
  try {
    const { actualWidthIn, actualDepthIn, ePsi, eMinPsi } = row;
    if (!positive(ePsi) || !positive(eMinPsi)) return false;
    const elasticModulusPsi = modulusBasis === "catalog-mean" ? ePsi : eMinPsi;
    if (member.elasticModulusPsi !== elasticModulusPsi) return false;
    bindRectangularFrameSection({
      actualWidthIn: bendingAxis === "about-width" ? actualWidthIn : actualDepthIn,
      actualDepthIn: bendingAxis === "about-width" ? actualDepthIn : actualWidthIn,
      memberAreaIn2: member.areaIn2,
      memberSecondMomentIn4: member.secondMomentIn4,
    });
    return true;
  } catch {
    return false;
  }
}
