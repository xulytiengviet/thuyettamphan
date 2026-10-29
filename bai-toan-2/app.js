import {ALPHABET,toTrits,fromTrits} from "../src/ternary.js";
import {STATES,WAVELENGTHS_NM,encodeSymbol,compareImplementationCosts,spectralConfusion,amdahl,evaluateScenario} from "./core.js";

const $=id=>document.getElementById(id);
const fmt=(n,dec=2)=>Number(n).toLocaleString("vi-VN",{maximumFractionDigits:dec});
const percent=n=>fmt(100*n,3)+"%";
const readNumber=id=>Number($(id).value);
const scenario=()=>({
  symbol:ALPHABET[readNumber("base27Symbol")],
  bitCost:readNumber("bitCost"),ternaryPerBitRatio:readNumber("ratio"),
  opticalShared:readNumber("opticalShared"),opticalPerTrit:readNumber("opticalPerTrit"),
  sigmaNm:readNumber("sigma"),driftNm:readNumber("drift"),
  addFraction:readNumber("addFraction")/100,addSpeedup:readNumber("addSpeedup"),
  wdmChannels:readNumber("wdmChannels"),systemUtilization:readNumber("systemUtilization")/100
});
function setText(id,text){$(id).textContent=String(text)}
function setInput(id,n){$(id).value=String(n)}
function updateCost(){
  const s=scenario(),v=compareImplementationCosts(s);
  setText("bitCostV",fmt(s.bitCost,1));setText("ratioV",fmt(s.ternaryPerBitRatio,1)+"×");
  setText("opticalSharedV",fmt(s.opticalShared,1));setText("opticalPerTritV",fmt(s.opticalPerTrit,1));
  const data=[
    {label:"5 bit · Nhị phân",cost:v.binary,cls:"bin"},
    {label:"3 trit · Tam phân điện tử",cost:v.electronicTernary,cls:"electronic"},
    {label:"3 trit · Tam phân quang",cost:v.optical,cls:"optical"}];
  const max=Math.max(...data.map(x=>x.cost),.001);
  $("costChart").replaceChildren(...data.map(row=>{
    const item=document.createElement("div");
    const title=document.createElement("div");title.className="barlabel";
    const n=document.createElement("span");n.textContent=row.label;
    const value=document.createElement("span");value.textContent=fmt(row.cost)+" đv";
    title.append(n,value);
    const track=document.createElement("div");track.className="bartrack";
    const bar=document.createElement("div");bar.className="barfill "+row.cls;bar.style.width=(100*row.cost/max)+"%";
    track.append(bar);item.append(title,track);return item;
  }));
  setText("elecRatio",fmt(v.ternaryToBinary)+"×");
  setText("optRatio",fmt(v.opticalToBinary)+"×");
  setText("costFinding",v.opticalBreakEven
    ?"Trong kịch bản đang chọn, chi phí quang giả định nhỏ hơn nhị phân. Cần đo laser, điều chế, thu và IO để biết điều này có xảy ra thực."
    :"Trong kịch bản đang chọn, quang học CHƯA rẻ hơn nhị phân. Quang học không tự động khử hình phạt kinh tế cơ số.");
}
function changePreset(){
  const p=$("preset").value;
  if(p==="40"){setInput("bitCost",1);setInput("ratio",40);setInput("opticalShared",3);setInput("opticalPerTrit",1.2)}
  if(p==="6t40t"){setInput("bitCost",6);setInput("ratio",40/6);setInput("opticalShared",3);setInput("opticalPerTrit",1.2)}
  updateCost();
}
$("preset").addEventListener("change",changePreset);
["bitCost","ratio","opticalShared","opticalPerTrit"].forEach(id=>$(id).addEventListener("input",()=>{
  $("preset").value="custom";updateCost();
}));
$("resetCost").addEventListener("click",()=>{$("preset").value="40";changePreset()});

$("base27Symbol").replaceChildren(...[...ALPHABET].map((c,d)=>{
  const opt=document.createElement("option");opt.value=String(d);opt.textContent=d+" — "+(c===" "?"Dấu cách":c);return opt;
}));
setInput("base27Symbol",20);
function updateSymbol(){
  const s=encodeSymbol(ALPHABET[readNumber("base27Symbol")]);
  setText("symbolDigit",s.digit);setText("symbolBinary",s.binary);
  $("tritGrid").replaceChildren(...s.trits.map((t,i)=>{
    const box=document.createElement("div");box.className="trit-card";
    const h=document.createElement("span");h.className="trit-name";h.textContent="t"+(2-i);
    const b=document.createElement("strong");b.textContent=t>0?"+1":String(t);
    const lab=document.createElement("small");lab.textContent="Kênh / xung "+(i+1);
    const w=document.createElement("span");w.className="wl";w.textContent=WAVELENGTHS_NM[String(t)]+" nm";
    box.append(h,b,lab,w);return box;
  }));
}
$("base27Symbol").addEventListener("change",updateSymbol);
updateSymbol();

