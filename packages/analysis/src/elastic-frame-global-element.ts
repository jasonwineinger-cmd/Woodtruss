import {elasticFrameElementLocalStiffness, type ElasticFrameElementProperties} from "./elastic-frame-element.js";

export interface ElasticFrameGlobalElementProperties extends Omit<ElasticFrameElementProperties,"lengthIn"> {
  left:{xIn:number;yIn:number};
  right:{xIn:number;yIn:number};
}

/** Rotate a single preliminary planar element into supplied global X/Y coordinates.
 * "Left" and "right" denote input end identities, not a sort by X. Local X
 * points left-to-right, local Y is 90 degrees counterclockwise from local X;
 * both rotations are counterclockwise and unchanged by the basis rotation.
 * Global DOFs are translations in inches and rotations in radians. This does
 * not assemble a frame or validate supports, loads, stability or connections.
 */
export function elasticFrameElementGlobalStiffness(properties:ElasticFrameGlobalElementProperties) {
  const {left,right}=properties;
  if(![left?.xIn,left?.yIn,right?.xIn,right?.yIn].every(Number.isFinite))
    throw new Error("Finite elastic frame endpoint coordinates required");
  const dx=right.xIn-left.xIn,dy=right.yIn-left.yIn;
  const lengthIn=Math.hypot(dx,dy);
  if(!Number.isFinite(lengthIn)||lengthIn<=0)
    throw new Error("Elastic frame endpoint distance must be finite and nonzero");

  // Normalize components before hypot; dividing by a subnormal rounded length
  // could otherwise yield a non-orthogonal basis even for finite coordinates.
  const scale=Math.max(Math.abs(dx),Math.abs(dy));
  const x=dx/scale,y=dy/scale,norm=Math.hypot(x,y);
  if((dx!==0&&x===0)||(dy!==0&&y===0))
    throw new Error("Elastic frame direction outside representable numerical range");
  const cosine=x/norm||0,sine=y/norm||0;
  const negativeSine=sine===0?0:-sine;
  const globalToLocalTransform=[
    [cosine,sine,0,0,0,0],
    [negativeSine,cosine,0,0,0,0],
    [0,0,1,0,0,0],
    [0,0,0,cosine,sine,0],
    [0,0,0,negativeSine,cosine,0],
    [0,0,0,0,0,1],
  ];
  const {matrix:localMatrix,localDofOrder:_,localAxes:__,...review}=
    elasticFrameElementLocalStiffness({...properties,lengthIn});

  // d_local = T d_global; energy equivalence gives K_global = Tᵀ K_local T.
  const T=globalToLocalTransform;
  const rightProduct=localMatrix.map(row=>row.map((_,j)=>
    row.reduce((sum,value,k)=>sum+value*T[k][j],0)));
  if(!rightProduct.every(row=>row.every(Number.isFinite)))
    throw new Error("Nonfinite elastic frame stiffness rotation");
  const matrix=Array.from({length:6},()=>Array<number>(6).fill(0));
  for(let i=0;i<6;i++)for(let j=i;j<6;j++){
    const value=T.reduce((sum,row,k)=>sum+row[i]*rightProduct[k][j],0);
    if(!Number.isFinite(value))throw new Error("Nonfinite elastic frame stiffness rotation");
    matrix[i][j]=matrix[j][i]=value===0?0:value;
  }
  return {...review,matrix,globalToLocalTransform,lengthIn,directionCosines:{cosine,sine},
    globalDofOrder:["uxLeft","uyLeft","thetaLeft","uxRight","uyRight","thetaRight"] as const};
}
