import assert from "node:assert/strict";
import test from "node:test";
import { loadPearson, loadRegression, PearsonStatus as Status } from "../dist/assets/pearson.js";

const regression = await loadRegression();
const pearson = await loadPearson();

function close(actual, expected, tolerance = 1e-12) {
  assert.equal(typeof actual, "number");
  assert.ok(Math.abs(actual - expected) <= tolerance, `Esperado ${expected}, recebido ${actual}`);
}

test("reta crescente e previsão com aviso fora do intervalo", () => {
  const fit = regression.analyze([[1, 2], [2, 4], [3, 6]], true);
  assert.equal(fit.status, Status.OK);
  close(fit.a, 2);
  close(fit.b, 0);
  assert.deepEqual(regression.predict(fit, 4), { status: Status.OK, value: 8, outside: true });
  assert.equal(regression.predict(fit, 1).outside, false);
  assert.equal(regression.predict(fit, 3).outside, false);
});

test("reta decrescente e previsão igual a zero", () => {
  const fit = regression.analyze([[1, 6], [2, 4], [3, 2]], true);
  assert.equal(fit.status, Status.OK);
  close(fit.a, -2);
  close(fit.b, 8);
  close(regression.predict(fit, 4).value, 0);
});

test("Y constante é válido para regressão e continua indefinido para Pearson", () => {
  const pairs = [[1, 5], [2, 5], [3, 5]];
  const fit = regression.analyze(pairs, true);
  assert.equal(fit.status, Status.OK);
  close(fit.a, 0);
  close(fit.b, 5);
  close(regression.predict(fit, -100).value, 5);
  assert.equal(pearson(pairs, true).status, Status.CONSTANT_Y);
});

test("X constante impede o ajuste, inclusive se Y também for constante", () => {
  for (const pairs of [[[2, 1], [2, 3], [2, 5]], [[2, 5], [2, 5]]]) {
    const fit = regression.analyze(pairs, true);
    assert.equal(fit.status, Status.CONSTANT_X);
    assert.equal(fit.a, null);
    assert.equal(fit.b, null);
  }
});

test("confere a reta e a previsão do material da aula", () => {
  const pairs = [[100,50], [200,80], [300,130], [400,190], [500,260], [600,350]];
  const fit = regression.analyze(pairs, true);
  assert.equal(fit.status, Status.OK);
  close(fit.a, 0.6);
  close(fit.b, -100 / 3);
  close(regression.predict(fit, 350).value, 530 / 3);
  assert.equal(regression.predict(fit, 350).outside, false);
});

test("prévia fornece médias e somas, sem antecipar a ou b", () => {
  const preview = regression.analyze([[-2.5, 0], [0, 5], [1.5, 8]]);
  assert.equal(preview.status, Status.OK);
  assert.equal(preview.a, null);
  assert.equal(preview.b, null);
  close(preview.meanX, -1 / 3);
  close(preview.meanY, 13 / 3);
  assert.equal(preview.minX, -2.5);
  assert.equal(preview.maxX, 1.5);
  assert.equal(regression.analyze([], true).status, Status.TOO_FEW_PAIRS);
  assert.equal(regression.analyze([[1, 2]], true).status, Status.TOO_FEW_PAIRS);
});

test("C rejeita valores não finitos e sinaliza problemas numéricos", () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.equal(regression.analyze([[1, 2], [2, value]], true).status, Status.NON_FINITE_INPUT);
    const fit = regression.analyze([[1, 2], [2, 4]], true);
    assert.equal(regression.predict(fit, value).status, Status.NON_FINITE_INPUT);
  }
  assert.equal(regression.analyze([[0, 0], [1e200, 1e200]], true).status, Status.NUMERIC_ERROR);
  assert.equal(regression.predict({ a: 1e308, b: 0, minX: 0, maxX: 1 }, 1e308).status, Status.NUMERIC_ERROR);
});

test("previsão usa coeficientes double completos, preservando a precisão", () => {
  const fit = regression.analyze([[0, 0], [3, 1], [6, 2]], true);
  close(fit.a, 1 / 3);
  close(regression.predict(fit, 100000).value, 100000 / 3, 1e-10);
});
