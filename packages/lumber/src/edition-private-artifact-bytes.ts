import type {PrivateLumberPublicationArtifact} from "./publication-byte-evidence.js";

type ExpectedArtifact=Readonly<{id:string;sha256:string}>;
type Outcome={matches:boolean;outstanding:string[]};
const MAX_ARTIFACTS=66;
const MAX_BYTES=64*1024*1024;
const validId=(value:unknown):value is string=>
  typeof value==="string"&&value.length>0&&value.length<=240&&value.trim()===value;
const validDigest=(value:unknown):value is string=>
  typeof value==="string"&&/^[a-f0-9]{64}$/u.test(value)&&!/^0{64}$/u.test(value);
const hold=(reason:string):Outcome=>({matches:false,outstanding:[reason]});
function ownData(value:object,key:string) {
  const at=Object.getOwnPropertyDescriptor(value,key);
  return at?.enumerable&&Object.hasOwn(at,"value")?at.value as unknown:undefined;
}
function fields<K extends string>(value:unknown,keys:readonly K[]):Record<K,unknown>|null{
  if(!value||typeof value!=="object"||
    (Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)||
    Reflect.ownKeys(value).length!==keys.length)return null;
  const pairs=keys.map(key=>[key,ownData(value,key)] as const);
  return pairs.some(([,data])=>data===undefined)?null:Object.fromEntries(pairs) as Record<K,unknown>;
}
function dense(value:unknown):unknown[]|null{
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return null;
  const length=Object.getOwnPropertyDescriptor(value,"length")?.value;
  if(!Number.isSafeInteger(length)||length<1||length>MAX_ARTIFACTS||Reflect.ownKeys(value).length!==length+1)return null;
  const rows=Array.from({length},(_,index)=>ownData(value,String(index)));
  return rows.every(row=>row!==undefined)?rows:null;
}

const typedArray=Object.getPrototypeOf(Uint8Array.prototype);
const getViewKind=Object.getOwnPropertyDescriptor(typedArray,Symbol.toStringTag)!.get!;
const getViewBuffer=Object.getOwnPropertyDescriptor(typedArray,"buffer")!.get!;
const getViewByteLength=Object.getOwnPropertyDescriptor(typedArray,"byteLength")!.get!;
const getArrayBufferByteLength=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,"byteLength")!.get!;
const copyInto=Uint8Array.prototype.set;

function usableByteLength(value:unknown):number {
  if(getViewKind.call(value)!=="Uint8Array")return 0;
  // Invoke the ArrayBuffer intrinsic, not an instance property. Shared
  // buffers fail that internal-slot check even across realms.
  getArrayBufferByteLength.call(getViewBuffer.call(value));
  return getViewByteLength.call(value);
}

/** Local private-byte check only. All candidate views are copied before any
 * await. Reports agreement with caller-supplied SHA-256, never publisher or
 * licensing authenticity. No raw bytes or artifact IDs are returned. */
export async function reviewLumberEditionPrivateBytes(
  expected:readonly ExpectedArtifact[],privateArtifacts:readonly PrivateLumberPublicationArtifact[],
):Promise<Outcome>{
  let snapshots:{sha256:string;bytes:Uint8Array<ArrayBuffer>}[];
  try{
    const expectedRows=dense(expected),privateRows=dense(privateArtifacts);
    if(!expectedRows||!privateRows||expectedRows.length!==privateRows.length)
      return hold("Expected and private publication artifact inventories must have the same bounded nonzero size.");
    const desired=new Map<string,string>(),digests=new Set<string>();
    for(const value of expectedRows){
      const row=fields(value,["id","sha256"]);
      if(!row||!validId(row.id)||!validDigest(row.sha256)||desired.has(row.id)||digests.has(row.sha256))
        return hold("Expected publication artifact IDs and SHA-256 digests must be exact, valid and distinct.");
      desired.set(row.id,row.sha256);digests.add(row.sha256);
    }
    const views=new Map<string,{bytes:Uint8Array;length:number}>();
    let total=0;
    for(const value of privateRows){
      const row=fields(value,["artifactId","bytes"]);
      if(!row||!validId(row.artifactId)||!desired.has(row.artifactId)||views.has(row.artifactId))
        return hold("Private publication artifacts must match the complete distinct expected ID set.");
      const length=usableByteLength(row.bytes);
      if(!Number.isSafeInteger(length)||length<=0)
        return hold("Private publication bytes must be nonempty usable Uint8Array views.");
      total+=length;
      if(total>MAX_BYTES)return hold("Private publication artifacts exceed the local byte limit.");
      views.set(row.artifactId,{bytes:row.bytes as Uint8Array,length});
    }
    snapshots=[...desired].map(([id,sha256])=>{
      const view=views.get(id);
      if(!view||usableByteLength(view.bytes)!==view.length)throw new Error("Exact view no longer available");
      const bytes=new Uint8Array(view.length);
      copyInto.call(bytes,view.bytes);
      return {sha256,bytes};
    });
  }catch{
    return hold("Private publication artifact input could not be read as bounded, non-shared bytes.");
  }

  try{
    const subtle=globalThis.crypto?.subtle;
    if(!subtle)return hold("Local SHA-256 verification is unavailable.");
    let changed=false;
    for(const {sha256,bytes} of snapshots){
      const digest=await subtle.digest("SHA-256",bytes);
      const hex=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
      if(hex!==sha256)changed=true;
    }
    return changed?hold("Private publication bytes differ from the expected SHA-256."):
      {matches:true,outstanding:[]};
  }catch{
    return hold("Private publication bytes could not be checked locally.");
  }
}
