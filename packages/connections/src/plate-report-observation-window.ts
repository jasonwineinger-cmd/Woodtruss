export interface PlateReportObservation {
  issuer:string;
  documentId:string;
  productCode:string;
  digestSha256:string;
  reissuedMonth:string;
  revisedMonth:string;
  issuerCheckedOn:string;
  issuerStatus:"active"|"withdrawn"|"superseded"|"unverified";
  windowBasis:"continuous-through-month-end"|"renewal-month-only";
  windowMonth:string;
}
const keys=["issuer","documentId","productCode","digestSha256","reissuedMonth","revisedMonth",
  "issuerCheckedOn","issuerStatus","windowBasis","windowMonth"] as const;
const statuses=["active","withdrawn","superseded","unverified"] as const;
const bases=["continuous-through-month-end","renewal-month-only"] as const;
const text=(value:unknown):value is string=>typeof value==="string"&&value.length>0&&value.length<=240&&value.trim()===value&&!/[\u0000-\u001f\u007f]/u.test(value);
const month=(value:unknown):value is string=>typeof value==="string"&&value.length===7&&/^(?!0000)[0-9]{4}-(?:0[1-9]|1[0-2])$/u.test(value);
const digest=(value:unknown):value is string=>typeof value==="string"&&value.length===64&&/^[a-f0-9]{64}$/u.test(value)&&!/^0{64}$/u.test(value);
function date(value:unknown):value is string{
  if(typeof value!=="string"||value.length!==10||!/^\d{4}-\d{2}-\d{2}$/u.test(value)||!month(value.slice(0,7)))return false;
  const [year,mon,day]=value.split("-").map(Number);
  const leap=year%4===0&&(year%100!==0||year%400===0);
  const monthDays=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  return day>=1&&day<=monthDays[mon-1];
}
function parse(input:unknown):PlateReportObservation|null {
  if(!input||typeof input!=="object"||
    (Object.getPrototypeOf(input)!==Object.prototype&&Object.getPrototypeOf(input)!==null)||
    Reflect.ownKeys(input).length!==keys.length)return null;
  const result:Partial<Record<typeof keys[number],unknown>>={};
  for(const key of keys){
    const descriptor=Object.getOwnPropertyDescriptor(input,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))return null;
    result[key]=descriptor.value;
  }
  if(!text(result.issuer)||!text(result.documentId)||!text(result.productCode)||!digest(result.digestSha256)||
    !month(result.reissuedMonth)||!month(result.revisedMonth)||!month(result.windowMonth)||!date(result.issuerCheckedOn)||
    !statuses.some(status=>status===result.issuerStatus)||!bases.some(basis=>basis===result.windowBasis))return null;
  return result as PlateReportObservation;
}

/** Reconcile declared report observations for one explicit calendar day.
 * This does not access or verify the issuer, infer a renewal date, or confer
 * applicability, capacity, fabrication or machine-release authority. */
export function inspectPlateReportObservationWindow(
  expected:PlateReportObservation,observed:PlateReportObservation,reviewDate:string,
){
  const outstanding:string[]=[];
  let a:PlateReportObservation|null=null,b:PlateReportObservation|null=null;
  try{a=parse(expected);}catch{}
  try{b=parse(observed);}catch{}
  if(!a)outstanding.push("Expected report observation is malformed.");
  if(!b)outstanding.push("Observed report observation is malformed.");
  if(!date(reviewDate))outstanding.push("An explicit valid ISO review date is required.");
  if(a&&b&&keys.some(key=>a![key]!==b![key]))outstanding.push("Declared report observations do not match exactly.");
  for(const [label,row] of [["Expected",a],["Observed",b]] as const){
    if(!row)continue;
    if(row.issuerStatus!=="active")outstanding.push(`${label} issuer status is not declared active.`);
    if(row.reissuedMonth>row.revisedMonth||row.revisedMonth>row.windowMonth)
      outstanding.push(`${label} reissue, revision and window months are out of order.`);
    if(date(reviewDate)){
      const reviewMonth=reviewDate.slice(0,7);
      if(row.issuerCheckedOn!==reviewDate)outstanding.push(`${label} issuer check is not on the explicit review date.`);
      if(reviewMonth<row.revisedMonth)outstanding.push(`${label} review date precedes the report revision month.`);
      if(row.windowBasis==="renewal-month-only"?reviewMonth>=row.windowMonth:reviewMonth>row.windowMonth)
        outstanding.push(`${label} observation is outside its stated review window.`);
    }
  }
  const report = {
    status:outstanding.length?"HOLD_REPORT_OBSERVATION" as const:"OBSERVATION_MATCH_REVIEW_ONLY" as const,
    outstanding,issuerStatusVerified:false as const,applicabilityVerified:false as const,
    capacityVerified:false as const,fabricationAuthorized:false as const,machineReleaseAuthorized:false as const,
  };
  return { report, matched: outstanding.length === 0 ? a : null };
}

export function reviewPlateReportObservationWindow(
  expected:PlateReportObservation,observed:PlateReportObservation,reviewDate:string,
) {
  return inspectPlateReportObservationWindow(expected,observed,reviewDate).report;
}
