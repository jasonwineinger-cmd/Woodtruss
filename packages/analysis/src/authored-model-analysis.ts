import type { Bar2D, JointLoad, Node2D, TrussModel } from "./index.js";
import {analyzeExplicitScenarios} from "./scenarios.js";
import {auditTrussModel} from "./model-audit.js";
import {auditGlobalEquilibrium} from "./equilibrium.js";
import {auditJointEquilibrium} from "./joint-equilibrium.js";

const schema="woodtruss-authored-model/v1";
const units={length:"in",force:"lb",area:"in^2",elasticModulus:"psi"} as const;
const minSpanIn=96,maxSpanIn=600;
function object(raw:unknown,field:string,required:readonly string[],optional:readonly string[]=[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||
     (Object.getPrototypeOf(raw)!==Object.prototype&&Object.getPrototypeOf(raw)!==null)||
     required.some(key=>!Object.hasOwn(raw,key))||
     Object.keys(raw).some(key=>!required.includes(key)&&!optional.includes(key)))
    throw new Error("Missing or unknown authored model field: "+field);
  return raw as Record<string,unknown>;
}
function text(raw:unknown,field:string) {
  if(typeof raw!=="string"||raw.trim()!==raw||!raw.length||raw.length>512)
    throw new Error("Invalid authored text: "+field);
  return raw;
}
function id(raw:unknown,field:string) {
  const label=text(raw,field);
  if(!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(label)||
    Object.hasOwn(Object.prototype,label)||label==="prototype")
    throw new Error("Invalid authored identifier: "+field);
  return label;
}
function number(raw:unknown,field:string,positive=false) {
  if(typeof raw!=="number"||!Number.isFinite(raw)||(positive&&raw<=0))
    throw new Error("Nonfinite or invalid authored number: "+field);
  return raw;
}
function array(raw:unknown,field:string,min:number,max:number):unknown[] {
  if(!Array.isArray(raw)||raw.length<min||raw.length>max)
    throw new Error("Authored array outside supported count: "+field);
  return raw;
}
const unique=(items:readonly string[],field:string)=>{
  if(new Set(items).size!==items.length)throw new Error("Duplicate authored "+field);
};

/** Strict one-case, two-bearing, linear planar analysis of authored geometry.
 * No family generation, code loads, member sizing, or fabrication authorization. */
export function analyzeAuthoredModel(raw:unknown) {
  const root=object(raw,"root",["schema","units","modelId","modelRevision","provenance","bearings","model","loadCase"]);
  if(root.schema!==schema)throw new Error("Unsupported authored model schema");
  const suppliedUnits=object(root.units,"units",Object.keys(units));
  if(Object.entries(units).some(([key,value])=>suppliedUnits[key]!==value))
    throw new Error("Expected explicit in, lb, in^2, and psi units");
  const modelId=id(root.modelId,"modelId"),modelRevision=id(root.modelRevision,"modelRevision");
  const provenance=text(root.provenance,"provenance");
  const bearings=object(root.bearings,"bearings",["leftNodeId","rightNodeId"]);
  const leftNodeId=id(bearings.leftNodeId,"left bearing"),rightNodeId=id(bearings.rightNodeId,"right bearing");
  const geometry=object(root.model,"model",["nodes","bars"]);
  const nodes:Node2D[]=array(geometry.nodes,"model.nodes",2,120).map(rawNode=>{
    const n=object(rawNode,"node",["id","x","y"]);
    return {id:id(n.id,"node.id"),x:number(n.x,"node.x"),y:number(n.y,"node.y")};
  });
  unique(nodes.map(n=>n.id),"node ID");
  const left=nodes.find(node=>node.id===leftNodeId),right=nodes.find(node=>node.id===rightNodeId);
  if(!left||!right||leftNodeId===rightNodeId||left.y!==right.y||!(right.x>left.x))
    throw new Error("Two distinct modeled, level bearings ordered by increasing X required");
  const bearingSpanIn=right.x-left.x;
  if(!Number.isFinite(bearingSpanIn)||bearingSpanIn<minSpanIn||bearingSpanIn>maxSpanIn)
    throw new Error("Authored horizontal bearing span must be 8 to 50 ft");
  if(nodes.some(node=>node.x<left.x||node.x>right.x))
    throw new Error("Modeled node outside declared bearing extent; overhang is not supported");
  const bars:Bar2D[]=array(geometry.bars,"model.bars",1,320).map(rawBar=>{
    const b=object(rawBar,"bar",["id","a","b","areaIn2","elasticModulusPsi"]);
    return {id:id(b.id,"bar.id"),a:id(b.a,"bar.a"),b:id(b.b,"bar.b"),
      areaIn2:number(b.areaIn2,"bar.areaIn2",true),elasticModulusPsi:number(b.elasticModulusPsi,"bar.elasticModulusPsi",true)};
  });
  unique(bars.map(bar=>bar.id),"bar ID");
  const load=object(root.loadCase,"loadCase",["id","description","provenance","jointLoads"]);
  const caseId=id(load.id,"loadCase.id"),description=text(load.description,"loadCase.description");
  const loadProvenance=text(load.provenance,"loadCase.provenance");
  const jointLoads:JointLoad[]=array(load.jointLoads,"loadCase.jointLoads",1,120).map(rawLoad=>{
    const j=object(rawLoad,"joint load",["nodeId"],["fxLb","fyLb"]);
    if(!Object.hasOwn(j,"fxLb")&&!Object.hasOwn(j,"fyLb"))throw new Error("At least one joint force component must be explicit");
    return {nodeId:id(j.nodeId,"joint load node"),fxLb:Object.hasOwn(j,"fxLb")?number(j.fxLb,"fxLb"):0,
      fyLb:Object.hasOwn(j,"fyLb")?number(j.fyLb,"fyLb"):0};
  });
  unique(jointLoads.map(j=>j.nodeId),"joint load node");
  const model:TrussModel={nodes,bars,loads:[],supports:[
    {nodeId:leftNodeId,fixX:true,fixY:true},{nodeId:rightNodeId,fixX:false,fixY:true},
  ]};
  const solved=analyzeExplicitScenarios(model,[{id:caseId,description,jointLoads}]);
  const [entry]=solved.cases;
  return {schema,units,modelId,modelRevision,provenance,
    bearings:{leftNodeId,rightNodeId,bearingSpanIn,configuration:"left-pin-right-vertical-roller" as const},
    loadCase:{id:caseId,description,provenance:loadProvenance,jointLoads},
    model:entry.model,result:entry.result,
    modelAudit:auditTrussModel(entry.model),
    equilibrium:{global:auditGlobalEquilibrium(entry.model,entry.result),
      joint:auditJointEquilibrium(entry.model,entry.result.axialForceLb,entry.result.reactionLb)},
    status:"PRELIMINARY_NOT_ENGINEERED" as const,engineeringApproved:false as const,manufacturingApproved:false as const,
    machineReleaseApproved:false as const,fabricationAuthorized:false as const,warnings:solved.warnings};
}
