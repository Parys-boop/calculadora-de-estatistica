// Entrada e edição compartilhadas pelas calculadoras.
export function parseEntry(input) {
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

export function editNumber(input, key) {
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
    if (key === "," && /[.,]/.test(remainder)) return false;
    input.setRangeText(key, start, end, "end");
  }
  return input.value !== value;
}

// Rejeita também frações que Number arredondaria para um inteiro (ex.: 30,0000000000000001).
export function isExactCount(entry) {
  if (entry.state !== "valid" || !Number.isSafeInteger(entry.value) || entry.value < 0) return false;
  const [mantissa, exponent = "0"] = entry.text.replace(",", ".").split(/[eE]/);
  const decimals = mantissa.split(".")[1]?.length ?? 0;
  const fractionalDigits = decimals - Number(exponent);
  const digits = mantissa.replace(/^[+-]/, "").replace(".", "");
  return fractionalDigits <= 0 ||
    (fractionalDigits <= digits.length && /^0*$/.test(digits.slice(-fractionalDigits)));
}

export function isExactSampleSize(entry) {
  return isExactCount(entry) && entry.value > 0;
}

export function attachNumericKeypad(host, prefix, onEdit) {
  const keypad = document.querySelector("#calculator .keypad").cloneNode(true);
  for (const element of keypad.querySelectorAll("[id]")) element.id = `${prefix}-${element.id}`;
  keypad.setAttribute("aria-labelledby", `${prefix}-keypad-title`);
  host.append(keypad);

  const selectedLabel = keypad.querySelector(`#${prefix}-selected-field`);
  let selectedInput;
  const keys = keypad.querySelector(".keys");
  keys.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && document.activeElement === selectedInput) event.preventDefault();
  });
  keys.addEventListener("click", event => {
    const key = event.target.closest("[data-key]");
    if (key && editNumber(selectedInput, key.dataset.key)) onEdit(selectedInput);
  });
  return {
    calculateButton: keypad.querySelector(".calculate-button"),
    selectField(input) {
      if (selectedInput) delete selectedInput.dataset.selected;
      selectedInput = input;
      selectedInput.dataset.selected = "true";
      selectedLabel.textContent = input.dataset.fieldName;
    },
  };
}
