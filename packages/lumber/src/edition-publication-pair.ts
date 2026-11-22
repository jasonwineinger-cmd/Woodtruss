export interface LumberEditionArtifact {
  edition:string;
  id:string;
  sha256:string;
}
export interface LumberEditionPublicationPair {
  ruleEdition:string;
  publisher:string;
  nds:LumberEditionArtifact;
  supplement:LumberEditionArtifact;
  ndsUpdates:readonly LumberEditionArtifact[];
  supplementUpdates:readonly LumberEditionArtifact[];
}

const maximumUpdatesPerRole=32;
const pairKeys=["ruleEdition","publisher","nds","supplement","ndsUpdates","supplementUpdates"] as const;
const artifactKeys=["edition","id","sha256"] as const;
const text=(value:unknown):value is string=>typeof value==="string"&&value.length>0&&value.length<=240&&value.trim()===value;
const year=(value:unknown):value is string=>typeof value==="string"&&/^[1-9][0-9]{3}$/u.test(value);
const digest=(value:unknown):value is string=>typeof value==="string"&&/^[a-f0-9]{64}$/u.test(value)&&!/^[0]{64}$/u.test(value);
function ownValue(value:object,key:string):unknown {
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  return descriptor?.enumerable&&Object.hasOwn(descriptor,"value")?descriptor.value:undefined;
}
function fields<K extends string>(value:unknown,keys:readonly K[]):Record<K,unknown>|null{
  if(!value||typeof value!=="object"||
    (Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)||
    Reflect.ownKeys(value).length!==keys.length)return null;
  const entries=keys.map(key=>[key,ownValue(value,key)] as const);
  if(entries.some(([,data])=>data===undefined))return null;
  return Object.fromEntries(entries) as Record<K,unknown>;
}
function updateList(value:unknown):unknown[]|null{
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||
      value.length>maximumUpdatesPerRole||Reflect.ownKeys(value).length!==value.length+1)return null;
  const rows=Array.from({length:value.length},(_,index)=>ownValue(value,String(index)));
  return rows.every(row=>row!==undefined)?rows:null;
}
function parse(value:unknown){
  const pair=fields(value,pairKeys);
  if(!pair||!year(pair.ruleEdition)||!text(pair.publisher))return null;
  const ruleEdition=pair.ruleEdition;
  const ndsUpdates=updateList(pair.ndsUpdates),supplementUpdates=updateList(pair.supplementUpdates);
  if(!ndsUpdates||!supplementUpdates)return null;
  const ids=new Set<string>(),hashes=new Set<string>();
  function artifact(value:unknown):LumberEditionArtifact|null{
    const row=fields(value,artifactKeys);
    if(!row||row.edition!==ruleEdition||!text(row.id)||!digest(row.sha256)||
      ids.has(row.id)||hashes.has(row.sha256))return null;
    ids.add(row.id);hashes.add(row.sha256);
    return {edition:ruleEdition,id:row.id,sha256:row.sha256};
  }
  const n=artifact(pair.nds),s=artifact(pair.supplement),nu=ndsUpdates.map(artifact),su=supplementUpdates.map(artifact);
  if(!n||!s||nu.some(row=>row===null)||su.some(row=>row===null))return null;
  return {ruleEdition,publisher:pair.publisher,nds:n,supplement:s,
    ndsUpdates:nu.filter(row=>row!==null),supplementUpdates:su.filter(row=>row!==null)};
}
const artifactMatches=(a:LumberEditionArtifact,b:LumberEditionArtifact)=>
  a.edition===b.edition&&a.id===b.id&&a.sha256===b.sha256;
const setMatches=(a:readonly LumberEditionArtifact[],b:readonly LumberEditionArtifact[])=>
  a.length===b.length&&a.every(item=>b.some(other=>artifactMatches(item,other)));

/** Compare two caller-provided bibliographic inventories, not files or design
 * values. Matching metadata cannot authenticate a publisher, a licensed copy,
 * the applicability of an edition or structural authorization. */
export function inspectLumberEditionPublicationPair(expected:LumberEditionPublicationPair,observed:LumberEditionPublicationPair) {
  const outstanding:string[]=[];
  let a:ReturnType<typeof parse>=null,b:ReturnType<typeof parse>=null;
  // Ordinary descriptor validation does not call getters. A Proxy can still
  // trap reflection; any reflection failure is only a hold, never a match.
  try{a=parse(expected);}catch{}
  try{b=parse(observed);}catch{}
  if(!a)outstanding.push("Expected publication inventory is malformed or has duplicate identities.");
  if(!b)outstanding.push("Observed publication inventory is malformed or has duplicate identities.");
  if(a&&b){
    if(a.ruleEdition!==b.ruleEdition)outstanding.push("Rule edition differs.");
    if(a.publisher!==b.publisher)outstanding.push("Declared publisher differs.");
    if(!artifactMatches(a.nds,b.nds))outstanding.push("Base NDS artifact differs.");
    if(!artifactMatches(a.supplement,b.supplement))outstanding.push("Base Supplement artifact differs.");
    if(!setMatches(a.ndsUpdates,b.ndsUpdates))outstanding.push("NDS update artifacts differ.");
    if(!setMatches(a.supplementUpdates,b.supplementUpdates))outstanding.push("Supplement update artifacts differ.");
  }
  const report = {
    documentationStatus:outstanding.length?"HOLD_EDITION_PUBLICATION_PAIR" as const:"DOCUMENTED_PAIR_NOT_VERIFIED" as const,
    outstanding,publisherVerified:false as const,licensedAuthorizationVerified:false as const,
    ndsReady:false as const,approvedForStructuralUse:false as const,
  };
  return {report, matchedInventory: outstanding.length === 0 ? a : null};
}

// The public check intentionally reports holds only, without exposing digests or locators.
export function reviewLumberEditionPublicationPair(expected:LumberEditionPublicationPair,observed:LumberEditionPublicationPair) {
  return inspectLumberEditionPublicationPair(expected, observed).report;
}
