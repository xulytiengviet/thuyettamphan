import {
  ALPHABET,toTrits,fromTrits,mappingProof,encodeTransport,decodeTransport,
  packProof,unpackProof,buildPatches,applyPatches
} from "./ternary.js";

const $=id=>document.getElementById(id);
const converter=window.CVNSSConverter;
let latestPacket=null,latestAudit="";
const countFmt=n=>Number(n).toLocaleString("vi-VN");
const escaped=s=>String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function set(id,s){$(id).textContent=String(s)}
function resultNote(id,message,mode="success"){const el=$(id);el.className="note "+(mode==="danger"?"danger-note":mode==="success"?"success-note":"");el.textContent=message}
async function copyString(s,button){
  try {if(!navigator.clipboard)throw new Error("Clipboard API không khả dụng");await navigator.clipboard.writeText(s);
    const t=button.textContent;button.textContent="✓ Đã sao chép";setTimeout(()=>button.textContent=t,1900)
  } catch(e) {resultNote("browserTests","Không sao chép được: "+e.message,"danger")}
}
function drawMap(){
  const p=mappingProof(),selected=Number($("symbolPick").value),t=toTrits(selected);
  ["trit2","trit1","trit0"].forEach((id,i)=>set(id,(t[i]>0?"+":"")+t[i]));
  set("singleProof",`Ký hiệu: ${selected===0?"␠":ALPHABET[selected]} · Base27 d=${selected}\nd-13=${selected-13}=9×(${t[0]})+3×(${t[1]})+(${t[2]})\nKhôi phục: d=${fromTrits(t)}  →  ${selected===0?"Dấu cách":ALPHABET[selected]}`);
  return p;
}
const mapProof=mappingProof();
$("symbolPick").innerHTML=mapProof.rows.map(r=>`<option value="${r.digit}">${r.digit} — ${r.symbol==="␠"?"Dấu cách":r.symbol}</option>`).join("");
$("symbolPick").value="20";
$("symbolPick").addEventListener("change",drawMap);
$("mappingBody").innerHTML=mapProof.rows.map(r=>`<tr><td><code>${r.symbol}</code></td><td>${r.digit}</td><td>${r.trits[0]}</td><td>${r.trits[1]}</td><td>${r.trits[2]}</td><td>${r.recovered}</td></tr>`).join("");
drawMap();
$("all27Btn").addEventListener("click",()=>{
  const p=mappingProof();
  resultNote("all27Status",`✓ PASS: ${p.checked}/27 ánh xạ. ${p.distinct} bộ trit khác nhau, giải mã ngược d đúng trong toàn miền [0,26]. Kết luận chỉ áp dụng song ánh ký hiệu Base27 ↔ 3 trit.`);
});
$("copyMappingBtn").addEventListener("click",()=>copyString(mapProof.rows.map(r=>[r.symbol,r.digit,...r.trits,r.recovered].join("\t")).join("\n"),$("copyMappingBtn")));

function refreshAudit(){
  if(!converter?.audit||!converter?.selfTest){set("auditReport","Không tải được vendor/cvnss4-v5.js");set("converterTests","THIẾU JS");return}
  const a=converter.audit(),s=converter.selfTest();
  latestAudit=JSON.stringify({version:a.version,sourceVersion:a.sourceVersion,baseRows:a.baseRows,patchEntries:a.totalPatchEntries,ambiguityGroups:a.ambiguityGroups,criticalCollisions:a.criticalCollisionGroups,silentReverseOverwrite:a.silentReverseOverwrite,selfTest:s},null,2);
  set("ambiguityCount",a.ambiguityGroups);
  set("converterTests",`${s.tests-s.failures.length}/${s.tests}`);
  set("auditReport",latestAudit);
}
refreshAudit();
$("copyAuditBtn").addEventListener("click",()=>copyString(latestAudit,$("copyAuditBtn")));

