/* [MCC_TYPING_IMAGECHECK_TOOL_1] 체크이미지 공통 도구 (모든 채널 index.html 맨 아래에서 불러옴, 2026-11-09)
 * - 체크이미지 = 항상 찍혀 있는 손글씨 체크 그림(images/check_on.png)
 * - 설계 화면: 모든 칸(텍스트박스·드롭다운·체크·고정텍스트 등)의 테두리 8곳(위·아래·좌·우·모서리)을 끌어서 크기 조절,
 *   가운데를 끌면 이동(기존 이동 기능)
 * - 칸 크기 = 너비 f.w(%) × 높이 f.inputHeight(px), 그림은 칸 안에 비율 유지로 꽉 차게
 * - 인쇄(buildPrintAll)에도 같은 크기로 그림을 넣는다
 * 채널마다 index.html 이 달라도 공통 전역(cur, render, scheduleSave, stage, FILL, buildPrintAll)만 쓴다.
 */
(function () {
  'use strict';
  if (typeof cur !== 'function' || typeof render !== 'function') return;
  var IS_FILL = (typeof FILL !== 'undefined') ? !!FILL : document.documentElement.classList.contains('fill');
  var SRC = (typeof CHECK_IMAGE_SRC !== 'undefined' && CHECK_IMAGE_SRC) ? CHECK_IMAGE_SRC : new URL('images/check_on.png', location.href).href;
  if (typeof CHECK_IMAGE_SRC === 'undefined') { try { window.CHECK_IMAGE_SRC = SRC; } catch (_) {} }

  function isIc(f) { return !!f && (f.type === 'imagecheck' || (f.type === 'checkmark' && f.checkStyle === 'image')); }
  // 요금제·제휴로 자동 체크되는 칸(요금제 자동 체크 켠 칸, affiliate_*, 5G요금제/5G체크/5G동의)은 조건이 맞을 때만 표시
  function autoOnly(f) {
    if (!f) return false;
    if (f.autoCheck && f.autoCheck.enabled) return true;
    return /^(affiliate_|5g요금제$|5g체크$|5g동의$)/i.test(String(f.id || '').replace(/\s+/g, ''));
  }
  function shown(f) { return autoOnly(f) ? !!f.value : true; }
  function heightOf(f) { var h = Number(f.inputHeight || f.checkSize || 30); return h > 0 ? h : 30; }
  function save() { try { scheduleSave(); } catch (_) {} }
  function stageEl() { try { if (typeof stage !== 'undefined' && stage) return stage; } catch (_) {} return document.getElementById('stage'); }

  // 스타일
  var css = document.createElement('style');
  css.textContent =
    '.mcc-ic-img{width:100%;height:100%;object-fit:contain;pointer-events:none;display:block}' +
    '.field.mcc-ic{overflow:visible !important}' +
    '.field.mcc-ic .label{display:none !important}' +
    '.mcc-ic-h{position:absolute;z-index:5;background:transparent}' +
    '.mcc-ic-h[data-d="n"],.mcc-ic-h[data-d="s"]{left:6px;right:6px;height:8px;cursor:ns-resize}' +
    '.mcc-ic-h[data-d="n"]{top:-4px}.mcc-ic-h[data-d="s"]{bottom:-4px}' +
    '.mcc-ic-h[data-d="e"],.mcc-ic-h[data-d="w"]{top:6px;bottom:6px;width:8px;cursor:ew-resize}' +
    '.mcc-ic-h[data-d="e"]{right:-4px}.mcc-ic-h[data-d="w"]{left:-4px}' +
    '.mcc-ic-h.c{width:10px;height:10px;background:#fff;border:1.5px solid #ff3b3b;border-radius:2px;display:none}' +
    '.field:hover>.mcc-ic-h.c,.field.sel>.mcc-ic-h.c,.field.selected>.mcc-ic-h.c,.field.active>.mcc-ic-h.c{display:block}' +
    '.field.mcc-rs>.resize-handle{display:none !important}' +
    '.mcc-ic-h[data-d="nw"]{left:-6px;top:-6px;cursor:nwse-resize}.mcc-ic-h[data-d="se"]{right:-6px;bottom:-6px;cursor:nwse-resize}' +
    '.mcc-ic-h[data-d="ne"]{right:-6px;top:-6px;cursor:nesw-resize}.mcc-ic-h[data-d="sw"]{left:-6px;bottom:-6px;cursor:nesw-resize}' +
    'html.fill .mcc-ic-h{display:none !important}' +
    'html:not(.fill) .field.mcc-rs{overflow:visible !important}' +
    '@media print{.mcc-ic-h{display:none !important}}';
  document.head.appendChild(css);

  function paint(w, f, forPrint) {
    w.classList.add('mcc-ic');
    w.style.height = heightOf(f) + 'px';
    w.style.setProperty('--ih', heightOf(f) + 'px');
    // 채널이 원래 체크이미지를 그리는 경우(요금제·제휴 자동 체크가 이 칸을 직접 고침)는 칸 크기만 맞추고 그대로 둔다
    var native = w.querySelector('[data-type="imagecheck"]');
    if (native || (forPrint && w.querySelector('img'))) {
      var box = native || w.querySelector('img').parentNode;
      if (box !== w) { box.style.width = '100%'; box.style.height = '100%'; }
      Array.prototype.forEach.call(w.querySelectorAll('img'), function (im) { im.style.width = '100%'; im.style.height = '100%'; im.style.objectFit = 'contain'; });
      return;
    }
    // 원래 칸 내용(입력칸·✓ 등)은 지우고 그림만 — 크기 조절 손잡이는 남김
    Array.prototype.slice.call(w.children).forEach(function (c) {
      if (c.classList.contains('mcc-ic-h') || c.classList.contains('resize-handle')) return;
      if (c.classList.contains('label')) { c.style.display = 'none'; return; }
      c.remove();
    });
    var on = shown(f);
    if (on || (!IS_FILL && !forPrint)) {
      var img = document.createElement('img');
      img.className = 'mcc-ic-img';
      img.src = SRC;
      img.alt = 'check';
      if (!on) img.style.opacity = '.3';
      w.insertBefore(img, w.firstChild);
    }
  }

  function addHandles(w, i) {
    if (IS_FILL || w.querySelector(':scope > .mcc-ic-h')) return;
    w.classList.add('mcc-rs');
    ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'].forEach(function (d) {
      var h = document.createElement('div');
      h.className = 'mcc-ic-h' + (d.length === 2 ? ' c' : '');
      h.dataset.d = d;
      h.addEventListener('mousedown', function (e) { startResize(e, i, w, d); });
      w.appendChild(h);
    });
  }

  function startResize(e, i, w, d) {
    e.preventDefault(); e.stopPropagation();
    var f = cur().fields[i];
    var st = stageEl();
    if (!f || !st) return;
    var sr = st.getBoundingClientRect();
    var scale = st.offsetWidth ? sr.width / st.offsetWidth : 1;
    var r0 = w.getBoundingClientRect();
    // 칸의 기준점(왼쪽 위인지 가운데인지)을 실제 위치로 계산 — 채널마다 달라도 맞게
    var ax = r0.width ? ((f.x / 100) * sr.width - (r0.left - sr.left)) / r0.width : 0;
    var ay = r0.height ? ((f.y / 100) * sr.height - (r0.top - sr.top)) / r0.height : 0;
    var L = r0.left - sr.left, T = r0.top - sr.top, R = L + r0.width, B = T + r0.height;
    var sx = e.clientX, sy = e.clientY;
    document.body.style.userSelect = 'none';
    function mv(ev) {
      var dx = ev.clientX - sx, dy = ev.clientY - sy;
      var l = L, t = T, rr = R, b = B, MIN = 6 * scale;
      if (d.indexOf('w') >= 0) l = Math.min(L + dx, R - MIN);
      if (d.indexOf('e') >= 0) rr = Math.max(R + dx, L + MIN);
      if (d.indexOf('n') >= 0) t = Math.min(T + dy, B - MIN);
      if (d.indexOf('s') >= 0) b = Math.max(B + dy, T + MIN);
      var nw = rr - l, nh = b - t;
      f.w = Math.max(0.3, (nw / sr.width) * 100);
      f.inputHeight = Math.round(nh / scale);
      f.x = ((l + ax * nw) / sr.width) * 100;
      f.y = ((t + ay * nh) / sr.height) * 100;
      if (f.type === 'checkbox' || (f.type === 'checkmark')) f.checkSize = Math.max(8, Math.min(60, f.inputHeight));
      w.style.width = f.w + '%';
      w.style.left = f.x + '%';
      w.style.top = f.y + '%';
      w.style.height = f.inputHeight + 'px';
      w.style.setProperty('--ih', f.inputHeight + 'px');
    }
    function up() {
      window.removeEventListener('mousemove', mv);
      window.removeEventListener('mouseup', up);
      document.body.style.userSelect = '';
      save();
      try { render(); } catch (_) {}
    }
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
  }

  function decorate() {
    var page; try { page = cur(); } catch (_) { return; }
    if (!page || !page.fields) return;
    var st = stageEl();
    var root = st || document;
    root.querySelectorAll('.field[data-i]').forEach(function (w) {
      if (w.closest('#printAll')) return;
      var i = Number(w.dataset.i);
      var f = page.fields[i];
      if (!f) return;
      if (isIc(f)) { if (!autoOnly(f)) f.value = true; paint(w, f, false); }
      addHandles(w, i);
    });
  }

  // 화면 그리기 뒤에 항상 꾸미기
  var origRender = render;
  render = function () { var out = origRender.apply(this, arguments); try { decorate(); } catch (e) { console.warn('[imagecheck]', e); } return out; };
  try { window.render = render; } catch (_) {}

  // 인쇄본에도 같은 그림
  if (typeof buildPrintAll === 'function') {
    var origPrint = buildPrintAll;
    buildPrintAll = function () {
      var out = origPrint.apply(this, arguments);
      try {
        var container = document.getElementById('printAll');
        var overlays = container ? container.querySelectorAll('.overlay') : [];
        (typeof pages !== 'undefined' ? pages : []).forEach(function (pg, pi) {
          var ov = overlays[pi];
          if (!ov) return;
          var ws = Array.prototype.filter.call(ov.children, function (c) { return c.classList && c.classList.contains('field'); });
          var fs = pg.fields || [];
          if (ws.length !== fs.length) return; // 줄 수가 다르면 건드리지 않음(원래 인쇄 그대로)
          fs.forEach(function (f, k) { if (isIc(f)) { if (!autoOnly(f)) f.value = true; paint(ws[k], f, true); } });
        });
      } catch (e) { console.warn('[imagecheck print]', e); }
      return out;
    };
    try { window.buildPrintAll = buildPrintAll; } catch (_) {}
  }

  // 새 필드 타입 목록에 "체크이미지"가 없으면 추가
  var sel = document.getElementById('newType');
  if (sel && !sel.querySelector('option[value="imagecheck"]')) {
    var o = document.createElement('option');
    o.value = 'imagecheck'; o.textContent = '체크이미지';
    var after = sel.querySelector('option[value="checkbox"]');
    if (after && after.nextSibling) sel.insertBefore(o, after.nextSibling); else sel.appendChild(o);
  }
  // 체크이미지를 새로 추가하면 작은 정사각형으로 시작
  var addBtn = document.getElementById('addField');
  if (addBtn) addBtn.addEventListener('click', function () {
    if (!sel || sel.value !== 'imagecheck') return;
    setTimeout(function () {
      try {
        var fs = cur().fields, f = fs[fs.length - 1];
        if (!isIc(f) || f.__mccIcInit) return;
        f.w = 3; f.inputHeight = 30; f.value = true;
        if (f.type === 'checkmark') f.checkSize = 30;
        render(); save();
      } catch (_) {}
    }, 0);
  });

  // 일부 채널(스테이지5·헬로)은 제휴 자동 체크에서 부르는 함수가 빠져 있어 오류가 났음 — 없을 때만 채워 넣음
  if (typeof window.setImageCheckById !== 'function') {
    window.setImageCheckById = function (id, checked) {
      if (!id) return;
      var key = String(id).toLowerCase();
      try {
        if (typeof valuesById !== 'undefined') { valuesById[id] = !!checked; valuesById[key] = !!checked; }
        (typeof pages !== 'undefined' ? pages : []).forEach(function (pg) {
          (pg.fields || []).forEach(function (f) { if (String(f.id || '').toLowerCase() === key && isIc(f)) f.value = !!checked; });
        });
        decorate();
      } catch (_) {}
    };
  }

  // [MCC_TYPING_DRAG_INPUTS_1] 설계 화면: 텍스트박스·텍스트영역·드롭다운 칸 위를 눌러 끌어도 칸이 움직이게(2026-11-10)
  // - 4px 넘게 끌면 이동, 그냥 누르면 지금처럼 입력칸에 글자 입력 / 드롭다운은 목록 열기
  if (!IS_FILL && typeof startDrag === 'function') {
    var host = stageEl() || document;
    host.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      var ctl = e.target && e.target.closest ? e.target.closest('input, textarea, select') : null;
      if (!ctl) return;
      var w = ctl.closest('.field[data-i]');
      if (!w || w.closest('#printAll')) return;
      var i = Number(w.dataset.i);
      var isSel = ctl.tagName === 'SELECT';
      e.stopPropagation();          // 채널 원래 처리(입력칸에서는 이동 안 함 등)보다 먼저
      if (isSel) e.preventDefault(); // 드롭다운은 바로 열지 않고, 안 끌었으면 놓을 때 연다
      var sx = e.clientX, sy = e.clientY, dragging = false;
      function mv(ev) {
        if (dragging) return;
        if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
        dragging = true;
        try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); window.getSelection().removeAllRanges(); } catch (_) {}
        try { if (typeof select === 'function') select(i); } catch (_) {}
        var el = document.querySelector('.field[data-i="' + i + '"]') || w;
        startDrag({ clientX: sx, clientY: sy, stopPropagation: function () {}, preventDefault: function () {} }, i, el);
      }
      function up() {
        window.removeEventListener('mousemove', mv, true);
        window.removeEventListener('mouseup', up, true);
        if (!dragging && isSel) { try { ctl.focus(); if (ctl.showPicker) ctl.showPicker(); } catch (_) {} }
      }
      window.addEventListener('mousemove', mv, true);
      window.addEventListener('mouseup', up, true);
    }, true);
  }

  try { decorate(); } catch (_) {}
})();
