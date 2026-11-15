import { formatAuxiliary, formatFinal, renderFormula } from "./display.js";
import { loadPearson, loadRegression, PearsonStatus } from "./pearson.js";
import { renderPrediction, renderRegression } from "./regression-display.js";

const home = document.querySelector("#home");
const calculator = document.querySelector("#calculator");
const pairTable = document.querySelector("#pairs");
const calculateButton = document.querySelector("#calculate");
const feedback = document.querySelector("#feedback");
const result = document.querySelector("#result");
const selectedLabel = document.querySelector("#selected-field");
const predictionPanel = document.querySelector("#prediction");
const predictionInput = document.querySelector("#prediction-x");
const predictionFeedback = document.querySelector("#prediction-feedback");

const moduleError = "Não foi possível carregar o módulo de cálculo. Recarregue a página para tentar de novo.";
const changedMessage = "Os dados mudaram. Clique em Calcular para obter o novo resultado.";
const statusMessages = {
  [PearsonStatus.TOO_FEW_PAIRS]: "Preencha pelo menos dois pares completos.",
  [PearsonStatus.NON_FINITE_INPUT]: "Use apenas números finitos.",
  [PearsonStatus.CONSTANT_X]: "Todos os valores de X são iguais. Pearson exige variação em X.",
  [PearsonStatus.CONSTANT_Y]: "Todos os valores de Y são iguais. Pearson exige variação em Y.",
  [PearsonStatus.CONSTANT_BOTH]: "X e Y são constantes. Pearson exige variação nas duas séries.",
  [PearsonStatus.NUMERIC_ERROR]: "Os valores excederam a precisão disponível para o cálculo. Revise a escala dos dados.",
};

let pearson;
let regression;
let selectedInput;
let preview;
let mode = "pearson";
let regressionFit;
const storedRows = { pearson: null, regression: null };

const formula = document.querySelector("#symbolic-formula");
for (const container of document.querySelectorAll("[data-symbolic-formula]")) {
  container.append(formula.content.cloneNode(true));
}

function navigate(focusHeading = false) {
  const showCalculator = ["#pearson", "#regressao"].includes(location.hash);
  const nextMode = location.hash === "#regressao" ? "regression" : "pearson";
  if (showCalculator && nextMode !== mode) {
    storedRows[mode] = Array.from(pairTable.rows, row => Array.from(row.querySelectorAll("input"), input => input.value));
    mode = nextMode;
    preview = undefined;
    resetRows(storedRows[mode] ?? undefined);
  }
  document.querySelector("#calculator-title").textContent = mode === "regression"
    ? "Regressão Linear Simples" : "Correlação de Pearson";
  document.querySelector(".symbolic").hidden = mode === "regression";
  document.querySelector("#regression-display").hidden = mode !== "regression";
  home.hidden = showCalculator;
  calculator.hidden = !showCalculator;
  if (focusHeading) {
    window.scrollTo(0, 0);
    const section = showCalculator ? calculator : home;
    section.querySelector("h1").focus({ preventScroll: true });
  }
}

function message(text = "", error = false) {
  feedback.textContent = text;
  feedback.dataset.error = String(error);
}

function selectField(input) {
  if (selectedInput) delete selectedInput.dataset.selected;
  selectedInput = input;
  selectedInput.dataset.selected = "true";
  selectedLabel.textContent = input === predictionInput
    ? "X · estimativa"
    : `${input.dataset.axis} · par ${input.closest("tr").sectionRowIndex + 1}`;
  updateFormula();
}

function appendRow(values = ["", ""]) {
  const row = pairTable.insertRow();
  row.innerHTML = `<th scope="row"></th>
    <td><input type="text" inputmode="decimal" data-axis="X" placeholder="—" autocomplete="off" spellcheck="false"></td>
    <td><input type="text" inputmode="decimal" data-axis="Y" placeholder="—" autocomplete="off" spellcheck="false"></td>
    <td><button type="button" class="remove-button"><span aria-hidden="true">×</span></button></td>`;
  row.querySelectorAll("input").forEach((input, index) => { input.value = values[index]; });
  return row;
}

function labelRows() {
  for (const row of pairTable.rows) {
    const number = row.sectionRowIndex + 1;
    row.cells[0].textContent = number;
    for (const input of row.querySelectorAll("input")) {
      input.setAttribute("aria-label", `${input.dataset.axis} do par ${number}`);
    }
    const remove = row.querySelector("button");
    remove.setAttribute("aria-label", `Remover par ${number}`);
    remove.disabled = pairTable.rows.length === 1;
  }
}

function parseEntry(input) {
  const text = input.value.trim().replaceAll("−", "-");
  if (!text) return { state: "blank", input };
  const validNumber = /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:e[+-]?\d+)?$/i;
  if (validNumber.test(text)) {
    const value = Number(text.replace(",", "."));
    const mantissa = text.split(/[eE]/)[0];
    if (Number.isFinite(value) && (value !== 0 || !/[1-9]/.test(mantissa))) {
      return { state: "valid", input, value, text };
    }
  }
  return { state: "invalid", input };
}

