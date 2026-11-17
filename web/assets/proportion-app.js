import { attachNumericKeypad, isExactCount, isExactSampleSize, parseEntry } from "./numeric-input.js";
import { ProportionStatus as Status } from "./pearson.js";
import { proportionMarkup, proportionResultMarkup } from "./proportion-display.js";

const invalidN = "Informe n como inteiro positivo de até 9.007.199.254.740.991.";
const invalidX = "Informe x como inteiro entre 0 e o tamanho da amostra (n).";
const changedMessage = "Os dados mudaram. Clique em Calcular para obter o novo resultado.";

export function initializeProportion() {
  const panel = document.querySelector("#proportion-calculator");
  const form = panel.querySelector("form");
  const cases = form.querySelector("#proportion-x");
  const size = form.querySelector("#proportion-n");
  const level = form.querySelector("#proportion-level");
  const feedback = panel.querySelector("#proportion-feedback");
  const result = panel.querySelector("#proportion-result");
  const display = panel.querySelector("#proportion-display");
  const note = panel.querySelector("#proportion-preview-note");
  const { calculateButton, selectField } = attachNumericKeypad(
    form.querySelector("#proportion-keypad"), "proportion", dataChanged,
  );
  calculateButton.type = "submit";
  let engine;
  let calculated;

  function message(text = "", error = false) {
    feedback.textContent = text;
    feedback.dataset.error = String(error);
  }

  function read() {
    const xEntry = parseEntry(cases);
    const nEntry = parseEntry(size);
    const n = isExactSampleSize(nEntry) ? nEntry.value : NaN;
    const x = isExactCount(xEntry) && (!Number.isFinite(n) || xEntry.value <= n) ? xEntry.value : NaN;
    return { xEntry, nEntry, input: { x, n, confidence: Number(level.value) } };
  }

  function render(input) {
    let preview;
    try { preview = calculated ?? engine?.(input); }
    catch { message("Não foi possível processar os dados. Tente novamente.", true); }
    display.innerHTML = proportionMarkup(input, preview, calculated);
    note.textContent = calculated ? "Resultado calculado"
      : preview?.fraction != null ? "Prévia · clique em Calcular para obter o intervalo"
        : "Preencha os dados da amostra";
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
    render(read().input);
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
    const { xEntry, nEntry, input } = read();
    if (xEntry.state === "blank") return invalid(cases, "Preencha a quantidade de casos (x).");
    if (nEntry.state === "blank") return invalid(size, "Preencha o tamanho da amostra (n).");
    if (!Number.isFinite(input.n)) return invalid(size, invalidN);
    if (!Number.isFinite(input.x)) return invalid(cases, invalidX);

    let output;
    try { output = engine(input, true); }
    catch { message("Não foi possível calcular o intervalo. Tente novamente.", true); return; }
    if (output.status === Status.INVALID_LEVEL) return invalid(level, "Selecione 90%, 95% ou 99%.");
    if (output.status === Status.INVALID_N) return invalid(size, invalidN);
    if (output.status === Status.INVALID_X) return invalid(cases, invalidX);
    calculated = output;
    message();
    result.innerHTML = proportionResultMarkup(calculated, input.confidence);
    render(input);
    result.scrollIntoView({ block: "nearest" });
  }

  form.addEventListener("focusin", event => {
    if (event.target === cases || event.target === size) selectField(event.target);
  });
  form.addEventListener("input", dataChanged);
  form.addEventListener("submit", calculate);
  panel.querySelector("#proportion-clear").addEventListener("click", () => {
    form.reset();
    selectField(cases);
    calculated = undefined;
    if (engine) message();
    dataChanged();
  });
  selectField(cases);
  message("Carregando módulo de cálculo…");
  render(read().input);

  return {
    panel,
    setEngine(calculation) { engine = calculation; calculateButton.disabled = false; message(); render(read().input); },
    setError(text) { calculateButton.disabled = true; message(text, true); },
  };
}
