import { snapshotElasticFrameReviewData } from "../../analysis/src/elastic-frame-reviewed-plain-data.js";
import { reviewPreliminaryStockWithCaseEvidence } from "./stock-evidence-frontier.js";
import { countMaximumReportedStockCoverage } from "./reported-stock-coverage-count.js";

type auditInputs = Parameters<typeof reviewPreliminaryStockWithCaseEvidence>;
const noAuthority={reportedInventoryIndependentlyVerified:false,inventoryAllocated:false,approvedForStructuralUse:false,
  fabricationAuthorized:false,approvedForFabrication:false,machineReleaseAuthorized:false,shippingAuthorized:false} as const;
const hold=(reason:string)=>({status:"HOLD_REPORTED_STOCK_COVERAGE" as const,outstanding:[reason],...noAuthority});
const stockFields=["referenceValueId","speciesGroup","grade","nominalSize","actualWidthIn","actualDepthIn",
  "referenceEdition","referencePublisher","referenceTable"] as const;
const constraints=["memberLengthIn","addedLengthIn","allowedReferenceValueIds","maxWidthIn","maxDepthIn"] as const;
function exact<K extends string>(x:unknown,fields:readonly K[]):x is Record<K,unknown>{
  return !!x&&typeof x==="object"&&!Array.isArray(x)&&Reflect.ownKeys(x).length===fields.length&&
    fields.every(k=>Object.hasOwn(x,k));
}
const rows=(x:unknown,max:number,check:(row:unknown)=>boolean)=>Array.isArray(x)&&x.length<=max&&x.every(check);
function bounded(x:unknown){
  if(!exact(x,["catalog","offers","needs","expectations","evidence"])||
    !Array.isArray(x.offers)||x.offers.length>500||!Array.isArray(x.needs)||!x.needs.length||
    x.needs.length>250||x.needs.length*x.offers.length>30_000||
    !exact(x.catalog,["catalogId","records"])||
    !rows(x.catalog.records,2_000,r=>exact(r,[...stockFields,"fbPsi","ftPsi","fcPsi","fvPsi","ePsi","eMinPsi"]))||
    !x.offers.every(r=>exact(r,["offerId","referenceValueId","stockLengthIn","availablePieces","stockRecordId"]))||
    !x.needs.every(r=>exact(r,["memberId","schematicRecordId",...constraints]))||
    !rows(x.expectations,x.needs.length,r=>exact(r,["memberId","schematicRecordId","requiredCases"])&&
      rows(r.requiredCases,128,c=>exact(c,["caseId","basisId"])))||
    !rows(x.evidence,x.needs.length*x.offers.length,r=>exact(r,["memberId","schematicRecordId","offerId","stockRecordId",
      "reportedStockLengthIn","schematicConstraints","catalogId","reference","caseReviews"])&&
      exact(r.schematicConstraints,constraints)&&exact(r.reference,stockFields)&&
      rows(r.caseReviews,128,c=>exact(c,["caseId","basisId","reviewRecordId","disposition"])))) return null;
  return x;
}

/** Count the greatest possible number of one-piece member matches among
 * caller-reported stock records and exact documentary eligibility edges.
 * No stock selection, reservations, nesting, procurement or authorization. */
export function auditReportedStockContention(input:unknown){
  try{
    const parsed=bounded(snapshotElasticFrameReviewData(input));
    if(!parsed)return hold("Exact bounded stock, members and evidence scope required");
    const {catalog,offers,needs,expectations,evidence}=parsed as unknown as {
      catalog:auditInputs[0];offers:auditInputs[1];needs:auditInputs[2];expectations:auditInputs[3];evidence:auditInputs[4]};
    const checked=reviewPreliminaryStockWithCaseEvidence(catalog,offers,needs,expectations,evidence);
    const stock=new Map<string,{index:number;reference:string;length:number;pieces:number}>();
    for(const offer of offers){
      const previous=stock.get(offer.stockRecordId);
      if(previous&&(previous.reference!==offer.referenceValueId||previous.length!==offer.stockLengthIn||
        previous.pieces!==offer.availablePieces))return hold("Aliases for the same reported stock record disagree");
      if(!previous)stock.set(offer.stockRecordId,{index:stock.size,reference:offer.referenceValueId,
        length:offer.stockLengthIn,pieces:offer.availablePieces});
    }
    const eligibleStockIndices=checked.members.map(member=>[...new Set(member.candidates.flatMap(candidate=>
      candidate.eligible?[stock.get(candidate.stockRecordId)!.index]:[]))]);
    const maximumCoveredCount=countMaximumReportedStockCoverage({
      availablePieces:[...stock.values()].map(entry=>entry.pieces),eligibleStockIndices});
    const memberCount=needs.length, uncoveredCount=memberCount-maximumCoveredCount;
    const outcome=uncoveredCount?hold("The reported evidence-eligible piece counts cannot cover all modeled members"):
      {status:"REPORTED_STOCK_COVERAGE_MATCH_ONLY" as const,outstanding:[],...noAuthority};
    return {...outcome,memberCount,maximumCoveredCount,uncoveredCount};
  }catch{
    return hold("The reported stock coverage could not be checked");
  }
}
