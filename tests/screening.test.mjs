import test from 'node:test';
import assert from 'node:assert/strict';
import {screenElasticCompression} from '../dist/lumber/src/screening.js';
const base={widthIn:1.5,depthIn:3.5,elasticModulusPsi:1000000,memberLengthIn:120,effectiveLengthFactor:1,compressionLb:500};
test('rectangular section area and minor inertia',()=>{
 const x=screenElasticCompression(base);
 assert.equal(x.areaIn2,5.25);
 assert.ok(Math.abs(x.minorAxisMomentIn4-3.5*1.5**3/12)<1e-10);
 assert.equal(x.status,'PRELIMINARY_NOT_ENGINEERED');
});
test('doubling length quarters Euler reference',()=>{
 const a=screenElasticCompression(base),b=screenElasticCompression({...base,memberLengthIn:240});
 assert.ok(Math.abs(a.eulerMinorAxisLb/b.eulerMinorAxisLb-4)<1e-10);
});
test('invalid inputs rejected',()=>{
 assert.throws(()=>screenElasticCompression({...base,effectiveLengthFactor:0}));
 assert.throws(()=>screenElasticCompression({...base,compressionLb:-1}));
 assert.throws(()=>screenElasticCompression({...base,elasticModulusPsi:NaN}));
});
