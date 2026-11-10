export const PearsonStatus = Object.freeze({
  OK: 0,
  TOO_FEW_PAIRS: 1,
  NON_FINITE_INPUT: 2,
  CONSTANT_X: 3,
  CONSTANT_Y: 4,
  CONSTANT_BOTH: 5,
  NUMERIC_ERROR: 6,
});

const outputLength = 6;
const bytesPerValue = Float64Array.BYTES_PER_ELEMENT;

export async function loadPearson() {
  const { default: createModule } = await import("./wasm/pearson.js");
  const wasm = await createModule();

  return (pairs, calculate = false) => {
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
      const status = wasm._pearson(address, pairs.length, Number(calculate), outputAddress);
      const output = wasm.HEAPF64.subarray(start + inputLength, start + inputLength + outputLength);
      const [meanX, meanY, sumXY, sumXX, sumYY, coefficient] =
        Array.from(output, value => Number.isFinite(value) ? value : null);
      return { status, meanX, meanY, sumXY, sumXX, sumYY, coefficient };
    } finally {
      wasm._free(address);
    }
  };
}
