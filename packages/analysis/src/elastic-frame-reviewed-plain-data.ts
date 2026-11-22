type ReviewData = null | boolean | number | string | readonly ReviewData[]
  | {readonly [key:string]:ReviewData};

const MAX_DEPTH=64;
const MAX_VISITS=250_000;
const MAX_TEXT_UNITS=8_000_000;
const invalid=(detail:string)=>new Error(`Invalid elastic frame review plain data: ${detail}`);
const owns=(value:object,key:PropertyKey)=>Object.prototype.hasOwnProperty.call(value,key);

/** Detach JSON-compatible review values before comparison, replay or hashing.
 * Scans own descriptors, not property values via ordinary access; never calls
 * getters or toJSON. As with standard JavaScript reflection, an arbitrary
 * Proxy may still execute its own reflection traps and is not a trust boundary.
 * Records are null-prototype and inserted in lexical key order (ECMAScript
 * integer-index keys still enumerate numerically). Arrays preserve order.
 * Negative zero intentionally becomes JSON numeric zero; no other coercion.
 */
export function snapshotElasticFrameReviewData(input:unknown):unknown {
  const active=new WeakSet<object>();
  let visits=0, textUnits=0;
  function addText(value:string) {
    textUnits+=value.length;
    if(textUnits>MAX_TEXT_UNITS)throw invalid("text budget exceeded");
  }
  function readOwn(owner:object,key:string) {
    const descriptor=Object.getOwnPropertyDescriptor(owner,key);
    if(!descriptor||!descriptor.enumerable||!owns(descriptor,"value"))
      throw invalid("only enumerable own data properties are permitted");
    return descriptor.value as unknown;
  }

  function copy(value:unknown,depth:number):ReviewData {
    if(depth>MAX_DEPTH||++visits>MAX_VISITS)throw invalid("snapshot budget exceeded");
    if(value===null||typeof value==="boolean")return value;
    if(typeof value==="string"){
      addText(value);
      return value;
    }
    if(typeof value==="number") {
      if(!Number.isFinite(value))throw invalid("numbers must be finite");
      return value===0?0:value;
    }
    if(typeof value!=="object")throw invalid("unsupported value");
    if(active.has(value))throw invalid("cyclic reference");
    active.add(value);
    try {
      const prototype=Object.getPrototypeOf(value);
      if(Array.isArray(value)){
        if(prototype!==Array.prototype)throw invalid("non-plain array");
        const length=Object.getOwnPropertyDescriptor(value,"length")?.value as unknown;
        if(typeof length!=="number"||!Number.isSafeInteger(length)||length<0||length>MAX_VISITS-visits)
          throw invalid("snapshot budget exceeded");
        const keys=Reflect.ownKeys(value);
        if(keys.length!==length+1)throw invalid("array must be dense with no extra fields");
        const out:ReviewData[]=[];
        for(let index=0;index<length;index++)out.push(copy(readOwn(value,String(index)),depth+1));
        return Object.freeze(out);
      }
      if(prototype!==Object.prototype&&prototype!==null)throw invalid("non-plain object");
      const keys=Reflect.ownKeys(value);
      if(keys.length>MAX_VISITS-visits)throw invalid("snapshot budget exceeded");
      if(keys.some(key=>typeof key!=="string"))throw invalid("symbol keys are not permitted");
      const out=Object.create(null) as Record<string,ReviewData>;
      const recordKeys=keys as string[];
      for(const key of recordKeys)addText(key);
      for(const key of recordKeys.sort())out[key]=copy(readOwn(value,key),depth+1);
      return Object.freeze(out);
    } finally {
      active.delete(value);
    }
  }
  return copy(input,0);
}
