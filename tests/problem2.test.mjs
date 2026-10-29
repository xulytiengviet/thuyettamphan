import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ALPHABET,toTrits} from "../src/ternary.js";
import {WAVELENGTHS_NM,STATES,encodeSymbol,compareImplementationCosts,spectralConfusion,amdahl,evaluateScenario} from "../bai-toan-2/core.js";

const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("Bài toán 2 · whole Base27 alphabet maps uniquely to three optical wavelength choices",()=>{
  assert.deepEqual(STATES,[-1,0,1]);
  assert.deepEqual(WAVELENGTHS_NM,{"-1":1550,"0":1310,"1":1064});
  const observed=new Set();
  for(let d=0;d<27;d++){
    const result=encodeSymbol(ALPHABET[d]);
    assert.equal(result.digit,d);
    assert.equal(result.recovered,ALPHABET[d]);
    assert.deepEqual(result.trits,toTrits(d));
    assert.equal(result.wavelengthNm.length,3);
    observed.add(result.wavelengthNm.join(","));
  }
  assert.equal(observed.size,27);
  assert.deepEqual(encodeSymbol("T").trits,[1,-1,1]);
  assert.deepEqual(encodeSymbol("T").wavelengthNm,[1064,1550,1064]);
  assert.throws(()=>encodeSymbol("á"),/symbol/i);
});
test("Bài toán 2 · normalized cost has consistent 27-symbol baselines, not claimed transistor truth",()=>{
  const x=compareImplementationCosts();
  assert.equal(x.binary,5);
  assert.equal(x.electronicTernary,120);
  assert.equal(x.optical,6.6);
  assert.equal(x.ternaryToBinary,24);
  assert.ok(!x.opticalBreakEven);
  const memory=compareImplementationCosts({bitCost:6,ternaryPerBitRatio:40/6,opticalShared:0,opticalPerTrit:1});
  assert.equal(memory.binary,30);
  assert.equal(memory.electronicTernary,120);
  assert.equal(memory.optical,3);
  assert.ok(memory.opticalBreakEven);
  assert.throws(()=>compareImplementationCosts({ternaryPerBitRatio:-3}));
});
test("Bài toán 2 · Gaussian receiver confusion rows are valid probabilities",()=>{
  for(const sigmaNm of [1,5,20,80,160])for(const driftNm of [-120,0,120]){
    const p=spectralConfusion({sigmaNm,driftNm});
    assert.equal(p.rows.length,3);
    for(const row of p.rows){
      assert.ok(row.every(x=>x>=0 && x<=1));
      assert.ok(Math.abs(row.reduce((a,b)=>a+b,0)-1)<1e-7);
    }
    assert.ok(p.symbolError>=0&&p.symbolError<=1);
  }
  assert.ok(spectralConfusion({sigmaNm:5,driftNm:0}).symbolError<0.00001);
  assert.ok(spectralConfusion({sigmaNm:130,driftNm:90}).symbolError>0.1);
  assert.throws(()=>spectralConfusion({sigmaNm:0}));
});
test("Bài toán 2 · Amdahl throughput estimates are explicitly conditional",()=>{
  const r=amdahl();
  assert.ok(Math.abs(r.core-1.8)<1e-12);
  assert.equal(amdahl({addFraction:0,addSpeedup:9}).core,1);
  assert.equal(amdahl({addFraction:1,addSpeedup:9}).core,9);
  const w=amdahl({addFraction:.5,addSpeedup:9,wdmChannels:6,systemUtilization:.6});
  assert.ok(Math.abs(w.upperBoundWithWdm-10.8)<1e-10);
  assert.ok(Math.abs(w.illustrativeEffective-6.48)<1e-10);
  assert.throws(()=>amdahl({addFraction:1.1}));
  const t=evaluateScenario({symbol:" ",sigmaNm:20,driftNm:0});
  assert.equal(t.symbol.digit,0);
});
test("Bài toán 2 · static HTML, references and page tabs exist",()=>{
  const main=read("../index.html"),p2=read("../bai-toan-2/index.html"),js=read("../bai-toan-2/app.js");
  assert.match(main,/href="\.\/bai-toan-2\/"/);
  assert.match(p2,/href="\.\.\/"/);
  assert.match(p2,/Long Ngo phát triển/);
  assert.match(p2,/Non-Commercial License/);
  for(const id of ["costChart","base27Symbol","confusionMatrix","amdahlCore","downloadScenario","verifyModel"]){
    assert.ok(p2.includes('id="'+id+'"'),"Missing UI element: "+id);
  }
  assert.match(p2,/40× = giả định/);
  assert.match(p2,/148 PFLOPS/);
  assert.match(p2,/Không phải benchmark chip chế tạo được đo độc lập/);
  assert.match(js,/evaluateScenario\(/);
});
