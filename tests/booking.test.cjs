const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");

const source = readFileSync(require.resolve("../script.js"), "utf8");

function setup({ response = { success: "true" }, ok = true, fetchImpl, now = "2026-10-20T12:00:00Z" } = {}) {
  const nodes = {};
  const document = { activeElement: null };
  function element(value = "") {
    return {
      value, textContent: "", listeners: {}, attributes: {}, isConnected: true,
      classList: { add() {}, remove() {} },
      addEventListener(event, fn) { this.listeners[event] = fn; },
      setAttribute(key, value) { this.attributes[key] = value; },
      removeAttribute(key) { delete this.attributes[key]; },
      setCustomValidity(message) { this.error = message; },
      checkValidity() { return !this.error && (!this.required || Boolean(this.value)); },
      reportValidity() { this.reported = true; return this.checkValidity(); },
      focus() { document.activeElement = this; },
    };
  }
  for (const id of ["heroWaBtn", "footerWaBtn", "floatWaBtn", "formWaBtn", "popupOverlay", "popupIcon", "popupTitle", "popupMessage", "popupOk", "popupClose", "bookingFields", "bookingStatus"]) nodes[id] = element();
  const form = nodes.bookingForm = element();
  const defaults = {
    Name: "Test User", Phone: "08030000000", Email: "test@example.com",
    Service: "Hair Making", Date: "2026-10-21", Time: "10:00", Notes: "Original notes",
    _subject: "New booking request", _template: "table", _honey: "",
  };
  const fields = [];
  for (const [name, value] of Object.entries(defaults)) {
    const field = element(value);
    field.name = name;
    field.required = ["Name", "Phone", "Service", "Date"].includes(name);
    fields.push(field);
    fields[name] = field;
  }
  form.elements = fields;
  form.reset = () => { for (const field of fields) field.value = ""; };
  form.reportValidity = () => fields.every((field) => field.checkValidity());
  const submitBtn = element();
  submitBtn.textContent = "Send booking request";
  form.querySelector = () => submitBtn;
  nodes.popupOverlay.showModal = () => { nodes.popupOverlay.open = true; };
  nodes.popupOverlay.close = () => {
    nodes.popupOverlay.open = false;
    nodes.popupOverlay.listeners.close?.();
  };
  document.getElementById = (id) => nodes[id];
  document.activeElement = submitBtn;
  const calls = [];
  let timeout, cleared = false;
  const fetch = async (...args) => {
    calls.push(args);
    return fetchImpl ? fetchImpl(...args) : { ok, json: async () => response };
  };
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
  }
  class FormData {
    constructor() { this.entries = fields.map(({ name, value }) => [name, value]); }
    [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
  }
  vm.runInNewContext(source, {
    document, window: { addEventListener() {} }, fetch, FormData,
    Date: FixedDate, Intl, AbortController, encodeURIComponent,
    setTimeout(fn, ms) { assert.equal(ms, 15000); timeout = fn; return 1; },
    clearTimeout() { cleared = true; },
  });
  return {
    fields, nodes, calls, submitBtn,
    submit: () => form.listeners.submit({ preventDefault() {} }),
    input: () => form.listeners.input(),
    timeout: () => timeout(),
    timerCleared: () => cleared,
    whatsApp: () => {
      const event = { prevented: false, preventDefault() { this.prevented = true; } };
      nodes.formWaBtn.listeners.click(event);
      return event;
    },
  };
}

for (const response of [{ success: false }, { success: "false" }, {}, null]) {
  test(`rejected or missing success preserves input: ${JSON.stringify(response)}`, async () => {
    const app = setup({ response });
    await app.submit();
    assert.equal(app.nodes.popupTitle.textContent, "Couldn't confirm delivery");
    assert.equal(app.fields.Name.value, "Test User");
    assert.equal(app.nodes.bookingFields.disabled, false);
    assert.equal(app.timerCleared(), true);
  });
}

for (const success of [true, "true"]) {
  test(`explicit success clears form and says request sent: ${success}`, async () => {
    const app = setup({ response: { success } });
    await app.submit();
    assert.equal(app.nodes.popupTitle.textContent, "Booking request sent");
    assert.equal(app.fields.Name.value, "");
    assert.equal(app.nodes.bookingFields.disabled, false);
    assert.equal(app.nodes.popupOverlay.open, true);
    const payload = JSON.parse(app.calls[0][1].body);
    assert.equal(payload.Email, "test@example.com");
    assert.equal(payload.Time, "10:00 (Lagos, UTC+1)");
    assert.equal(payload._honey, "");
    assert.equal(payload._captcha, undefined);
  });
}

