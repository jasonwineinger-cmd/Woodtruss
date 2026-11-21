/** Simplified elastic axial deformation benchmark.
 * Not an NDS member design, joint-slip model, or fabrication calculation.
 */
export interface AxialBenchmarkInput {
 lengthIn:number;
 areaIn2:number;
 elasticModulusPsi:number;
 axialLoadLb:number;
}
export interface AxialBenchmark {
 elongationIn:number;
 axialStressPsi:number;
 axialStrain:number;
 status:"PRELIMINARY_NOT_ENGINEERED";
}
export function analyticAxialBar(input:AxialBenchmarkInput):AxialBenchmark {
 const {lengthIn,areaIn2,elasticModulusPsi,axialLoadLb}=input;
 if(![lengthIn,areaIn2,elasticModulusPsi,axialLoadLb].every(Number.isFinite)||
   lengthIn<=0||areaIn2<=0||elasticModulusPsi<=0)
   throw new Error("Invalid axial benchmark input");
 const axialStressPsi=axialLoadLb/areaIn2;
 const axialStrain=axialStressPsi/elasticModulusPsi;
 const elongationIn=axialStrain*lengthIn;
 if(![axialStressPsi,axialStrain,elongationIn].every(Number.isFinite))
   throw new Error("Nonfinite axial benchmark");
 return {elongationIn,axialStressPsi,axialStrain,status:"PRELIMINARY_NOT_ENGINEERED"};
}
