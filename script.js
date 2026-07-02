/* =========================================================
   Деловая20 — интерактив лендинга
   ========================================================= */

/* ┌───────────────────────────────────────────────────────┐
   │  РЕЖИМ ОТПРАВКИ ФОРМЫ                                   │
   │  DEMO_MODE = true  → форма НЕ шлёт данные на сервер,    │
   │                      сразу показывает «Спасибо».        │
   │                      Удобно для локального показа.      │
   │                                                         │
   │  Чтобы включить РЕАЛЬНУЮ отправку на info@emuna.ru:     │
   │   1. Загрузите сайт на хостинг с поддержкой PHP.        │
   │   2. Поставьте DEMO_MODE = false (строка ниже).         │
   │   3. При необходимости измените ENDPOINT на путь до     │
   │      обработчика send.php.                              │
   └───────────────────────────────────────────────────────┘ */
const DEMO_MODE = true;
const ENDPOINT = "send.php";

document.addEventListener("DOMContentLoaded", () => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- текущий год в футере ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- хедер: тень/фон при скролле (через IntersectionObserver, без scroll-листенера) ---------- */
  const header = document.querySelector("[data-header]");
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;";
  document.body.prepend(sentinel);
  new IntersectionObserver(
    ([entry]) => header.toggleAttribute("data-scrolled", !entry.isIntersecting),
    { threshold: 0 }
  ).observe(sentinel);

  /* ---------- мобильное меню ---------- */
  const burger = document.querySelector("[data-burger]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const toggleMenu = (open) => {
    const isOpen = open ?? mobileMenu.hasAttribute("hidden");
    if (isOpen) mobileMenu.removeAttribute("hidden");
    else mobileMenu.setAttribute("hidden", "");
    burger.setAttribute("aria-expanded", String(isOpen));
  };
  burger?.addEventListener("click", () => toggleMenu());
  mobileMenu?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => toggleMenu(false))
  );

  /* ---------- плавные появления секций (reveal) ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in-view"));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- анимация счётчиков ---------- */
  const counters = document.querySelectorAll("[data-count]");
  const formatNum = (value, decimals, useSpace) => {
    let s = decimals ? value.toFixed(decimals).replace(".", ",") : String(Math.round(value));
    if (useSpace) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return s;
  };
  const runCounter = (el) => {
    const target = parseFloat(el.dataset.target);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const useSpace = el.dataset.format === "space";
    if (prefersReduced) { el.textContent = formatNum(target, decimals, useSpace); return; }

    const duration = 1300;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = formatNum(target * eased, decimals, useSpace);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = formatNum(target, decimals, useSpace);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length) {
    const cObs = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { runCounter(e.target); obs.unobserve(e.target); }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => cObs.observe(c));
  }

  /* ---------- маска телефона +7 (___) ___-__-__ ---------- */
  const phone = document.getElementById("phone");
  const formatPhone = (digits) => {
    // нормализуем: ведущая 8 или 7 → 7
    let d = digits.replace(/\D/g, "");
    if (d.startsWith("8")) d = "7" + d.slice(1);
    if (!d.startsWith("7")) d = "7" + d;
    d = d.slice(0, 11);
    const p = d.slice(1); // без кода страны
    let out = "+7";
    if (p.length > 0) out += " (" + p.slice(0, 3);
    if (p.length >= 3) out += ") " + p.slice(3, 6);
    if (p.length >= 6) out += "-" + p.slice(6, 8);
    if (p.length >= 8) out += "-" + p.slice(8, 10);
    return out;
  };
  const phoneDigits = (val) => {
    let d = val.replace(/\D/g, "");
    if (d.startsWith("8")) d = "7" + d.slice(1);
    return d.slice(0, 11);
  };
  if (phone) {
    phone.addEventListener("input", () => {
      const digits = phoneDigits(phone.value);
      phone.value = digits ? formatPhone(digits) : "";
    });
    phone.addEventListener("focus", () => { if (!phone.value) phone.value = "+7 ("; });
    phone.addEventListener("blur", () => { if (phone.value === "+7 (" || phone.value === "+7") phone.value = ""; });
  }

  /* ---------- валидация + отправка ---------- */
  const form = document.getElementById("lead-form");
  const successBox = document.querySelector("[data-success]");
  const submitBtn = form?.querySelector("[data-submit]");

  const setError = (name, msg) => {
    const field = form.querySelector(`[name="${name}"]`)?.closest(".field") ||
                  form.querySelector(`[name="${name}"]`)?.closest(".consent")?.parentElement;
    const errEl = form.querySelector(`[data-error-for="${name}"]`);
    if (errEl) errEl.textContent = msg || "";
    if (field) field.toggleAttribute("data-invalid", Boolean(msg));
  };

  const validators = {
    name: (v) => (v.trim().length >= 2 ? "" : "Укажите имя (минимум 2 символа)"),
    phone: (v) => (phoneDigits(v).length === 11 ? "" : "Введите корректный номер телефона"),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Введите корректный email"),
    consent: (checked) => (checked ? "" : "Необходимо согласие на обработку данных"),
  };

  const validateForm = () => {
    let ok = true;
    const data = new FormData(form);
    ["name", "phone", "email"].forEach((n) => {
      const msg = validators[n](String(data.get(n) || ""));
      setError(n, msg);
      if (msg) ok = false;
    });
    const consentMsg = validators.consent(form.consent.checked);
    setError("consent", consentMsg);
    if (consentMsg) ok = false;
    return ok;
  };

  // живая очистка ошибки при вводе
  form?.querySelectorAll("input, select, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      if (el.name && ["name", "phone", "email"].includes(el.name)) setError(el.name, "");
      if (el.name === "consent") setError("consent", "");
    });
  });

  const showSuccess = () => {
    form.hidden = true;
    successBox.hidden = false;
    successBox.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
  };

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    // honeypot: если бот заполнил скрытое поле — молча «успех»
    if (form.company && form.company.value.trim() !== "") { showSuccess(); return; }

    if (!validateForm()) {
      const firstInvalid = form.querySelector("[data-invalid] input, [data-invalid] select, [data-invalid] textarea");
      firstInvalid?.focus();
      return;
    }

    if (DEMO_MODE) {
      // Демо: имитируем короткую отправку и показываем успех
      submitBtn.setAttribute("data-loading", "");
      setTimeout(() => {
        submitBtn.removeAttribute("data-loading");
        showSuccess();
      }, 700);
      return;
    }

    // Реальная отправка на send.php
    submitBtn.setAttribute("data-loading", "");
    try {
      const res = await fetch(ENDPOINT, { method: "POST", body: new FormData(form) });
      const json = await res.json().catch(() => ({ ok: res.ok }));
      if (json.ok) {
        showSuccess();
      } else {
        throw new Error(json.error || "Ошибка отправки");
      }
    } catch (err) {
      setError("email", "Не удалось отправить. Позвоните нам: +7 (495) 969-16-15");
    } finally {
      submitBtn.removeAttribute("data-loading");
    }
  });

  // «Отправить ещё одну»
  document.querySelector("[data-reset-form]")?.addEventListener("click", () => {
    form.reset();
    successBox.hidden = true;
    form.hidden = false;
    form.querySelector("input")?.focus();
  });
});
