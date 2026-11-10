import assert from "node:assert/strict";
import test from "node:test";
import { loadPearson, PearsonStatus as Status } from "../dist/assets/pearson.js";

const pearson = await loadPearson();
const classPairs = [[100, 50], [200, 80], [300, 130], [400, 190], [500, 260], [600, 350]];

function close(actual, expected, tolerance = 1e-14) {
  assert.equal(typeof actual, "number");
  assert.ok(Math.abs(actual - expected) <= tolerance, `Esperado ${expected}, recebido ${actual}`);
}

test("calcula a correlação positiva perfeita", () => {
  const result = pearson([[-2.5, -7], [0, -2], [1.5, 1]], true);
  assert.equal(result.status, Status.OK);
  close(result.coefficient, 1);
});

test("calcula a correlação negativa perfeita", () => {
  const result = pearson([[-1, 3], [0, 2], [2, 0]], true);
  assert.equal(result.status, Status.OK);
  close(result.coefficient, -1);
});

test("calcula correlação zero", () => {
  const result = pearson([[-1, 1], [0, -2], [1, 1]], true);
  assert.equal(result.status, Status.OK);
  close(result.coefficient, 0);
});

test("reproduz o resultado independente de statistics.correlation para o exemplo da aula", () => {
  const result = pearson(classPairs, true);
  assert.equal(result.status, Status.OK);
  close(result.coefficient, 0.9865208973698818);
});

test("fornece médias e somas na prévia, sem o coeficiente", () => {
  const result = pearson(classPairs);
  assert.equal(result.status, Status.OK);
  assert.equal(result.coefficient, null);
  close(result.meanX, 350);
  close(result.meanY, 530 / 3, 1e-12);
  close(result.sumXY, 105000, 1e-10);
  close(result.sumXX, 175000, 1e-10);
  close(result.sumYY, 194200 / 3, 1e-10);
});

test("valida ausência de pares e disponibiliza médias para um único par", () => {
  assert.equal(pearson([], true).status, Status.TOO_FEW_PAIRS);
  const result = pearson([[-2.5, 0]], true);
  assert.equal(result.status, Status.TOO_FEW_PAIRS);
  assert.equal(result.meanX, -2.5);
  assert.equal(result.meanY, 0);
  assert.equal(result.coefficient, null);
});

test("rejeita valores não finitos no próprio módulo", () => {
  for (const value of [Infinity, -Infinity, NaN]) {
    const result = pearson([[0, 0], [1, value]], true);
    assert.equal(result.status, Status.NON_FINITE_INPUT);
    assert.equal(result.coefficient, null);
  }
});

test("identifica qual série é constante", () => {
  assert.equal(pearson([[1, 2], [1, 4]], true).status, Status.CONSTANT_X);
  assert.equal(pearson([[1, 2], [3, 2]], true).status, Status.CONSTANT_Y);
  assert.equal(pearson([[1, 2], [1, 2]], true).status, Status.CONSTANT_BOTH);
});

test("evita overflow no produto das variâncias e preserva pequenos desvios", () => {
  close(pearson([[1e150, 3e150], [2e150, 2e150], [3e150, 1e150]], true).coefficient, -1);
  close(pearson([[1e16, 0], [1e16 + 2, 1]], true).coefficient, 1);
});

test("sinaliza somas fora da faixa representável", () => {
  for (const scale of [1e-200, 1e200]) {
    const result = pearson([[0, 0], [scale, scale]], true);
    assert.equal(result.status, Status.NUMERIC_ERROR);
    assert.equal(result.coefficient, null);
  }
});
