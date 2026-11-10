const standard = new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 10 });
const scientific = new Intl.NumberFormat("pt-BR", {
  notation: "scientific", maximumSignificantDigits: 16,
});

const steps = document.querySelector("#steps");
const substitutionScroll = document.querySelector(".substitution-scroll");
const scrollHint = document.querySelector("#scroll-hint");
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

export function renderSubstitution(rows, stats, count) {
  steps.innerHTML = rows.map(({ x, y }, index) => {
    const dx = deviation(x, stats?.meanX);
    const dy = deviation(y, stats?.meanY);
    return `<tr><th scope="row">${index + 1}</th>
      <td><math>${dx}${dy}</math></td>
      <td><math><msup>${dx}<mn>2</mn></msup></math></td>
      <td><math><msup>${dy}<mn>2</mn></msup></math></td></tr>`;
  }).join("");

  const sum = value => numberMarkup(count < 2 || value == null ? null : formatAuxiliary(value));
  document.querySelector("#sums").innerHTML = `
    <math display="block">
      <mi>r</mi><mo>=</mo>
      <mfrac>
        <mrow>${sum(stats?.sumXY)}</mrow>
        <msqrt><mrow>${sum(stats?.sumXX)}</mrow><mo>×</mo><mrow>${sum(stats?.sumYY)}</mrow></msqrt>
      </mfrac>
    </math>`;
}
