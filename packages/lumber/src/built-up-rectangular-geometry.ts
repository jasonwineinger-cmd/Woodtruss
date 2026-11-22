/** Explicit section coordinates, all inches; x is width, y is depth. */
export interface BuiltUpRectangle {
  id:string;
  widthIn:number;
  depthIn:number;
  centerXIn:number;
  centerYIn:number;
}
const positive=(v:number)=>Number.isFinite(v)&&v>0;

/** Contrasts two ideal geometric models. The separate result sums each
 * rectangle's own centroidal properties, not a prediction of load sharing.
 * The common-centroid result assumes fully composite homogeneous material
 * only for illustration; it does not establish load transfer or capacity. */
export function studyIdealBuiltUpRectangularGeometry(rectangles:readonly BuiltUpRectangle[]) {
  if (!Array.isArray(rectangles) || rectangles.length<2 || rectangles.length>1000)
    throw new Error("Provide two to 1000 explicit rectangles");
  const ids=new Set<string>();
  const pieces=rectangles.map(r=>{
    if (!r || typeof r.id!=="string" || !r.id.trim() || ids.has(r.id) ||
      ![r.widthIn,r.depthIn].every(positive) || ![r.centerXIn,r.centerYIn].every(Number.isFinite))
      throw new Error("Unique IDs, positive dimensions and finite section coordinates required");
    ids.add(r.id);
    const {id,widthIn:b,depthIn:h,centerXIn:x,centerYIn:y}=r;
    const areaIn2=b*h, ix=b*h**3/12, iy=h*b**3/12;
    const x0=x-b/2,x1=x+b/2,y0=y-h/2,y1=y+h/2;
    if (![areaIn2,ix,iy].every(positive) || ![x0,x1,y0,y1].every(Number.isFinite) || !(x0<x1 && y0<y1))
      throw new Error("Rectangle exceeds the usable numeric range");
    return {id,x,y,areaIn2,ix,iy,x0,x1,y0,y1};
  });
  for(const [i,a] of pieces.entries()) for(const b of pieces.slice(i+1))
    if (Math.max(a.x0,b.x0)<Math.min(a.x1,b.x1) && Math.max(a.y0,b.y0)<Math.min(a.y1,b.y1))
      throw new Error("Explicit rectangle interiors overlap");
  const areaIn2=pieces.reduce((sum,p)=>sum+p.areaIn2,0);
  const centroidXIn=pieces.reduce((sum,p)=>sum+(p.areaIn2/areaIn2)*p.x,0);
  const centroidYIn=pieces.reduce((sum,p)=>sum+(p.areaIn2/areaIn2)*p.y,0);
  const separatelyCentroidal={
    aboutXIn4:pieces.reduce((sum,p)=>sum+p.ix,0),
    aboutYIn4:pieces.reduce((sum,p)=>sum+p.iy,0),
    productXYIn4:0,
  };
  const commonCentroidHomogeneous={
    aboutXIn4:pieces.reduce((sum,p)=>sum+p.ix+p.areaIn2*(p.y-centroidYIn)**2,0),
    aboutYIn4:pieces.reduce((sum,p)=>sum+p.iy+p.areaIn2*(p.x-centroidXIn)**2,0),
    productXYIn4:pieces.reduce((sum,p)=>sum+p.areaIn2*(p.x-centroidXIn)*(p.y-centroidYIn),0),
  };
  if (![areaIn2,separatelyCentroidal.aboutXIn4,separatelyCentroidal.aboutYIn4,
    commonCentroidHomogeneous.aboutXIn4,commonCentroidHomogeneous.aboutYIn4].every(positive) ||
    ![centroidXIn,centroidYIn,commonCentroidHomogeneous.productXYIn4].every(Number.isFinite))
    throw new Error("Built-up section exceeds the usable numeric range");
  return {status:"PRELIMINARY_NOT_ENGINEERED" as const, areaIn2,centroidXIn,centroidYIn,
    separatelyCentroidal,commonCentroidHomogeneous,
    axes:"x is width; y is depth; product XY is the integral of centered x*y.",
    compositeActionVerified:false as const,approvedForStructuralUse:false as const,
    warnings:[
      "These are geometric idealizations, not verified installed stiffness bounds or an intermediate composite model.",
      "No material properties, connection slip, load-sharing, capacity, standard checks or manufacture are evaluated.",
    ]};
}
