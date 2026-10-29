/**
 * Thuyet Tam Phan — Base27 / balanced trit / lossless CVNSS4.0 proof layer.
 * Alphabet: SPACE=0, A=1, ..., Z=26 (compatible with base27-cvnss.github.io).
 * Original project's terms: LICENSE-NONCOMMERCIAL.md. Vendor CVNSS retains its own terms.
 *
 * The sidecar is NOT a claim that plain CVNSS4.0 is injective.
 * It describes edits required to recover the original Unicode scalar sequence.
 */
export const ALPHABET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const WEIGHTS = [9,3,1];
const utf8 = new TextEncoder();
const utf8Decode = new TextDecoder("utf-8",{fatal:true});

export function toTrits(d) {
  if (!Number.isInteger(d) || d < 0 || d > 26) throw new RangeError("Base27 digit must be 0..26");
  let value = d - 13;
  const output = [];
  for (const weight of WEIGHTS) {
    const bound = (weight - 1)/2;
    const trit = value > bound ? 1 : value < -bound ? -1 : 0;
    output.push(trit);
    value -= trit * weight;
  }
  if (value !== 0) throw new Error("Unrepresentable balanced ternary digit");
  return output;
}

export function fromTrits(trits) {
  if (!Array.isArray(trits) || trits.length !== 3 || trits.some(t=>!Number.isInteger(t)||t < -1||t > 1))
    throw new TypeError("Expected 3 balanced trits in {-1,0,+1}");
  const d = 13 + trits[0]*9 + trits[1]*3 + trits[2];
  if (d < 0 || d > 26) throw new Error("Unrepresentable Base27 digit");
  return d;
}

export function mappingProof() {
  const seen = new Set();
  const rows = ALPHABET.split("").map((symbol,d)=>{
    const trits=toTrits(d), key=trits.join(",");
    if(seen.has(key) || fromTrits(trits)!==d) throw new Error("Bijection failed at digit "+d);
    seen.add(key);
    return {symbol:symbol===" "?"␠":symbol,digit:d,trits,recovered:fromTrits(trits)};
  });
  return {ok:seen.size===27, checked:rows.length, distinct:seen.size, rows};
}

export function encodeTransport(cvss) {
  if(typeof cvss!=="string") throw new TypeError("String required");
  const direct=/^[ a-z]*$/.test(cvss);
  const bytes=direct?null:utf8.encode(cvss);
  // UTF8-pair mode: each byte 0..255 becomes two digits in radix 27.
  // The mode field disambiguates a raw CVNSS symbol stream from UTF8 byte pairs.
  const digits=direct
    ? [...cvss].map(ch=>ALPHABET.indexOf(ch===" "?" ":ch.toUpperCase()))
    : [...bytes].flatMap(b=>[Math.floor(b/27),b%27]);
  return {mode:direct?"direct27":"utf8-pair27",digits,trits:digits.flatMap(toTrits)};
}
export function decodeTransport({mode,digits}) {
  if(!Array.isArray(digits)||digits.some(d=>!Number.isInteger(d)||d<0||d>26))
    throw new Error("Malformed Base27 digit stream");
  if(mode==="direct27") return digits.map(d=>ALPHABET[d].toLowerCase()).join("");
  if(mode==="utf8-pair27") {
    if(digits.length%2) throw new Error("Odd number of UTF8-pair digits");
    const b=new Uint8Array(digits.length/2);
    for(let i=0;i<digits.length;i+=2) {
      const x=digits[i]*27+digits[i+1];
      if(x>255) throw new Error("Invalid UTF8 byte pair");
      b[i/2]=x;
    }
    return utf8Decode.decode(b);
  }
  throw new Error("Unsupported transport mode");
}

