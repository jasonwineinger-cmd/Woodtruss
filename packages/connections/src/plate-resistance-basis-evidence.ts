export interface PlateResistanceBasisEvidence {
  documentId:string;
  productCode:string;
  digestSha256:string;
  locator:string;
  routeEvidenceId:string;
  family:"integral-toothed"|"nail-applied"|"hinge";
  mechanism:"tooth-lateral"|"steel-tension"|"steel-shear"|"hinge-joint";
  embedment:"hydraulic-platen"|"pneumatic-platen"|"staged-roller"|"hybrid-finishing-roller"|
    "single-pass-roller"|"separately-applied-nails";
  denominator:"per-square-inch-per-plate"|"per-inch-per-pair"|"force-per-pair";
  sectionBasis:"gross"|"net"|"not-applicable";
  axisBasis:"slots-and-grain"|"signed-plate-axis"|"hinge-axis";
  faces:"paired-opposite";
}
const strings=["documentId","productCode","locator","routeEvidenceId"] as const;
const domains={
  family:["integral-toothed","nail-applied","hinge"],
  mechanism:["tooth-lateral","steel-tension","steel-shear","hinge-joint"],
  embedment:["hydraulic-platen","pneumatic-platen","staged-roller","hybrid-finishing-roller",
    "single-pass-roller","separately-applied-nails"],
  denominator:["per-square-inch-per-plate","per-inch-per-pair","force-per-pair"],
  sectionBasis:["gross","net","not-applicable"],
  axisBasis:["slots-and-grain","signed-plate-axis","hinge-axis"],
  faces:["paired-opposite"],
} as const;
const keys=[...strings,"digestSha256",...Object.keys(domains)];
const text=(value:unknown):value is string=>typeof value==="string"&&value.length>0&&value.length<=1_000&&value.trim()===value;
const digest=(value:unknown):value is string=>
  typeof value==="string"&&value.length===64&&/^[a-f0-9]{64}$/u.test(value)&&!/^0{64}$/u.test(value);

function parse(input:unknown):PlateResistanceBasisEvidence|null{
  if(!input||typeof input!=="object"||
    (Object.getPrototypeOf(input)!==Object.prototype&&Object.getPrototypeOf(input)!==null)||
    Reflect.ownKeys(input).length!==keys.length)return null;
  const result:Record<string,unknown>={};
  for(const key of keys){
    const descriptor=Object.getOwnPropertyDescriptor(input,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))return null;
    result[key]=descriptor.value;
  }
  if(strings.some(key=>!text(result[key]))||!digest(result.digestSha256)||
    Object.entries(domains).some(([key,values])=>!values.some(value=>value===result[key])))return null;
  return result as unknown as PlateResistanceBasisEvidence;
}

function consistent(row:PlateResistanceBasisEvidence) {
  const {family,mechanism,embedment,denominator,sectionBasis,axisBasis}=row;
  const nails=embedment==="separately-applied-nails";
  if(mechanism==="hinge-joint")return family==="hinge"&&denominator==="force-per-pair"&&
    sectionBasis==="not-applicable"&&axisBasis==="hinge-axis"&&
    !nails;
  if(mechanism==="tooth-lateral")return family==="integral-toothed"&&!nails&&denominator==="per-square-inch-per-plate"&&
    sectionBasis!=="not-applicable"&&axisBasis==="slots-and-grain";
  return family!=="hinge"&&(family==="nail-applied")===nails&&denominator==="per-inch-per-pair"&&
    sectionBasis!=="not-applicable"&&axisBasis==="signed-plate-axis";
}

/** Compare stated resistance-basis metadata only. Category checks do not
 * validate any actual manufacturer embedding route or infer capacity. No
 * source retrieval, resistance values, applicability or release authority. */
export function reviewPlateResistanceBasisEvidence(
  expected:PlateResistanceBasisEvidence,observed:PlateResistanceBasisEvidence,
){
  const outstanding:string[]=[];
  let a:PlateResistanceBasisEvidence|null=null,b:PlateResistanceBasisEvidence|null=null;
  try{a=parse(expected);}catch{}
  try{b=parse(observed);}catch{}
  if(!a)outstanding.push("Expected resistance basis evidence is malformed.");
  else if(!consistent(a))outstanding.push("Expected resistance basis categories are inconsistent.");
  if(!b)outstanding.push("Observed resistance basis evidence is malformed.");
  else if(!consistent(b))outstanding.push("Observed resistance basis categories are inconsistent.");
  if(a&&b&&keys.some(key=>a![key as keyof PlateResistanceBasisEvidence]!==b![key as keyof PlateResistanceBasisEvidence]))
    outstanding.push("Declared resistance basis evidence does not match exactly.");
  return {
    status:outstanding.length?"HOLD_RESISTANCE_BASIS" as const:"BASIS_MATCH_REVIEW_ONLY" as const,
    outstanding,applicabilityVerified:false as const,capacityVerified:false as const,
    fabricationAuthorized:false as const,machineReleaseAuthorized:false as const,
  };
}
