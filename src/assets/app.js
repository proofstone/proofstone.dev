/* proofstone — theme toggle + per-milestone progress (localStorage, no cookies).
   Everything here is progressive enhancement: with JS off the page reads fine. */
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

  /* ── Milestone progress (roadmap pages only) ────────────────────────────── */
  var slug = document.body.getAttribute('data-roadmap');
  var article = document.querySelector('.prose');
  if (!slug || !article) return;

  var boxes = [];
  Array.prototype.forEach.call(article.querySelectorAll('h3'), function (h) {
    var m = (h.textContent || '').match(/^\s*(M\d+\.\d+)/);
    if (!m) return;
    var id = m[1];
    h.classList.add('is-milestone');

    if (/[⭐★]/.test(h.textContent)) { // ⭐ or ★ → flagship
      h.classList.add('is-flagship');
      var flag = document.createElement('span');
      flag.className = 'ps-flag';
      flag.textContent = '★ flagship';
      h.appendChild(flag);
    }

    var key = 'proofstone:progress:' + slug + ':' + id;
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'ps-check';
    cb.dataset.key = key;
    cb.setAttribute('aria-label', 'Mark ' + id + ' done');
    try { cb.checked = localStorage.getItem(key) === '1'; } catch (e) {}
    cb.addEventListener('change', function () {
      try { localStorage.setItem(key, cb.checked ? '1' : '0'); } catch (e) {}
      update();
    });
    h.insertBefore(cb, h.firstChild);
    boxes.push(cb);
  });

  if (!boxes.length) return;

  var wrap = document.createElement('div');
  wrap.className = 'progress';
  wrap.innerHTML =
    '<span class="progress__label"></span>' +
    '<span class="progress__bar"><span class="progress__fill"></span></span>' +
    '<button type="button" class="progress__reset">reset</button>';
  article.parentNode.insertBefore(wrap, article);

  var label = wrap.querySelector('.progress__label');
  var fill = wrap.querySelector('.progress__fill');
  wrap.querySelector('.progress__reset').addEventListener('click', function () {
    boxes.forEach(function (cb) {
      cb.checked = false;
      try { localStorage.setItem(cb.dataset.key, '0'); } catch (e) {}
    });
    update();
  });

  function update() {
    var done = boxes.filter(function (cb) { return cb.checked; }).length;
    label.textContent = done + ' / ' + boxes.length + ' milestones';
    fill.style.width = Math.round((done / boxes.length) * 100) + '%';
  }
  update();
})();
