/**
 * T27-LP2 · mixed Base27 transport for CVNSS4.0.
 * Local UTF-8 escapes avoid promoting an entire sentence to byte-pair mode
 * after one punctuation mark. Exact recovery still needs a Unicode sidecar.
 * Original project contributions: LICENSE-NONCOMMERCIAL.md.
 */
import {ALPHABET,toTrits,buildPatches,applyPatches,sha256} from "./ternary.js";
const enc=new TextEncoder(),dec=new TextDecoder("utf-8",{fatal:true});
const isDirect=c=>c===" "||/^[a-z]$/.test(c);
const byteDigits=b=>[Math.floor(b/27),b%27];

function assertUnicodeScalarString(str){
  for(let i=0;i<str.length;i++){
    const c=str.charCodeAt(i);
    if(c>=0xD800&&c<=0xDBFF){
      const n=str.charCodeAt(++i);
      if(!(n>=0xDC00&&n<=0xDFFF))throw new Error("Unpaired UTF-16 high surrogate; only valid Unicode scalar strings supported");
    }else if(c>=0xDC00&&c<=0xDFFF)throw new Error("Unpaired UTF-16 low surrogate; only valid Unicode scalar strings supported");
  }
}

const toBytes=digits=>{
  if(!Array.isArray(digits)||digits.length%2!==0)throw new Error("Invalid UTF8 pair count");
  const out=new Uint8Array(digits.length/2);
  for(let i=0;i<digits.length;i+=2){
    const a=digits[i],b=digits[i+1];
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||a>26||b<0||b>26||a*27+b>255)
      throw new Error("Out-of-range UTF8 byte pair");
    out[i/2]=a*27+b;
  }
  return out;
};

export function encodeMixedTransport(str){
  if(typeof str!=="string")throw new TypeError("CVNSS string required");
  assertUnicodeScalarString(str);
  const spans=[];
  let kind=null,buffer="";
  const flush=()=>{
    if(buffer==="")return;
    const bytes=kind==="literal"?enc.encode(buffer):null;
    const digits=kind==="direct"?[...buffer].map(c=>ALPHABET.indexOf(c===" "?" ":c.toUpperCase()))
      :[...bytes].flatMap(byteDigits);
    spans.push({mode:kind==="direct"?"d":"u",digits});
    kind=null;buffer="";
  };
  for(const ch of str){
    const k=isDirect(ch)?"direct":"literal";
    if(kind!==null&&kind!==k)flush();
    kind=k;buffer+=ch;
  }
  flush();
  return {mode:"mixed27-v1",spans};
}
export function decodeMixedTransport(obj){
  if(!obj||obj.mode!=="mixed27-v1"||!Array.isArray(obj.spans))throw new Error("Invalid mixed transport");
  let result="";
  for(const s of obj.spans){
    if(!s||!Array.isArray(s.digits)||s.digits.some(x=>!Number.isInteger(x)||x<0||x>26))
      throw new Error("Invalid Base27 digit span");
    if(s.mode==="d")result+=s.digits.map(x=>ALPHABET[x].toLowerCase()).join("");
    else if(s.mode==="u")result+=dec.decode(toBytes(s.digits));
    else throw new Error("Unknown span mode");
  }
  return result;
}
export function mixedProfile(transport){
  const digitCount=transport.spans.reduce((sum,s)=>sum+s.digits.length,0);
  const spans=transport.spans.length;
  return {digits:digitCount,trits:digitCount*3,spans,
    escSpans:transport.spans.filter(s=>s.mode==="u").length,
    transportBytes:enc.encode(JSON.stringify(transport)).length};
}
export async function packLosslessV2(original,converter){
  if(typeof original!=="string"||typeof converter?.fromCqn!=="function"||typeof converter?.fromCvss!=="function")
    throw new TypeError("Require Unicode text and converter");
  assertUnicodeScalarString(original);
  const cvss=converter.fromCqn(original).cvss;
  const canonical=converter.fromCvss(cvss).cqn;
  const transport=encodeMixedTransport(cvss);
  const patches=buildPatches(canonical,original);
  const packet={format:"T27-LP2",version:2,converterVersion:converter.VERSION,
    transport,patches,utf8Length:enc.encode(original).length,
    utf8Sha256:await sha256(original)};
  const recovered=await unpackLosslessV2(packet,converter);
  const profile=mixedProfile(transport);
  const packetBytes=enc.encode(JSON.stringify(packet)).length;
  return {packet,cvss,canonical,recovered:recovered.text,
    canonicalEqual:canonical===original,valid:recovered.valid,...profile,packetBytes,
    sidecarBytes:enc.encode(JSON.stringify(patches)).length,
    originalBytes:enc.encode(original).length};
}
export async function unpackLosslessV2(packet,converter){
  if(!packet||packet.version!==2||packet.format!=="T27-LP2")throw new Error("Unsupported packet");
  if(packet.converterVersion!==converter.VERSION)throw new Error("Converter version mismatch");
  const cvss=decodeMixedTransport(packet.transport);
  const canonical=converter.fromCvss(cvss).cqn;
  const text=applyPatches(canonical,packet.patches);
  const digest=await sha256(text);
  const valid=digest===packet.utf8Sha256 && enc.encode(text).length===packet.utf8Length;
  if(!valid)throw new Error("Packet checksum mismatch");
  return {text,cvss,canonical,valid,digest};
}
