import assert from "node:assert/strict";
import test from "node:test";
import { loadConfidence, ConfidenceStatus as Status } from "../dist/assets/pearson.js";
import { isExactSampleSize, parseEntry } from "../web/assets/numeric-input.js";

const confidenceInterval = await loadConfidence();
const defaults = { mean: 1.75, deviation: 0.13, n: 40, confidence: 95, deviationType: 0 };
const calculate = (changes = {}, final = true) => confidenceInterval({ ...defaults, ...changes }, final);
const close = (actual, expected, tolerance = 1e-12) => {
  assert.equal(typeof actual, "number");
  assert.ok(Math.abs(actual - expected) <= tolerance, `Esperado ${expected}, recebido ${actual}`);
};
const noResult = output => {
  assert.equal(output.margin, null);
  assert.equal(output.lower, null);
  assert.equal(output.upper, null);
};

// Referência independente: Python decimal, precisão 60, sqrt decimal e Z da aula.
const references = [
  { mean: 1.75, deviation: 0.13, n: 40, confidence: 95,
    margin: 0.0402874173905451526896659, lower: 1.70971258260945484731033, upper: 1.79028741739054515268967 },
  { mean: 320, deviation: 45, n: 50, confidence: 95,
    margin: 12.4733636201306983304309, lower: 307.526636379869301669569, upper: 332.473363620130698330431 },
  { mean: 2.8, deviation: 0.4, n: 36, confidence: 99,
    margin: 0.171666666666666666666667, lower: 2.62833333333333333333333, upper: 2.97166666666666666666667 },
  { mean: 18.5, deviation: 4.2, n: 60, confidence: 90,
    margin: 0.891948064631568108656785, lower: 17.6080519353684318913432, upper: 19.3919480646315681086568 },
];
for (const [index, reference] of references.entries()) {
  test(`IC da aula ${index + 1}: C/WebAssembly confere com decimal independente`, () => {
    const result = calculate(reference);
    assert.equal(result.status, Status.OK);
    for (const field of ["margin", "lower", "upper"]) close(result[field], reference[field]);
  });
}

test("IC usa exatamente os Z tabelados da aula e calcula alpha em C", () => {
  for (const [confidence, z, alpha] of [[90, 1.645, 0.1], [95, 1.96, 0.05], [99, 2.575, 0.01]]) {
    const result = calculate({ confidence });
    assert.equal(result.z, z);
    close(result.alpha, alpha);
    close(result.level, confidence / 100);
  }
});

test("IC na prévia fornece parâmetros, sem antecipar margem ou limites", () => {
  noResult(calculate({}, false));
  const pending = calculate({ mean: NaN, deviation: NaN, n: NaN }, false);
  assert.equal(pending.z, 1.96);
  close(pending.alpha, 0.05);
  noResult(pending);
});

test("IC amostral com n=30 bloqueia e com n=31 permite, mesmo com confirmação", () => {
  const blocked = calculate({ n: 30, normalityConfirmed: true });
  assert.equal(blocked.status, Status.SAMPLE_TOO_SMALL);
  noResult(blocked);
  assert.equal(calculate({ n: 31 }).status, Status.OK);
});

test("IC populacional com n pequeno exige confirmação explícita de normalidade", () => {
  for (const n of [1, 20, 30]) {
    for (const normalityConfirmed of [false, 0, 1.5, NaN]) {
      const blocked = calculate({ n, deviationType: 1, normalityConfirmed });
      assert.equal(blocked.status, Status.NORMALITY_REQUIRED);
      noResult(blocked);
    }
    assert.equal(calculate({ n, deviationType: 1, normalityConfirmed: true }).status, Status.OK);
  }
  assert.equal(calculate({ n: 31, deviationType: 1 }).status, Status.OK);
});

test("IC rejeita n zero, negativo, fracionário e acima do limite inteiro exato no próprio C", () => {
  for (const n of [0, -1, 1.5, 30.9, 9007199254740992]) {
    const result = calculate({ n, deviationType: 1, normalityConfirmed: true });
    assert.equal(result.status, Status.INVALID_N);
    noResult(result);
  }
});

test("IC rejeita desvio negativo no próprio C", () => {
  const result = calculate({ deviation: -0.1 });
  assert.equal(result.status, Status.NEGATIVE_DEVIATION);
  noResult(result);
});

