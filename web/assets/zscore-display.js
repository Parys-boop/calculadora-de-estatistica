import { numberMarkup } from "./display.js";

const scoreFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const distanceFormatter = new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 17 });
const scientificDistance = new Intl.NumberFormat("pt-BR", {
  notation: "scientific", maximumSignificantDigits: 17,
});
const classifications = [
  "Dentro do padrão",
  "No limite do padrão",
  "Valor incomum",
];
const fraction = (observed, mean, deviation) =>
  `<mfrac><mrow>${observed}<mo>−</mo>${mean}</mrow><mrow>${deviation}</mrow></mfrac>`;
const symbolic = fraction("<mi>x</mi>", "<mi>μ</mi>", "<mi>σ</mi>");

export function formatZScore(value) {
  return scoreFormatter.format(value).replaceAll("-", "−");
}

function entryMarkup(entry, symbol) {
  if (entry.state !== "valid") return `<mi>${symbol}</mi>`;
  const value = numberMarkup(entry.text.replace(".", ","));
  return entry.value < 0 ? `<mrow><mo>(</mo>${value}<mo>)</mo></mrow>` : value;
}

export function zScoreMarkup(entries, calculated) {
  const hasValues = Object.values(entries).some(entry => entry.state === "valid");
  const substituted = hasValues
    ? `<mo>=</mo>${fraction(entryMarkup(entries.observed, "x"), entryMarkup(entries.mean, "μ"), entryMarkup(entries.deviation, "σ"))}`
    : "";
  const final = calculated ? `<mo>≈</mo>${numberMarkup(formatZScore(calculated.score))}` : "";
  return `<div class="math-scroll" tabindex="0" role="region" aria-label="Fórmula do escore Z com os valores inseridos">
    <math display="block"><mi>z</mi><mo>=</mo>${symbolic}${substituted}${final}</math></div>`;
}

export function zScoreResultMarkup(result) {
  const formatter = result.distance >= 1e12 || (result.distance > 0 && result.distance < 1e-6)
    ? scientificDistance : distanceFormatter;
  const position = result.position > 0 ? "acima" : "abaixo";
  const explanation = result.position === 0
    ? "O valor observado é igual à média do grupo de referência."
    : `O valor observado está a ${formatter.format(result.distance)} desvios padrão ${position} da média do grupo de referência.`;
  return `<dl class="metrics"><div><dt>Escore Z</dt><dd>${formatZScore(result.score)}</dd></div>
    <div><dt>Critério da aula</dt><dd>${classifications[result.classification]}</dd></div></dl>
    <p class="fit-explanation">${explanation}</p>
    <p class="fit-explanation">A interpretação de estar acima ou abaixo da média depende do que está sendo medido.</p>`;
}
