/* ============================================================
   MCC 공통 개선 모듈 (mcc-enhance.js)
   - 이름/주소: 작성·인쇄 모두 칸에 맞춰 최대 크기 + 2줄(내용 안 잘림, 아래칸 침범 없음)
   - 탭 순서: 논리적 입력 순서 (신규/번이 분기)
   - 포커스: 드롭다운 선택 후 화면이 다시 그려져도 포커스 유지
   페이지 기존 코드는 건드리지 않고 "위에 얹는" 방식. 모든 동작 try/catch 격리.
   페이지별 설정: window.MCC_TAB_ORDER = ['필드id', ...]  (없으면 키워드 추정)
   ============================================================ */
(function () {
  'use strict';

  var MCC_UPPER_IDS = {};  // 대문자 적용 대상 필드 id
  var EXTRA_H = 7;      // 칸 아래 여백만큼 높이 확보
  var MAXFS   = 13;     // 기본 최대 글씨
  var MINFS   = 8;      // 최소 글씨

  function _ov() {
    try { return (typeof overlay !== 'undefined' && overlay) ? overlay : document.querySelector('.overlay'); }
    catch (_) { return document.querySelector('.overlay'); }
  }
  function _pages() { try { return (typeof pages !== 'undefined' && pages) ? pages : []; } catch (_) { return []; } }
  function _isName(f) { try { return typeof isNameField === 'function' && isNameField(f); } catch (_) { return false; } }
  function _isAddr(f) { try { return typeof isAddressField === 'function' && isAddressField(f); } catch (_) { return false; } }
  function _isCustName(f) {
    try {
      if (!_isName(f)) return false;
      var t = String((f && f.id) || '') + ' ' + String((f && f.label) || '') + ' ' + String((f && f.placeholder) || '');
      return !/(판매자|자필|서명|성함싸인|예금주|통장|관계|대리점|직원|판매점)/.test(t);
    } catch (_) { return false; }
  }

  function allFields() {
    var out = [];
    var ps = _pages();
    for (var i = 0; i < ps.length; i++) {
      var fs = (ps[i] && ps[i].fields) || [];
      for (var j = 0; j < fs.length; j++) out.push(fs[j]);
    }
    return out;
  }
  function fieldById(id) {
    if (!id) return null;
    var fs = allFields();
    for (var i = 0; i < fs.length; i++) if (String(fs[i].id) === String(id)) return fs[i];
    return null;
  }
  // 인쇄 DOM은 data-id가 없어서 위치(x,y %)로 필드객체를 찾음
  function fieldByPos(left, top) {
    var fs = allFields(), best = null, bd = 1.2;
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i];
      if (typeof f.x !== 'number' || typeof f.y !== 'number') continue;
      var d = Math.abs(f.x - left) + Math.abs(f.y - top);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  // el(textarea/div)을 칸(box) 높이 안에 들어갈 최대 글씨로 맞춤
  function fitInto(el, box, maxPx, minPx) {
    try {
      if (!el || !box) return;
      el.style.lineHeight = '1.1';
      el.style.whiteSpace = 'normal';
      el.style.overflow = 'hidden';
      var size = Math.max(minPx, maxPx);
      el.style.fontSize = size + 'px';
      void el.offsetHeight;
      var g = 80;
      while (g-- > 0 && size > minPx && el.scrollHeight > box.clientHeight + 1) {
        size -= 0.5; el.style.fontSize = size + 'px'; void el.offsetHeight;
      }
    } catch (_) {}
  }

  /* ---------- 작성 모드: 이름/주소 칸 2줄 fit ---------- */
  function enhanceFill() {
    try {
      var ov = _ov(); if (!ov) return;
      var fields = ov.querySelectorAll('.field');
      for (var i = 0; i < fields.length; i++) {
        var w = fields[i];
        var f = fieldById(w.getAttribute('data-id'));
        if (!f) continue;
        var isN = _isName(f), isA = _isAddr(f);
        if (!isN && !isA) continue;
        var ctrl = w.querySelector('textarea, input[type="text"]');
        if (!ctrl) continue;
        if (isN && _isCustName(f)) {
          try {
            ctrl.setAttribute('maxlength', '52'); ctrl.maxLength = 52;
            ctrl.style.textTransform = 'uppercase';   // 영문은 대문자로 표시
            MCC_UPPER_IDS[String(f.id)] = 1;           // 인쇄에서 동일 적용(id 기준)
          } catch (_) {}
        }
        var ih = (Number(f.inputHeight) || 18) + EXTRA_H;
        try { w.style.height = ih + 'px'; w.style.setProperty('--ih', ih + 'px'); } catch (_) {}
        var maxFs = Math.max(MAXFS, Number(f.fontSize) || 14);
        if (ctrl.tagName === 'TEXTAREA') {
          ctrl.style.height = ih + 'px';
          ctrl.dataset.fixedH = ih;
          ctrl.style.wordBreak = isN ? 'break-all' : 'keep-all';
          ctrl.style.overflowWrap = isN ? 'anywhere' : 'normal';
          fitInto(ctrl, ctrl, maxFs, MINFS);
        } else {
          // input(이름 등): 한 줄 안에서 최대한 크게 (줄바꿈 불가)
          ctrl.style.height = ih + 'px';
          fitInto(ctrl, ctrl, maxFs, MINFS);
        }
      }
    } catch (_) {}
  }

  /* ---------- 인쇄 모드: 이름/주소를 2줄 fit div로 교체 ---------- */
  function enhancePrint() {
    try {
      var root = document.getElementById('printAll'); if (!root) return;
      var fields = root.querySelectorAll('.field');
      for (var i = 0; i < fields.length; i++) {
        var w = fields[i];
        if (w.querySelector('.mcc-print-value')) continue; // 이미 처리됨
        var left = parseFloat(w.style.left), top = parseFloat(w.style.top);
        if (isNaN(left) || isNaN(top)) continue;
        var f = fieldByPos(left, top);
        if (!f) continue;
        var isN = _isName(f), isA = _isAddr(f);
        if (!isN && !isA) continue;
        var ctrl = w.querySelector('input[type="text"], textarea, .print-value');
        if (!ctrl) continue;
        var val = ('value' in ctrl) ? ctrl.value : ctrl.textContent;
        val = String(val || '').replace(/\s+/g, ' ').trim();
        if (!val) continue;
        var ih = (Number(f.inputHeight) || 18) + EXTRA_H;
        var div = document.createElement('div');
        div.className = 'mcc-print-value';
        div.textContent = val;
        var _up = (f && MCC_UPPER_IDS[String(f.id)]) ? 'text-transform:uppercase;' : '';  // 고객명 영문 대문자
        div.style.cssText =
          'display:block;width:100%;box-sizing:border-box;padding:0 1px;margin:0;color:#000;' +
          'background:transparent;border:none;white-space:normal;overflow:hidden;line-height:1.1;' +
          'letter-spacing:0;font-weight:700;font-family:system-ui,"Noto Sans KR",sans-serif;' + _up +
          'word-break:' + (isN ? 'break-all' : 'keep-all') + ';overflow-wrap:' + (isN ? 'anywhere' : 'normal') + ';';
        try { ctrl.style.display = 'none'; } catch (_) {}
        w.style.height = ih + 'px';
        w.style.minHeight = '0';
        w.style.overflow = 'hidden';
        w.appendChild(div);
        fitInto(div, w, Math.max(MAXFS, Number(f.fontSize) || 14), MINFS);
      }
    } catch (_) {}
  }

  /* ---------- 탭 순서 + 포커스 ---------- */
  var ORDER_KW = [
    ['plan', '요금제'], ['판매자', '성함'], ['가입자', '이름', '명의', 'custname', 'name'],
    ['생년월일', '생년'], ['주소'], ['연락', '비상'],
    ['예금주'], ['은행', '계좌', '카드번호'], ['유효기간'],
    ['희망번호', '희망'], ['유심'], ['유심번호', '일련'], ['번호이동'], ['통신사']
  ];
  function rankOf(id) {
    try {
      var cfg = window.MCC_TAB_ORDER;
      if (cfg && cfg.length) { var k = cfg.indexOf(id); return k >= 0 ? k + 1 : null; }
      // 키워드 추정
      var s = String(id || '');
      // 예금주 생년월일/성함은 납부정보 그룹으로 (가입자 성함/생년월일보다 뒤)
      if (/예금주/.test(s)) {
        if (/생년|성함|명의/.test(s)) return 7;
        return 7;
      }
      for (var r = 0; r < ORDER_KW.length; r++) {
        var kws = ORDER_KW[r];
        for (var q = 0; q < kws.length; q++) if (s.indexOf(kws[q]) >= 0) return r + 1;
      }
      return null;
    } catch (_) { return null; }
  }
  function currentMode() {
    try { return (typeof getCheckmarkGroupValue === 'function' ? (getCheckmarkGroupValue('신규/번이') || '') : '').trim(); }
    catch (_) { return ''; }
  }
  function applyTabOrder() {
    try {
      var ov = _ov(); if (!ov) return;
      var mode = currentMode();
      var skip = {};
      if (mode === '신규') { skip['번호이동'] = 1; skip['통신사명'] = 1; }
      else if (mode === '번이') { skip['희망번호'] = 1; }
      var fields = Array.prototype.slice.call(ov.querySelectorAll('.field'));
      var aux = [];
      for (var i = 0; i < fields.length; i++) if (rankOf(fields[i].getAttribute('data-id')) == null) aux.push(fields[i]);
      aux.sort(function (a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return (ra.top - rb.top) || (ra.left - rb.left);
      });
      for (var j = 0; j < fields.length; j++) {
        var w = fields[j], id = w.getAttribute('data-id') || '';
        var ctrl = w.querySelector('input:not([type="hidden"]):not([disabled]), select, textarea');
        if (!ctrl) continue;
        if (skip[id]) { ctrl.tabIndex = -1; continue; }
        var r = rankOf(id);
        ctrl.tabIndex = (r != null) ? r : (100 + Math.max(0, aux.indexOf(w)));
      }
    } catch (_) {}
  }

  function ctrlSel(id) {
    var e = (window.CSS && CSS.escape) ? CSS.escape(id) : id;
    return '.field[data-id="' + e + '"] input:not([type="hidden"]):not([disabled]), .field[data-id="' + e + '"] select, .field[data-id="' + e + '"] textarea';
  }

  /* ---------- 훅: render / buildPrintAll 래핑 ---------- */
  function hook() {
    try {
      if (typeof render === 'function' && !render.__mccWrapped) {
        var _r = render, inR = false;
        render = function () {
          if (inR) return _r.apply(this, arguments);
          inR = true;
          var fid = '';
          try { var a = document.activeElement, af = a && a.closest && a.closest('.field'); if (af) fid = af.getAttribute('data-id') || ''; } catch (_) {}
          var ret;
          try { ret = _r.apply(this, arguments); }
          finally {
            inR = false;
            try { enhanceFill(); } catch (_) {}
            try { applyTabOrder(); } catch (_) {}
            if (fid) {
              try {
                var ov = _ov(); var el = ov && ov.querySelector(ctrlSel(fid));
                if (el && el.offsetParent !== null && document.activeElement !== el) el.focus({ preventScroll: true });
              } catch (_) {}
            }
          }
          return ret;
        };
        render.__mccWrapped = true;
      }
    } catch (_) {}

    try {
      if (typeof buildPrintAll === 'function' && !buildPrintAll.__mccWrapped) {
        var _b = buildPrintAll;
        buildPrintAll = function () {
          var r = _b.apply(this, arguments);
          try { requestAnimationFrame(function () { enhancePrint(); }); } catch (_) { try { enhancePrint(); } catch (__) {} }
          return r;
        };
        buildPrintAll.__mccWrapped = true;
      }
    } catch (_) {}

    // 페이지 자체 fit 함수를 2줄 fit으로 대체 (작성 화면이 1줄로 과축소되지 않게)
    try {
      if (typeof autoShrinkNameFont === 'function' && !autoShrinkNameFont.__mcc) {
        autoShrinkNameFont = function (el) { try { if (el && el.dataset && el.dataset.fixedH) el.style.height = el.dataset.fixedH + 'px'; fitInto(el, el, 14, MINFS); } catch (_) {} };
        autoShrinkNameFont.__mcc = 1;
      }
    } catch (_) {}
    try {
      if (typeof fitAddressText === 'function' && !fitAddressText.__mcc) {
        fitAddressText = function (el) { try { if (el && el.dataset && el.dataset.fixedH) el.style.height = el.dataset.fixedH + 'px'; fitInto(el, el, 14, MINFS); } catch (_) {} };
        fitAddressText.__mcc = 1;
      }
    } catch (_) {}

    // 인쇄 레이아웃 활성 시 한 번 더 (칸 크기 정확)
    try {
      window.addEventListener('beforeprint', function () { try { enhancePrint(); } catch (_) {} });
      if (window.matchMedia) window.matchMedia('print').addEventListener('change', function (e) { if (e.matches) { try { enhancePrint(); } catch (_) {} } });
    } catch (_) {}
  }

  function init() {
    hook();
    try { enhanceFill(); } catch (_) {}
    try { applyTabOrder(); } catch (_) {}
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
  else setTimeout(init, 0);
})();
