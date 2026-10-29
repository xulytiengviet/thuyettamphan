import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../vendor/cvnss4-v5.js";
import {encodeTransport} from "../src/ternary.js";
import {encodeMixedTransport,decodeMixedTransport,mixedProfile,packLosslessV2,unpackLosslessV2} from "../src/codec-v2.js";
import {evaluateFourPillars,trainMiniByteBpe,encodeMiniBpe,decodeMiniBpe,validateLLMEvidence} from "../src/evaluation.js";
const converter=globalThis.CVNSSConverter;
const corpus=JSON.parse(readFileSync(new URL("../data/vietnamese_eval_v1.json",import.meta.url),"utf8"));

test("P1 · mixed Base27 transport local-escapes only punctuation and is byte-reversible",()=>{
  const s="abc!?def — á\u0301 🤖 xyz";
  const mixed=encodeMixedTransport(s);
  assert.equal(decodeMixedTransport(mixed),s);
  assert.ok(mixed.spans.some(x=>x.mode==="d"));
  assert.ok(mixed.spans.some(x=>x.mode==="u"));
  assert.ok(mixedProfile(mixed).digits<encodeTransport(s).digits.length);
  assert.throws(()=>decodeMixedTransport({mode:"mixed27-v1",spans:[{mode:"u",digits:[26,26]}]}));
  assert.throws(()=>decodeMixedTransport({mode:"mixed27-v1",spans:[{mode:"x",digits:[0]}]}));
});

test("P2 · packet LP2 preserves the full original Unicode in diverse cases",async()=>{
  const samples=["iên yên, oà òa", "Chào bạn! Điện toán tam phân.", "abc！？ xyz 🤖", "a\u0301 và á",
    "AÀÁÂÉÍÓÚỲ", "", "   ", "1234 [WebGIS] — Đà Lạt", "CVNSS4.0 × BASE27 × RUL"];
  for(const s of samples){
    const p=await packLosslessV2(s,converter);
    const r=await unpackLosslessV2(p.packet,converter);
    assert.equal(r.text,s);
    assert.equal(p.valid,true);
    assert.equal(p.trits,3*p.digits);
    assert.ok(p.packetBytes>0);
  }
});

test("P2 · altered sidecar is rejected by integrity verification",async()=>{
  const p=await packLosslessV2("iên yên, oà òa",converter);
  const q=structuredClone(p.packet);
  q.patches=[{at:0,remove:0,insert:"BOGUS"}];
  await assert.rejects(unpackLosslessV2(q,converter),/checksum|invalid/i);
});

test("P3 · actual deterministic mini BPE merges and decompression",()=>{
  const train=["điện toán tam phân","điện toán tam phân","điện toán tam phân","ngôn ngữ tiếng việt"];
  const m=trainMiniByteBpe(train,48);
  assert.ok(m.rules.length>0 && m.rules.length<=48);
  const t="Đà Lạt 🚁 — ngôn ngữ tiếng Việt.";
  const coded=encodeMiniBpe(t,m);
  assert.equal(decodeMiniBpe(coded,m),t);
  assert.deepEqual(trainMiniByteBpe(train,48),m);
  assert.ok(coded.length<=new TextEncoder().encode(t).length);
});

test("P1–P3 · published train/holdout corpus end-to-end diagnostic",async()=>{
  const a=await evaluateFourPillars(corpus,converter,{merges:48});
  assert.equal(a.schema,"vt-proof-eval/v1");
  assert.equal(a.p1.status,"proven-finite");
  assert.equal(a.p1.count,27);
  assert.equal(a.p1.unique,27);
  assert.equal(a.p1.minTrits,3);
  assert.equal(a.p2.losslessPass,corpus.test.length);
  assert.equal(a.p2.failCount,0);
  assert.equal(a.p3.heldoutSamples,corpus.test.length);
  assert.equal(a.p3.trainingSamples,corpus.train.length);
  assert.equal(a.p3.bpeByteReversible,true);
  assert.equal(a.p3.mixedByteReversible,true);
  assert.equal(a.p4.status,"awaiting-real-model-runs");
  assert.ok(a.p3.nativeMiniBpeTokens<a.p3.rawByteTokens);
  assert.ok(a.p3.mixedBase27Digits<=a.p3.legacyBase27Digits);
});
test("P3 · train/test leakage must fail before measuring",async()=>{
  const overlap=structuredClone(corpus); overlap.test.push(overlap.train[0]);
  await assert.rejects(evaluateFourPillars(overlap,converter),/leakage/i);
});

function makeRun(seed,candidate=false){
  return {seed,dataset_sha256:"a".repeat(64),hardware_id:"cpu-x64-2026",eval_protocol:"vm1-2026-v1",
    tokenizer_version:candidate?"cvnss-t27-patch-v1":"bpe-baseline-v1",
    model_commit:candidate?"candidate-model":"baseline-model",score_pct:candidate?79.5:80,
    inference_flops_per_utf8_byte:candidate?75:100,
    joule_per_utf8_byte:candidate?7:10,latency_ms_per_utf8_byte:candidate?2.5:3,
    peak_ram_mb:candidate?750:980,training_compute_flops:10000,model_params:1000000};
}
test("P4 · blank schema has no experiment and must not pass",()=>{
  const template=JSON.parse(readFileSync(new URL("../data/llm_evidence_template_v1.json",import.meta.url),"utf8"));
  const r=validateLLMEvidence(template);
  assert.equal(r.valid,false);
  assert.equal(r.gate,"INVALID");
});
test("P4 · synthetic test fixture ONLY: gate checks matching data and thresholds",()=>{
  const demo={schema:"vt-llm-eval/v1",baseline_id:"M0",arms:[
    {id:"M0",runs:[1,2,3].map(s=>makeRun(s))},
    {id:"M6",runs:[1,2,3].map(s=>makeRun(s,true))}
  ]};
  const r=validateLLMEvidence(demo);
  assert.equal(r.valid,true);
  assert.equal(r.comparisons[0].passProposedGate,true);
  demo.arms[1].runs[0].hardware_id="different-hardware";
  assert.equal(validateLLMEvidence(demo).valid,false);
  demo.arms[1].runs[0].hardware_id="cpu-x64-2026";
  demo.arms[1].runs[0].training_compute_flops=20000;
  assert.equal(validateLLMEvidence(demo).valid,false);
});
