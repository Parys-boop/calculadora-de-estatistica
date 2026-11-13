const standard = new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 10 });
const scientific = new Intl.NumberFormat("pt-BR", {
  notation: "scientific", maximumSignificantDigits: 16,
});

const formulaDisplay = document.querySelector(".symbolic");
const formulaContext = document.querySelector("#formula-context");

export function formatAuxiliary(value) {
  if (value == null) return "—";
  const magnitude = Math.abs(value);
  const formatter = magnitude >= 1e12 || (magnitude > 0 && magnitude < 1e-6) ? scientific : standard;
  return formatter.format(value === 0 ? 0 : value).replaceAll("-", "−");
}

function numberMarkup(text) {
  const [mantissa, exponent] = text.replaceAll("-", "−").split(/[eE]/);
  const number = `<mn>${mantissa}</mn>`;
  if (exponent == null) return number;
  return `${number}<mo>×</mo><msup><mn>10</mn><mn>${exponent}</mn></msup>`;
}

function deviation(entry, axis, index, mean) {
  const observation = entry.state === "valid"
    ? numberMarkup(entry.text.replace(".", ","))
    : `<msub><mi>${axis}</mi><mn>${index + 1}</mn></msub>`;
  let average = `<mover accent="true"><mi>${axis}</mi><mo>¯</mo></mover>`;
  if (mean != null) {
    average = numberMarkup(formatAuxiliary(mean));
    if (mean < 0) average = `<mrow><mo>(</mo>${average}<mo>)</mo></mrow>`;
  }
  return `<mrow><mo>(</mo>${observation}<mo>−</mo>${average}<mo>)</mo></mrow>`;
}

function fraction(numerator, sumX, sumY) {
  return `<mfrac>
    ${numerator}
    <msqrt><mrow><mo>(</mo>${sumX}<mo>)</mo><mo>×</mo><mo>(</mo>${sumY}<mo>)</mo></mrow></msqrt>
  </mfrac>`;
}

export function renderFormula(rows, stats, coefficient) {
  const hasData = rows.some(({ x, y }) => x.state !== "blank" || y.state !== "blank");
  if (!hasData) {
    formulaDisplay.replaceChildren(document.querySelector("#symbolic-formula").content.cloneNode(true));
    formulaContext.hidden = true;
    return;
  }

  const pendingIndex = rows.findIndex(({ x, y }) => x.state !== "valid" || y.state !== "valid");
  const complete = pendingIndex < 0;
  const terms = rows.map(({ x, y }, index) => ({
    x: deviation(x, "x", index, complete ? stats?.meanX : null),
    y: deviation(y, "y", index, complete ? stats?.meanY : null),
    selected: x.input.dataset.selected === "true" || y.input.dataset.selected === "true",
  }));
  const sum = values => `<mrow>${values.join("<mo>+</mo>")}</mrow>`;
  const products = sum(terms.map(({ x, y, selected }) =>
    `<mrow class="${selected ? "active-formula-term" : ""}">${x}${y}</mrow>`));
  const squaresX = sum(terms.map(({ x }) => `<msup>${x}<mn>2</mn></msup>`));
  const squaresY = sum(terms.map(({ y }) => `<msup>${y}<mn>2</mn></msup>`));
  const left = coefficient == null
    ? `<mi>r</mi><mo>${complete ? "≈" : "="}</mo>`
    : `<mn class="formula-coefficient">${coefficient}</mn><mo>≈</mo>`;
  let totals = "";
  if (complete && stats && [stats.sumXY, stats.sumXX, stats.sumYY].every(value => value != null)) {
    totals = `<mo>≈</mo>${fraction(
      numberMarkup(formatAuxiliary(stats.sumXY)),
      numberMarkup(formatAuxiliary(stats.sumXX)),
      numberMarkup(formatAuxiliary(stats.sumYY)),
    )}`;
  }

  formulaDisplay.innerHTML = `
    <math id="live-equation" display="block">
      ${left}${fraction(products, squaresX, squaresY)}${totals}
    </math>`;

  let context = "";
  if (!complete) {
    const row = rows[pendingIndex];
    const axis = row.x.state !== "valid" ? "X" : "Y";
    const entry = axis === "X" ? row.x : row.y;
    context = `${entry.state === "blank" ? "Preencha" : "Revise"} ${axis} do par ${pendingIndex + 1}. Os símbolos indicam os valores que faltam para completar a fórmula.`;
  }
  if (formulaDisplay.scrollWidth > formulaDisplay.clientWidth) {
    context += " Role para os lados para acompanhar toda a expressão.";
  }
  formulaContext.hidden = !context;
  formulaContext.textContent = context.trim();

  const target = formulaDisplay.querySelector(".formula-coefficient, .active-formula-term");
  if (target) {
    const targetBounds = target.getBoundingClientRect();
    const viewportBounds = formulaDisplay.getBoundingClientRect();
    if (targetBounds.right > viewportBounds.right) {
      formulaDisplay.scrollLeft += targetBounds.right - viewportBounds.right + 8;
    } else if (targetBounds.left < viewportBounds.left) {
      formulaDisplay.scrollLeft += targetBounds.left - viewportBounds.left - 8;
    }
  }
}