function readRows() {
  const rows = Array.from(pairTable.rows, row => {
    const [x, y] = Array.from(row.querySelectorAll("input"), parseEntry);
    return { x, y };
  });
  const pairs = rows.filter(({ x, y }) => x.state === "valid" && y.state === "valid")
    .map(({ x, y }) => [x.value, y.value]);
  return { rows, pairs };
}

function updateFormula() {
  if (!preview) return;
  if (mode === "regression") {
    renderRegression(preview.rows, preview.stats, regressionFit);
    return;
  }
  const coefficient = result.querySelector("strong")?.textContent;
  renderFormula(preview.rows, preview.stats, coefficient);
}

function updatePreview() {
  const { rows, pairs } = readRows();
  const hasData = rows.some(({ x, y }) => x.state !== "blank" || y.state !== "blank");
  let stats;
  if (pearson && pairs.length > 0) {
    try {
      stats = mode === "regression" ? regression.analyze(pairs) : pearson(pairs);
    } catch {
      message("Não foi possível processar os pares. Reduza a quantidade de dados e tente novamente.", true);
    }
  }

  document.querySelector("#count").textContent = pairs.length;
  document.querySelector("#mean-x").textContent = formatAuxiliary(stats?.meanX);
  document.querySelector("#mean-y").textContent = formatAuxiliary(stats?.meanY);
  const previewNote = document.querySelector("#preview-note");
  if (!hasData) {
    previewNote.textContent = "Aguardando dados";
  } else if (pairs.length === 0) {
    previewNote.textContent = "Preencha X e Y para ver as médias";
  } else if (pairs.length < rows.length) {
    previewNote.textContent = "Médias parciais dos pares completos";
  } else {
    previewNote.textContent = "Valores exibidos podem estar arredondados";
  }

  preview = { rows, stats };
  updateFormula();
}

function dataChanged() {
  const needsCalculation = result.textContent || feedback.textContent === changedMessage;
  result.replaceChildren();
  regressionFit = undefined;
  predictionPanel.hidden = true;
  predictionInput.value = "";
  clearPrediction();
  if (selectedInput === predictionInput) selectField(pairTable.querySelector("input"));
  for (const input of pairTable.querySelectorAll("[aria-invalid]")) {
    input.removeAttribute("aria-invalid");
  }
  if (pearson) message(needsCalculation ? changedMessage : "");
  updatePreview();
}

function resetRows(values = [["", ""], ["", ""]]) {
  pairTable.replaceChildren();
  for (const pair of values) appendRow(pair);
  labelRows();
  regressionFit = undefined;
  predictionPanel.hidden = true;
  predictionInput.value = "";
  clearPrediction();
  selectField(pairTable.querySelector("input"));
  result.replaceChildren();
  if (pearson) message("");
  updatePreview();
}

function applyKey(key) {
  const input = selectedInput;
  const { value, selectionStart: start, selectionEnd: end } = input;
  if (key === "sign") {
    const prefix = value.match(/^\s*/)[0];
    const number = value.slice(prefix.length);
    const signed = /^[+−-]/.test(number);
    const negative = /^[-−]/.test(number);
    input.value = prefix + (negative ? number.slice(1) : `-${signed ? number.slice(1) : number}`);
    const shift = negative ? -1 : signed ? 0 : 1;
    const move = position => position < prefix.length ? position : Math.max(prefix.length, position + shift);
    input.setSelectionRange(move(start), move(end));
  } else if (key === "delete") {
    input.setRangeText("", start === end ? Math.max(0, start - 1) : start, end, "end");
  } else {
    const remainder = value.slice(0, start) + value.slice(end);
    if (key === "," && /[.,]/.test(remainder)) return;
    input.setRangeText(key, start, end, "end");
  }
  if (input.value !== value) {
    if (input === predictionInput) clearPrediction();
    else dataChanged();
  }
}

