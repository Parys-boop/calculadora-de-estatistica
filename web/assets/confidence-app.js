import { ConfidenceStatus as Status } from "./pearson.js";
import { confidenceMarkup, confidenceResultMarkup } from "./confidence-display.js";
import { editNumber, isExactSampleSize, parseEntry } from "./numeric-input.js";

const changedMessage = "Os dados mudaram. Clique em Calcular para obter o novo resultado.";
const messages = {
  [Status.NON_FINITE_INPUT]: "Use apenas números finitos nos campos da amostra.",
  [Status.INVALID_N]: "Informe n como inteiro positivo, sem arredondar frações, até 9.007.199.254.740.991 (limite de representação exata).",
  [Status.NEGATIVE_DEVIATION]: "O desvio padrão deve ser maior ou igual a zero.",
  [Status.INVALID_LEVEL]: "Selecione um nível de confiança de 90%, 95% ou 99%.",
  [Status.INVALID_DEVIATION_TYPE]: "Selecione o desvio amostral ou o populacional conhecido.",
  [Status.SAMPLE_TOO_SMALL]: "Para este tamanho de amostra com desvio padrão amostral, o método Z apresentado na aula não se aplica. É necessário avaliar o uso de t de Student, ainda não disponível nesta calculadora.",
  [Status.NORMALITY_REQUIRED]: "Com desvio populacional conhecido e n ≤ 30, confirme que a população estudada tem distribuição normal antes de calcular.",
  [Status.NUMERIC_ERROR]: "Os valores excederam a faixa ou a precisão disponível para o cálculo. Revise a escala da média, do desvio e de n.",
};