test("HTTP and network errors preserve input", async () => {
  for (const options of [{ ok: false }, { fetchImpl: async () => { throw Error("offline"); } }]) {
    const app = setup(options);
    await app.submit();
    assert.equal(app.fields.Notes.value, "Original notes");
    assert.equal(app.nodes.popupTitle.textContent, "Couldn't confirm delivery");
    assert.equal(app.nodes.bookingFields.disabled, false);
  }
});

test("malformed JSON does not clear input", async () => {
  const app = setup({ fetchImpl: async () => ({ ok: true, json: async () => { throw SyntaxError(); } }) });
  await app.submit();
  assert.equal(app.fields.Name.value, "Test User");
  assert.equal(app.nodes.popupTitle.textContent, "Couldn't confirm delivery");
});

test("pending request locks editing and prevents duplicate submission", async () => {
  let finish;
  const app = setup({ fetchImpl: () => new Promise((resolve) => { finish = resolve; }) });
  const pending = app.submit();
  assert.equal(app.nodes.bookingFields.disabled, true);
  assert.equal(app.nodes.bookingForm.attributes["aria-busy"], "true");
  assert.equal(app.whatsApp().prevented, true);
  await app.submit();
  assert.equal(app.calls.length, 1);
  finish({ ok: true, json: async () => ({ success: "true" }) });
  await pending;
  assert.equal(app.nodes.bookingFields.disabled, false);
  assert.equal(app.nodes.formWaBtn.attributes["aria-disabled"], undefined);
});

test("timeout unlocks form and preserves details", async () => {
  const app = setup({ fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(Error("aborted")));
  }) });
  const pending = app.submit();
  app.timeout();
  await pending;
  assert.equal(app.nodes.popupTitle.textContent, "Request timed out");
  assert.equal(app.nodes.bookingFields.disabled, false);
  assert.equal(app.fields.Name.value, "Test User");
  assert.equal(app.timerCleared(), true);
});

for (const [field, value] of [
  ["Name", "   "], ["Phone", "   "], ["Phone", "not a phone"],
  ["Phone", "0803"], ["Phone", "+08030000000"], ["Date", "2026-10-19"],
  ["Date", "2026-10-26"], ["Time", "07:59"], ["Time", "20:01"],
]) {
  test(`invalid ${field} blocks email and WhatsApp: ${JSON.stringify(value)}`, async () => {
    const app = setup();
    app.fields[field].value = value;
    app.input();
    await app.submit();
    assert.equal(app.calls.length, 0);
    assert.ok(app.fields[field].error);
    assert.equal(app.whatsApp().prevented, true);
  });
}

test("phone formatting accepts Nigerian and international numbers", () => {
  const app = setup();
  for (const phone of ["0803 000 0000", "+234 (803) 000-0000", "+44 20 7946 0958"]) {
    app.fields.Phone.value = phone;
    app.input();
    assert.equal(app.fields.Phone.error, "");
  }
});

test("Lagos time rejects elapsed times and today's date after closing", () => {
  const app = setup();
  app.fields.Date.value = "2026-10-20";
  app.fields.Time.value = "13:00";
  app.input();
  assert.ok(app.fields.Time.error);
  app.fields.Time.value = "13:01";
  app.input();
  assert.equal(app.fields.Time.error, "");
  const closed = setup({ now: "2026-10-20T19:00:00Z" });
  closed.fields.Date.value = "2026-10-20";
  closed.input();
  assert.ok(closed.fields.Date.error);
});

test("minimum date follows Lagos midnight, not UTC", () => {
  const app = setup({ now: "2026-10-20T23:30:00Z" });
  assert.equal(app.fields.Date.min, "2026-10-21");
});

test("WhatsApp includes email and supports partial requests", () => {
  const app = setup();
  assert.ok(decodeURIComponent(app.nodes.formWaBtn.href).includes("Email: test@example.com"));
  app.fields.Name.value = "";
  app.fields.Phone.value = "";
  app.fields.Service.value = "";
  app.fields.Date.value = "";
  app.fields.Time.value = "";
  app.input();
  assert.equal(app.whatsApp().prevented, false);
});

test("honeypot prevents submission", async () => {
  const app = setup();
  app.fields._honey.value = "spam";
  await app.submit();
  assert.equal(app.calls.length, 0);
});

test("closing dialog restores focus", async () => {
  const app = setup();
  const focus = app.submitBtn.focus;
  app.submitBtn.focus = () => { app.submitBtn.restored = true; focus(); };
  await app.submit();
  app.nodes.popupOk.listeners.click();
  assert.equal(app.nodes.popupOverlay.open, false);
  assert.equal(app.submitBtn.restored, true);
});

test("opening time, closing time and no preferred time remain valid", async () => {
  for (const time of ["08:00", "20:00", ""]) {
    const app = setup();
    app.fields.Time.value = time;
    app.input();
    await app.submit();
    assert.equal(app.calls.length, 1);
    assert.equal(app.nodes.popupTitle.textContent, "Booking request sent");
  }
});
