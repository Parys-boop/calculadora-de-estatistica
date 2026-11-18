import assert from "node:assert/strict";
import test from "node:test";
import { loadZScore, ZScoreStatus as Status } from "../dist/assets/pearson.js";

const zscore = await loadZScore();
const calculate = (observed, mean, deviation) => zscore({ observed, mean, deviation }, true);

test("escore Z calcula os exemplos da aula e classifica a posição em C", () => {
  for (const [observed, mean, deviation, score, position, classification] of [
    [280, 200, 40, 2, 1, 1],
    [20, 30, 5, -2, -1, 1],
    [750, 500, 100, 2.5, 1, 2],
    [200, 200, 40, 0, 0, 0],
    [-20, -30, 5, 2, 1, 1],
    [-40, -30, 5, -2, -1, 1],
  ]) {
    const result = calculate(observed, mean, deviation);
    assert.equal(result.status, Status.OK);
    assert.equal(result.score, score);
    assert.equal(result.distance, Math.abs(score));
    assert.equal(result.position, position);
    assert.equal(result.classification, classification);
  }
});

test("escore Z classifica o resultado completo junto dos limites, antes de arredondar", () => {
  for (const [score, classification] of [
    [1.99999, 0], [2, 1], [2.00001, 2],
    [-1.99999, 0], [-2, 1], [-2.00001, 2],
    [2.0000000000000004, 2],
  ]) {
    const result = calculate(score, 0, 1);
    assert.equal(result.score, score);
    assert.equal(result.classification, classification);
    assert.equal(Math.abs(result.score).toFixed(2), "2.00");
  }
});

test("escore Z bloqueia desvios não positivos e entradas não finitas no WebAssembly", () => {
  for (const deviation of [0, -0, -1, -40]) {
    const result = calculate(280, 200, deviation);
    assert.equal(result.status, Status.INVALID_DEVIATION);
    assert.equal(result.score, null);
  }
  for (const invalid of [NaN, Infinity, -Infinity]) {
    for (const input of [
      { observed: invalid, mean: 200, deviation: 40 },
      { observed: 280, mean: invalid, deviation: 40 },
      { observed: 280, mean: 200, deviation: invalid },
    ]) {
      assert.equal(zscore(input, true).status, Status.NON_FINITE_INPUT);
    }
  }
});

test("escore Z aguarda Calcular para fornecer resultado e interpretação", () => {
  const preview = zscore({ observed: 280, mean: 200, deviation: 40 });
  assert.equal(preview.status, Status.OK);
  assert.deepEqual([preview.score, preview.distance, preview.position, preview.classification],
    [null, null, null, null]);
});

test("escore Z preserva decimais e a posição de resultados pequenos", () => {
  const result = calculate(-2.5, -5, 0.5);
  assert.equal(result.score, 5);
  const small = calculate(-0.000001, 0, 1);
  assert.equal(small.score, -0.000001);
  assert.equal(small.position, -1);
  assert.equal(small.classification, 0);
});

test("escore Z trata os limites numéricos e evita overflow intermediário", () => {
  const wide = calculate(Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE);
  assert.equal(wide.status, Status.OK);
  assert.equal(wide.score, 2);
  for (const [observed, mean, deviation] of [
    [Number.MAX_VALUE, -Number.MAX_VALUE, 1],
    [1e-300, 0, 1e300],
  ]) {
    const result = calculate(observed, mean, deviation);
    assert.equal(result.status, Status.NUMERIC_ERROR);
    assert.equal(result.score, null);
  }
});
