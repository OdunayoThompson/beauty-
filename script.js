const WHATSAPP_NUMBER = "2347040621753";

const BOOKING_EMAIL = "odunayothompson792@gmail.com";

function buildWaLink(prefillText) {
  const text = encodeURIComponent(
    prefillText ||
      "Hi Jen Esthediks Beauty Studio, I'd like to book an appointment.",
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

// Static WhatsApp entry points (nav, hero, footer, floating button)
const defaultMsg =
  "Hi Jen Esthediks Beauty Studio, I'd like to book an appointment.";
["heroWaBtn", "footerWaBtn", "floatWaBtn"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.href = buildWaLink(defaultMsg);
});

// Build the WhatsApp message from the live form fields
const form = document.getElementById("bookingForm");
const formWaBtn = document.getElementById("formWaBtn");
const fields = form.elements;
const bookingFields = document.getElementById("bookingFields");
const bookingStatus = document.getElementById("bookingStatus");
let sending = false;

function validateBooking() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map(({ type, value }) => [type, value]),
  );
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const now = `${parts.hour}:${parts.minute}`;
  const date = fields.Date.value;
  const time = fields.Time.value;
  fields.Date.min = today;

  fields.Name.setCustomValidity(
    fields.Name.value && !fields.Name.value.trim() ? "Enter your name." : "",
  );
  const phone = fields.Phone.value.trim();
  const digits = phone.replace(/\D/g, "");
  const validPhone = /^\+?[\d\s().-]+$/.test(phone) &&
    (!phone.startsWith("+") && digits.startsWith("0") ? /^0[789]\d{9}$/.test(digits) : /^[1-9]\d{7,14}$/.test(digits));
  fields.Phone.setCustomValidity(
    phone && validPhone ? "" : fields.Phone.value ? "Enter an 11-digit Nigerian number or an international number, such as +234 803 000 0000." : "",
  );

  let dateError = "";
  if (date && date < today) dateError = "Choose today or a future date, using Lagos time.";
  else if (date && new Date(`${date}T12:00:00Z`).getUTCDay() === 1) dateError = "The studio is closed on Mondays. Choose Tuesday to Sunday.";
  else if (date === today && now >= "20:00") dateError = "The studio has closed for today. Choose a future date.";
  fields.Date.setCustomValidity(dateError);

  let timeError = "";
  if (time && (time < "08:00" || time > "20:00")) timeError = "Choose a time between 8am and 8pm, Lagos time.";
  else if (time && date === today && time <= now) timeError = "Choose a time later than the current time in Lagos.";
  fields.Time.setCustomValidity(timeError);
}

function updateFormWaLink() {
  const name = fields.Name.value.trim();
  const phone = fields.Phone.value.trim();
  const email = fields.Email.value.trim();
  const service = fields.Service.value;
  const date = fields.Date.value;
  const time = fields.Time.value;
  const notes = fields.Notes.value.trim();

  let msg =
    "Hi Jen Esthediks Beauty Studio, I'd like to book an appointment.\n";
  if (name) msg += `Name: ${name}\n`;
  if (phone) msg += `Phone: ${phone}\n`;
  if (email) msg += `Email: ${email}\n`;
  if (service) msg += `Service: ${service}\n`;
  if (date) msg += `Date: ${date}\n`;
  if (time) msg += `Time: ${time} (Lagos, UTC+1)\n`;
  if (notes) msg += `Notes: ${notes}\n`;

  formWaBtn.href = buildWaLink(msg);
}
form.addEventListener("input", () => {
  validateBooking();
  updateFormWaLink();
});
form.addEventListener("focusin", validateBooking);
window.addEventListener("focus", validateBooking);
formWaBtn.addEventListener("click", (event) => {
  if (sending) {
    event.preventDefault();
    return;
  }
  validateBooking();
  // Partial WhatsApp requests are allowed, but supplied values must be valid.
  const invalid = Array.from(fields).find((field) => field.value && !field.checkValidity());
  if (invalid) {
    event.preventDefault();
    invalid.reportValidity();
    return;
  }
  updateFormWaLink();
});
validateBooking();
updateFormWaLink();

// -------------------- confirmation popup --------------------
const popupOverlay = document.getElementById("popupOverlay");
const popupIcon = document.getElementById("popupIcon");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupOk = document.getElementById("popupOk");
const popupClose = document.getElementById("popupClose");
let popupReturnFocus;

function showPopup(kind, title, message) {
  popupOverlay.classList.remove("err");
  if (kind === "err") popupOverlay.classList.add("err");
  popupIcon.innerHTML =
    kind === "err"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16" x2="12.01" y2="16"></line><circle cx="12" cy="12" r="9"></circle></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popupReturnFocus = document.activeElement;
  popupOverlay.showModal();
  popupOk.focus();
}
function hidePopup() {
  popupOverlay.close();
}

popupOk.addEventListener("click", hidePopup);
popupClose.addEventListener("click", hidePopup);
popupOverlay.addEventListener("click", (e) => {
  if (e.target === popupOverlay) hidePopup();
});
popupOverlay.addEventListener("close", () => {
  if (popupReturnFocus?.isConnected) popupReturnFocus.focus();
});

// -------------------- send booking  --------------------
const submitBtn = form.querySelector('button[type="submit"]');
const submitBtnDefaultText = submitBtn.textContent;
submitBtn.addEventListener("click", validateBooking);

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  if (sending || fields._honey.value) return;
  validateBooking();
  if (!form.reportValidity()) return;

  // Capture the payload before disabling the controls.
  const payload = Object.fromEntries(new FormData(form));
  for (const key of ["Name", "Phone", "Email", "Notes"]) payload[key] = payload[key].trim();
  if (payload.Time) payload.Time += " (Lagos, UTC+1)";
  sending = true;
  bookingFields.disabled = true;
  form.setAttribute("aria-busy", "true");
  formWaBtn.setAttribute("aria-disabled", "true");
  submitBtn.textContent = "Sending...";
  bookingStatus.textContent = "Sending your booking request. Please wait.";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let result;

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${BOOKING_EMAIL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      /* non-JSON response, handled below */
    }

    if (res.ok && (data?.success === true || data?.success === "true")) {
      result = [
        "ok",
        "Booking request sent",
        "Your request has been sent to the studio. We'll confirm your exact time shortly.",
      ];
      form.reset();
      validateBooking();
      updateFormWaLink();
    } else {
      throw new Error("Booking request could not be delivered");
    }
  } catch (err) {
    result = [
      "err",
      controller.signal.aborted ? "Request timed out" : "Couldn't confirm delivery",
      "We couldn't confirm that your request reached the studio. Your details are still here. If you retry or contact us on WhatsApp, mention this attempt so we can check for duplicates.",
    ];
  } finally {
    clearTimeout(timeout);
    sending = false;
    bookingFields.disabled = false;
    form.removeAttribute("aria-busy");
    formWaBtn.removeAttribute("aria-disabled");
    submitBtn.textContent = submitBtnDefaultText;
    bookingStatus.textContent = "";
  }
  showPopup(...result);
});
