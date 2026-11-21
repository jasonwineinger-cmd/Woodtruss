import type {Joint,Member} from "../../geometry/src/topology.js";
/** Watermarked, read-only schematic SVG. Not a dimensioned shop drawing. */
export function renderSchematicTrussSvg(joints:Joint[],members:Member[]):string {
 if(joints.length<2||members.length===0)throw new Error("Empty truss schematic");
 const points=new Map<string,{x:number;y:number}>();
 for(const j of joints){
  if(!j.id||points.has(j.id)||!Number.isFinite(j.position.x)||!Number.isFinite(j.position.y))
   throw new Error("Invalid schematic joint");
  points.set(j.id,j.position);
 }
 const coords=[...points.values()];
 const minX=Math.min(...coords.map(p=>p.x)),maxX=Math.max(...coords.map(p=>p.x));
 const minY=Math.min(...coords.map(p=>p.y)),maxY=Math.max(...coords.map(p=>p.y));
 if(maxX<=minX||maxY<minY)throw new Error("Invalid schematic bounds");
 const width=maxX-minX+80,height=maxY-minY+110;
 const escape=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
 const xy=(p:{x:number;y:number})=>({x:p.x-minX+40,y:maxY-p.y+40});
 const lines=members.map(m=>{
  const a=points.get(m.start),b=points.get(m.end);
  if(!a||!b||a===b)throw new Error("Unknown member endpoint");
  const p=xy(a),q=xy(b);
  return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="#333" stroke-width="2" data-member="${escape(m.id)}"/>`;
 }).join("");
 const dots=joints.map(j=>{const p=xy(j.position);return `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#111"/><text x="${p.x+5}" y="${p.y-5}" font-size="11">${escape(j.id)}</text>`;}).join("");
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Unapproved preliminary truss schematic"><title>PRELIMINARY - NOT FOR FABRICATION</title><rect width="100%" height="100%" fill="white"/>${lines}${dots}<text x="20" y="${height-18}" font-size="15" fill="#b00020">PRELIMINARY - NOT FOR FABRICATION</text></svg>`;
}