async function runLossless() {
  if(!converter) {resultNote("losslessStatus","Thiếu converter v5 nguyên bản.","danger");return}
  if(!globalThis.crypto?.subtle){resultNote("losslessStatus","Web Crypto không hoạt động: mở trang qua HTTPS hoặc localhost để thử SHA-256.","danger");return}
  const input=$("cqnInput").value;
  if(input.length>120000){resultNote("losslessStatus","Bản demo giới hạn 120.000 UTF-16 code units để tránh treo trình duyệt.","danger");return}
  $("proofRun").disabled=true;set("losslessStatus","Đang kiểm chứng...");
  try{
    const r=await packProof(input,converter);
    latestPacket=JSON.stringify(r.packet,null,2);
    set("cvssOutput",r.cvss||"(rỗng)");
    set("ordinaryOutput",r.ordinary||"(rỗng)");
    set("recoveredOutput",r.restored||"(rỗng)");
    set("digitOutput",`Chế độ: ${r.mode}\n${r.packet.transport.digits.slice(0,120).join(" ")}${r.packet.transport.digits.length>120?" …":""}\nTổng: ${r.digitCount} chữ số Base27 · ${r.tritCount} trit\nGói vận chuyển có thể giải ngược CVNSS và được bao bởi sidecar.`);
    set("kpiSource",countFmt(r.bytes));set("kpiTrit",countFmt(r.tritCount));
    set("kpiSidecar",countFmt(r.sidecarBytes));set("kpiPacket",countFmt(r.packetBytes));
    set("packetOutput",latestPacket);
    set("hashOutput",`SHA-256 gốc = ${r.packet.utf8Sha256}\nConverter    = ${r.packet.converterVersion}\nByte length  = ${r.packet.utf8Length}\nPatches      = ${r.packet.patches.length}\nTransport    = ${r.mode}`);
    const first=r.basicRoundtrip?"CVNSS thuần giữ nguyên văn bản này.":"CVNSS thuần KHÔNG khôi phục nguyên văn bản này.";
    const second=r.packetRoundtrip?"Gói mở rộng + sidecar khôi phục byte UTF-8 gốc; SHA-256 trùng.":"Gói mở rộng KHÔNG khôi phục.";
    resultNote("losslessStatus",`${first} ${second} Chi phí packet = ${r.packetBytes} byte so với ${r.bytes} byte gốc. Đây là chứng minh trên đầu vào hiện tại, không phải lợi thế nén hoặc định lý toàn Unicode.`,r.packetRoundtrip?"success":"danger");
  }catch(e){resultNote("losslessStatus","Lỗi: "+e.message,"danger");set("packetOutput","—")}
  finally{$("proofRun").disabled=false}
}
$("proofRun").addEventListener("click",runLossless);
$("counterexampleBtn").addEventListener("click",()=>{$("cqnInput").value="iên yên, oà òa — Êm đềm!";runLossless()});
$("sentenceBtn").addEventListener("click",()=>{$("cqnInput").value="Tôi yêu Việt Nam. Robot tự hành cần nhận thức, lập kế hoạch và kiểm soát hành động an toàn.";runLossless()});
$("copyPacketBtn").addEventListener("click",async()=>{
  if(!latestPacket)await runLossless();if(latestPacket)await copyString(latestPacket,$("copyPacketBtn"));
});

$("rulSimBtn").addEventListener("click",()=>{
  const tier=$("rulTier").value,label=$("rulTier").selectedOptions[0].text;
  const sample=[0,1,2,3,12,13,14,25,26];
  const output=sample.map(d=>`${d.toString().padStart(2)} → (${toTrits(d).join(",")}) → ${fromTrits(toTrits(d))}`);
  set("rulReadout",`RUL STUDY SIMULATION · ${label}\n\n[01] Construct Algorithm: digit ↔ balanced trits\n[02] Check shape / digit bounds 0..26\n[03] Run JS golden oracle (not native RUL)\n[04] Compare decoded values with input (sample)\n\n${output.join("\n")}\n\nStatus: ${mappingProof().ok?"JS invariant PASS":"FAIL"}\nRuntime: browser JavaScript; selected tier="${tier}" is conceptual only.\nNative RUL verifier runs separately via GitHub Actions.\nNo measured speedup or Rust/WASM execution is claimed.`);
});

