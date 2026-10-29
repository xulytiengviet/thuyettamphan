import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../assets/style.css",import.meta.url),"utf8");
const app=readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const license=readFileSync(new URL("../LICENSE-NONCOMMERCIAL.md",import.meta.url),"utf8");
const oldSample="Tôi yêu Việt Nam. iên yên; oà òa. ĐIỆN TOÁN tam phân!";
const sample="Chào bạn! Có vẻ như bạn đang rất hào hứng với tiếng Việt và một chủ đề công nghệ cực kỳ thú vị: Điện toán tam phân.";

test("light edition branding, default text, new comparative section",()=>{
  assert.match(css,/color-scheme:light/);
  assert.match(html,/Long Ngo phát triển/);
  assert.ok(html.includes(sample));
  assert.ok(!html.includes(oldSample));
  assert.ok(!html.includes("CVNSS4.0 × BASE27 × RUL"));
  assert.ok(!html.includes("Không tuyên bố đã có chip tam phân hay LLM tam phân được huấn luyện."));
  assert.match(html,/id="binary-ternary"/);
  assert.ok(html.indexOf('id="dinh-ly"')<html.indexOf('id="binary-ternary"'));
  assert.ok(html.indexOf('id="binary-ternary"')<html.indexOf('id="lossless"'));
});

test("chart is wired and explicitly separates units of comparison",()=>{
  for(const id of ["stateTarget","resetCompare","compareChart","compareBinaryValue","compareTernaryValue","compareBinaryUse","compareTernaryUse"])
    assert.ok(html.includes('id="'+id+'"'),"missing chart element "+id);
  assert.ok(app.includes("function renderBinaryTernaryChart()"));
  assert.ok(app.includes("function leastDigits(base,n)"));
  assert.ok(css.includes(".chart-group"));
  assert.ok(html.includes("chưa phải bằng chứng tiết kiệm điện"));
});

test("noncommercial license is scoped to original project-owned assets",()=>{
  assert.match(html,/Giấy phép phi thương mại · Non-Commercial License/);
  assert.match(license,/Long Ngo/);
  assert.match(license,/MIT OR Apache-2\.0/);
  assert.match(license,/không thay thế/);
});
