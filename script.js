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

  /* интерактив: при наведении на «Цифры, которыми гордимся» число пере-анимируется */
  if (!prefersReduced) {
    document.querySelectorAll(".proud__item").forEach((item) => {
      const numEl = item.querySelector("[data-count]");
      if (numEl) item.addEventListener("pointerenter", () => runCounter(numEl));
    });
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

/* =========================================================
   HERO — параллакс на движение мыши.
   Пишем только CSS-переменные (--par-x/--par-y) → композитинг
   transform/translate, без ре-рендера. rAF + lerp, с очисткой.
   ========================================================= */
(function heroParallax() {
  const init = () => {
    const hero = document.querySelector(".hero");
    if (!hero) return;

    const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerMQ = window.matchMedia("(hover: hover) and (pointer: fine)");

    let raf = 0;
    let active = false;
    let tx = 0, ty = 0; // цель (−1..1)
    let cx = 0, cy = 0; // текущее сглаженное значение

    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      hero.style.setProperty("--par-x", cx.toFixed(4));
      hero.style.setProperty("--par-y", cy.toFixed(4));
      if (Math.abs(tx - cx) > 0.0005 || Math.abs(ty - cy) > 0.0005) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      schedule();
    };
    const onLeave = () => { tx = 0; ty = 0; schedule(); };

    const enable = () => {
      if (active) return;
      active = true;
      hero.addEventListener("pointermove", onMove);
      hero.addEventListener("pointerleave", onLeave);
    };
    const disable = () => {
      if (!active && !raf) return;
      active = false;
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      hero.style.setProperty("--par-x", "0");
      hero.style.setProperty("--par-y", "0");
    };

    const apply = () => {
      if (!reduceMQ.matches && pointerMQ.matches) enable();
      else disable();
    };

    apply();
    reduceMQ.addEventListener?.("change", apply);
    pointerMQ.addEventListener?.("change", apply);
    window.addEventListener("pagehide", disable, { once: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

/* =========================================================
   ГАЛЕРЕЯ — лайтбокс (картинка на весь экран)
   ========================================================= */
(function galleryLightbox() {
  const init = () => {
    const lb = document.querySelector("[data-lightbox]");
    if (!lb) return;
    const lbImg = lb.querySelector("[data-lightbox-img]");
    const closeBtn = lb.querySelector("[data-lightbox-close]");
    const items = document.querySelectorAll(".gallery__item img");

    const open = (src, alt) => {
      lbImg.src = src;
      lbImg.alt = alt || "";
      lb.hidden = false;
      document.body.style.overflow = "hidden";
      closeBtn?.focus();
    };
    const close = () => {
      lb.hidden = true;
      lbImg.removeAttribute("src");
      document.body.style.overflow = "";
    };

    items.forEach((img) => {
      img.addEventListener("click", () => open(img.currentSrc || img.src, img.alt));
    });
    closeBtn?.addEventListener("click", close);
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) close(); });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