function updateSpectral(){
  const s=scenario(),r=spectralConfusion(s);
  setText("sigmaV",fmt(s.sigmaNm,0)+" nm");setText("driftV",(s.driftNm>=0?"+":"")+fmt(s.driftNm,0)+" nm");
  setText("opticalError",percent(r.symbolError));
  $("confusionMatrix").replaceChildren(...r.rows.map((row,i)=>{
    const tr=document.createElement("tr");
    const label=document.createElement("td");label.textContent=(STATES[i]>0?"+":"")+STATES[i]+" ("+WAVELENGTHS_NM[String(STATES[i])]+" nm)";
    tr.append(label);
    row.forEach((p,j)=>{
      const td=document.createElement("td");if(i===j)td.className="hit";td.textContent=percent(p);
      tr.append(td);
    });return tr;
  }));
  setText("spectralFinding",s.sigmaNm<35&&Math.abs(s.driftNm)<50
    ?"Ba tâm bước sóng được đặt rất xa nhau trong mô hình lý tưởng nên xác suất nhầm phân loại gần 0; kết quả này không bao gồm thiết bị thực hoặc SFG."
    :"Khi phổ bị nhiễu hoặc trôi, tỷ lệ phân loại sai tăng. Đây là lý do bước sóng khác nhau vẫn cần bộ thu có khả năng phân giải và kiểm soát độ ổn định.");
}
["sigma","drift"].forEach(id=>$(id).addEventListener("input",updateSpectral));

function updateAmdahl(){
 const s=scenario(),v=amdahl(s);
 setText("addFractionV",fmt(s.addFraction*100,0)+"%");setText("addSpeedupV",fmt(s.addSpeedup,1)+"×");
 setText("wdmChannelsV",String(s.wdmChannels));setText("systemUtilizationV",fmt(s.systemUtilization*100,0)+"%");
 setText("amdahlCore",fmt(v.core,3)+"×");
 setText("amdahlMax",fmt(v.upperBoundWithWdm,3)+"×");
 setText("amdahlEstimate",fmt(v.illustrativeEffective,3)+"×");
 setText("amdahlFinding","Amdahl cho "+fmt(s.addFraction*100,0)+"% công việc được tăng tốc "+fmt(s.addSpeedup,1)+
  "× → "+fmt(v.core,3)+"× trên một luồng. Nhân tiếp "+s.wdmChannels+
  " kênh là giả định lý tưởng về song song; mức tận dụng "+fmt(s.systemUtilization*100,0)+"% chỉ là kịch bản.");
}
["addFraction","addSpeedup","wdmChannels","systemUtilization"].forEach(id=>$(id).addEventListener("input",updateAmdahl));

function verify(){
 let count=0;
 const seen=new Set();
 for(let d=0;d<27;d++){
   const s=encodeSymbol(ALPHABET[d]),x=toTrits(d);
   if(s.digit!==d||s.recovered!==ALPHABET[d]||fromTrits(x)!==d)throw new Error("Base27 mapping failed at "+d);
   seen.add(x.join(","));count++;
 }
 if(seen.size!==27)throw new Error("Trit collision");
 for(const sigmaNm of [5,20,80,150]){
   const m=spectralConfusion({sigmaNm,driftNm:10});
   for(const row of m.rows){
     const sum=row.reduce((a,b)=>a+b,0);
     if(row.some(p=>p<0||p>1)||Math.abs(sum-1)>1e-7)throw new Error("Probability conservation failed");
   }
 }
 const a=amdahl({addFraction:0.5,addSpeedup:9});
 if(Math.abs(a.core-1.8)>1e-10)throw new Error("Amdahl scenario");
 return count;
}
$("verifyModel").addEventListener("click",()=>{
  try{const count=verify();setText("verifyOutput","✓ PASS: "+count+"/27 ký hiệu giải mã đúng, 27 bộ tam phân riêng biệt; xác suất của các hàng ma trận tổng bằng 1; kịch bản Amdahl 50%/9× cho 1,8×. Đây là kiểm tra mô hình phần mềm, không phải phép đo chip.");}
  catch(e){setText("verifyOutput","FAIL: "+e.message);}
});
$("downloadScenario").addEventListener("click",()=>{
 const params=scenario();const result=evaluateScenario(params);
 const report={schema:"thuyettamphan-optical-scenario/v1",generatedAt:new Date().toISOString(),sourceClaim:"N-Radix preprint by Christopher Riner; nominal 40x electronic ratio, three IR wavelengths",
   modelProvenance:"Open educational model by Long Ngo; NOT a Meep FDTD simulation, empirical chip benchmark, or validated laser energy model.",
   inputs:params,outputs:result,limitations:["40x is a configurable assumption, not universal circuit law","optical cost units are illustrative; include real laser/ADC/detector/thermal costs in future","speedup scenario ignores unmodeled bandwidth bottlenecks and is not an LLM result","wavelength uncertainty is simplistic Gaussian; not nonlinear SFG crosstalk model"]};
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+"\n"],{type:"application/json"}));
 const a=document.createElement("a");a.href=url;a.download="thuyettamphan-bai-toan-2-scenario.json";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
});
updateCost();updateSpectral();updateAmdahl();
