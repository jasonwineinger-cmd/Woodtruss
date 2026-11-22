type PointIn = Readonly<{x: number; y: number}>;
type GlobalForceLb = Readonly<{fxLb: number; fyLb: number}>;

/** Global planar actions only. No load basis is inferred from member slope. */
export type PlanarAuthoredAction =
  | Readonly<{id:string;kind:"point";at:PointIn;fxLb:number;fyLb:number}>
  | Readonly<{id:string;kind:"couple";momentLbIn:number}>
  | Readonly<{id:string;kind:"uniform";from:PointIn;to:PointIn;
      basis:"horizontal-projection"|"member-length";fxLbPerIn:number;fyLbPerIn:number}>;

const finitePoint = (p: PointIn): boolean => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);

/** Resolve global right/up forces and CCW moments about an explicit origin.
 * No nodes, supports, stiffness, design load generation, or capacity. */
export function calculatePlanarLoadResultant(origin: PointIn, actions: readonly PlanarAuthoredAction[]) {
  if (!finitePoint(origin) || !Array.isArray(actions) || !actions.length || actions.length>320)
    throw new Error("Explicit finite origin and bounded planar actions required");
  const seen=new Set<string>();
  const contributions=Array.from(actions).map(action=>{
    if (!action || typeof action.id!=="string" || !action.id.trim() || seen.has(action.id))
      throw new Error("Planar action IDs must be unique and nonempty");
    seen.add(action.id);
    let force: GlobalForceLb, momentLbIn: number;
    if (action.kind==="couple") {
      force={fxLb:0,fyLb:0}; momentLbIn=action.momentLbIn;
    } else {
      let dx:number, dy:number;
      if (action.kind==="point" && finitePoint(action.at)) {
        force={fxLb:action.fxLb,fyLb:action.fyLb};
        dx=action.at.x-origin.x; dy=action.at.y-origin.y;
      } else if (action.kind==="uniform" && finitePoint(action.from) && finitePoint(action.to)) {
        if (![action.fxLbPerIn,action.fyLbPerIn].every(Number.isFinite)) throw new Error("Uniform force components must be finite numbers");
        const vx=action.to.x-action.from.x, vy=action.to.y-action.from.y;
        const length=action.basis==="horizontal-projection"?Math.abs(vx):
          action.basis==="member-length"?Math.hypot(vx,vy):NaN;
        if (!(length>0) || !Number.isFinite(length)) throw new Error("Invalid applied load extent or basis");
        dx=action.from.x-origin.x+vx/2; dy=action.from.y-origin.y+vy/2;
        force={fxLb:action.fxLbPerIn*length,fyLb:action.fyLbPerIn*length};
      } else throw new Error("Unsupported or invalid planar action");
      momentLbIn=dx*force.fyLb-dy*force.fxLb;
    }
    if (![force.fxLb,force.fyLb,momentLbIn].every(Number.isFinite)) throw new Error("Invalid or nonfinite resultant");
    return {id:action.id,kind:action.kind,...force,momentLbIn};
  });
  const resultant=contributions.reduce((sum,row)=>({
    fxLb:sum.fxLb+row.fxLb,fyLb:sum.fyLb+row.fyLb,momentLbIn:sum.momentLbIn+row.momentLbIn,
  }),{fxLb:0,fyLb:0,momentLbIn:0});
  if (!Object.values(resultant).every(Number.isFinite)) throw new Error("Combined resultant exceeds numeric scope");
  return {origin:{x:origin.x,y:origin.y},contributions,resultant,
    scope:"GLOBAL_RESULTANT_ONLY" as const,fabricationAuthorized:false as const};
}
