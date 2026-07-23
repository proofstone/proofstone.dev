/* proofstone — theme toggle + milestone progress (localStorage, no cookies).
   Everything here is progressive enhancement: with JS off the page reads fine,
   and the proof-criterion styling still works (it is applied at build time). */
(function () {
  'use strict';
  var root = document.documentElement;

  /* ── Theme toggle ───────────────────────────────────────────────────────── */
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    // The button's only state indicator was an aria-hidden CSS glyph, so its
    // name read the same before and after pressing it. aria-pressed is set here
    // rather than in the template: the head script runs before <body> exists,
    // and a hardcoded value would be a lie for an OS-dark visitor with JS off.
    var setPressed = function () {
      var cur = root.getAttribute('data-theme');
      if (!cur) cur = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      toggle.setAttribute('aria-pressed', String(cur === 'dark'));
      return cur;
    };
    setPressed();
    toggle.addEventListener('click', function () {
      var next = setPressed() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      setPressed();
      try { localStorage.setItem('proofstone:theme', next); } catch (e) {}
    });
  }

  /* ── Roadmap pages only ─────────────────────────────────────────────────── */
  var slug = document.body.getAttribute('data-roadmap');
  var article = document.querySelector('.prose');
  if (!slug || !article) return;

  // NOTE: the section outline is no longer touched from here. It ships closed and
  // the stylesheet forces it open on desktop (::details-content), so there is no
  // post-paint collapse to shift the page and nothing to re-sync on resize.

  /* ── Wrap each milestone so "done" can be shown on the block itself ─────── */
  var heads = Array.prototype.slice.call(article.querySelectorAll('h3.ps-ms-h'));
  var boxes = [];

  heads.forEach(function (h) {
    var id = h.getAttribute('data-ms');
    if (!id) return;

    // Read the heading BEFORE the checkbox is inserted into it. "Mark M0.1 done"
    // gave a screen-reader user a list of ~30 unique but opaque names, and left
    // voice control with nothing to say: the visible words were not in the name.
    // The trailing "#" is the decorative permalink; ⭐ stays, it means flagship.
    var title = (h.textContent || '').replace(/#\s*$/, '').replace(/\s+/g, ' ').trim();

    // Collect heading + everything up to the next heading, then move into a wrapper.
    var nodes = [h];
    var n = h.nextElementSibling;
    while (n && n.tagName !== 'H2' && n.tagName !== 'H3') { nodes.push(n); n = n.nextElementSibling; }
    var wrap = document.createElement('div');
    wrap.className = 'ps-ms';
    wrap.setAttribute('data-ms', id);
    h.parentNode.insertBefore(wrap, h);
    nodes.forEach(function (el) { wrap.appendChild(el); });

    // Storage key is unchanged from v1 — existing visitor progress keeps working.
    var key = 'proofstone:progress:' + slug + ':' + id;
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'ps-check';
    cb.setAttribute('data-key', key);
    cb.setAttribute('data-ms', id);
    cb.setAttribute('aria-label', 'Mark done: ' + (title || id));
    try { cb.checked = localStorage.getItem(key) === '1'; } catch (e) {}

    cb.addEventListener('click', function (e) { e.stopPropagation(); });
    cb.addEventListener('change', function () {
      try {
        if (cb.checked) localStorage.setItem(key, '1');
        else localStorage.removeItem(key);
      } catch (e) {}
      wrap.classList.toggle('is-done', cb.checked);
      update();
    });

    h.insertBefore(cb, h.firstChild);
    h.classList.add('is-clickable');
    // The whole heading row is the hit target — the checkbox alone is a poor one.
    h.addEventListener('click', function (e) {
      if (e.target.closest('a')) return; // keep the anchor link usable
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    });

    wrap.classList.toggle('is-done', cb.checked);
    boxes.push(cb);
  });

  if (!boxes.length) return;

  /* ── Progress bar + "next unchecked" ────────────────────────────────────── */
  // The markup is rendered by roadmap.njk so the space is reserved before paint;
  // this only wires it. Building it here used to push the article down ~61 px
  // about 1.7 s in. If it is absent (a roadmap with no milestones), stop.
  var wrapEl = article.parentElement.querySelector('.progress');
  if (!wrapEl) return;

  var label = wrapEl.querySelector('.progress__label');
  var bar = wrapEl.querySelector('.progress__bar');
  var fill = wrapEl.querySelector('.progress__fill');
  var nextBtn = wrapEl.querySelector('.progress__next');
  var resetBtn = wrapEl.querySelector('.progress__reset');
  var status = wrapEl.querySelector('[role="status"]');

  // Shipped disabled so they are honest with JS off; they work from here on.
  nextBtn.removeAttribute('disabled');
  resetBtn.removeAttribute('disabled');

  nextBtn.addEventListener('click', function () {
    for (var i = 0; i < boxes.length; i++) {
      if (!boxes[i].checked) {
        var block = boxes[i].closest('.ps-ms') || boxes[i];
        // Honour the OS motion setting: the CSS reduced-motion block only kills
        // transitions, and an explicit behavior:'smooth' here overrides CSS
        // anyway — on a 33-milestone page that is thousands of pixels of scroll.
        var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        block.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        // …and take focus with you. The bar is sticky, so focus used to stay on
        // the button while the viewport moved: a keyboard user "jumped" and then
        // had to tab through everything above the target to act on it.
        // preventScroll keeps the browser from cancelling the smooth scroll and
        // parking the bare input under the sticky header.
        boxes[i].focus({ preventScroll: true });
        return;
      }
    }
  });

  resetBtn.addEventListener('click', function () {
    boxes.forEach(function (cb) {
      cb.checked = false;
      // removeItem, not setItem('0'): reading treats '0' and absent identically,
      // so writing zeros only left dead keys behind in the visitor's storage.
      try { localStorage.removeItem(cb.getAttribute('data-key')); } catch (e) {}
      var b = cb.closest('.ps-ms');
      if (b) b.classList.remove('is-done');
    });
    update();
  });

  /* ── Per-section counts in the outline ──────────────────────────────────── */
  var counts = Array.prototype.slice.call(document.querySelectorAll('.toc__count'));
  var state = {};
  var announced = false; // the first pass is page load, not a change

  function update() {
    boxes.forEach(function (cb) { state[cb.getAttribute('data-ms')] = cb.checked; });

    var done = boxes.filter(function (cb) { return cb.checked; }).length;
    var sentence = done + ' of ' + boxes.length + ' milestones done';
    label.textContent = done + ' / ' + boxes.length + ' milestones';
    fill.style.width = Math.round((done / boxes.length) * 100) + '%';
    nextBtn.disabled = done === boxes.length;

    bar.setAttribute('aria-valuenow', String(done));
    bar.setAttribute('aria-valuetext', sentence);
    if (announced) status.textContent = sentence;
    announced = true;

    counts.forEach(function (el) {
      var ids = (el.getAttribute('data-toc-ms') || '').split(',').filter(Boolean);
      var total = ids.length || Number(el.getAttribute('data-toc-total')) || 0;
      if (!total) return;
      var n = ids.filter(function (id) { return state[id]; }).length;
      el.textContent = n + '/' + total;
      var link = el.closest('.toc__link');
      if (!link) return;
      link.classList.toggle('is-complete', n === total);
      // The visible count is a compact "3/7" inside the link, which announces as
      // a bare pair of numbers with no unit. The link keeps its own section name.
      var name = link.getAttribute('data-name');
      if (!name) {
        var num = link.querySelector('.toc__num');
        var t = link.querySelector('.toc__title');
        name = ((num ? num.textContent.trim() + ' ' : '') + (t ? t.textContent.trim() : '')).trim();
        link.setAttribute('data-name', name);
      }
      link.setAttribute('aria-label', name + ' — ' + n + ' of ' + total + ' milestones done');
    });
  }
  update();

  /* ── Active section highlighting ────────────────────────────────────────── */
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc__link'));
  var sections = links.map(function (a) { return document.getElementById(a.getAttribute('data-toc')); });
  var ticking = false;

  function updateActive() {
    ticking = false;
    var idx = -1;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i] && sections[i].getBoundingClientRect().top <= 130) idx = i; else break;
    }
    // aria-current, not a class: "you are here" was a colour/weight change with
    // no programmatic equivalent. "true" rather than "location" — support for
    // the exact token is thinner in older screen readers. The CSS hangs off this
    // same attribute, so the visual and the announced state cannot drift.
    links.forEach(function (a, i) {
      if (i === idx) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  if (links.length) {
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateActive); }
    }, { passive: true });
    updateActive();
  }
})();