export function initializeConfidence() {
  const panel = document.querySelector("#confidence-calculator");
  const form = panel.querySelector("form");
  const fields = Object.fromEntries(["mean", "deviation", "n"].map(name => [name, panel.querySelector(`#confidence-${name}`)]));
  const level = panel.querySelector("#confidence-level");
  const type = panel.querySelector("#confidence-deviation-type");
  const normality = panel.querySelector("#confidence-normality");
  const confirmed = panel.querySelector("#confidence-normal-confirmed");
  const feedback = panel.querySelector("#confidence-feedback");
  const result = panel.querySelector("#confidence-result");
  const display = panel.querySelector("#confidence-display");
  const note = panel.querySelector("#confidence-preview-note");
  const keypad = document.querySelector("#calculator .keypad").cloneNode(true);
  // Mesmos controles e estilos aprovados, com IDs próprios para esta calculadora.
  for (const element of keypad.querySelectorAll("[id]")) element.id = `confidence-${element.id}`;
  keypad.setAttribute("aria-labelledby", "confidence-keypad-title");
  panel.querySelector("#confidence-keypad").append(keypad);
  const calculateButton = keypad.querySelector(".calculate-button");
  const selectedLabel = keypad.querySelector("#confidence-selected-field");
  let engine;
  let selectedInput;
  let calculated;

  function message(text = "", error = false) {
    feedback.textContent = text;
    feedback.dataset.error = String(error);
  }

  function selectField(input) {
    if (selectedInput) delete selectedInput.dataset.selected;
    selectedInput = input;
    selectedInput.dataset.selected = "true";
    selectedLabel.textContent = input.dataset.fieldName;
  }

  function read() {
    const entries = Object.fromEntries(Object.entries(fields).map(([name, input]) => [name, parseEntry(input)]));
    const input = Object.fromEntries(Object.entries(entries).map(([name, entry]) => [name, entry.state === "valid" ? entry.value : NaN]));
    return { entries, input: { ...input, confidence: Number(level.value), deviationType: Number(type.value), normalityConfirmed: confirmed.checked } };
  }

  function render() {
    const { entries, input } = read();
    let metadata;
    if (engine) {
      try { metadata = engine(input); }
      catch { message("Não foi possível processar os dados. Tente novamente.", true); }
    }
    display.innerHTML = confidenceMarkup(entries, metadata, calculated, type.value);
    const smallPopulation = type.value === "1" && isExactSampleSize(entries.n) && entries.n.value <= 30;
    normality.hidden = !smallPopulation;
    panel.querySelector("#confidence-deviation-help").textContent = type.value === "1"
      ? "Desvio padrão conhecido da população estudada."
      : "Calculado apenas com os elementos da amostra.";
    panel.querySelector("#confidence-method-note").textContent = type.value === "1"
      ? "Método Z com σ populacional conhecido. Para n ≤ 30, confirme a distribuição normal da população."
      : "Com desvio amostral, o material adota a aproximação Z somente para n > 30; essa regra não garante a validade em qualquer população.";
    note.textContent = calculated ? "Cálculo em C, sem arredondamento intermediário"
      : Object.values(entries).every(entry => entry.state === "valid")
        ? "Prévia · clique em Calcular para obter os resultados"
        : "Os símbolos representam os campos pendentes";
  }

  function dataChanged(target) {
    const needsCalculation = calculated || feedback.textContent === changedMessage;
    calculated = undefined;
    result.replaceChildren();
    for (const field of form.querySelectorAll("[aria-invalid]")) field.removeAttribute("aria-invalid");
    if (target === fields.n || target === type) confirmed.checked = false;
    if (engine) message(needsCalculation ? changedMessage : "");
    render();
  }

  function invalid(input, text) {
    input.setAttribute("aria-invalid", "true");
    if (input.matches('input[type="text"]')) selectField(input);
    input.focus({ preventScroll: true });
    message(text, true);
    feedback.scrollIntoView({ block: "nearest" });
  }

  function calculate(event) {
    event?.preventDefault();
    if (!engine) return;
    calculated = undefined;
    result.replaceChildren();
    for (const field of form.querySelectorAll("[aria-invalid]")) field.removeAttribute("aria-invalid");
    render();
    const { entries, input } = read();
    for (const entry of Object.values(entries)) {
      if (entry.state !== "valid") {
        invalid(entry.input, entry.state === "blank"
          ? `Preencha ${entry.input.dataset.fieldName}.`
          : `Digite um número finito em ${entry.input.dataset.fieldName}, usando vírgula ou ponto decimal.`);
        return;
      }
    }
    if (!isExactSampleSize(entries.n)) {
      invalid(fields.n, messages[Status.INVALID_N]);
      return;
    }
    let output;
    try { output = engine(input, true); }
    catch { message("Não foi possível calcular o intervalo. Tente novamente.", true); return; }
    if (output.status !== Status.OK || [output.margin, output.lower, output.upper].some(value => value == null)) {
      const target = {
        [Status.INVALID_N]: fields.n, [Status.SAMPLE_TOO_SMALL]: fields.n,
        [Status.NEGATIVE_DEVIATION]: fields.deviation, [Status.NORMALITY_REQUIRED]: confirmed,
        [Status.INVALID_LEVEL]: level, [Status.INVALID_DEVIATION_TYPE]: type,
      }[output.status] ?? fields.mean;
      invalid(target, messages[output.status] ?? messages[Status.NUMERIC_ERROR]);
      return;
    }
    calculated = { ...output, mean: input.mean };
    result.innerHTML = confidenceResultMarkup(calculated, type.value, input.deviation);
    message();
    render();
    result.scrollIntoView({ block: "nearest" });
  }

  form.addEventListener("focusin", event => {
    if (event.target.matches('input[type="text"]')) selectField(event.target);
  });
  form.addEventListener("input", event => {
    if (event.target.matches('input[type="text"]')) dataChanged(event.target);
  });
  form.addEventListener("change", event => {
    if (event.target.matches('select, input[type="checkbox"]')) dataChanged(event.target);
  });
  form.addEventListener("submit", calculate);
  calculateButton.addEventListener("click", calculate);
  const keys = keypad.querySelector(".keys");
  keys.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && document.activeElement === selectedInput) event.preventDefault();
  });
  keys.addEventListener("click", event => {
    const key = event.target.closest("[data-key]");
    if (key && editNumber(selectedInput, key.dataset.key)) dataChanged(selectedInput);
  });
  panel.querySelector("#confidence-clear").addEventListener("click", () => {
    form.reset();
    selectField(fields.mean);
    calculated = undefined;
    result.replaceChildren();
    dataChanged();
    if (engine) message();
  });
  selectField(fields.mean);
  message("Carregando módulo de cálculo…");
  render();
  return {
    panel,
    setEngine(calculation) { engine = calculation; calculateButton.disabled = false; message(); render(); },
    setError(text) { calculateButton.disabled = true; message(text, true); },
  };
}
