import "../vendor/cvnss4-v5.js";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {evaluateFourPillars} from "../src/evaluation.js";

const read=p=>readFileSync(new URL(p,import.meta.url));
const corpusBytes=read("../data/vietnamese_eval_v1.json");
const corpus=JSON.parse(corpusBytes.toString("utf8"));
const report=await evaluateFourPillars(corpus,globalThis.CVNSSConverter,{merges:96});
report.provenanceHashes={
  corpusSha256:createHash("sha256").update(corpusBytes).digest("hex"),
  evaluationSourceSha256:createHash("sha256").update(read("../src/evaluation.js")).digest("hex"),
  codecV2SourceSha256:createHash("sha256").update(read("../src/codec-v2.js")).digest("hex"),
  converterSourceSha256:createHash("sha256").update(read("../vendor/cvnss4-v5.js")).digest("hex"),
  githubCommit:process.env.GITHUB_SHA||"local-run"
};
if(report.p1.unique!==27||report.p1.minTrits!==3||!report.p2.unicodeByteExact||!report.p3.mixedByteReversible||
   report.p4.status!=="awaiting-real-model-runs")throw new Error("P1-P3 diagnostic invariants failed");
mkdirSync("reports",{recursive:true});
writeFileSync("reports/evaluation-v1.json",JSON.stringify(report,null,2)+"\n","utf8");
console.log(JSON.stringify({
  result:"P1-P3 diagnostics successful; P4 UNMEASURED",
  p1:report.p1,holdout:report.p2.tested,p2Roundtrip:report.p2.losslessPass,
  legacyTransportDigits:report.p3.legacyBase27Digits,mixedTransportDigits:report.p3.mixedBase27Digits,
  originalBytes:report.p2.inputUtf8Bytes,
  legacyPacketBytes:report.p2.legacyPacketBytes,mixedPacketBytes:report.p2.mixedPacketBytes,
  miniBpeTokens:report.p3.nativeMiniBpeTokens,
  P4:report.p4.status,report:"reports/evaluation-v1.json"
},null,2));
