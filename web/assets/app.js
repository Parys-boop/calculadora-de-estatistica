import { formatAuxiliary, renderSubstitution } from "./display.js";
import { loadPearson, PearsonStatus } from "./pearson.js";

const home = document.querySelector("#home");
const calculator = document.querySelector("#calculator");
const pairTable = document.querySelector("#pairs");
const calculateButton = document.querySelector("#calculate");
const feedback = document.querySelector("#feedback");
const result = document.querySelector("#result");
const selectedLabel = document.querySelector("#selected-field");
const finalNumber = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 4, maximumFractionDigits: 4,
});

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
let selectedInput;

const formula = document.querySelector("#symbolic-formula");
for (const container of document.querySelectorAll("[data-symbolic-formula]")) {
  container.append(formula.content.cloneNode(true));
}

function navigate(focusHeading = false) {
  const showCalculator = location.hash === "#pearson";
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
  selectedLabel.textContent = `${input.dataset.axis} · par ${input.closest("tr").sectionRowIndex + 1}`;
}

function appendRow() {
  const row = pairTable.insertRow();
  row.innerHTML = `<th scope="row"></th>
    <td><input type="text" inputmode="decimal" data-axis="X" placeholder="—" autocomplete="off" spellcheck="false"></td>
    <td><input type="text" inputmode="decimal" data-axis="Y" placeholder="—" autocomplete="off" spellcheck="false"></td>
    <td><button type="button" class="remove-button"><span aria-hidden="true">×</span></button></td>`;
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

function updatePreview() {
  const { rows, pairs } = readRows();
  const hasData = rows.some(({ x, y }) => x.state !== "blank" || y.state !== "blank");
  let stats;
  if (pearson && pairs.length > 0) {
    try {
      stats = pearson(pairs);
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
    previewNote.textContent = "Prévia com os pares completos";
  } else {
    previewNote.textContent = "Valores exibidos podem estar arredondados";
  }

  document.querySelector("#substitution").hidden = !hasData;
  if (hasData) renderSubstitution(rows, stats, pairs.length);
}

function dataChanged() {
  const needsCalculation = result.textContent || feedback.textContent === changedMessage;
  result.replaceChildren();
  for (const input of pairTable.querySelectorAll("[aria-invalid]")) {
    input.removeAttribute("aria-invalid");
  }
  if (pearson) message(needsCalculation ? changedMessage : "");
  updatePreview();
}

function resetRows() {
  pairTable.replaceChildren();
  appendRow();
  appendRow();
  labelRows();
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
  if (input.value !== value) dataChanged();
}

function calculate() {
  const { rows, pairs } = readRows();
  result.replaceChildren();
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
    stats = pearson(pairs, true);
  } catch {
    message("Não foi possível processar os pares. Reduza a quantidade de dados e tente novamente.", true);
    return;
  }
  if (stats.status !== PearsonStatus.OK || stats.coefficient == null) {
    message(statusMessages[stats.status] ?? statusMessages[PearsonStatus.NUMERIC_ERROR], true);
    return;
  }

  message();
  const roundedZero = Math.abs(stats.coefficient) < 0.00005;
  const formatted = finalNumber.format(roundedZero ? 0 : stats.coefficient).replace("-", "−");
  const value = document.createElement("strong");
  value.textContent = formatted;
  result.append("Resultado de r =", value);
  result.scrollIntoView({ block: "nearest" });
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
document.querySelector("#clear").addEventListener("click", resetRows);
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
  calculateButton.disabled = false;
  message();
  updatePreview();
} catch (error) {
  message(moduleError, true);
  console.error(error);
}
