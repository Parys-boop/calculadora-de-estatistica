export const PearsonStatus = Object.freeze({
  OK: 0,
  TOO_FEW_PAIRS: 1,
  NON_FINITE_INPUT: 2,
  CONSTANT_X: 3,
  CONSTANT_Y: 4,
  CONSTANT_BOTH: 5,
  NUMERIC_ERROR: 6,
});

export const ConfidenceStatus = Object.freeze({
  OK: 0,
  NON_FINITE_INPUT: 1,
  INVALID_N: 2,
  NEGATIVE_DEVIATION: 3,
  INVALID_LEVEL: 4,
  INVALID_DEVIATION_TYPE: 5,
  SAMPLE_TOO_SMALL: 6,
  NORMALITY_REQUIRED: 7,
  NUMERIC_ERROR: 8,
});

export const ProportionStatus = Object.freeze({
  OK: 0,
  INVALID_N: 1,
  INVALID_X: 2,
  INVALID_LEVEL: 3,
  EXTREME: 4,
});

export const ZScoreStatus = Object.freeze({
  OK: 0,
  NON_FINITE_INPUT: 1,
  INVALID_DEVIATION: 2,
  NUMERIC_ERROR: 3,
});

const bytesPerValue = Float64Array.BYTES_PER_ELEMENT;
let modulePromise;

async function loadModule() {
  if (!modulePromise) {
    modulePromise = import("./wasm/pearson.js").then(({ default: createModule }) => createModule());
  }
  return modulePromise;
}

function analyze(wasm, pairs, calculate, operation, outputLength) {
  const inputLength = 2 * pairs.length;
  const address = wasm._malloc((inputLength + outputLength) * bytesPerValue);
  if (!address) throw new Error("Não há memória suficiente para estes dados.");

  try {
    const start = address / bytesPerValue;
    const outputAddress = address + inputLength * bytesPerValue;
    for (let i = 0; i < pairs.length; i++) {
      wasm.HEAPF64[start + 2 * i] = pairs[i][0];
      wasm.HEAPF64[start + 2 * i + 1] = pairs[i][1];
    }
    const status = operation(address, pairs.length, Number(calculate), outputAddress);
    const output = wasm.HEAPF64.subarray(start + inputLength, start + inputLength + outputLength);
    const values = Array.from(output, value => Number.isFinite(value) ? value : null);
    return { status, values };
  } finally {
    wasm._free(address);
  }
}

export async function loadPearson() {
  const wasm = await loadModule();
  return (pairs, calculate = false) => {
    const { status, values } = analyze(wasm, pairs, calculate, wasm._pearson, 6);
    const [meanX, meanY, sumXY, sumXX, sumYY, coefficient] = values;
    return { status, meanX, meanY, sumXY, sumXX, sumYY, coefficient };
  };
}

export async function loadRegression() {
  const wasm = await loadModule();
  return {
    analyze(pairs, calculate = false) {
      const { status, values } = analyze(wasm, pairs, calculate, wasm._linear_regression, 8);
      const [meanX, meanY, sumXY, sumXX, a, b, minX, maxX] = values;
      return { status, meanX, meanY, sumXY, sumXX, a, b, minX, maxX };
    },
    predict(fit, x) {
      const address = wasm._malloc(2 * bytesPerValue);
      if (!address) throw new Error("Não há memória suficiente para estimar Y.");
      try {
        const status = wasm._regression_predict(fit.a, fit.b, fit.minX, fit.maxX, x, address);
        const value = wasm.HEAPF64[address / bytesPerValue];
        const outside = wasm.HEAPF64[address / bytesPerValue + 1] === 1;
        return { status, value: Number.isFinite(value) ? value : null, outside };
      } finally {
        wasm._free(address);
      }
    },
  };
}

export async function loadConfidence() {
  const wasm = await loadModule();
  return ({ mean, deviation, n, confidence, deviationType, normalityConfirmed = false }, calculate = false) => {
    const address = wasm._malloc(6 * bytesPerValue);
    if (!address) throw new Error("Não há memória suficiente para calcular o intervalo.");
    try {
      const status = wasm._confidence_interval(mean, deviation, n, confidence,
        deviationType, Number(normalityConfirmed), Number(calculate), address);
      const start = address / bytesPerValue;
      const [level, alpha, z, margin, lower, upper] = Array.from(
        wasm.HEAPF64.subarray(start, start + 6), value => Number.isFinite(value) ? value : null);
      return { status, level, alpha, z, margin, lower, upper };
    } finally {
      wasm._free(address);
    }
  };
}

export async function loadProportion() {
  const wasm = await loadModule();
  const outputLength = 9;
  return ({ x, n, confidence }, calculate = false) => {
    const address = wasm._malloc(outputLength * bytesPerValue);
    if (!address) throw new Error("Não há memória suficiente para calcular o intervalo.");
    try {
      const status = wasm._proportion_interval(x, n, confidence, Number(calculate), address);
      const start = address / bytesPerValue;
      const [z, fraction, percent, smallSample, margin, lower, upper, lowerCeiling, upperCeiling] =
        Array.from(wasm.HEAPF64.subarray(start, start + outputLength), value => Number.isFinite(value) ? value : null);
      return { status, z, fraction, percent, smallSample: smallSample === 1, margin, lower, upper, lowerCeiling, upperCeiling };
    } finally {
      wasm._free(address);
    }
  };
}

export async function loadZScore() {
  const wasm = await loadModule();
  const outputLength = 4;
  return ({ observed, mean, deviation }, calculate = false) => {
    const address = wasm._malloc(outputLength * bytesPerValue);
    if (!address) throw new Error("Não há memória suficiente para calcular o escore.");
    try {
      const status = wasm._z_score(observed, mean, deviation, Number(calculate), address);
      const start = address / bytesPerValue;
      const [score, distance, position, classification] = Array.from(
        wasm.HEAPF64.subarray(start, start + outputLength),
        value => Number.isFinite(value) ? value : null,
      );
      return { status, score, distance, position, classification };
    } finally {
      wasm._free(address);
    }
  };
}
