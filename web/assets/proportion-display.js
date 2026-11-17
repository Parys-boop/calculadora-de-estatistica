import { formatAuxiliary, numberMarkup } from "./display.js";
import { ProportionStatus } from "./pearson.js";

const twoDecimals = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const wholeNumber = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const fixed = value => twoDecimals.format(value === 0 ? 0 : value).replaceAll("-", "−");
const p = "<mi>p</mi>";
const n = "<mi>n</mi>";
const z = "<mi>Z</mi>";
const ep = "<msub><mi>E</mi><mi>p</mi></msub>";
const num = value => numberMarkup(formatAuxiliary(value));
const ratio = (numerator, denominator) => `<mfrac><mrow>${numerator}</mrow><mrow>${denominator}</mrow></mfrac>`;
const margin = (critical, fraction, size) =>
  `${critical}<mo>×</mo><msqrt>${ratio(`${fraction}<mo>×</mo><mo>(</mo><mn>1</mn><mo>−</mo>${fraction}<mo>)</mo>`, size)}</msqrt>`;
const step = (title, markup) => `<section class="regression-step"><h3>${title}</h3>
  <div class="math-scroll" tabindex="0" role="region" aria-label="${title}"><math display="block">${markup}</math></div>
  </section>`;

export function proportionMarkup(input, preview, calculated) {
  const xValue = Number.isFinite(input.x) ? numberMarkup(wholeNumber.format(input.x)) : "<mi>x</mi>";
  const nValue = Number.isFinite(input.n) ? numberMarkup(wholeNumber.format(input.n)) : n;
  const zValue = preview?.z != null ? num(preview.z) : z;
  const pValue = preview?.fraction != null ? numberMarkup(String(preview.fraction).replace(".", ",")) : p;
  const finalMargin = calculated?.margin != null ? num(calculated.margin / 100) : ep;
  const limit = (label, sign) => `<mtr><mtd><msub><mi>L</mi><mi>${label}</mi></msub><mo>=</mo>${pValue}<mo>${sign}</mo>${finalMargin}</mtd></mtr>`;
  return step("Proporção amostral",
    `${p}<mo>=</mo>${ratio("<mi>x</mi>", n)}<mo>=</mo>${ratio(xValue, nValue)}${preview?.fraction != null ? `<mo>≈</mo>${pValue}` : ""}`) +
    step("Margem de erro",
      `${ep}<mo>=</mo>${margin(z, p, n)}<mo>≈</mo>${margin(zValue, pValue, nValue)}`) +
    step("Limites do intervalo",
      `<mtable rowspacing="0.6em">${limit("inf", "−")}${limit("sup", "+")}</mtable>`);
}

export function proportionResultMarkup(result, confidence) {
  const method = `<p class="confidence-method-label">Aproximação pela normal (método Z) · ${confidence}% de confiança</p>`;
  const observed = `<div><dt>Proporção amostral</dt><dd>${fixed(result.percent)}%</dd></div>`;
  if (result.status === ProportionStatus.EXTREME) {
    return `${method}<dl class="metrics">${observed}</dl>
      <p class="extrapolation-warning">A amostra tem 0 casos ou 0 observações sem a característica. Neste caso, a aproximação normal não fornece um intervalo útil.</p>`;
  }
  return `${method}<dl class="metrics">
      ${observed}
      <div><dt>Margem de erro</dt><dd>${fixed(result.margin)} pontos percentuais</dd></div>
      <div><dt>Intervalo de confiança</dt><dd>${fixed(result.lower)}% a ${fixed(result.upper)}%</dd></div>
    </dl>
    <p class="proportion-rounded"><span>Limites arredondados para cima</span>
      <strong>${wholeNumber.format(result.lowerCeiling === 0 ? 0 : result.lowerCeiling)}% a ${wholeNumber.format(result.upperCeiling === 0 ? 0 : result.upperCeiling)}%</strong>
    </p>
    ${result.smallSample ? '<p class="extrapolation-warning">Há menos de 10 casos ou menos de 10 observações sem a característica. A aproximação normal pode ser ruim.</p>' : ""}`;
}
