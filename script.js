const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function showToast(message) {
  let toast = $("#mpdo-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "mpdo-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("is-show");

  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => toast.classList.remove("is-show"), 2400);
}

function startPhilippineClock() {
  const clockEl = $("#clock");
  const dateEl = $("#date");
  if (!clockEl || !dateEl) return;

  const update = () => {
    const now = new Date();

    const timeFmt = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    clockEl.textContent = timeFmt.format(now);

    const dateFmt = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    dateEl.textContent = dateFmt.format(now);
  };

  update();
  setInterval(update, 1000);
}

function setupActiveNavHighlight() {
  const navLinks = $$(".nav-link[href^='#']");
  if (!navLinks.length) return;

  const targets = navLinks
    .map((a) => {
      const hash = a.getAttribute("href") || "";
      const id = hash.replace("#", "");
      if (!id) return null;
      const el = document.getElementById(id);
      return el ? { link: a, el } : null;
    })
    .filter(Boolean);

  if (!targets.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      // Pick the most-visible intersecting section.
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
      if (!visible) return;

      const found = targets.find((t) => t.el === visible.target);
      if (!found) return;

      navLinks.forEach((l) => l.classList.remove("is-active"));
      found.link.classList.add("is-active");
    },
    { threshold: [0.2, 0.35, 0.5], rootMargin: "-20% 0px -65% 0px" }
  );

  targets.forEach((t) => io.observe(t.el));
}

function setupServiceInteractions() {
  const cards = $$(".service-card[data-service]");
  cards.forEach((card) => {
    card.addEventListener("click", (e) => {
      const serviceName = card.getAttribute("data-service") || "Service";
      showToast(`Opening ${serviceName}...`);
    });
  });
}

function setupDemoFormHandlers() {
  const genericForms = $$("main form");

  genericForms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const formTitle =
        (form.querySelector("h2.section-title")?.textContent || "").trim() ||
        (form.querySelector("h2")?.textContent || "").trim() ||
        "Request";

      showToast(`${formTitle} submitted (demo).`);
    });
  });
}

startPhilippineClock();

// Multi-page routing + wizard logic is below.

function toManilaDateParts(date) {
  // Uses an explicit IANA timezone to avoid local-OS differences.
  const timeString = date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const dateString = date.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  return { timeString, dateString };
}

function updateClock() {
  const now = new Date();
  const { timeString, dateString } = toManilaDateParts(now);

  const clockEl = document.getElementById("clock");
  const dateEl = document.getElementById("date");
  if (clockEl) clockEl.textContent = timeString;
  if (dateEl) dateEl.textContent = dateString;
}

// Smooth scroll for internal anchors.
function setupSmoothScrolling() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='#']");
    if (!link) return;

    // Let the Create Account modal handle these clicks.
    if (link.getAttribute("data-action") === "open-create-account") return;

    const id = link.getAttribute("href");
    if (!id || id === "#") return;

    const target = document.querySelector(id);
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.pushState(null, "", id);
  });
}

// (Clock is handled by `startPhilippineClock()` above. Smooth-scrolling is disabled
// because we use hash-based page switching.)

