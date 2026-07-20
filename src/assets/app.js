/* proofstone — theme toggle + milestone progress (localStorage, no cookies).
   Everything here is progressive enhancement: with JS off the page reads fine,
   and the proof-criterion styling still works (it is applied at build time). */
(function () {
  'use strict';
  var root = document.documentElement;

  /* ── Theme toggle ───────────────────────────────────────────────────────── */
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme');
      if (!cur) cur = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('proofstone:theme', next); } catch (e) {}
    });
  }

  /* ── Roadmap pages only ─────────────────────────────────────────────────── */
  var slug = document.body.getAttribute('data-roadmap');
  var article = document.querySelector('.prose');
  if (!slug || !article) return;

  // Collapse the section outline on narrow screens (it is a sidebar on desktop).
  var tocDetails = document.querySelector('.toc__details');
  if (tocDetails && window.innerWidth < 1120) tocDetails.open = false;

  /* ── Wrap each milestone so "done" can be shown on the block itself ─────── */
  var heads = Array.prototype.slice.call(article.querySelectorAll('h3.ps-ms-h'));
  var boxes = [];

  heads.forEach(function (h) {
    var id = h.getAttribute('data-ms');
    if (!id) return;

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
    cb.setAttribute('aria-label', 'Mark ' + id + ' done');
    try { cb.checked = localStorage.getItem(key) === '1'; } catch (e) {}

    cb.addEventListener('click', function (e) { e.stopPropagation(); });
    cb.addEventListener('change', function () {
      try { localStorage.setItem(key, cb.checked ? '1' : '0'); } catch (e) {}
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
  // Must be a direct child of the tall column: position:sticky only travels while
  // its own parent is in view, so a wrapper sized to the bar would pin nothing.
  var column = article.parentElement;
  var wrapEl = document.createElement('div');
  wrapEl.className = 'progress';
  wrapEl.innerHTML =
    '<span class="progress__label"></span>' +
    '<span class="progress__bar"><span class="progress__fill"></span></span>' +
    '<button type="button" class="progress__next">next unchecked ↓</button>' +
    '<button type="button" class="progress__reset">reset</button>';
  column.insertBefore(wrapEl, article);

  var label = wrapEl.querySelector('.progress__label');
  var fill = wrapEl.querySelector('.progress__fill');
  var nextBtn = wrapEl.querySelector('.progress__next');

  nextBtn.addEventListener('click', function () {
    for (var i = 0; i < boxes.length; i++) {
      if (!boxes[i].checked) {
        var block = boxes[i].closest('.ps-ms') || boxes[i];
        block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  });

  wrapEl.querySelector('.progress__reset').addEventListener('click', function () {
    boxes.forEach(function (cb) {
      cb.checked = false;
      try { localStorage.setItem(cb.getAttribute('data-key'), '0'); } catch (e) {}
      var b = cb.closest('.ps-ms');
      if (b) b.classList.remove('is-done');
    });
    update();
  });

  /* ── Per-section counts in the outline ──────────────────────────────────── */
  var counts = Array.prototype.slice.call(document.querySelectorAll('.toc__count'));
  var state = {};

  function update() {
    boxes.forEach(function (cb) { state[cb.getAttribute('data-ms')] = cb.checked; });

    var done = boxes.filter(function (cb) { return cb.checked; }).length;
    label.textContent = done + ' / ' + boxes.length + ' milestones';
    fill.style.width = Math.round((done / boxes.length) * 100) + '%';
    nextBtn.disabled = done === boxes.length;

    counts.forEach(function (el) {
      var ids = (el.getAttribute('data-toc-ms') || '').split(',').filter(Boolean);
      var total = ids.length || Number(el.getAttribute('data-toc-total')) || 0;
      if (!total) return;
      var n = ids.filter(function (id) { return state[id]; }).length;
      el.textContent = n + '/' + total;
      var link = el.closest('.toc__link');
      if (link) link.classList.toggle('is-complete', n === total);
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
    links.forEach(function (a, i) { a.classList.toggle('is-active', i === idx); });
  }
  if (links.length) {
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateActive); }
    }, { passive: true });
    updateActive();
  }
})();
