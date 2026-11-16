import { formatAuxiliary, formatFinal, numberMarkup } from "./display.js";

export const percent = value => new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 }).format(value);
const average = '<mover accent="true"><mi>x</mi><mo>¯</mo></mover>';
const em = '<msub><mi>E</mi><mi>m</mi></msub>';
const lowerSymbol = '<msub><mi>L</mi><mi>inf</mi></msub>';
const upperSymbol = '<msub><mi>L</mi><mi>sup</mi></msub>';
const group = markup => `<mrow><mo>(</mo>${markup}<mo>)</mo></mrow>`;
const step = (title, label, markup) => `<section class="regression-step"><h3>${title}</h3>
  <div class="math-scroll" tabindex="0" role="region" aria-label="${label}"><math display="block">${markup}</math></div></section>`;

function entryMarkup(entry, placeholder) {
  return entry.state === "valid" ? numberMarkup(entry.text.replace(".", ",")) : placeholder;
}

export function confidenceMarkup(entries, metadata, result, deviationType) {
  const mean = entryMarkup(entries.mean, average);
  const deviationSymbol = deviationType === "1" ? "<mi>σ</mi>" : "<mi>s</mi>";
  const deviation = entryMarkup(entries.deviation, deviationSymbol);
  const n = entryMarkup(entries.n, "<mi>n</mi>");
  const z = metadata?.z != null ? numberMarkup(formatAuxiliary(metadata.z)) : "<mi>Z</mi>";
  const parameters = metadata?.level != null
    ? `<mtext>Confiança: ${percent(metadata.level)}</mtext><mo>;</mo><mi>α</mi><mo>=</mo><mn>1</mn><mo>−</mo>${numberMarkup(formatAuxiliary(metadata.level))}<mo>≈</mo>${numberMarkup(formatAuxiliary(metadata.alpha))}<mo>;</mo><mi>Z</mi><mo>=</mo>${z}`
    : '<mtext>Carregando parâmetros do método Z…</mtext>';
  const fraction = `<mfrac><mrow>${z}<mo>×</mo>${group(deviation)}</mrow><msqrt>${n}</msqrt></mfrac>`;
  const margin = result ? numberMarkup(String(result.margin).replace(".", ",")) : em;
  const final = value => result ? `<mo>≈</mo>${numberMarkup(formatFinal(value))}` : "";
  return step("Confiança, α e Z", "Parâmetros do intervalo de confiança", parameters) +
    step("Margem de erro", "Fórmula da margem de erro",
      `${em}<mo>=</mo><mfrac><mrow><mi>Z</mi><mo>×</mo>${deviationSymbol}</mrow><msqrt><mi>n</mi></msqrt></mfrac><mo>=</mo>${fraction}${final(result?.margin)}`) +
    step("Limites do intervalo", "Fórmulas dos limites do intervalo",
      `<mtable rowspacing="0.8em"><mtr><mtd>${lowerSymbol}<mo>=</mo>${mean}<mo>−</mo>${group(margin)}${final(result?.lower)}</mtd></mtr>
      <mtr><mtd>${upperSymbol}<mo>=</mo>${mean}<mo>+</mo>${group(margin)}${final(result?.upper)}</mtd></mtr></mtable>`) +
    (result ? step("Intervalo de confiança", "Intervalo para a média da população",
      `<mi>IC</mi><mo>≈</mo><mo>(</mo>${numberMarkup(formatFinal(result.lower))}<mo>;</mo>${numberMarkup(formatFinal(result.upper))}<mo>)</mo>`) : "");
}

export function confidenceResultMarkup(result, deviationType, deviation) {
  const confidence = percent(result.level);
  const values = [
    ["Média informada", formatFinal(result.mean)],
    ["Margem de erro", formatFinal(result.margin)],
    ["Limite inferior", formatFinal(result.lower)],
    ["Limite superior", formatFinal(result.upper)],
    ["Nível de confiança", confidence],
  ];
  const method = deviationType === "0"
    ? "Aproximação pelo método Z · desvio amostral (s), n > 30"
    : "Método Z · desvio populacional conhecido (σ)";
  const zeroNote = deviation === 0
    ? `<p class="extrapolation-warning">A margem zero e os limites iguais à média decorrem do desvio informado.${deviationType === "0" ? " Um desvio amostral zero não comprova ausência de incerteza na população." : ""}</p>` : "";
  return `<p class="confidence-method-label">${method}</p><dl class="metrics">${values.map(([label, value]) =>
    `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>
    <p class="fit-explanation">Este intervalo estima a média da população, não a faixa que contém os valores individuais.</p>
    <p class="fit-explanation">Se repetíssemos a amostragem e este procedimento muitas vezes, aproximadamente ${confidence} dos intervalos conteriam a verdadeira média populacional.</p>${zeroNote}`;
}
