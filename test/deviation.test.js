import assert from "node:assert/strict";
import test from "node:test";
import { loadDeviation, DeviationStatus as Status } from "../dist/assets/pearson.js";

const deviation = await loadDeviation();
const calculate = (values, sample = true) => deviation(values, sample, true);
const close = (actual, expected, tolerance = 1e-12) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `Esperado ${expected}, recebido ${actual}`);

test("auxiliar calcula desvio amostral e populacional em C/WebAssembly", () => {
  const values = [2, 4, 4, 4, 5, 5, 7, 9];
  const population = calculate(values, false);
  assert.equal(population.status, Status.OK);
  assert.equal(population.mean, 5);
  assert.equal(population.deviation, 2);
  const sample = calculate(values);
  assert.equal(sample.status, Status.OK);
  assert.equal(sample.divisor, 7);
  close(sample.deviation, 2.138089935299395);
});

test("auxiliar aceita negativos, decimais e grupos constantes", () => {
  const result = calculate([-2.5, 0, 2.5]);
  assert.equal(result.mean, 0);
  assert.equal(result.deviation, 2.5);
  assert.equal(calculate([5, 5, 5]).deviation, 0);
  assert.equal(calculate([5], false).deviation, 0);
});

test("auxiliar exige dados suficientes e valores finitos", () => {
  assert.equal(calculate([]).status, Status.TOO_FEW_VALUES);
  assert.equal(calculate([1]).status, Status.TOO_FEW_VALUES);
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.equal(calculate([1, invalid]).status, Status.NON_FINITE_INPUT);
  }
  assert.equal(calculate([1, 2], 2).status, Status.INVALID_TYPE);
});

test("prévia fornece média e quantidade sem antecipar o desvio", () => {
  const preview = deviation([10, 12, 14]);
  assert.equal(preview.mean, 12);
  assert.equal(preview.count, 3);
  assert.equal(preview.divisor, 2);
  assert.equal(preview.deviation, null);
});

test("auxiliar preserva diferenças pequenas e evita overflow dos quadrados", () => {
  assert.equal(calculate([1e15, 1e15 + 1, 1e15 + 2]).deviation, 1);
  close(calculate([-1e200, 1e200], false).deviation / 1e200, 1);
  close(calculate([1e-200, 2e-200, 3e-200]).deviation / 1e-200, 1);
  assert.equal(calculate([-Number.MAX_VALUE, Number.MAX_VALUE]).status, Status.NUMERIC_ERROR);
  assert.equal(calculate([-Number.MAX_VALUE, Number.MAX_VALUE], false).deviation, Number.MAX_VALUE);
});
