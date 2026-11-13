const standard = new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 10 });
const scientific = new Intl.NumberFormat("pt-BR", {
  notation: "scientific", maximumSignificantDigits: 16,
});

const steps = document.querySelector("#steps");
const substitutionScroll = document.querySelector(".substitution-scroll");
const scrollHint = document.querySelector("#scroll-hint");
const formulaDisplay = document.querySelector(".symbolic");
const resize = new ResizeObserver(() => {
  scrollHint.hidden = substitutionScroll.scrollWidth <= substitutionScroll.clientWidth;
});
resize.observe(substitutionScroll);
resize.observe(steps.closest("table"));

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

function deviation(entry, mean) {
  const observation = numberMarkup(entry.state === "valid" ? entry.text.replace(".", ",") : null);
  const average = numberMarkup(mean == null ? null : formatAuxiliary(mean));
  return `<mrow><mo>(</mo>${observation}<mo>−</mo>${average}<mo>)</mo></mrow>`;
}

export function renderFormula(row, stats, hasData, coefficient) {
  if (!hasData || !row) {
    formulaDisplay.replaceChildren(document.querySelector("#symbolic-formula").content.cloneNode(true));
    return;
  }

  const dx = deviation(row.x, stats?.meanX);
  const dy = deviation(row.y, stats?.meanY);
  const r = coefficient == null
    ? "<mi>r</mi>"
    : `<mn class="formula-coefficient">${coefficient}</mn>`;

  formulaDisplay.innerHTML = `
    <math display="block">
      ${r}<mo>=</mo>
      <mfrac>
        <mrow><mo>∑</mo><mo>[</mo>${dx}${dy}<mo>]</mo></mrow>
        <msqrt>
          <mo>∑</mo><msup>${dx}<mn>2</mn></msup>
          <mo>×</mo>
          <mo>∑</mo><msup>${dy}<mn>2</mn></msup>
        </msqrt>
      </mfrac>
    </math>`;
}

export function renderSubstitution(rows, stats, count) {
  const terms = rows.map(({ x, y }) => ({
    x: deviation(x, stats?.meanX),
    y: deviation(y, stats?.meanY),
    selected: x.input.dataset.selected === "true" || y.input.dataset.selected === "true",
  }));
  steps.innerHTML = terms.map(({ x, y }, index) => {
    return `<tr><th scope="row">${index + 1}</th>
      <td><math>${x}${y}</math></td>
      <td><math><msup>${x}<mn>2</mn></msup></math></td>
      <td><math><msup>${y}<mn>2</mn></msup></math></td></tr>`;
  }).join("");

  const addTerms = values => `<mrow>${values.join("<mo>+</mo>")}</mrow>`;
  const products = addTerms(terms.map(({ x, y, selected }) =>
    `<mrow class="${selected ? "active-sum-term" : ""}">${x}${y}</mrow>`));
  const squaresX = addTerms(terms.map(({ x }) => `<msup>${x}<mn>2</mn></msup>`));
  const squaresY = addTerms(terms.map(({ y }) => `<msup>${y}<mn>2</mn></msup>`));
  const sum = value => numberMarkup(value == null ? null : formatAuxiliary(value));
  const pendingIndex = rows.findIndex(({ x, y }) => x.state !== "valid" || y.state !== "valid");
  let status = "";
  if (pendingIndex >= 0) {
    const row = rows[pendingIndex];
    const axis = row.x.state !== "valid" ? "X" : "Y";
    const entry = axis === "X" ? row.x : row.y;
    status = `${entry.state === "blank" ? "Preencha" : "Revise"} ${axis} do par ${pendingIndex + 1}.`;
    if (count > 0) {
      status += ` As somas parciais usam ${count} ${count === 1 ? "par completo" : "pares completos"}.`;
    } else {
      status += " As médias e as somas aparecem ao completar um par.";
    }
  } else if (count < 2) {
    status = "Preencha pelo menos dois pares completos para calcular r.";
  }

  document.querySelector("#sums").innerHTML = `
    <p class="sums-label">Valores substituídos</p>
    <div class="sums-expression" tabindex="0" role="region" aria-label="Fórmula com todos os valores inseridos">
      <math display="block">
        <mi>r</mi><mo>=</mo>
        <mfrac>
          ${products}
          <msqrt><mo>(</mo>${squaresX}<mo>)</mo><mo>×</mo><mo>(</mo>${squaresY}<mo>)</mo></msqrt>
        </mfrac>
      </math>
    </div>
    <p class="sums-label">${pendingIndex >= 0 ? "Somas parciais" : "Somas calculadas"}</p>
    <div class="sums-totals">
      <math display="block">
        <mi>r</mi><mo>=</mo>
        <mfrac>
          <mrow>${sum(stats?.sumXY)}</mrow>
          <msqrt><mrow>${sum(stats?.sumXX)}</mrow><mo>×</mo><mrow>${sum(stats?.sumYY)}</mrow></msqrt>
        </mfrac>
      </math>
    </div>
    <p class="sums-status" ${status ? "" : "hidden"}>${status}</p>`;

  const expression = document.querySelector(".sums-expression");
  const activeTerm = expression.querySelector(".active-sum-term");
  if (activeTerm) {
    const termBounds = activeTerm.getBoundingClientRect();
    const viewportBounds = expression.getBoundingClientRect();
    if (termBounds.right > viewportBounds.right) {
      expression.scrollLeft += termBounds.right - viewportBounds.right + 8;
    } else if (termBounds.left < viewportBounds.left) {
      expression.scrollLeft += termBounds.left - viewportBounds.left - 8;
    }
  }
}