// Create Account modal
(() => {
  const modal = $("#create-account-modal");
  if (!modal) return;
  const birthdayInput = modal.querySelector('input[name="birthday"]');
  const birthdayTrigger = modal.querySelector(".date-field-trigger");

  const feedbackEl = $("#register-feedback");
  const setFeedback = (msg) => {
    if (!feedbackEl) return;
    if (!msg) {
      feedbackEl.textContent = "";
      feedbackEl.classList.remove("is-show");
      return;
    }
    feedbackEl.textContent = msg;
    feedbackEl.classList.add("is-show");
  };

  const setOpen = (isOpen) => {
    modal.classList.toggle("is-open", isOpen);
    modal.setAttribute("aria-hidden", String(!isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  };

  const open = () => {
    setOpen(true);
    const first = modal.querySelector('input[name="fullName"]');
    if (first) first.focus();
    setFeedback("");
  };

  const setupBirthdayMaxDate = () => {
    if (!birthdayInput) return;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const today = `${yyyy}-${mm}-${dd}`;
    birthdayInput.setAttribute("max", today);
  };
  setupBirthdayMaxDate();

  if (birthdayTrigger && birthdayInput) {
    birthdayTrigger.addEventListener("click", () => {
      if (typeof birthdayInput.showPicker === "function") {
        birthdayInput.showPicker();
      } else {
        birthdayInput.focus();
        birthdayInput.click();
      }
    });
  }

  const close = () => {
    setFeedback("");
    setOpen(false);
  };

  const modalForm = modal.querySelector("form");
  const setupPasswordVisibilityToggles = () => {
    const toggles = modal.querySelectorAll("[data-toggle-password]");
    toggles.forEach((btn) => {
      const inputName = btn.getAttribute("data-toggle-password");
      const input = inputName ? modal.querySelector(`input[name="${inputName}"]`) : null;
      if (!input) return;

      btn.addEventListener("click", () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.classList.toggle("is-active", show);
      });
    });
  };
  setupPasswordVisibilityToggles();

  if (modalForm) {
    modalForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const fd = new FormData(modalForm);
      const fullName = String(fd.get("fullName") || "");
      const email = String(fd.get("email") || "");
      const birthday = String(fd.get("birthday") || "");
      const password = String(fd.get("password") || "");
      const repeatPassword = String(fd.get("repeatPassword") || "");
      const agreeTermsEl = modal.querySelector('input[name="agreeTerms"]');
      const agreeTerms = !!(agreeTermsEl && agreeTermsEl.checked);

      const commonWords = [
        "password",
        "admin",
        "welcome",
        "qwerty",
        "letmein",
        "123456",
        "12345678",
        "123456789",
        "mpdo",
        "alubijid",
      ];

      const lowerRe = /[a-z]/;
      const upperRe = /[A-Z]/;
      const numberRe = /[0-9]/;
      const symbolRe = /[^A-Za-z0-9]/;

      const normalized = {
        fullName: fullName.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password: password,
      };

      // Birthday cannot be in the future.
      if (birthday) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const maxDate = `${yyyy}-${mm}-${dd}`;
        if (birthday > maxDate) {
          setFeedback("Birthday cannot be a future date.");
          return;
        }
      }

      // 1) Repeat match (show this first so users immediately see mismatch)
      if (password !== repeatPassword) {
        setFeedback("Passwords do not match.");
        return;
      }

      // 2) Length 12–15
      if (password.length < 12 || password.length > 15) {
        setFeedback("Password must be 12 characters long.");
        return;
      }

      // 3) Must contain a mix
      if (!lowerRe.test(password) || !upperRe.test(password) || !numberRe.test(password) || !symbolRe.test(password)) {
        setFeedback("Password must include upper, lower, number, and symbol.");
        return;
      }

      // 4) No obvious personal info
      const emailLocal = normalized.email.includes("@") ? normalized.email.split("@")[0] : normalized.email;
      const fullNameParts = normalized.fullName.split(/\s+/).filter((p) => p.length >= 3);

      const passwordLower = normalized.password.toLowerCase();
      const personalHit =
        (emailLocal && emailLocal.length >= 3 && passwordLower.includes(emailLocal)) ||
        fullNameParts.some((p) => p && passwordLower.includes(p));

      if (personalHit) {
        setFeedback("Password must not include your name or email parts.");
        return;
      }

      // 5) No common words
      const hasCommon = commonWords.some((w) => {
        const ww = w.toLowerCase();
        return ww && passwordLower.includes(ww);
      });
      if (hasCommon) {
        setFeedback("Password contains a common word. Please choose a stronger passphrase.");
        return;
      }

      if (!agreeTerms) {
        setFeedback("Please check the agreement box to continue.");
        return;
      }

      // Confirmation + success feedback (no redirect).
      const openFlow = window.mpdoOpenConfirmFlow;
      if (typeof openFlow === "function") {
        openFlow({
          kind: "register",
          confirmTitle: "Create Account",
          confirmText: "Are you sure you want to create this account? No changes can be made after.",
          successTitle: "Account created!",
          successText: "Thank you. Your account has been successfully created!",
          onAfterSuccess: () => close(),
        });
      } else {
        // Fallback
        showToast("Account created (demo).");
        close();
      }
    });
  }

  document.addEventListener("click", (e) => {
    const openEl = e.target.closest('[data-action="open-create-account"]');
    if (openEl) {
      e.preventDefault();
      e.stopImmediatePropagation();
      open();
      return;
    }

    const closeEl = e.target.closest('[data-action="close-create-account"]');
    if (closeEl) {
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    }
  });

  modal.addEventListener("click", (e) => {
    // Close when clicking outside the modal card.
    if (e.target === modal) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
})();

