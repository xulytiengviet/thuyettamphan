/**
 * Bài toán 2 — optical radix-economy research model.
 * The values from Riner's N-Radix paper are explicitly assumptions/projections.
 * Original implementation by Long Ngo project; LICENSE-NONCOMMERCIAL.md.
 * All units in area-equivalent cost model are hypothetical normalized units.
 */
import {toTrits,fromTrits,ALPHABET} from "../src/ternary.js";

export const WAVELENGTHS_NM=Object.freeze({"-1":1550,"0":1310,"1":1064});
export const STATES=[-1,0,1];
/**
 * Classical radix economy assumes cost of one digit grows linearly with radix.
 * The objective r / ln(r) has its continuous minimum at Euler's number e.
 * This mathematical model does not prove cost-optimality in CMOS or optics.
 */
export function radixEconomy(radix){
  if(!Number.isFinite(radix)||radix<=1)throw new RangeError("Radix must be greater than one");
  return radix/Math.log(radix);
}
export function encodeSymbol(symbol){
  if(typeof symbol!=="string"||symbol.length!==1)throw new TypeError("Select exactly one Base27 symbol");
  const digit=ALPHABET.indexOf(symbol.toUpperCase());
  if(digit<0)throw new RangeError("Symbol must be space or A–Z");
  const trits=toTrits(digit);
  return {symbol:ALPHABET[digit],digit,trits,
    wavelengthNm:trits.map(t=>WAVELENGTHS_NM[String(t)]),
    binary:digit.toString(2).padStart(5,"0"),recovered:ALPHABET[fromTrits(trits)]};
}
export function compareImplementationCosts({bitCost=1,ternaryPerBitRatio=40,opticalShared=3,opticalPerTrit=1.2}={}){
  for(const x of [bitCost,ternaryPerBitRatio,opticalShared,opticalPerTrit])
    if(!Number.isFinite(x)||x<0)throw new RangeError("Costs must be nonnegative finite numbers");
  if(bitCost===0)throw new RangeError("Binary reference bit cost must be positive");
  const binary=5*bitCost;
  const electronicTernary=3*bitCost*ternaryPerBitRatio;
  const optical=opticalShared+3*opticalPerTrit;
  return {binary,electronicTernary,optical,
    ternaryToBinary:electronicTernary/binary,opticalToBinary:optical/binary,
    ternaryPerInformationBit:ternaryPerBitRatio/Math.log2(3),
    opticalBreakEven:optical<binary,
    disclaimer:"Normalized illustrative costs for 27-symbol fixed-length codec; not a transistor count, chip area or measured joules."};
}
function erfApprox(x){
  const sign=x<0?-1:1,ax=Math.abs(x);
  const t=1/(1+0.3275911*ax);
  const erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-ax*ax);
  return sign*erf;
}
export const normalCdf=z=>0.5*(1+erfApprox(z/Math.SQRT2));
export function spectralConfusion({sigmaNm=20,driftNm=0}={}){
  if(!Number.isFinite(sigmaNm)||sigmaNm<=0||!Number.isFinite(driftNm))
    throw new RangeError("Sigma must be >0 and drift must be finite");
  const low=(1064+1310)/2,high=(1310+1550)/2;
  const means=STATES.map(t=>WAVELENGTHS_NM[String(t)]+driftNm);
  // detected bins in STATES order [-1,0,+1]
  const rows=means.map(mean=>{
    const left=normalCdf((low-mean)/sigmaNm),right=normalCdf((high-mean)/sigmaNm);
    return [Math.max(0,1-right),Math.max(0,right-left),Math.max(0,left)];
  });
  const accuracies=rows.map((r,i)=>r[i]);
  const meanAccuracy=accuracies.reduce((a,b)=>a+b,0)/3;
  return {rows,accuracies,meanAccuracy,symbolError:1-meanAccuracy,
    thresholdsNm:[high,low],means,sigmaNm,driftNm,
    model:"Ideal Gaussian wavelength uncertainty + nearest-center thresholds (equally likely trits); no FDTD, nonlinear mixer or device model."};
}
export function amdahl({addFraction=0.5,addSpeedup=9,wdmChannels=1,systemUtilization=1}={}){
  for(const x of [addFraction,addSpeedup,wdmChannels,systemUtilization])if(!Number.isFinite(x))throw new RangeError("Nonfinite input");
  if(addFraction<0||addFraction>1||addSpeedup<1||wdmChannels<1||systemUtilization<=0||systemUtilization>1)
    throw new RangeError("Out-of-range fraction, speedup, channels or utilization");
  const core=1/((1-addFraction)+addFraction/addSpeedup);
  // aggregate ratio is only a hypothetical upper-bound scenario. Do not claim measured hardware throughput.
  return {core,upperBoundWithWdm:core*wdmChannels,illustrativeEffective:core*wdmChannels*systemUtilization,
    disclaimer:"Amdahl scenario for 9x ADD assumption; WDM multiplication requires independent physical lanes, IO and lasers. This is not a measured AI speedup."};
}
export function evaluateScenario(s){
  return {scenarioVersion:"optical-radix-v1",symbol:encodeSymbol(s.symbol||"T"),
    cost:compareImplementationCosts(s),spectral:spectralConfusion(s),performance:amdahl(s)};
}
