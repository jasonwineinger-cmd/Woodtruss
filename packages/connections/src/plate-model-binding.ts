import { analyzePinJointedTruss, type JointLoad, type TrussModel } from "../../analysis/src/index.js";
import { assertAuditedTrussModel } from "../../analysis/src/model-audit.js";
import { inventoryScenarioConnectorPlateDemands, type PlateReference } from "./plate-screen.js";

type BindingModel=Omit<TrussModel,"loads">;
type Scenario={id:string;loads:JointLoad[]};
type Source={revision:string;model:BindingModel};
export interface PlateForceEvidence {
 revision:string;
 modelKey:string;
 scenarioId:string;
 loadKey:string;
 axialForceLb:Record<string,number>;
}

const ordered=<T extends {id:string}>(rows:T[])=>[...rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
const finite=(n:number)=>{if(!Number.isFinite(n))throw new Error("Nonfinite plate model evidence");return n===0?0:n;};

function canonical(source:Source,scenario:Scenario){
 if(!source.revision.trim()||!scenario.id.trim())throw new Error("Missing plate revision or scenario ID");
 const {nodes,bars,supports}=source.model;
 const model:TrussModel={
  nodes:ordered(nodes).map(({id,x,y})=>({id,x:finite(x),y:finite(y)})),
  bars:ordered(bars).map(({id,a,b,areaIn2,elasticModulusPsi})=>({id,a,b,areaIn2:finite(areaIn2),elasticModulusPsi:finite(elasticModulusPsi)})),
  supports:ordered(supports.map(s=>({id:s.nodeId,...s}))).map(({nodeId,fixX,fixY})=>({nodeId,fixX,fixY})),
  loads:scenario.loads.map(({nodeId,fxLb,fyLb})=>({nodeId,fxLb:finite(fxLb??0),fyLb:finite(fyLb??0)}))
   .sort((a,b)=>a.nodeId<b.nodeId?-1:a.nodeId>b.nodeId?1:a.fxLb-b.fxLb||a.fyLb-b.fyLb),
 };
 assertAuditedTrussModel(model);
 // Canonical content equality, not a signature, authentication, or approval.
 const modelKey=JSON.stringify(["plate-axial-model/v1",model.nodes,model.bars,model.supports]);
 const loadKey=JSON.stringify(["plate-axial-scenario/v1",scenario.id,model.loads]);
 return {model,modelKey,loadKey};
}

/** Capture the signed analysis output from its exact named model/scenario. */
export function capturePlateForceEvidence(source:Source,scenario:Scenario):PlateForceEvidence {
 const {model,modelKey,loadKey}=canonical(source,scenario);
 const {axialForceLb}=analyzePinJointedTruss(model);
 return {revision:source.revision,modelKey,scenarioId:scenario.id,loadKey,axialForceLb};
}

/** Compare against the independently expected model, revision and named loads;
 * also replay signed numbers so changing the evidence labels is insufficient.
 * Still only a preliminary numerical review, not a plate design check.
 */
export function inventoryBoundConnectorPlateDemands(source:Source,scenarios:Scenario[],
 plates:PlateReference[],evidence:PlateForceEvidence[]){
 if(!scenarios.length||evidence.length!==scenarios.length)
  throw new Error("Incomplete bound connector scenarios");
 const byCase=new Map(evidence.map(e=>[e.scenarioId,e]));
 if(byCase.size!==evidence.length||new Set(scenarios.map(s=>s.id)).size!==scenarios.length)
  throw new Error("Duplicate bound connector scenario");
 const cases=scenarios.map(scenario=>{
  const supplied=byCase.get(scenario.id);
  const {model,modelKey,loadKey}=canonical(source,scenario);
  if(!supplied||supplied.revision!==source.revision||supplied.modelKey!==modelKey||supplied.loadKey!==loadKey)
   throw new Error("Plate force evidence does not match expected revision, model or scenario");
  const replay=analyzePinJointedTruss(model).axialForceLb;
  if(Object.keys(supplied.axialForceLb).length!==model.bars.length||
     model.bars.some(({id})=>!Object.hasOwn(supplied.axialForceLb,id)||supplied.axialForceLb[id]!==replay[id]))
   throw new Error("Plate force evidence does not match exact solved axial forces");
  return {id:scenario.id,axialForceLb:replay};
 });
 return inventoryScenarioConnectorPlateDemands(source.model.nodes,
  source.model.bars.map(({id,a:start,b:end})=>({id,start,end})),plates,cases)
  .map(row=>({...row,sourceRevision:source.revision,modelKey:evidence[0].modelKey}));
}
