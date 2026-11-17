import assert from "node:assert/strict";
import test from "node:test";
import { loadProportion, ProportionStatus as Status } from "../dist/assets/pearson.js";
import { isExactCount, parseEntry } from "../web/assets/numeric-input.js";

const interval = await loadProportion();
const calculate = (x, n, confidence = 95) => interval({ x, n, confidence }, true);

test("IC para proporção: 560 de 800 com 95% confere com a referência da aula", () => {
  const output = calculate(560, 800);
  assert.equal(output.status, Status.OK);
  assert.equal(output.fraction, 0.7);
  assert.equal(output.percent, 70);
  assert.ok(Math.abs(output.margin - 3.1755629422198512) < 1e-12);
  assert.deepEqual([output.margin, output.lower, output.upper].map(value => value.toFixed(2)),
    ["3.18", "66.82", "73.18"]);
  assert.deepEqual([output.lowerCeiling, output.upperCeiling], [67, 74]);
  assert.equal(output.smallSample, false);
});

test("IC para proporção usa os Z da tabela e fornece proporção sem calcular os limites na prévia", () => {
  for (const [confidence, z] of [[90, 1.645], [95, 1.96], [99, 2.575]]) {
    const preview = interval({ x: 560, n: 800, confidence });
    assert.equal(preview.z, z);
    assert.equal(preview.fraction, 0.7);
    assert.deepEqual([preview.margin, preview.lower, preview.upper], [null, null, null]);
  }
  assert.equal(interval({ x: NaN, n: NaN, confidence: 95 }).z, 1.96);
  assert.equal(calculate(560, 800, 92).status, Status.INVALID_LEVEL);
});

test("IC para proporção aplica teto aos limites percentuais brutos", () => {
  const lowerExample = calculate(53, 84);
  assert.equal(lowerExample.lower.toFixed(2), "52.78");
  assert.equal(lowerExample.lowerCeiling, 53);
  const upperExample = calculate(51, 84);
  assert.equal(upperExample.upper.toFixed(2), "71.16");
  assert.equal(upperExample.upperCeiling, 72);
  // O limite superior da referência em alta precisão é 69,999999999999999085…%.
  const seventy = calculate(699999971596905, 1000000000000006);
  assert.equal(seventy.upper, 70);
  assert.equal(seventy.upperCeiling, 70);
  const exact = calculate(4802, 9604);
  assert.deepEqual([exact.lower, exact.upper, exact.lowerCeiling, exact.upperCeiling], [49, 51, 49, 51]);
  const above = calculate(12, 24);
  assert.equal(above.upper.toFixed(2), "70.00");
  assert.equal(above.upperCeiling, 71);
});

test("IC para proporção rejeita contagens inválidas no WebAssembly", () => {
  for (const n of [0, -1, 3.2, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(calculate(1, n).status, Status.INVALID_N);
  }
  for (const x of [-1, 2.5, 11, Infinity, NaN]) {
    assert.equal(calculate(x, 10).status, Status.INVALID_X);
  }
});

test("Contagens preservam campos pendentes e rejeitam frações que double arredondaria", () => {
  const parse = value => parseEntry({ value });
  assert.equal(parse("").state, "blank");
  assert.equal(isExactCount(parse("560,00000000000000001")), false);
  assert.equal(isExactCount(parse("-0,00000000000000001")), false);
  assert.equal(isExactCount(parse("0")), true);
  assert.equal(isExactCount(parse("560,0")), true);
});

test("IC para proporção sinaliza amostras pequenas e preserva os limites da fórmula", () => {
  assert.equal(calculate(10, 20).smallSample, false);
  assert.equal(calculate(9, 20).smallSample, true);
  assert.equal(calculate(11, 20).smallSample, true);
  const low = calculate(1, 2);
  assert.equal(low.status, Status.OK);
  assert.ok(low.lower < 0);
  assert.ok(low.upper > 100);
  assert.deepEqual([low.lowerCeiling, low.upperCeiling], [-19, 120]);
});

test("IC para proporção mostra apenas a proporção nos extremos", () => {
  for (const [x, expected] of [[0, 0], [800, 100]]) {
    const result = calculate(x, 800);
    assert.equal(result.status, Status.EXTREME);
    assert.equal(result.percent, expected);
    assert.deepEqual([result.margin, result.lower, result.upper, result.lowerCeiling, result.upperCeiling],
      [null, null, null, null, null]);
  }
});
