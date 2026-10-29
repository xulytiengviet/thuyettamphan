/**
 * Four pillars evaluation / v1 (research prototype, no fabricated LLM results).
 * Mini-BPE is a real deterministic byte-pair-merge baseline trained on a tiny
 * disclosed corpus. It is NOT a pretrained BPE-32K, BLT, or LLM benchmark.
 */
import {mappingProof,encodeTransport,decodeTransport,packProof,unpackProof} from "./ternary.js";
import {encodeMixedTransport,decodeMixedTransport,mixedProfile,packLosslessV2,unpackLosslessV2} from "./codec-v2.js";
const te=new TextEncoder();

const mean=xs=>xs.reduce((s,x)=>s+x,0)/(xs.length||1);
const sum=xs=>xs.reduce((s,x)=>s+x,0);
const asBytes=s=>[...te.encode(s)];
const arrEq=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);

function countPairs(seqs){
  const m=new Map();
  for(const seq of seqs)for(let i=0;i<seq.length-1;i++){
    const key=seq[i]+","+seq[i+1];
    m.set(key,(m.get(key)||0)+1);
  }
  return m;
}
const mergeSequence=(seq,rule)=>{
  const out=[];
  for(let i=0;i<seq.length;i++){
    if(i<seq.length-1&&seq[i]===rule.a&&seq[i+1]===rule.b){out.push(rule.id);i++}
    else out.push(seq[i]);
  }
  return out;
};
export function trainMiniByteBpe(strings,maxMerges=96){
  if(!Array.isArray(strings)||!Number.isInteger(maxMerges)||maxMerges<0||maxMerges>1024)
    throw new TypeError("Invalid BPE train split or merge limit");
  let seqs=strings.map(asBytes);
  const rules=[];
  for(let id=256;id<256+maxMerges;id++){
    const counts=countPairs(seqs);
    let best=null,score=1;
    for(const [key,n] of counts){
      if(n<2)continue;
      const [a,b]=key.split(",").map(Number);
      if(n>score||(n===score&&(best===null||a<best.a||(a===best.a&&b<best.b)))){
        best={a,b,id,trainPairFrequency:n};score=n;
      }
    }
    if(!best)break;
    rules.push(best);
    seqs=seqs.map(seq=>mergeSequence(seq,best));
  }
  return {type:"diagnostic-byte-bpe",rules,vocabSize:256+rules.length,trainSamples:strings.length};
}
export function encodeMiniBpe(s,model){
  let ids=asBytes(s);
  for(const rule of model.rules)ids=mergeSequence(ids,rule);
  return ids;
}
export function decodeMiniBpe(ids,model){
  const recipes=new Map(model.rules.map(r=>[r.id,[r.a,r.b]]));
  const expanded=[];
  const expand=(id,depth)=>{
    if(depth>model.rules.length+1)throw new Error("BPE invalid recursion");
    if(id>=0&&id<=255){expanded.push(id);return}
    const pair=recipes.get(id);
    if(!pair)throw new Error("Unknown BPE token");
    expand(pair[0],depth+1);expand(pair[1],depth+1);
  };
  for(const id of ids)expand(id,0);
  return new TextDecoder("utf-8",{fatal:true}).decode(new Uint8Array(expanded));
}

