/** Traceable wood design-value records. No default allowable stresses are supplied.
 * Values must be obtained from the applicable, licensed reference and independently checked.
 * This module is NOT a substitute for NDS adjustment factors or engineering review.
 */
export interface LumberReference {
  speciesGroup: string;
  grade: string;
  nominalSize: string;
  actualWidthIn: number;
  actualDepthIn: number;
  referenceEdition: string;
  referencePublisher: string;
  referenceTable: string;
  referenceValueId: string;
  /** Unadjusted reference design values in psi; not capacities. */
  fbPsi: number;
  ftPsi: number;
  fcPsi: number;
  fvPsi: number;
  ePsi: number;
  eMinPsi: number;
}
export interface LumberCatalog {
  catalogId: string;
  records: LumberReference[];
}
export function validateLumberCatalog(catalog: LumberCatalog): void {
  if (!catalog.catalogId?.trim() || catalog.records.length===0)
    throw new Error("Lumber catalog requires an identifier and reference records");
  const ids=new Set<string>();
  for(const r of catalog.records){
    for(const key of ["speciesGroup","grade","nominalSize","referenceEdition","referencePublisher","referenceTable","referenceValueId"] as const){
      if(!r[key]?.trim())throw new Error("Missing lumber reference provenance: "+key);
    }
    if(ids.has(r.referenceValueId))throw new Error("Duplicate lumber reference ID");
    ids.add(r.referenceValueId);
    for(const key of ["actualWidthIn","actualDepthIn","fbPsi","ftPsi","fcPsi","fvPsi","ePsi","eMinPsi"] as const){
      if(!Number.isFinite(r[key]) || r[key]<=0)throw new Error("Invalid lumber reference value: "+key);
    }
    if(r.eMinPsi>r.ePsi)throw new Error("Minimum modulus cannot exceed mean modulus");
  }
}
export interface LumberCandidate {
  referenceValueId: string;
  areaIn2: number;
  axialStressPsi: number;
  /** Always false until edition-specific NDS factors and member checks are implemented. */
  approvedForStructuralUse: false;
  outstandingChecks: string[];
}
export function previewLumberCandidates(
 catalog:LumberCatalog, axialForceLb:number
):LumberCandidate[] {
  validateLumberCatalog(catalog);
  if(!Number.isFinite(axialForceLb))throw new Error("Invalid axial force");
  return catalog.records.map(r=>({
    referenceValueId:r.referenceValueId,
    areaIn2:r.actualWidthIn*r.actualDepthIn,
    axialStressPsi:axialForceLb/(r.actualWidthIn*r.actualDepthIn),
    approvedForStructuralUse:false as const,
    outstandingChecks:[
      "Reference design values and edition require independent verification",
      "NDS duration, moisture, temperature, size, repetitive-member and other applicable factors",
      "Compression stability, bending interaction, lateral restraint and member slenderness",
      "Connector plate, bearing, load combinations, deflection and independent engineering review"
    ]
  }));
}
