/
  const WHATSAPP_NUMBER = "2347040621753";

  // ============================================================
  const BOOKING_EMAIL = "odunayothompson792@gmail.com";

  function buildWaLink(prefillText){
    const text = encodeURIComponent(prefillText || "Hi Jen Esthediks Beauty Studio, I'd like to book an appointment.");
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  }

  // Static WhatsApp entry points (nav, hero, footer, floating button)
  const defaultMsg = "Hi Jen Esthediks Beauty Studio, I'd like to book an appointment.";
  ["heroWaBtn","footerWaBtn","floatWaBtn"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.href = buildWaLink(defaultMsg);
  });

  // Slip number, purely cosmetic
  document.getElementById("slipNo").textContent = String(Math.floor(1000 + Math.random()*9000));

  // Build the WhatsApp message from the live form fields
  const form = document.getElementById("bookingForm");
  const formWaBtn = document.getElementById("formWaBtn");

  function updateFormWaLink(){
    const name = form.Name.value.trim();
    const phone = form.Phone.value.trim();
    const service = form.Service.value;
    const date = form.Date.value;
    const time = form.Time.value;
    const notes = form.Notes.value.trim();

    let msg = "Hi Jen Esthediks Beauty Studio, I'd like to book an appointment.\n";
    if(name) msg += `Name: ${name}\n`;
    if(phone) msg += `Phone: ${phone}\n`;
    if(service) msg += `Service: ${service}\n`;
    if(date) msg += `Date: ${date}\n`;
    if(time) msg += `Time: ${time}\n`;
    if(notes) msg += `Notes: ${notes}\n`;

    formWaBtn.href = buildWaLink(msg);
  }
  form.addEventListener("input", updateFormWaLink);
  updateFormWaLink();

  // -------------------- confirmation popup --------------------
  const popupOverlay = document.getElementById("popupOverlay");
  const popupIcon = document.getElementById("popupIcon");
  const popupTitle = document.getElementById("popupTitle");
  const popupMessage = document.getElementById("popupMessage");
  const popupOk = document.getElementById("popupOk");
  const popupClose = document.getElementById("popupClose");

  function showPopup(kind, title, message){
    popupOverlay.classList.remove("err");
    if(kind === "err") popupOverlay.classList.add("err");
    popupIcon.innerHTML = kind === "err"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16" x2="12.01" y2="16"></line><circle cx="12" cy="12" r="9"></circle></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    popupTitle.textContent = title;
    popupMessage.textContent = message;
    popupOverlay.classList.add("show");
    popupOk.focus();
  }
  function hidePopup(){ popupOverlay.classList.remove("show"); }

  popupOk.addEventListener("click", hidePopup);
  popupClose.addEventListener("click", hidePopup);
  popupOverlay.addEventListener("click", (e)=>{ if(e.target === popupOverlay) hidePopup(); });
  document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") hidePopup(); });

  // -------------------- send booking  --------------------
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitBtnDefaultText = submitBtn.textContent;

  form.addEventListener("submit", async function(e){
    e.preventDefault();g

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try{
      const payload = {
        Name: form.Name.value.trim(),
        Phone: form.Phone.value.trim(),
        Email: form.Email.value.trim(),
        Service: form.Service.value,
        Date: form.Date.value,
        Time: form.Time.value,
        Notes: form.Notes.value.trim(),
        _subject: "New booking request — Jen Esthediks Beauty Studio",
        _template: "table",
        _captcha: "false"
      };

      const res = await fetch(`https://formsubmit.co/ajax/${BOOKING_EMAIL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });

      let data = null;
      try{ data = await res.json(); } catch(_){ /* non-JSON response, handled below */ }

      if(res.ok && data){
        showPopup("ok", "Booking confirmed", "Thank you — your booking request has been sent to the studio. We'll confirm your exact time shortly.");
        form.reset();
        updateFormWaLink();
        document.getElementById("slipNo").textContent = String(Math.floor(1000 + Math.random()*9000));
      } else {
        throw new Error("Booking request could not be delivered");
      }
    } catch(err){
      showPopup("err", "Couldn't send that", "Something went wrong sending your request. Please try again, or tap \u201cContinue on WhatsApp instead\u201d below to reach us directly.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtnDefaultText;
    }
  });

  // Reveal-on-scroll
  const revealEls = document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el=>io.observe(el));
  } else {
    revealEls.forEach(el=>el.classList.add("in"));
  }
