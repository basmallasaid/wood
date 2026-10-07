/**
 * Wood – Custom Carpentry Landing Page
 * Vanilla JS, no dependencies. Everything is wrapped in an IIFE so nothing
 * leaks into the global scope. Each feature is a self-contained init function.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * Config – change the WhatsApp number here (digits only, intl format)
   * ------------------------------------------------------------------ */
  var CONFIG = {
    whatsappNumber: '02356777',
    sliderInterval: 6000,
    headerScrollThreshold: 40
  };

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var isRTL = document.documentElement.dir === 'rtl';

  /* Small helpers */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function headerOffset() {
    var header = $('[data-header]');
    return header ? header.offsetHeight : 0;
  }

  /* ==================================================================
   * 1. Mobile menu – toggle, aria-expanded, scroll lock, Esc, focus
   * ================================================================== */
  function initMobileMenu() {
    var toggle = $('[data-nav-toggle]');
    var nav = $('[data-nav]');
    var backdrop = $('[data-nav-backdrop]');
    var header = $('[data-header]');
    if (!toggle || !nav) return;

    var desktopMQ = window.matchMedia('(min-width: 1024px)');

    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

    function open() {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'إغلاق القائمة');
      nav.classList.add('is-open');
      header.classList.add('menu-open');
      document.body.classList.add('is-locked');
      if (backdrop) {
        backdrop.hidden = false;
        requestAnimationFrame(function () { backdrop.classList.add('is-visible'); });
      }
      var firstLink = $('a', nav);
      if (firstLink) setTimeout(function () { firstLink.focus(); }, 50);
    }

    function close(returnFocus) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'فتح القائمة');
      nav.classList.remove('is-open');
      header.classList.remove('menu-open');
      document.body.classList.remove('is-locked');
      if (backdrop) {
        backdrop.classList.remove('is-visible');
        setTimeout(function () { if (!isOpen()) backdrop.hidden = true; }, 350);
      }
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', function () {
      isOpen() ? close(false) : open();
    });

    if (backdrop) backdrop.addEventListener('click', function () { close(true); });

    // Close when a link inside the panel is used
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && isOpen()) close(false);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { close(true); return; }

      // Keep Tab focus inside the open panel + toggle
      if (e.key === 'Tab') {
        var focusables = [toggle].concat($$('a, button', nav));
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Reset state when resizing up to desktop layout
    function onBreakpoint(mq) { if (mq.matches && isOpen()) close(false); }
    if (desktopMQ.addEventListener) desktopMQ.addEventListener('change', onBreakpoint);
    else desktopMQ.addListener(onBreakpoint);
  }

  /* ==================================================================
   * 2. Header style after scrolling
   * ================================================================== */
  function initHeaderScroll() {
    var header = $('[data-header]');
    if (!header) return;
    var ticking = false;

    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > CONFIG.headerScrollThreshold);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ==================================================================
   * 3. Smooth scroll with sticky-header offset
   *    (also pre-selects the product in the form from product cards)
   * ================================================================== */
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;

      var target = id === '#top' ? document.body : document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();

      // Product card → preselect product type in the quote form
      var product = link.getAttribute('data-product');
      if (product) {
        var select = $('#f-product');
        if (select) {
          select.value = product;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      var top = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - headerOffset() - 8;
      window.scrollTo({ top: top, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });

      // Move focus for keyboard / screen-reader users without a second jump
      if (id !== '#top') {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
      if (history.pushState) history.pushState(null, '', id);
    });
  }

  /* ==================================================================
   * 4. Highlight active nav link on scroll (scrollspy)
   * ================================================================== */
  function initScrollSpy() {
    var links = $$('.nav__link');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var sections = links.map(function (link) {
      var section = document.getElementById(link.getAttribute('href').slice(1));
      if (section) map[section.id] = link;
      return section;
    }).filter(Boolean);

    function setActive(id) {
      links.forEach(function (l) {
        var active = map[id] === l;
        l.classList.toggle('is-active', active);
        if (active) l.setAttribute('aria-current', 'true');
        else l.removeAttribute('aria-current');
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });

    // Clear highlight when back in the hero
    window.addEventListener('scroll', function () {
      if (sections[0] && window.scrollY + headerOffset() < sections[0].offsetTop - 200) setActive(null);
    }, { passive: true });
  }

  /* ==================================================================
   * 5. Scroll-reveal animations (respects prefers-reduced-motion)
   * ================================================================== */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ==================================================================
   * 6. Gallery – category filter + keyboard-navigable lightbox
   * ================================================================== */
  function initGallery() {
    var gallery = $('[data-gallery]');
    var filters = $('[data-filters]');
    var lightbox = $('[data-lightbox]');
    if (!gallery) return;

    var items = $$('.gallery__item', gallery);
    var status = $('[data-gallery-status]');

    /* --- Filter --- */
    if (filters) {
      filters.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-filter]');
        if (!btn) return;
        var cat = btn.getAttribute('data-filter');

        $$('[data-filter]', filters).forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });

        var count = 0;
        items.forEach(function (item) {
          var show = cat === 'all' || item.getAttribute('data-category') === cat;
          item.hidden = !show;
          if (show) {
            count++;
            // restart the entrance animation
            item.style.animation = 'none';
            void item.offsetWidth;
            item.style.animation = '';
          }
        });
        if (status) status.textContent = 'يتم عرض ' + count + ' صور – ' + btn.textContent.trim();
      });
    }

    /* --- Lightbox --- */
    if (!lightbox) return;
    var img = $('[data-lb-img]', lightbox);
    var caption = $('[data-lb-caption]', lightbox);
    var counter = $('[data-lb-counter]', lightbox);
    var btnClose = $('[data-lb-close]', lightbox);
    var btnPrev = $('[data-lb-prev]', lightbox);
    var btnNext = $('[data-lb-next]', lightbox);
    var visible = [];
    var index = 0;
    var lastFocus = null;

    function show(i) {
      index = (i + visible.length) % visible.length;
      var btn = $('.gallery__btn', visible[index]);
      var thumb = $('img', btn);
      img.classList.add('is-loading');
      img.onload = function () { img.classList.remove('is-loading'); };
      img.src = btn.getAttribute('data-full');
      img.alt = thumb.alt;
      caption.textContent = $('.gallery__caption', btn).textContent;
      counter.textContent = (index + 1) + ' / ' + visible.length;

      // Preload neighbours for snappy navigation
      [index + 1, index - 1].forEach(function (n) {
        var item = visible[(n + visible.length) % visible.length];
        new Image().src = $('.gallery__btn', item).getAttribute('data-full');
      });
    }

    function openLb(item) {
      visible = items.filter(function (it) { return !it.hidden; });
      lastFocus = document.activeElement;
      lightbox.hidden = false;
      document.body.classList.add('is-locked');
      show(visible.indexOf(item));
      btnClose.focus();
    }

    function closeLb() {
      lightbox.hidden = true;
      document.body.classList.remove('is-locked');
      img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
      if (lastFocus) lastFocus.focus();
    }

    gallery.addEventListener('click', function (e) {
      var btn = e.target.closest('.gallery__btn');
      if (btn) openLb(btn.closest('.gallery__item'));
    });

    btnClose.addEventListener('click', closeLb);
    btnPrev.addEventListener('click', function () { show(index - 1); });
    btnNext.addEventListener('click', function () { show(index + 1); });

    // Click on the dark backdrop closes
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLb();
    });

    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      switch (e.key) {
        case 'Escape': closeLb(); break;
        // In RTL "next" visually sits on the left
        case 'ArrowLeft': e.preventDefault(); show(isRTL ? index + 1 : index - 1); break;
        case 'ArrowRight': e.preventDefault(); show(isRTL ? index - 1 : index + 1); break;
        case 'Tab': {
          var f = [btnClose, btnPrev, btnNext];
          var pos = f.indexOf(document.activeElement);
          e.preventDefault();
          var next = e.shiftKey ? pos - 1 : pos + 1;
          f[(next + f.length) % f.length].focus();
          break;
        }
      }
    });

    // Basic swipe support on touch devices
    var startX = null;
    lightbox.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) {
        var forward = isRTL ? dx > 0 : dx < 0;
        show(forward ? index + 1 : index - 1);
      }
      startX = null;
    });
  }

  /* ==================================================================
   * 7. Testimonial slider – autoplay, prev/next, dots, pause on hover
   * ================================================================== */
  function initSlider() {
    var slider = $('[data-slider]');
    if (!slider) return;
    var slides = $$('.slide', slider);
    var dotsWrap = $('[data-slider-dots]', slider);
    var prev = $('[data-slider-prev]', slider);
    var next = $('[data-slider-next]', slider);
    if (slides.length < 2) return;

    var current = 0;
    var timer = null;
    var hovered = false;
    var focused = false;

    // Build dots
    var dots = slides.map(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot';
      b.setAttribute('aria-label', 'عرض الرأي رقم ' + (i + 1));
      b.addEventListener('click', function () { goTo(i); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });

    function goTo(i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        var active = n === current;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-hidden', String(!active));
      });
      dots.forEach(function (d, n) {
        if (n === current) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }

    function play() {
      stop();
      if (prefersReducedMotion.matches || hovered || focused || document.hidden) return;
      timer = setInterval(function () { goTo(current + 1); }, CONFIG.sliderInterval);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { play(); }

    prev.addEventListener('click', function () { goTo(current - 1); restart(); });
    next.addEventListener('click', function () { goTo(current + 1); restart(); });

    slider.addEventListener('mouseenter', function () { hovered = true; stop(); });
    slider.addEventListener('mouseleave', function () { hovered = false; play(); });
    slider.addEventListener('focusin', function () { focused = true; stop(); });
    slider.addEventListener('focusout', function (e) {
      if (!slider.contains(e.relatedTarget)) { focused = false; play(); }
    });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : play(); });

    // Arrow keys when focus is inside the slider
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { goTo(isRTL ? current + 1 : current - 1); }
      else if (e.key === 'ArrowRight') { goTo(isRTL ? current - 1 : current + 1); }
    });

    goTo(0);
    play();
  }

  /* ==================================================================
   * 8. FAQ accordion – only one item open at a time
   * ================================================================== */
  function initFaq() {
    var faq = $('[data-faq]');
    if (!faq) return;
    var buttons = $$('.faq__btn', faq);

    function setState(btn, open) {
      btn.setAttribute('aria-expanded', String(open));
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.classList.toggle('is-open', open);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var willOpen = btn.getAttribute('aria-expanded') !== 'true';
        buttons.forEach(function (b) { setState(b, false); });
        if (willOpen) setState(btn, true);
      });
    });

    // Open the first item by default
    if (buttons[0]) setState(buttons[0], true);
  }

  /* ==================================================================
   * 9. Animated stats counter (IntersectionObserver)
   * ================================================================== */
  function initCounters() {
    var counters = $$('[data-count]');
    if (!counters.length) return;
    var fmt = new Intl.NumberFormat('en-US');

    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) return; // final values already in HTML

    function animate(el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var duration = 1800;
      var start = null;
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = fmt.format(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    counters.forEach(function (el) { el.textContent = '0'; });

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  /* ==================================================================
   * 10. Contact form – client-side validation + success state
   * ================================================================== */
  function initContactForm() {
    var form = $('[data-form]');
    var success = $('[data-form-success]');
    if (!form) return;

    var rules = {
      name: function (v) {
        if (!v) return 'من فضلك أدخل اسمك.';
        if (v.length < 3) return 'الاسم يجب أن يكون 3 أحرف على الأقل.';
        return '';
      },
      phone: function (v) {
        if (!v) return 'من فضلك أدخل رقم الهاتف.';
        var digits = v.replace(/[\s\-()]/g, '');
        if (!/^\+?\d{7,15}$/.test(digits)) return 'أدخل رقم هاتف صحيح (أرقام فقط، من 7 إلى 15 رقمًا).';
        return '';
      },
      product: function (v) {
        return v ? '' : 'اختر نوع المنتج الذي تريده.';
      },
      message: function (v) {
        if (!v) return 'من فضلك اكتب تفاصيل طلبك.';
        if (v.length < 10) return 'التفاصيل قصيرة جدًا، اكتب 10 أحرف على الأقل.';
        return '';
      }
    };

    function validateField(field) {
      var rule = rules[field.name];
      if (!rule) return true;
      var msg = rule(field.value.trim());
      var errEl = document.getElementById(field.getAttribute('aria-describedby'));
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (errEl) errEl.textContent = msg;
      return !msg;
    }

    // Validate on blur; re-validate live once a field has been flagged
    Object.keys(rules).forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      field.addEventListener('blur', function () { if (field.value.trim()) validateField(field); });
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
      field.addEventListener('change', function () {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      Object.keys(rules).forEach(function (name) {
        var field = form.elements[name];
        if (field && !validateField(field) && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      // No backend: build a WhatsApp message from the data and show success
      var productLabel = form.elements.product.options[form.elements.product.selectedIndex].text;
      var text = 'مرحبًا، أود طلب عرض سعر.\n' +
        'الاسم: ' + form.elements.name.value.trim() + '\n' +
        'الهاتف: ' + form.elements.phone.value.trim() + '\n' +
        'المنتج: ' + productLabel + '\n' +
        'التفاصيل: ' + form.elements.message.value.trim();
      var waLink = $('[data-success-wa]', success);
      if (waLink) waLink.href = 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(text);

      form.hidden = true;
      if (success) {
        success.hidden = false;
        success.focus();
      }
    });

    var resetBtn = $('[data-form-reset]', success);
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.reset();
        $$('[aria-invalid]', form).forEach(function (f) { f.removeAttribute('aria-invalid'); });
        $$('.field__error', form).forEach(function (el) { el.textContent = ''; });
        success.hidden = true;
        form.hidden = false;
        form.elements.name.focus();
      });
    }
  }

  /* ==================================================================
   * 11. Footer year
   * ================================================================== */
  function initYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ------------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initHeaderScroll();
    initSmoothScroll();
    initScrollSpy();
    initReveal();
    initGallery();
    initSlider();
    initFaq();
    initCounters();
    initContactForm();
    initYear();
  });
})();