const ensureCorpus=corpus=>{
  if(!corpus||corpus.schema!=="vt-vietnamese-eval-corpus/v1")throw new Error("Wrong corpus schema");
  if(!Array.isArray(corpus.train)||corpus.train.length<4||!Array.isArray(corpus.test)||corpus.test.length<4)throw new Error("Missing train/holdout split");
  if(![...corpus.train,...corpus.test].every(s=>typeof s==="string"))throw new Error("Corpus must contain strings");
  const train=new Set(corpus.train);
  if(corpus.test.some(s=>train.has(s)))throw new Error("Data leakage: train/holdout string duplicate");
};
export async function evaluateFourPillars(corpus,converter,{merges=96}={}){
  ensureCorpus(corpus);
  if(!converter?.fromCqn||!converter?.fromCvss)throw new Error("No real CVNSS converter");
  const bij=mappingProof();
  const proof1={status:bij.ok?"proven-finite":"fail",count:bij.checked,unique:bij.distinct,
    minBits:Math.ceil(Math.log2(27)),minTrits:Math.ceil(Math.log(27)/Math.log(3)-1e-12),
    unusedBinary:32-27,unusedTernary:0};

  // A few deliberate counterexamples. They are expected failures for the plain converter.
  const collisionPairs=[["iên","yên"],["oà","òa"]];
  const collisions=collisionPairs.map(([a,b])=>({a,b,cA:converter.fromCqn(a).cvss,cB:converter.fromCqn(b).cvss,
    collides:converter.fromCqn(a).cvss===converter.fromCqn(b).cvss}));

  const test=corpus.test;
  const inputUtf8Bytes=sum(test.map(s=>te.encode(s).length));
  const rawCodepoints=sum(test.map(s=>Array.from(s).length));
  const trainCVNSS=corpus.train.map(s=>converter.fromCqn(s).cvss);
  const baseBpe=trainMiniByteBpe(corpus.train,merges);
  const cvssBpe=trainMiniByteBpe(trainCVNSS,merges);
  let bpeTokens=0,cvssBpeTokens=0,cvssCodepoints=0,rawByteTokens=inputUtf8Bytes,canonLoss=0;
  let legacyDigits=0,mixedDigits=0,legacyPacketBytes=0,mixedPacketBytes=0,
    sidecarBytes=0,spanCount=0,losslessPass=0,failures=[];
  let bpeRoundtrip=0,mixedTransportRoundtrip=0;

  for(let i=0;i<test.length;i++){
    const s=test[i],cvss=converter.fromCqn(s).cvss;
    const a=encodeMiniBpe(s,baseBpe),b=encodeMiniBpe(cvss,cvssBpe);
    bpeTokens+=a.length;cvssBpeTokens+=b.length;
    if(decodeMiniBpe(a,baseBpe)===s && decodeMiniBpe(b,cvssBpe)===cvss)bpeRoundtrip++;
    cvssCodepoints+=Array.from(cvss).length;
    if(converter.fromCvss(cvss).cqn!==s)canonLoss++;
    const m=encodeMixedTransport(cvss);
    if(decodeMixedTransport(m)===cvss)mixedTransportRoundtrip++;
    else failures.push({i,stage:"mixed-transport"});
    mixedDigits+=mixedProfile(m).digits;spanCount+=m.spans.length;
    legacyDigits+=encodeTransport(cvss).digits.length;
    try{
      const old=await packProof(s,converter),newOne=await packLosslessV2(s,converter);
      if((await unpackProof(old.packet,converter)).text!==s)throw new Error("LP1 mismatch");
      if((await unpackLosslessV2(newOne.packet,converter)).text!==s)throw new Error("LP2 mismatch");
      losslessPass++;
      legacyPacketBytes+=old.packetBytes;
      mixedPacketBytes+=newOne.packetBytes;
      sidecarBytes+=newOne.sidecarBytes;
    }catch(e){failures.push({i,stage:"roundtrip",error:String(e.message||e)})}
  }
  const proof2={status:failures.length?"fail":"sample-tested",
    tested:test.length,losslessPass,unicodeByteExact:losslessPass===test.length,
    plainConverterNonlosslessCases:canonLoss,collisionPairs:collisions,
    failCount:failures.length,failures,
    inputUtf8Bytes,legacyPacketBytes,mixedPacketBytes,sidecarBytes,
    overheadRatio:inputUtf8Bytes?mixedPacketBytes/inputUtf8Bytes:0,
    holdoutNormalization:"none"};
  const proof3={status:"diagnostic-measured",notBpe32K:true,notTrainingQualityProof:true,
    heldoutSamples:test.length,trainingSamples:corpus.train.length,miniBpeMerges:merges,
    nativeBpeVocab:baseBpe.vocabSize,cvnssBpeVocab:cvssBpe.vocabSize,
    inputUtf8Bytes,rawCodepoints,rawByteTokens,
    nativeMiniBpeTokens:bpeTokens,cvnssCodepoints,
    cvnssMiniBpeTokens:cvssBpeTokens,
    legacyBase27Digits:legacyDigits,mixedBase27Digits:mixedDigits,
    legacyTrits:legacyDigits*3,mixedTrits:mixedDigits*3,
    unicodeBytesPerNativeBpeToken:bpeTokens?inputUtf8Bytes/bpeTokens:null,
    relativeMixedDigits:mixedDigits/(legacyDigits||1),mixedSpans:spanCount,
    bpeByteReversible:bpeRoundtrip===test.length,
    mixedByteReversible:mixedTransportRoundtrip===test.length,
    packetBytes:mixedPacketBytes,rawBytes:inputUtf8Bytes,
    caveat:"Tokenizer mini-BPE được huấn luyện trên tập mẫu nhỏ; không thay thế BPE32K hoặc BLT, không là đánh giá mô hình."};
  return {
    schema:"vt-proof-eval/v1",dataset:corpus.schema,provenance:corpus.description,
    method:{split:"fixed-disjoint",trainingSamples:corpus.train.length,holdoutSamples:corpus.test.length,merges,normalization:"none"},
    p1:proof1,p2:proof2,p3:proof3,
    p4:{status:"awaiting-real-model-runs",requiredSeeds:3,objective:"same hardware + dataset + evaluation protocol + matched training compute and params",
      metricKeys:["score_pct","inference_flops_per_utf8_byte","joule_per_utf8_byte","latency_ms_per_utf8_byte","peak_ram_mb"]},
    disclaimer:"Only P1 proves a mathematical finite mapping. P2/P3 are bounded diagnostics on the disclosed corpus; P4 has no training outcomes."
  };
}