test("IC valida as opções de confiança e tipo em C sem truncar frações", () => {
  for (const confidence of [0, 94, 95.5, 100, NaN, Infinity]) {
    const result = calculate({ confidence });
    assert.equal(result.status, Status.INVALID_LEVEL);
    noResult(result);
  }
  for (const deviationType of [-1, 0.5, 2, NaN, Infinity]) {
    assert.equal(calculate({ deviationType }).status, Status.INVALID_DEVIATION_TYPE);
  }
});

test("IC rejeita entradas não finitas no próprio C", () => {
  for (const field of ["mean", "deviation", "n"]) {
    for (const value of [NaN, Infinity, -Infinity]) {
      const result = calculate({ [field]: value });
      assert.equal(result.status, Status.NON_FINITE_INPUT);
      noResult(result);
    }
  }
});

test("IC aceita média zero ou negativa e não limita os limites a zero", () => {
  const zero = calculate({ mean: 0 });
  assert.equal(zero.status, Status.OK);
  assert.ok(zero.lower < 0 && zero.upper > 0);
  const negative = calculate({ mean: -10 });
  assert.equal(negative.status, Status.OK);
  assert.ok(negative.lower < -10 && negative.upper < 0);
});

test("IC com desvio zero tem margem zero e limites iguais à média, respeitando condições", () => {
  const result = calculate({ mean: -2, deviation: 0 });
  assert.equal(result.status, Status.OK);
  assert.equal(result.margin, 0);
  assert.equal(result.lower, -2);
  assert.equal(result.upper, -2);
  assert.equal(calculate({ deviation: 0, n: 30 }).status, Status.SAMPLE_TOO_SMALL);
  assert.equal(calculate({ deviation: 0, n: 20, deviationType: 1 }).status, Status.NORMALITY_REQUIRED);
});

test("IC maior confiança amplia o intervalo e maior n reduz a margem", () => {
  const margins = [90, 95, 99].map(confidence => calculate({ confidence }).margin);
  assert.ok(margins[0] < margins[1] && margins[1] < margins[2]);
  assert.ok(calculate({ n: 160 }).margin < calculate({ n: 40 }).margin);
});

test("IC mantém a margem sem arredondamento intermediário nos limites", () => {
  const result = calculate({ mean: 0.00005, deviation: 0.0001, n: 31 });
  close(result.lower, 0.0000147973608027521194601479, 1e-19);
  close(result.upper, 0.0000852026391972478805398521, 1e-19);
  assert.notEqual(result.lower, result.upper);
});

test("IC detecta overflow, underflow e perda da resolução dos limites", () => {
  for (const changes of [
    { mean: 1.7e308, deviation: 1e308 },
    { mean: 0, deviation: Number.MIN_VALUE, n: 9007199254740991 },
    { mean: 1e308, deviation: 1 },
  ]) {
    const result = calculate(changes);
    assert.equal(result.status, Status.NUMERIC_ERROR);
    noResult(result);
  }
});

test("IC evita overflow intermediário quando o resultado ainda é representável", () => {
  const result = calculate({ mean: 0, deviation: 1e308, n: 40 });
  assert.equal(result.status, Status.OK);
  assert.ok(Number.isFinite(result.margin) && result.margin > 3e307);
});

test("entrada compartilhada preserva vazios e aceita vírgula, ponto e sinais", () => {
  assert.equal(parseEntry({ value: "  " }).state, "blank");
  for (const value of ["-2,5", "−2.5"]) assert.equal(parseEntry({ value }).value, -2.5);
  assert.equal(parseEntry({ value: "0" }).value, 0);
  for (const value of ["NaN", "Infinity", "1e999", "1e-999", "<script>"]) {
    assert.equal(parseEntry({ value }).state, "invalid");
  }
});

test("entrada de n não arredonda frações, inclusive as menores que a precisão de double", () => {
  for (const value of ["30.5", "30,0000000000000001", "9007199254740993", "", "0", "-1"]) {
    assert.equal(isExactSampleSize(parseEntry({ value })), false, value);
  }
  for (const value of ["31", "31,0", "3.1e1", "310e-1", "9007199254740991"]) {
    assert.equal(isExactSampleSize(parseEntry({ value })), true, value);
  }
});