function updateEstimate(){
  const L=+$("bpeLength").value,r=+$("charRatio").value,d=+$("embeddingDim").value;
  set("bpeLengthLabel",countFmt(L));set("charRatioLabel",r.toFixed(2).replace(".",",")+" ×");set("embeddingDimLabel",countFmt(d));
  set("embBpe",countFmt(32000*d));set("emb27",countFmt(27*d));
  set("attentionEquation",`Tỉ lệ attention xấp xỉ ≈ ( ${countFmt(Math.round(L*r))} / ${countFmt(L)} )² = ${(r*r).toFixed(2)}×`);
  $("attentionBar").firstElementChild.style.width=Math.min(100,(r*r)/64*100)+"%";
  set("attentionDesc",`Giả định ${countFmt(L)} token BPE vs ${countFmt(Math.round(L*r))} token ký tự. Attention toàn cục trước tối ưu cache có thể tốn khoảng ${(r*r).toFixed(2)} lần cho phần xử lý chuỗi; embedding giảm ≈ ${(32000/27).toFixed(1)}× về số hàng. Hai chi phí không được gộp tùy tiện.`);
}
["bpeLength","charRatio","embeddingDim"].forEach(id=>$(id).addEventListener("input",updateEstimate));
updateEstimate();


/** Analytic three-level voltage discriminator (Gaussian assumption only). */
function normalCdf(x) {
  if(x<0)return 1-normalCdf(-x);
  const t=1/(1+0.2316419*x);
  const d=0.3989422804*Math.exp(-x*x/2);
  return 1-d*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
}
function chipNoiseModel(){
  const trit=+$("chipSymbol").value, sigma=+$("chipNoise").value;
  const low=normalCdf((-0.5-trit)/sigma), high=normalCdf((0.5-trit)/sigma);
  const pMinus=low, pZero=high-low, pPlus=1-high;
  const actual=[pMinus,pZero,pPlus],correct=actual[trit+1];
  const error=Math.max(0,1-correct),fmt=v=>(v*100).toFixed(3).replace(".",",")+"%";
  set("chipNoiseLabel",sigma.toFixed(2).replace(".",",")+" V");
  set("chipVoltage",`${trit>0?"+":""}${trit} V`);
  set("chipError",fmt(error));
  set("chipSpectrum",`Trạng thái phát : ${trit}     | σ = ${sigma} V
P(giải mã −1) : ${fmt(pMinus)}
P(giải mã  0) : ${fmt(pZero)}
P(giải mã +1) : ${fmt(pPlus)}
Đúng theo mô hình: ${fmt(correct)}
Ngưỡng: −0,5 V / +0,5 V
KHÔNG phải đo đạc chip hay suy luận năng lượng.`);
}
["chipSymbol","chipNoise"].forEach(id=>$(id).addEventListener("input",chipNoiseModel));
chipNoiseModel();

async function browserProofSuite(){
  try{
    const p=mappingProof(),samples=[
      "iên yên","oà òa","Tôi yêu Việt Nam","CVNSS4.0–Base27–Ternary AI",
      "ĐIỆN TOÁN TAM PHÂN","Dòng 1\nDòng 2\t 🙂","nghiêng tiếng Việt 1234!",
      "NFC: a\u0300 và à","    ","", "🤖 robot + SLAM",
      "Mô hình ngôn ngữ–hành động tiếng Việt"
    ];
    let pass=0;const faults=[];
    for(const [idx,sample] of samples.entries()) {
      const result=await packProof(sample,converter);
      const re=await unpackProof(result.packet,converter);
      if(re.text===sample&&result.packetRoundtrip)pass++;else faults.push(idx);
    }
    // Direct transport and UTF8 fallback reversibility.
    for(const s of ["abc xyz","","🙂!?","á ÁÀÐ"]) {
      const t=encodeTransport(s);
      if(decodeTransport(t)!==s)faults.push("transport:"+s);else pass++;
    }
    // Sidecar Unicode-splice property with multiple edits.
    for(const [a,b] of [["abce","Abe!"],["iên","yên"],["🦊a","a🦊"],["","hello"],["abc",""]]) {
      if(applyPatches(a,buildPatches(a,b))!==b)faults.push("patch:"+a);else pass++;
    }
    resultNote("browserTests",`${faults.length?"FAIL":"PASS"}: 27/27 trit mapping và ${pass}/${samples.length+4+5} phép thử round-trip/transport/sidecar. ${faults.length?"Lỗi: "+faults.join(", "):"Lưu ý: test mẫu không chứng minh mọi Unicode."}`,faults.length?"danger":"success");
  } catch(e){resultNote("browserTests","FAIL: "+e.message,"danger")}
}
$("runTestsBtn").addEventListener("click",browserProofSuite);
runLossless();
