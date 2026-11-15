import { deviation, formatAuxiliary, formatFinal, numberMarkup } from "./display.js";

const display = document.querySelector("#regression-display");
const context = document.querySelector("#formula-context");
const average = axis => `<mover accent="true"><mi>${axis}</mi><mo>¯</mo></mover>`;
const sum = values => `<mrow>${values.join("<mo>+</mo>")}</mrow>`;

function observation(entry, axis, index) {
  return entry.state === "valid"
    ? numberMarkup(entry.text.replace(".", ","))
    : `<msub><mi>${axis}</mi><mn>${index + 1}</mn></msub>`;
}

const fullPrecision = value => String(value).replace(".", ",").replaceAll("-", "−");

function interceptMarkup(value, formatter) {
  const formatted = formatter(value);
  const negative = formatted.startsWith("−");
  return `<mo>${negative ? "−" : "+"}</mo>${numberMarkup(negative ? formatted.slice(1) : formatted)}`;
}

export function lineMarkup(fit, x = "<mi>x</mi>", formatter = formatFinal) {
  return `${numberMarkup(formatter(fit.a))}${x}${interceptMarkup(fit.b, formatter)}`;
}

export function renderRegression(rows, stats, fit) {
  const hasData = rows.some(({ x, y }) => x.state !== "blank" || y.state !== "blank");
  const pendingIndex = rows.findIndex(({ x, y }) => x.state !== "valid" || y.state !== "valid");
  const complete = pendingIndex < 0;
  const mean = (axis, value) => complete && value != null ? numberMarkup(formatAuxiliary(value)) : average(axis);
  const meanX = mean("x", stats?.meanX);
  const meanY = mean("y", stats?.meanY);
  const symbolicDeviation = axis => `<mrow><mo>(</mo><msub><mi>${axis}</mi><mi>i</mi></msub><mo>−</mo>${average(axis)}<mo>)</mo></mrow>`;
  const terms = rows.map(({ x, y }, index) => ({
    x: deviation(x, "x", index, complete ? stats?.meanX : null),
    y: deviation(y, "y", index, complete ? stats?.meanY : null),
  }));
  const numerator = hasData
    ? sum(terms.map(({ x, y }) => `${x}${y}`))
    : `<mrow><mo>∑</mo>${symbolicDeviation("x")}${symbolicDeviation("y")}</mrow>`;
  const denominator = hasData
    ? sum(terms.map(({ x }) => `<msup>${x}<mn>2</mn></msup>`))
    : `<mrow><mo>∑</mo><msup>${symbolicDeviation("x")}<mn>2</mn></msup></mrow>`;
  const meanFormula = (axis, value) => {
    const entries = hasData
      ? sum(rows.map((row, index) => observation(row[axis], axis, index)))
      : `<mrow><mo>∑</mo><msub><mi>${axis}</mi><mi>i</mi></msub></mrow>`;
    const n = complete ? `<mn>${rows.length}</mn>` : "<mi>n</mi>";
    const evaluated = complete && value != null ? `<mo>≈</mo>${numberMarkup(formatAuxiliary(value))}` : "";
    return `<math display="block">${average(axis)}<mo>=</mo><mfrac>${entries}${n}</mfrac>${evaluated}</math>`;
  };
  let sums = "";
  if (complete && stats?.sumXY != null && stats?.sumXX != null) {
    sums = `<mo>≈</mo><mfrac>${numberMarkup(formatAuxiliary(stats.sumXY))}${numberMarkup(formatAuxiliary(stats.sumXX))}</mfrac>`;
  }
  const aValue = fit ? `<mo>≈</mo><mn class="regression-a">${formatFinal(fit.a)}</mn>` : "";
  const bValue = fit ? `<mo>≈</mo><mn class="regression-b">${formatFinal(fit.b)}</mn>` : "";
  const aInB = fit ? `<mrow><mo>(</mo>${numberMarkup(fullPrecision(fit.a))}<mo>)</mo></mrow>` : "<mi>a</mi>";
  display.innerHTML = `
    <section class="regression-step">
      <h3>Médias de X e Y</h3>
      <div class="math-scroll" tabindex="0" role="region" aria-label="Cálculo das médias">${meanFormula("x", stats?.meanX)}${meanFormula("y", stats?.meanY)}</div>
    </section>
    <section class="regression-step">
      <h3>Inclinação a</h3>
      <div class="math-scroll" tabindex="0" role="region" aria-label="Fórmula da inclinação">
        <math display="block"><mi>a</mi><mo>=</mo><mfrac>${numerator}${denominator}</mfrac>${sums}${aValue}</math>
      </div>
    </section>
    <section class="regression-step">
      <h3>Intercepto b</h3>
      <div class="math-scroll" tabindex="0" role="region" aria-label="Fórmula do intercepto">
        <math display="block"><mi>b</mi><mo>=</mo>${meanY}<mo>−</mo>${aInB}<mo>×</mo>${meanX}${bValue}</math>
      </div>
    </section>
    ${fit ? `<section class="regression-step regression-final">
      <h3>Equação da reta</h3>
      <div class="math-scroll" tabindex="0" role="region" aria-label="Equação final da reta">
        <math display="block"><mi>ŷ</mi><mo>=</mo>${lineMarkup(fit)}</math>
      </div>
    </section>` : ""}`;
  context.hidden = !hasData || complete;
  if (hasData && !complete) {
    const row = rows[pendingIndex];
    const axis = row.x.state !== "valid" ? "X" : "Y";
    context.textContent = `Preencha ou revise ${axis} do par ${pendingIndex + 1}. Os símbolos representam os valores pendentes.`;
  }
}

export function renderPrediction(fit, entry, value) {
  const x = `<mrow><mo>(</mo>${numberMarkup(entry.text.replace(".", ","))}<mo>)</mo></mrow>`;
  document.querySelector("#prediction-result").innerHTML = `
    <div class="math-scroll" tabindex="0" role="region" aria-label="Substituição na previsão">
      <math display="block"><mi>ŷ</mi><mo>≈</mo>${lineMarkup(fit, x, fullPrecision)}<mo>≈</mo>${numberMarkup(formatFinal(value))}</math>
    </div>
    <p>Y estimado = <strong>${formatFinal(value)}</strong></p>`;
}