export function buildPatches(base,original) {
  const a=Array.from(base), b=Array.from(original);
  if(a.length===0 && b.length===0) return [];
  // Exact LCS for bounded demo strings; longer inputs use one exact prefix/suffix patch.
  if(a.length>450||b.length>450) {
    let left=0,right=0;
    while(left<a.length && left<b.length && a[left]===b[left]) left++;
    while(right<a.length-left && right<b.length-left && a[a.length-right-1]===b[b.length-right-1]) right++;
    return left===a.length && left===b.length ? [] :
      [{at:left,remove:a.length-left-right,insert:b.slice(left,b.length-right).join("")}];
  }
  const width=b.length+1, dp=new Uint16Array((a.length+1)*width);
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--)
    dp[i*width+j]=a[i]===b[j]?1+dp[(i+1)*width+j+1]:
      Math.max(dp[(i+1)*width+j],dp[i*width+j+1]);
  const patches=[];let i=0,j=0,p=null;
  const flush=()=>{if(p && (p.remove||p.insert))patches.push(p);p=null};
  while(i<a.length||j<b.length) {
    if(i<a.length&&j<b.length&&a[i]===b[j]){flush();i++;j++;continue}
    if(!p)p={at:i,remove:0,insert:""};
    if(i<a.length && (j===b.length||dp[(i+1)*width+j]>=dp[i*width+j+1])){i++;p.remove++;}
    else {p.insert+=b[j++];}
  }
  flush();return patches;
}

export function applyPatches(base,patches) {
  if(!Array.isArray(patches)) throw new TypeError("Patches must be an array");
  let out=Array.from(base), end=out.length+1;
  for(let k=patches.length-1;k>=0;k--){
    const p=patches[k];
    if(!p||!Number.isInteger(p.at)||!Number.isInteger(p.remove)||p.at<0||p.remove<0||typeof p.insert!=="string"||p.at+p.remove>end-1)
      throw new Error("Invalid or overlapping Unicode patch at "+k);
    out.splice(p.at,p.remove,...Array.from(p.insert));end=p.at;
  }
  return out.join("");
}

export async function sha256(input) {
  const bytes=typeof input==="string"?utf8.encode(input):input;
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
}

export async function packProof(original,converter) {
  if(typeof original!=="string"||!converter?.fromCqn||!converter?.fromCvss)
    throw new TypeError("Require Unicode string and CVNSS converter v5");
  const cvss=converter.fromCqn(original).cvss;
  const ordinary=converter.fromCvss(cvss).cqn;
  const transport=encodeTransport(cvss);
  const patches=buildPatches(ordinary,original);
  const packet={
    format:"T27-LP1",version:1,converterVersion:converter.VERSION,
    transport:{mode:transport.mode,digits:transport.digits},
    patches,utf8Sha256:await sha256(original),utf8Length:utf8.encode(original).length
  };
  const decoded=await unpackProof(packet,converter);
  return {packet,cvss,ordinary,restored:decoded.text,
    basicRoundtrip:ordinary===original,packetRoundtrip:decoded.valid,
    bytes:utf8.encode(original).length,packetBytes:utf8.encode(JSON.stringify(packet)).length,
    digitCount:transport.digits.length,tritCount:transport.trits.length,
    sidecarBytes:utf8.encode(JSON.stringify(patches)).length,mode:transport.mode};
}

export async function unpackProof(packet,converter) {
  if(!packet||packet.format!=="T27-LP1"||packet.version!==1)throw new Error("Unsupported proof packet");
  if(packet.converterVersion!==converter.VERSION)throw new Error("Converter version mismatch");
  const cvss=decodeTransport(packet.transport);
  const canonical=converter.fromCvss(cvss).cqn;
  const text=applyPatches(canonical,packet.patches);
  const observed=await sha256(text);
  const valid=observed===packet.utf8Sha256&&utf8.encode(text).length===packet.utf8Length;
  if(!valid) throw new Error("SHA-256/length mismatch: invalid or tampered packet");
  return {text,cvss,canonical,valid,sha256:observed};
}
