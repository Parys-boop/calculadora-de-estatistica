import { attachNumericKeypad, parseEntry } from "./numeric-input.js";
import { ZScoreStatus as Status } from "./pearson.js";
import { zScoreMarkup, zScoreResultMarkup } from "./zscore-display.js";

const changedMessage = "Os dados mudaram. Clique em Calcular para obter o novo resultado.";
const deviationMessage = "Informe um desvio padrão estritamente positivo, maior que zero.";

export function initializeZScore() {
  const panel = document.querySelector("#zscore-calculator");
  const form = panel.querySelector("form");
  const fields = Object.fromEntries(["observed", "mean", "deviation"].map(name =>
    [name, form.querySelector(`#zscore-${name}`)]));
  const feedback = panel.querySelector("#zscore-feedback");
  const result = panel.querySelector("#zscore-result");
  const display = panel.querySelector("#zscore-display");
  const note = panel.querySelector("#zscore-preview-note");
  const { calculateButton, selectField } = attachNumericKeypad(
    panel.querySelector("#zscore-keypad"), "zscore", dataChanged,
  );
  calculateButton.type = "submit";
  let engine;
  let calculated;

  function message(text = "", error = false) {
    feedback.textContent = text;
    feedback.dataset.error = String(error);
  }

  function read() {
    const entries = Object.fromEntries(Object.entries(fields).map(([name, input]) => [name, parseEntry(input)]));
    const input = Object.fromEntries(Object.entries(entries).map(([name, entry]) =>
      [name, entry.state === "valid" ? entry.value : NaN]));
    return { entries, input };
  }

  function render() {
    const { entries } = read();
    display.innerHTML = zScoreMarkup(entries, calculated);
    note.textContent = calculated ? "Resultado calculado"
      : Object.values(entries).every(entry => entry.state === "valid")
        ? "Prévia · clique em Calcular para obter o escore"
        : "Os símbolos representam os campos pendentes";
  }

  function clearValidation() {
    for (const field of form.querySelectorAll("[aria-invalid]")) field.removeAttribute("aria-invalid");
  }

  function dataChanged() {
    const needsCalculation = calculated || feedback.textContent === changedMessage;
    calculated = undefined;
    result.replaceChildren();
    clearValidation();
    if (engine) message(needsCalculation ? changedMessage : "");
    render();
  }

  function invalid(field, text) {
    field.setAttribute("aria-invalid", "true");
    field.focus({ preventScroll: true });
    message(text, true);
    feedback.scrollIntoView({ block: "nearest" });
  }

  function calculate(event) {
    event.preventDefault();
    if (!engine) return;
    clearValidation();
    const { entries, input } = read();
    for (const entry of Object.values(entries)) {
      if (entry.state === "blank") return invalid(entry.input, `Preencha ${entry.input.dataset.fieldName}.`);
      if (entry.state !== "valid") return invalid(entry.input,
        `Digite um número finito em ${entry.input.dataset.fieldName}, usando vírgula ou ponto decimal.`);
    }
    let output;
    try { output = engine(input, true); }
    catch { message("Não foi possível calcular o escore. Tente novamente.", true); return; }
    if (output.status === Status.INVALID_DEVIATION) return invalid(fields.deviation, deviationMessage);
    if (output.status !== Status.OK || output.score == null) {
      message("Os valores excederam a faixa ou a precisão disponível. Revise a escala dos dados.", true);
      return;
    }
    calculated = output;
    result.innerHTML = zScoreResultMarkup(calculated);
    message();
    render();
    result.scrollIntoView({ block: "nearest" });
  }

  form.addEventListener("focusin", event => {
    if (event.target.matches('input[type="text"]')) selectField(event.target);
  });
  form.addEventListener("input", dataChanged);
  form.addEventListener("submit", calculate);
  panel.querySelector("#zscore-clear").addEventListener("click", () => {
    form.reset();
    selectField(fields.observed);
    calculated = undefined;
    if (engine) message();
    dataChanged();
  });
  selectField(fields.observed);
  message("Carregando módulo de cálculo…");
  render();
  return {
    panel,
    setEngine(calculation) { engine = calculation; calculateButton.disabled = false; message(); },
    setError(text) { calculateButton.disabled = true; message(text, true); },
  };
}