function calculate() {
  const { rows, pairs } = readRows();
  result.replaceChildren();
  updateFormula();
  const invalidFields = rows.flatMap(({ x, y }) => [x, y]).filter(entry => entry.state !== "valid");
  if (invalidFields.length) {
    for (const { input } of invalidFields) input.setAttribute("aria-invalid", "true");
    const invalid = invalidFields.find(entry => entry.state === "invalid");
    const { input } = invalid ?? invalidFields[0];
    const number = input.closest("tr").sectionRowIndex + 1;
    const axis = input.dataset.axis;
    if (invalid) {
      message(`Digite um número finito em ${axis} do par ${number}, como −2,5 ou 0.`, true);
    } else if (pairs.length < 2) {
      message(`Preencha pelo menos dois pares completos. Falta ${axis} no par ${number}.`, true);
    } else {
      message(`Preencha ${axis} do par ${number} ou remova essa linha.`, true);
    }
    selectField(input);
    input.closest(".observation-scroll").scrollTop = input.closest("tr").offsetTop - pairTable.offsetTop;
    return;
  }

  let stats;
  try {
    stats = mode === "regression" ? regression.analyze(pairs, true) : pearson(pairs, true);
  } catch {
    message("Não foi possível processar os pares. Reduza a quantidade de dados e tente novamente.", true);
    return;
  }
  const validResult = mode === "regression"
    ? stats.a != null && stats.b != null : stats.coefficient != null;
  if (stats.status !== PearsonStatus.OK || !validResult) {
    const constantX = mode === "regression" && stats.status === PearsonStatus.CONSTANT_X;
    message(constantX
      ? "Não há variação suficiente em X para determinar a reta. Informe valores diferentes de X."
      : statusMessages[stats.status] ?? statusMessages[PearsonStatus.NUMERIC_ERROR], true);
    return;
  }

  message();
  if (mode === "regression") {
    regressionFit = stats;
    predictionPanel.hidden = false;
    clearPrediction();
    result.innerHTML = `
      <div class="fit-values"><span>a = <strong>${formatFinal(stats.a)}</strong></span><span>b = <strong>${formatFinal(stats.b)}</strong></span></div>
      <p class="fit-explanation">a indica a variação estimada de Y para cada unidade adicional de X. b é o valor previsto de Y quando X = 0.</p>`;
    updateFormula();
    document.querySelector(".regression-final").scrollIntoView({ block: "nearest" });
    return;
  }
  const formatted = formatFinal(stats.coefficient);
  const value = document.createElement("strong");
  value.textContent = formatted;
  result.append("Resultado de r =", value);
  updateFormula();
  document.querySelector(".symbolic").scrollIntoView({ block: "center" });
}

function clearPrediction() {
  document.querySelector("#prediction-result").replaceChildren();
  predictionFeedback.textContent = "";
  predictionFeedback.dataset.error = "false";
  predictionInput.removeAttribute("aria-invalid");
  document.querySelector("#extrapolation-warning").hidden = true;
}

function predict(event) {
  event.preventDefault();
  clearPrediction();
  if (!regressionFit) return;
  const entry = parseEntry(predictionInput);
  if (entry.state !== "valid") {
    predictionFeedback.textContent = "Digite um valor numérico finito de X para estimar Y.";
    predictionFeedback.dataset.error = "true";
    predictionInput.setAttribute("aria-invalid", "true");
    selectField(predictionInput);
    return;
  }
  let prediction;
  try {
    prediction = regression.predict(regressionFit, entry.value);
  } catch {
    predictionFeedback.textContent = "Não foi possível estimar Y. Tente novamente.";
    predictionFeedback.dataset.error = "true";
    return;
  }
  if (prediction.status !== PearsonStatus.OK || prediction.value == null) {
    predictionFeedback.textContent = "Os valores excederam a precisão disponível para a previsão. Revise a escala de X.";
    predictionFeedback.dataset.error = "true";
    return;
  }
  renderPrediction(regressionFit, entry, prediction.value);
  const warning = document.querySelector("#extrapolation-warning");
  warning.hidden = !prediction.outside;
  const predictionTarget = prediction.outside ? warning : document.querySelector("#prediction-result");
  predictionTarget.scrollIntoView({ block: "nearest" });
}

pairTable.addEventListener("focusin", event => {
  if (event.target.matches("input")) selectField(event.target);
});
pairTable.addEventListener("input", event => {
  selectField(event.target);
  dataChanged();
});
pairTable.addEventListener("click", event => {
  const button = event.target.closest(".remove-button");
  if (!button) return;
  const row = button.closest("tr");
  const index = row.sectionRowIndex;
  row.remove();
  labelRows();
  const remainingRow = pairTable.rows[Math.min(index, pairTable.rows.length - 1)];
  selectField(selectedInput.isConnected ? selectedInput : remainingRow.querySelector("input"));
  if (event.detail === 0) selectedInput.focus({ preventScroll: true });
  dataChanged();
});

document.querySelector("#add").addEventListener("click", () => {
  const row = appendRow();
  labelRows();
  selectField(row.querySelector("input"));
  selectedInput.focus();
  dataChanged();
});
document.querySelector("#clear").addEventListener("click", () => resetRows());
predictionInput.addEventListener("focus", () => selectField(predictionInput));
predictionInput.addEventListener("input", clearPrediction);
document.querySelector("#prediction-form").addEventListener("submit", predict);
const keys = document.querySelector(".keys");
keys.addEventListener("pointerdown", event => {
  if (event.pointerType === "mouse" && document.activeElement === selectedInput) {
    event.preventDefault();
  }
});
keys.addEventListener("click", event => {
  const key = event.target.closest("[data-key]");
  if (key) applyKey(key.dataset.key);
});
calculateButton.addEventListener("click", calculate);
window.addEventListener("hashchange", () => navigate(true));

resetRows();
navigate();
message("Carregando módulo de cálculo…");
try {
  pearson = await loadPearson();
  regression = await loadRegression();
  calculateButton.disabled = false;
  message();
  updatePreview();
} catch (error) {
  message(moduleError, true);
  console.error(error);
}