/**
 * Strict evidence gate for user-supplied, independently performed LLM experiments.
 * We verify SCHEMA AND COMPARABILITY, not the actual hardware measurements.
 */
export function validateLLMEvidence(record){
  const errors=[];
  if(!record||record.schema!=="vt-llm-eval/v1")return {valid:false,gate:"INVALID",errors:["schema must be vt-llm-eval/v1"]};
  const arms=record.arms;
  if(!Array.isArray(arms)||arms.length<2)return {valid:false,gate:"INVALID",errors:["at least baseline and candidate arms required"]};
  const byName=new Map();
  for(const arm of arms){
    if(!arm||typeof arm.id!=="string"||!Array.isArray(arm.runs)) {errors.push("Malformed arm");continue}
    if(byName.has(arm.id))errors.push("Duplicate arm id "+arm.id);
    byName.set(arm.id,arm);
    if(arm.runs.length<3)errors.push(arm.id+" requires at least three independent seeds");
    const seeds=new Set();
    for(const run of arm.runs){
      if(!run || !Number.isInteger(run.seed) || seeds.has(run.seed))errors.push(arm.id+": duplicate/invalid seed");
      seeds.add(run?.seed);
      for(const k of ["score_pct","inference_flops_per_utf8_byte","joule_per_utf8_byte","latency_ms_per_utf8_byte",
        "peak_ram_mb","training_compute_flops","model_params"]){
        if(typeof run?.[k]!=="number"||!Number.isFinite(run[k])||run[k]<=0||k==="score_pct"&&run[k]>100)
          errors.push(arm.id+": missing/out-of-range "+k);
      }
      for(const k of ["dataset_sha256","hardware_id","eval_protocol","tokenizer_version","model_commit"]){
        if(typeof run?.[k]!=="string"||run[k].length<3)errors.push(arm.id+": missing provenance "+k);
      }
    }
  }
  const base=byName.get(record.baseline_id);
  if(!base)errors.push("baseline_id does not refer to an arm");
  const allRuns=arms.flatMap(a=>a?.runs||[]);
  for(const key of ["dataset_sha256","hardware_id","eval_protocol"]){
    const unique=new Set(allRuns.map(r=>r?.[key]));
    if(unique.size!==1)errors.push("Noncomparable "+key+": "+[...unique].join(" / "));
  }
  const means={};
  for(const [id,arm] of byName)if(arm.runs.length){
    means[id]={};
    for(const key of ["score_pct","inference_flops_per_utf8_byte","joule_per_utf8_byte","latency_ms_per_utf8_byte",
      "peak_ram_mb","training_compute_flops","model_params"]){
      const xs=arm.runs.map(r=>r?.[key]);
      means[id][key]=xs.every(x=>typeof x==="number"&&Number.isFinite(x))?mean(xs):null;
    }
  }
  if(base && means[base.id]){
    const b=means[base.id];
    for(const [id,stats] of Object.entries(means))if(id!==base.id){
      if(stats.training_compute_flops&&b.training_compute_flops
        &&Math.abs(stats.training_compute_flops/b.training_compute_flops-1)>0.05)
          errors.push("Unmatched training FLOPs for "+id+" (>5%)");
      if(stats.model_params&&b.model_params&&Math.abs(stats.model_params/b.model_params-1)>0.05)
          errors.push("Unmatched parameter count for "+id+" (>5%)");
    }
  }
  if(errors.length)return {valid:false,gate:"INVALID",errors:[...new Set(errors)],means};
  const b=means[record.baseline_id],comparisons=[];
  for(const arm of arms)if(arm.id!==record.baseline_id){
    const c=means[arm.id];
    const scoreGap=c.score_pct-b.score_pct;
    const flopSaving=1-c.inference_flops_per_utf8_byte/b.inference_flops_per_utf8_byte;
    const energySaving=1-c.joule_per_utf8_byte/b.joule_per_utf8_byte;
    const latencySaving=1-c.latency_ms_per_utf8_byte/b.latency_ms_per_utf8_byte;
    comparisons.push({arm:arm.id,scoreGapPp:scoreGap,flopSavingPct:100*flopSaving,
      energySavingPct:100*energySaving,latencySavingPct:100*latencySaving,
      passProposedGate:scoreGap>=-1 && flopSaving>=.20 && energySaving>=.20});
  }
  return {valid:true,gate:"SUBMITTED_DATA_SCHEMA_VALID",comparisons,means,
    caution:"The tool validates submitted values/comparability; it does not independently verify measurement provenance, calibration, or actual LLM training."};
}
