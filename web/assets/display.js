const standard = new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 10 });
const scientific = new Intl.NumberFormat("pt-BR", {
  notation: "scientific", maximumSignificantDigits: 16,
});

const steps = document.querySelector("#steps");
const substitutionScroll = document.querySelector(".substitution-scroll");
const scrollHint = document.querySelector("#scroll-hint");
const liveFormula = document.querySelector("#live-formula");
const formulaContent = document.querySelector("#formula-content");
const formulaScrollHint = document.querySelector("#formula-scroll-hint");
const resize = new ResizeObserver(() => {
  scrollHint.hidden = substitutionScroll.scrollWidth <= substitutionScroll.clientWidth;
  formulaScrollHint.hidden = liveFormula.scrollWidth <= liveFormula.clientWidth
    && liveFormula.scrollHeight <= liveFormula.clientHeight;
});
resize.observe(substitutionScroll);
resize.observe(steps.closest("table"));
resize.observe(liveFormula);
resize.observe(formulaContent);

export function formatAuxiliary(value) {
  if (value == null) return "—";
  const magnitude = Math.abs(value);
  const formatter = magnitude >= 1e12 || (magnitude > 0 && magnitude < 1e-6) ? scientific : standard;
  return formatter.format(value === 0 ? 0 : value).replaceAll("-", "−");
}

function numberMarkup(text) {
  if (text == null) return '<mtext aria-label="valor pendente">□</mtext>';
  const [mantissa, exponent] = text.replaceAll("-", "−").split(/[eE]/);
  const number = `<mn>${mantissa}</mn>`;
  if (exponent == null) return number;
  return `${number}<mo>×</mo><msup><mn>10</mn><mn>${exponent}</mn></msup>`;
}

function observationMarkup(entry) {
  return numberMarkup(entry.state === "valid" ? entry.text.replace(".", ",") : null);
}

function deviation(observation, mean) {
  const average = numberMarkup(mean == null ? null : formatAuxiliary(mean));
  return `<mrow><mo>(</mo>${observation}<mo>−</mo>${average}<mo>)</mo></mrow>`;
}

export function renderFormula(rows, stats) {
  const hasData = rows.some(({ x, y }) => x.state !== "blank" || y.state !== "blank");
  if (!hasData) {
    formulaContent.replaceChildren(document.querySelector("#symbolic-formula").content.cloneNode(true));
    return;
  }

  const deviations = rows.map(({ x, y }) => ({
    x: deviation(observationMarkup(x), stats?.meanX),
    y: deviation(observationMarkup(y), stats?.meanY),
  }));
  const sum = terms => `<mrow>${terms.join("<mo>+</mo>")}</mrow>`;
  const products = sum(deviations.map(({ x, y }) => x + y));
  const squaresX = sum(deviations.map(({ x }) => `<msup>${x}<mn>2</mn></msup>`));
  const squaresY = sum(deviations.map(({ y }) => `<msup>${y}<mn>2</mn></msup>`));
  formulaContent.innerHTML = `
    <math display="block">
      <mi>r</mi><mo>=</mo>
      <mfrac>
        ${products}
        <msqrt>
          <mrow>
            <mo>(</mo>${squaresX}<mo>)</mo>
            <mo>×</mo>
            <mo>(</mo>${squaresY}<mo>)</mo>
          </mrow>
        </msqrt>
      </mfrac>
    </math>`;
}

export function renderSubstitution(rows, stats) {
  steps.innerHTML = rows.map(({ x, y }, index) => {
    const dx = deviation(observationMarkup(x), stats?.meanX);
    const dy = deviation(observationMarkup(y), stats?.meanY);
    return `<tr><th scope="row">${index + 1}</th>
      <td><math>${dx}${dy}</math></td>
      <td><math><msup>${dx}<mn>2</mn></msup></math></td>
      <td><math><msup>${dy}<mn>2</mn></msup></math></td></tr>`;
  }).join("");
}