// Routing + page show/hide (runs after modal bootstrap so it can coexist).
(function initRoutingAndWizard() {
  const getRoute = () => {
    const raw = (window.location.hash || "").replace("#", "");
    return raw || "home";
  };

  const showPage = (route) => {
    const pages = $$(".app-page");
    pages.forEach((p) => p.classList.remove("is-active"));

    const target = document.getElementById(route);
    const page = target && target.classList.contains("app-page") ? target : $("#home");
    if (!page) return;

    page.classList.add("is-active");
    window.scrollTo(0, 0);

    // Active nav highlight (ignore Register since it opens a modal)
    const navLinks = $$(".nav-link[href^='#']");
    navLinks.forEach((l) => l.classList.remove("is-active"));
    const match = $(`.nav-link[href="#${route}"]`);
    if (match) match.classList.add("is-active");
  };

  window.addEventListener("hashchange", () => showPage(getRoute()));

  // Initial load
  showPage(getRoute());

  // Handle buttons that navigate using `data-route`
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-route]");
    if (!btn) return;
    const route = btn.getAttribute("data-route");
    if (!route) return;
    window.location.hash = route.replace("#", "");
  });

  // Coming soon cards
  $$("[data-action='coming-soon']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-service") || "Service";
      showToast(`${name} coming soon.`);
    });
  });

  // Open Application wizard
  $$("[data-action='open-application']").forEach((a) => {
    a.addEventListener("click", (e) => {
      const stepStr = a.getAttribute("data-step") || "1";
      const step = Number(stepStr);
      const nextRoute = "#application";
      e.preventDefault();
      setWizardStep(step);
      window.location.hash = nextRoute.replace("#", "");
    });
  });

  // Login form
  const loginForm = $("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Welcome back. Your login was successful (demo).");
    });
  }

  // Forgot password form
  const forgotForm = $("#forgot-form");
  if (forgotForm) {
    forgotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Request received! If your email is registered, you'll receive a reset link (demo).");
    });
  }

  // Ask question form
  const askForm = $("#ask-form");
  if (askForm) {
    askForm.addEventListener("submit", (e) => {
      e.preventDefault();

      openConfirmFlow({
        kind: "inquiry",
        confirmTitle: "Submit Application",
        confirmText: "Are you sure you want to submit this application? No changes can be made after.",
        successTitle: "Application received!",
        successText: "Thank you. Your application has been successfully submitted!",
        onAfterSuccess: () => {},
      });
    });
  }

  // Wizard
  const wizardStepLabel = $("#wizard-step-label");
  const wizardPrimary = $("[data-action='wizard-primary']");
  const wizardBack = $("[data-action='wizard-back']");
  const stepContents = $$("[data-step]");

  const submitConfirmModal = $("#submit-confirm-modal");
  const submitSuccessModal = $("#submit-success-modal");

  const confirmTitleEl = $("#submit-confirm-title");
  const confirmTextEl = $("#submit-confirm-text");
  const successTitleEl = $("#submit-success-title");
  const successTextEl = $("#submit-success-text");

  // Tracks what should happen after the user confirms submission.
  let submitFlow = {
    kind: "application",
    onAfterSuccess: null,
  };

  const setModalOpen = (modalEl, isOpen) => {
    if (!modalEl) return;
    modalEl.classList.toggle("is-open", isOpen);
    modalEl.setAttribute("aria-hidden", String(!isOpen));
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  };

  const openConfirmFlow = ({
    kind,
    confirmTitle,
    confirmText,
    successTitle,
    successText,
    onAfterSuccess,
  }) => {
    if (!submitConfirmModal || !submitSuccessModal) return;

    submitFlow = {
      kind: kind || "application",
      onAfterSuccess: typeof onAfterSuccess === "function" ? onAfterSuccess : null,
    };

    if (confirmTitleEl && typeof confirmTitle === "string") confirmTitleEl.textContent = confirmTitle;
    if (confirmTextEl && typeof confirmText === "string") confirmTextEl.textContent = confirmText;
    if (successTitleEl && typeof successTitle === "string") successTitleEl.textContent = successTitle;
    if (successTextEl && typeof successText === "string") successTextEl.textContent = successText;

    setModalOpen(submitConfirmModal, true);
    const confirmBtn = submitConfirmModal.querySelector('[data-action="confirm-submit"]');
    if (confirmBtn) confirmBtn.focus();
  };

  // Expose to other iifes (e.g., Create Account modal).
  window.mpdoOpenConfirmFlow = openConfirmFlow;

  const openSubmitConfirm = () => {
    openConfirmFlow({
      kind: "application",
      confirmTitle: "Submit Application",
      confirmText: "Are you sure you want to submit this application? No changes can be made after.",
      successTitle: "Application received!",
      successText: "Thank you. Your application has been successfully submitted!",
      onAfterSuccess: null,
    });
  };

  const openSubmitSuccess = () => {
    if (!submitSuccessModal) return;
    setModalOpen(submitSuccessModal, true);
  };

  const closeSubmitConfirm = () => setModalOpen(submitConfirmModal, false);
  const closeSubmitSuccess = () => setModalOpen(submitSuccessModal, false);

  // Submit modal handlers (confirm/cancel/esc/outside)
  const confirmBtn = submitConfirmModal && submitConfirmModal.querySelector('[data-action="confirm-submit"]');
  const cancelBtn = submitConfirmModal && submitConfirmModal.querySelector('[data-action="cancel-submit"]');

  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      closeSubmitConfirm();
      openSubmitSuccess();

      // Handle after-success behavior based on flow kind.
      window.setTimeout(() => {
        closeSubmitSuccess();
        if (submitFlow.onAfterSuccess) {
          try {
            submitFlow.onAfterSuccess();
          } catch {
            // ignore
          }
        }

        if (submitFlow.kind === "application") {
          setWizardStep(1);
          window.location.hash = "home";
        }
      }, 2600);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closeSubmitConfirm();
    });
  }

  // Close X buttons
  $$('[data-action="close-submit-confirm"]').forEach((el) => {
    el.addEventListener("click", () => closeSubmitConfirm());
  });

  // Outside click closes confirm modal
  if (submitConfirmModal) {
    submitConfirmModal.addEventListener("click", (e) => {
      if (e.target === submitConfirmModal) closeSubmitConfirm();
    });
  }
  // Outside click closes success modal
  if (submitSuccessModal) {
    submitSuccessModal.addEventListener("click", (e) => {
      if (e.target === submitSuccessModal) closeSubmitSuccess();
    });
  }

  // Esc closes whichever is open
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (submitConfirmModal && submitConfirmModal.classList.contains("is-open")) closeSubmitConfirm();
    if (submitSuccessModal && submitSuccessModal.classList.contains("is-open")) closeSubmitSuccess();
  });

  let currentStep = 1;

  const stepLabelMap = {
    1: "1. Applicant information",
    2: "2. Authorized Representative (Optional)",
    3: "3. Project Information",
    4: "4. Project Location",
    5: "5. Project Area & Cost",
    6: "6. Documents Upload",
    7: "7. Review & Submit",
  };

  const wizardRoot = $("#application") || document;
  const getAuthorizeRep = () => {
    const el = wizardRoot.querySelector('input[name="authorizeRep"]');
    return !!(el && el.checked);
  };

  const syncConditionalFields = () => {
    const authorized = getAuthorizeRep();

    // Step 1: applicant type toggles (individual vs corporation blocks)
    const applicantType = wizardRoot.querySelector('select[name="applicantType"]');
    const isCorp = applicantType && applicantType.value === "Corporation/Business";
    const step1Blocks = wizardRoot.querySelectorAll(
      '.wizard-step-content[data-step="1"] [data-cond]'
    );
    step1Blocks.forEach((block) => {
      const cond = block.getAttribute("data-cond");
      // Only toggle contact blocks; other conditional labels use different data-cond values.
      if (cond === "individual") block.style.display = isCorp ? "none" : "block";
      if (cond === "corp") block.style.display = isCorp ? "block" : "none";
    });

    // Step 2: representative optional
    const repNote = wizardRoot.querySelector('.wizard-step-content[data-step="2"] [data-rep-note]');
    const repFields = wizardRoot.querySelector('.wizard-step-content[data-step="2"] .wiz-rep-fields');
    if (repNote) repNote.style.display = authorized ? "none" : "block";
    if (repFields) repFields.style.display = authorized ? "block" : "none";

    // Step 3: Other project type/nature fields
    const projectType = wizardRoot.querySelector('select[name="projectType"]');
    const projectNature = wizardRoot.querySelector('select[name="projectNature"]');
    const showProjectOther = projectType && projectType.value === "Other";
    const showNatureOther = projectNature && projectNature.value === "Other";

    const projectTypeOther = wizardRoot.querySelector('[data-cond="project-type-other"]');
    if (projectTypeOther) projectTypeOther.style.display = showProjectOther ? "block" : "none";

    const projectNatureOther = wizardRoot.querySelector('[data-cond="project-nature-other"]');
    if (projectNatureOther) projectNatureOther.style.display = showNatureOther ? "block" : "none";

    // Step 4: Crop type conditional
    const existingLandUse = wizardRoot.querySelector('select[name="existingLandUse"]');
    const showCrop = existingLandUse && existingLandUse.value === "Agricultural";
    const cropType = wizardRoot.querySelector('[data-cond="crop-type"]');
    if (cropType) cropType.style.display = showCrop ? "block" : "none";

    // Step 6: Authorization Letter only if representative is authorized
    const authLetter = wizardRoot.querySelector('[data-cond="auth-letter"]');
    if (authLetter) authLetter.style.display = authorized ? "block" : "none";
  };

  const getNextStep = (fromStep) => {
    // Step 2 is optional: if NOT authorizing representative, skip step 2.
    if (fromStep === 1) return getAuthorizeRep() ? 2 : 3;
    if (fromStep === 2) return 3;
    if (fromStep >= 3 && fromStep < 7) return fromStep + 1;
    return fromStep;
  };

  const getPrevStep = (fromStep) => {
    // If step 2 was skipped, going back from step 3 should go to step 1.
    if (fromStep === 3 && !getAuthorizeRep()) return 1;
    if (fromStep <= 7 && fromStep > 1) return fromStep - 1;
    return fromStep;
  };

  const updateStepper = () => {
    const indicators = $$(".wizard-step-indicator[data-step-indicator]");
    const authorized = getAuthorizeRep();

    indicators.forEach((node) => {
      const step = Number(node.getAttribute("data-step-indicator"));
      const dot = node.querySelector(".wizard-dot");
      if (!dot) return;

      dot.classList.remove("wizard-dot--active", "wizard-dot--done");

      const isSkippedStep2 = !authorized && step === 2;
      if (step === currentStep) {
        dot.classList.add("wizard-dot--active");
        return;
      }

      const isDone = step < currentStep && !isSkippedStep2;
      if (isDone) dot.classList.add("wizard-dot--done");
    });
  };

  const setWizardStep = (step) => {
    const authorized = getAuthorizeRep();
    // If step 2 is not authorized, always skip it.
    if (Number(step) === 2 && !authorized) step = 3;

    currentStep = Math.max(1, Math.min(7, step));

    stepContents.forEach((el) => {
      const n = Number(el.getAttribute("data-step"));
      el.classList.toggle("is-active", n === currentStep);
    });

    if (wizardStepLabel) wizardStepLabel.textContent = stepLabelMap[currentStep] || "";

    // Back + Primary button state
    if (wizardBack) {
      wizardBack.style.visibility = currentStep === 1 ? "hidden" : "visible";
      wizardBack.disabled = currentStep === 1;
    }

    if (wizardPrimary) {
      const isSubmit = currentStep === 7;
      wizardPrimary.classList.toggle("is-submit", isSubmit);
      wizardPrimary.textContent = isSubmit ? "Submit Application" : "NEXT";
    }

    updateStepper();
    syncConditionalFields();
  };

  // Expose for handlers registered earlier
  window.setWizardStep = setWizardStep;
  setWizardStep(currentStep);

  // Replace native selects with custom dropdowns (wizard-only)
  const setupCustomSelects = () => {
    const selects = wizardRoot.querySelectorAll("select");
    if (!selects || !selects.length) return;

    const closeAllMenus = () => {
      $$(".cs-menu").forEach((m) => m.classList.remove("is-open"));
    };

    selects.forEach((sel) => {
      if (sel.dataset.csBound === "1") return;
      sel.dataset.csBound = "1";

      const wrapper = document.createElement("div");
      wrapper.className = "cs-select";

      const display = document.createElement("div");
      display.className = "cs-display";
      display.tabIndex = 0;

      const arrow = document.createElement("span");
      arrow.className = "cs-arrow";
      arrow.textContent = "▾";

      const displayText = document.createElement("span");
      displayText.className = "cs-display-text";

      display.appendChild(displayText);
      display.appendChild(arrow);

      const menu = document.createElement("div");
      menu.className = "cs-menu";

      const getSelectedText = () => {
        const opt = sel.selectedOptions && sel.selectedOptions[0];
        return (opt && opt.textContent) ? opt.textContent.trim() : "";
      };

      displayText.textContent = getSelectedText();

      const buildOptions = () => {
        menu.innerHTML = "";
        Array.from(sel.options).forEach((opt) => {
          if (opt.disabled) return;
          const item = document.createElement("div");
          item.className = "cs-option";
          item.textContent = opt.textContent.trim();
          item.dataset.value = opt.value;

          if (opt.value === sel.value) item.classList.add("is-selected");

          // Extra stopPropagation so the global "outside click" logic
          // never interferes with selecting dropdown values.
          item.addEventListener("mousedown", (e) => e.stopPropagation());
          item.addEventListener("pointerdown", (e) => e.stopPropagation());
          item.addEventListener("touchstart", (e) => e.stopPropagation());

          item.addEventListener("click", (e) => {
            // Prevent the document click handler from interfering before selection updates.
            e.stopPropagation();
            sel.value = opt.value;
            // Fire both input + change so existing listeners update reliably.
            sel.dispatchEvent(new Event("input", { bubbles: true }));
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            displayText.textContent = opt.textContent.trim();
            Array.from(menu.querySelectorAll(".cs-option")).forEach((x) => x.classList.remove("is-selected"));
            item.classList.add("is-selected");
            menu.classList.remove("is-open");

            // Ensure conditional fields refresh instantly.
            try {
              syncConditionalFields();
            } catch {
              // ignore if not available yet
            }
          });

          menu.appendChild(item);
        });
      };

      buildOptions();

      // Also stop propagation for the menu container itself.
      menu.addEventListener("mousedown", (e) => e.stopPropagation());
      menu.addEventListener("click", (e) => e.stopPropagation());
      menu.addEventListener("pointerdown", (e) => e.stopPropagation());

      // Hide original select
      sel.style.display = "none";
      sel.parentNode.insertBefore(wrapper, sel);
      wrapper.appendChild(display);
      wrapper.appendChild(menu);

      const toggle = () => {
        const isOpen = menu.classList.contains("is-open");
        closeAllMenus();
        if (!isOpen) menu.classList.add("is-open");
      };

      display.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      display.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
        if (e.key === "Escape") {
          menu.classList.remove("is-open");
        }
      });
    });

    document.addEventListener("click", () => closeAllMenus());
  };

  // Use native selects for reliability (prevents open/close race issues).
  // setupCustomSelects();

  // Step 5 inline numeric validation (validate immediately on input)
  const setupWizardNumericValidation = () => {
    const step5 = wizardRoot.querySelector('.wizard-step-content[data-step="5"]');
    if (!step5) return;

    const numberInputs = step5.querySelectorAll('input[type="number"]');
    if (!numberInputs.length) return;

    const validateInput = (input) => {
      const valueStr = String(input.value ?? "").trim();
      let errEl = input.nextElementSibling;
      if (!errEl || !errEl.classList || !errEl.classList.contains("wiz-inline-error")) {
        errEl = document.createElement("div");
        errEl.className = "wiz-inline-error";
        input.insertAdjacentElement("afterend", errEl);
      }

      if (!valueStr) {
        errEl.textContent = "";
        errEl.classList.remove("is-show");
        input.style.borderColor = "";
        input.setAttribute("aria-invalid", "false");
        return;
      }

      const num = Number(valueStr);
      const parts = valueStr.split(".");
      const decimals = parts[1] ? parts[1].length : 0;

      if (!Number.isFinite(num) || num <= 0) {
        errEl.textContent = "Please enter a valid amount greater than 0.";
        errEl.classList.add("is-show");
        input.style.borderColor = "rgba(255, 60, 60, .85)";
        input.setAttribute("aria-invalid", "true");
        return;
      }

      if (decimals > 2) {
        errEl.textContent = "Please use up to 2 decimal places.";
        errEl.classList.add("is-show");
        input.style.borderColor = "rgba(255, 60, 60, .85)";
        input.setAttribute("aria-invalid", "true");
        return;
      }

      errEl.textContent = "";
      errEl.classList.remove("is-show");
      input.style.borderColor = "rgba(255,255,255,.18)";
      input.setAttribute("aria-invalid", "false");
    };

    numberInputs.forEach((inp) => {
      inp.addEventListener("input", () => validateInput(inp));
      // Initial validation in case browser autofills.
      validateInput(inp);
    });
  };

  setupWizardNumericValidation();

  // Back button
  if (wizardBack) {
    wizardBack.addEventListener("click", () => {
      if (currentStep <= 1) return;
      setWizardStep(getPrevStep(currentStep));
    });
  }

  // Primary button (Next/Review/Submit)
  if (wizardPrimary) {
    wizardPrimary.addEventListener("click", () => {
      if (currentStep < 7) {
        setWizardStep(getNextStep(currentStep));
        return;
      }

      // Step 7 -> confirmation modal first
      openSubmitConfirm();
    });
  }

  // Input-driven conditional UI updates
  const applicantTypeSel = wizardRoot.querySelector('select[name="applicantType"]');
  if (applicantTypeSel) applicantTypeSel.addEventListener("change", () => syncConditionalFields());

  const authorizeRepCb = wizardRoot.querySelector('input[name="authorizeRep"]');
  if (authorizeRepCb) {
    authorizeRepCb.addEventListener("change", () => {
      syncConditionalFields();
      // If user turns off authorization while on step 2, skip to step 3.
      if (!getAuthorizeRep() && currentStep === 2) setWizardStep(3);
    });
  }

  const projectTypeSel = wizardRoot.querySelector('select[name="projectType"]');
  if (projectTypeSel) projectTypeSel.addEventListener("change", () => syncConditionalFields());

  const projectNatureSel = wizardRoot.querySelector('select[name="projectNature"]');
  if (projectNatureSel) projectNatureSel.addEventListener("change", () => syncConditionalFields());

  const existingLandUseSel = wizardRoot.querySelector('select[name="existingLandUse"]');
  if (existingLandUseSel) existingLandUseSel.addEventListener("change", () => syncConditionalFields());

  // Dropzone (Step 6)
  $$("[data-dropzone]", wizardRoot).forEach((dz) => {
    const input = dz.querySelector("input[type='file']");
    if (!input) return;

    dz.addEventListener("click", () => input.click());
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("is-dragover");
    });
    dz.addEventListener("dragleave", () => dz.classList.remove("is-dragover"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("is-dragover");

      const dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files.length) return;

      // Some browsers allow assigning dropped files to the input.
      try {
        input.files = dt.files;
      } catch {
        // Ignore if not supported; files can still be selected via browse.
      }

      showToast("Files added.");
    });
  });
})();
