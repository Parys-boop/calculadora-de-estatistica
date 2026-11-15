export const PearsonStatus = Object.freeze({
  OK: 0,
  TOO_FEW_PAIRS: 1,
  NON_FINITE_INPUT: 2,
  CONSTANT_X: 3,
  CONSTANT_Y: 4,
  CONSTANT_BOTH: 5,
  NUMERIC_ERROR: 6,
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
