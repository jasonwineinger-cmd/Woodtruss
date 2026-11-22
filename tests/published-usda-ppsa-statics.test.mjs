import assert from 'node:assert/strict';
import test from 'node:test';
import {calculatePlanarLoadResultant as sum} from '../dist/analysis/src/planar-load-resultant.js';

// USDA FPL-GTR-40, Tables II/III/VI/VII, PDF pp. 18, 20, 21:
// https://research.fs.usda.gov/download/treesearch/5946.pdf
// This reconstructs only the printed example's global force/moment balance.
// It does not implement PPSA's general load semantics or any frame solution.
const O={x:0,y:0}, N2={x:0,y:50.01}, N3={x:70.25,y:26.6}, N4={x:140.5,y:3.18}, N5={x:140.5,y:0};
const common=[
  {id:'point-on-6',kind:'point',at:{x:46.25,y:0},fxLb:0,fyLb:-550},
  {id:'joint-4',kind:'point',at:N4,fxLb:0,fyLb:-128.8},
  {id:'couple-at-4',kind:'couple',momentLbIn:-1657.7},
];
const loads=basis=>[
 {id:'member-2',kind:'uniform',from:N2,to:N3,basis,fxLbPerIn:0,fyLbPerIn:-5},
 {id:'member-3',kind:'uniform',from:N3,to:N4,basis,fxLbPerIn:0,fyLbPerIn:-5}, ...common,
];
const near=(x,y,tol=1e-7)=>assert.ok(Math.abs(x-y)<tol,`expected ${y}; got ${x}`);

test('published PPSA example global load and moment close with projected length, not slope length',()=>{
 const {resultant:r,fabricationAuthorized}=sum(O,loads('horizontal-projection'));
 near(r.fxLb,0); near(r.fyLb,-1381.3); near(r.momentLbIn,-94542.225);
 assert.equal(fabricationAuthorized,false);
 const rise = sum(O,loads('member-length')).resultant;
 near(rise.fyLb,-1419.295,0.001); near(rise.momentLbIn,-97211.912,0.002);
 assert.ok(Math.abs(rise.momentLbIn-r.momentLbIn)>2600);

 const t=[[O,896.178,1005.070],[N2,-833.472,0],[N5,-62.705,376.230]];
 const reactions=sum(O,t.map(([at,fxLb,fyLb],i)=>({id:`R${i}`,kind:'point',at,fxLb,fyLb}))).resultant;
 near(reactions.fxLb+r.fxLb,0,0.002);
 near(reactions.fyLb+r.fyLb,0);
 near(reactions.momentLbIn+r.momentLbIn,0,0.05); // Table VII rounds individual components.
});

test('reversing a uniform segment preserves the resultant and origin changes account for both forces',()=>{
 const line={id:'line',kind:'uniform',from:{x:2,y:4},to:{x:5,y:8},basis:'member-length',fxLbPerIn:1,fyLbPerIn:-2};
 assert.deepEqual(sum(O,[line]).resultant,sum(O,[{...line,from:line.to,to:line.from}]).resultant);
 assert.deepEqual(sum({x:2,y:3},[line]).resultant,{fxLb:5,fyLb:-10,momentLbIn:-30});
 for(const invalid of [{...line,basis:'guess'},{...line,basis:'horizontal-projection',to:{x:2,y:8}},
   {...line,to:{x:Infinity,y:0}},{...line,fyLbPerIn:'-2'},{id:'bad',kind:'couple',momentLbIn:Infinity}])
   assert.throws(()=>sum(O,[invalid]));
 assert.throws(()=>sum(O,[line,line]));
});
