import { attachNumericKeypad, parseEntry } from "./numeric-input.js";
import { DeviationStatus as Status } from "./pearson.js";
import { formatAuxiliary, formatFinal, numberMarkup } from "./display.js";

const average = '<mover accent="true"><mi>x</mi><mo>¯</mo></mover>';
const changedMessage = "Os valores mudaram. Calcule o desvio padrão novamente.";

export function initializeDeviation() {
  const dialog = document.querySelector("#deviation-dialog");
  const form = dialog.querySelector("form");
  const valuesInput = dialog.querySelector("#deviation-values");
  const type = dialog.querySelector("#deviation-type");
  const feedback = dialog.querySelector("#deviation-feedback");
  const result = dialog.querySelector("#deviation-result");
  const display = dialog.querySelector("#deviation-display");
  const applyButton = dialog.querySelector("#deviation-apply");
  const { calculateButton, selectField } = attachNumericKeypad(
    dialog.querySelector("#deviation-keypad"), "deviation", dataChanged,
  );
  calculateButton.type = "submit";
  let engine;
  let calculated;
  let targetInput;
  let targetType;

  function message(text = "", error = false) {
    feedback.textContent = text;
    feedback.dataset.error = String(error);
  }

  function readValues() {
    const text = valuesInput.value.trim();
    const entries = text ? text.split(/\r?\n/).map(value => parseEntry({ value })) : [];
    const invalidLine = entries.findIndex(entry => entry.state !== "valid");
    return {
      entries, invalidLine,
      values: entries.map(entry => entry.value),
      sample: type.value === "1",
    };
  }

  function render() {
    const { entries, invalidLine, values, sample } = readValues();
    let preview;
    if (engine && entries.length && invalidLine === -1) {
      try { preview = calculated ?? engine(values, sample); }
      catch { message("Não foi possível processar a lista de valores. Tente novamente.", true); }
    }
    const symbol = sample ? "<mi>s</mi>" : "<mi>σ</mi>";
    const symbolicDivisor = sample ? "<mi>n</mi><mo>−</mo><mn>1</mn>" : "<mi>n</mi>";
    let mean = preview?.mean != null ? numberMarkup(formatAuxiliary(preview.mean)) : average;
    if (preview?.mean < 0) mean = `<mrow><mo>(</mo>${mean}<mo>)</mo></mrow>`;
    const divisor = preview?.divisor != null ? numberMarkup(String(preview.divisor)) : symbolicDivisor;
    const final = calculated ? `<mo>≈</mo>${numberMarkup(formatFinal(calculated.deviation))}` : "";
    display.innerHTML = `<div class="math-scroll" tabindex="0" role="region" aria-label="Fórmula do desvio padrão">
      <math display="block">${symbol}<mo>=</mo><msqrt><mfrac>
        <mrow><mo>∑</mo><msup><mrow><mo>(</mo><msub><mi>x</mi><mi>i</mi></msub><mo>−</mo>${mean}<mo>)</mo></mrow><mn>2</mn></msup></mrow>
        <mrow>${divisor}</mrow></mfrac></msqrt>${final}</math></div>`;
  }

  function dataChanged() {
    const needsCalculation = calculated || feedback.textContent === changedMessage;
    calculated = undefined;
    result.replaceChildren();
    applyButton.hidden = true;
    valuesInput.removeAttribute("aria-invalid");
    if (engine) message(needsCalculation ? changedMessage : "");
    render();
  }

  function calculate(event) {
    event.preventDefault();
    if (!engine) return;
    const { entries, invalidLine, values, sample } = readValues();
    if (!entries.length || invalidLine !== -1) {
      valuesInput.setAttribute("aria-invalid", "true");
      message(!entries.length ? "Preencha os valores do grupo, um por linha."
        : `Revise a linha ${invalidLine + 1}. Informe um número finito ou remova a linha vazia.`, true);
      valuesInput.focus({ preventScroll: true });
      return;
    }
    let output;
    try { output = engine(values, sample, true); }
    catch { message("Não foi possível calcular o desvio padrão. Tente novamente.", true); return; }
    if (output.status === Status.TOO_FEW_VALUES) {
      message(sample ? "O desvio amostral exige pelo menos dois valores." : "Informe pelo menos um valor.", true);
      return;
    }
    if (output.status !== Status.OK || output.deviation == null) {
      message("Os valores excederam a faixa ou a precisão disponível. Revise a escala dos dados.", true);
      return;
    }
    calculated = output;
    result.innerHTML = `<dl class="metrics">
      <div><dt>Valores (n)</dt><dd>${output.count}</dd></div>
      <div><dt>Média</dt><dd>${formatAuxiliary(output.mean)}</dd></div>
      <div><dt>Desvio ${sample ? "amostral (s)" : "populacional (σ)"}</dt><dd>${formatFinal(output.deviation)}</dd></div>
    </dl>`;
    message();
    applyButton.hidden = !targetInput;
    render();
    result.scrollIntoView({ block: "nearest" });
  }

  for (const button of document.querySelectorAll("[data-open-deviation]")) {
    button.addEventListener("click", () => {
      const panel = button.closest("main > section");
      targetInput = panel.querySelector("#confidence-deviation, #zscore-deviation");
      targetType = panel.querySelector("#confidence-deviation-type");
      if (targetType) {
        const nextType = targetType.value === "0" ? "1" : "0";
        if (nextType !== type.value) { type.value = nextType; dataChanged(); }
      }
      applyButton.hidden = !calculated || !targetInput;
      dialog.showModal();
      selectField(valuesInput);
      valuesInput.focus({ preventScroll: true });
    });
  }
  dialog.querySelector("#deviation-close").addEventListener("click", () => dialog.close());
  window.addEventListener("hashchange", () => { if (dialog.open) dialog.close(); });
  form.addEventListener("input", dataChanged);
  form.addEventListener("submit", calculate);
  valuesInput.addEventListener("focus", () => selectField(valuesInput));
  dialog.querySelector("#deviation-newline").addEventListener("click", () => {
    valuesInput.setRangeText("\n", valuesInput.selectionStart, valuesInput.selectionEnd, "end");
    dataChanged();
    valuesInput.focus({ preventScroll: true });
  });
  dialog.querySelector("#deviation-clear").addEventListener("click", () => {
    valuesInput.value = "";
    calculated = undefined;
    dataChanged();
    if (engine) message();
    valuesInput.focus({ preventScroll: true });
  });
  applyButton.addEventListener("click", () => {
    if (!calculated || !targetInput) return;
    if (targetType) {
      targetType.value = type.value === "1" ? "0" : "1";
      targetType.dispatchEvent(new Event("change", { bubbles: true }));
    }
    targetInput.value = String(calculated.deviation);
    targetInput.dispatchEvent(new Event("input", { bubbles: true }));
    dialog.close();
    targetInput.focus({ preventScroll: true });
    targetInput.scrollIntoView({ block: "nearest" });
  });
  selectField(valuesInput);
  message("Carregando módulo de cálculo…");
  render();
  return {
    setEngine(calculation) { engine = calculation; calculateButton.disabled = false; message(); render(); },
    setError(text) { calculateButton.disabled = true; message(text, true); },
  };
}
