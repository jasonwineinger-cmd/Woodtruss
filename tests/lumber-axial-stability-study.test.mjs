import test from 'node:test';
import assert from 'node:assert/strict';
import { studyPreliminaryAxialStability } from '../dist/lumber/src/index.js';

// Synthetic demonstration values only; no published design values.
const catalog={catalogId:'synthetic',records:[{
  referenceValueId:'rect',speciesGroup:'synthetic',grade:'test only',nominalSize:'example',
  actualWidthIn:2,actualDepthIn:4,referenceEdition:'example',referencePublisher:'example',referenceTable:'example',
  fbPsi:300,ftPsi:300,fcPsi:300,fvPsi:300,ePsi:100000,eMinPsi:50000,
}]};
const envelope={status:'PRELIMINARY_NOT_ENGINEERED',memberForces:{
  chord:{minLb:-2400,maxLb:800,governingMinCase:'gravity',governingMaxCase:'uplift'},
},reactions:{},warnings:[]};
const input={memberId:'chord',referenceValueId:'rect',modulus:'catalog-mean',
  aboutWidthAxis:{unbracedLengthIn:40,effectiveLengthFactor:1,restraintBasis:'synthetic scenario x'},
  aboutDepthAxis:{unbracedLengthIn:20,effectiveLengthFactor:2,restraintBasis:'synthetic scenario y'},
};
const near=(got,expected)=>assert.ok(Math.abs(got-expected)<1e-8,`expected ${expected}, got ${got}`);

test('separates signed-case demand and ideal Euler references about both rectangular axes',()=>{
  const r=studyPreliminaryAxialStability(envelope,catalog,input);
  assert.deepEqual([r.areaIn2,r.tensionStressPsi,r.compressionStressPsi,r.tensionCase,r.compressionCase],[8,100,300,'uplift','gravity']);
  near(r.aboutWidthAxis.momentOfInertiaIn4,32/3);
  near(r.aboutDepthAxis.momentOfInertiaIn4,8/3);
  near(r.aboutWidthAxis.idealEulerReferenceLb,6579.736267392906);
  near(r.aboutDepthAxis.idealEulerReferenceLb,1644.9340668482264);
  assert.equal(r.approvedForStructuralUse,false);
  assert.equal(r.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal('passes' in r,false);
});

test('keeps absence of tension case explicit and independently varies axis restraint / modulus',()=>{
  const compressionOnly={...envelope,memberForces:{chord:{...envelope.memberForces.chord,maxLb:-10}}};
  const r=studyPreliminaryAxialStability(compressionOnly,catalog,{...input,modulus:'catalog-minimum',
    aboutDepthAxis:{...input.aboutDepthAxis,unbracedLengthIn:40}});
  assert.equal(r.tensionStressPsi,0);
  assert.equal(r.tensionCase,null);
  near(r.aboutWidthAxis.idealEulerReferenceLb,3289.868133696453);
  near(r.aboutDepthAxis.idealEulerReferenceLb,205.6167583560283);
});

test('fails closed on absent restraint, modulus, section, unrepresentable length or invalid force',()=>{
  for (const candidate of [
    {...input,memberId:'toString'},{...input,referenceValueId:'missing'},
    {...input,modulus:undefined},{...input,aboutDepthAxis:undefined},
    {...input,aboutWidthAxis:{...input.aboutWidthAxis,restraintBasis:'  '}},
    {...input,aboutWidthAxis:{...input.aboutWidthAxis,unbracedLengthIn:1e300}},
  ]) assert.throws(()=>studyPreliminaryAxialStability(envelope,catalog,candidate));
  assert.throws(()=>studyPreliminaryAxialStability({...envelope,
    memberForces:{chord:{...envelope.memberForces.chord,minLb:Infinity}}},catalog,input));
});
