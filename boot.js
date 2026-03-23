/* ══════════════════════════════════════════════════════════════
   SGN — BOOT SEQUENCE & PAGE TRANSITION
   
   Boot: Typewriter terminal initialization, once per browser session.
   Transition: Cyan scan-line wipe when navigating between SGN pages.
   
   Load this script on every page BEFORE other scripts.
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var BOOT_SESSION_KEY = 'sgn_boot_done';
  var TRANSITION_KEY   = 'sgn_transition_pending';

  function currentPage() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    var map = {
      'index.html':     'STAR CHART',
      'wiki.html':      'CODEX',
      'personnel.html': 'PERSONNEL',
      'orbat.html':     'ORBAT',
      'language.html':  'LANGUAGE FORGE'
    };
    return map[path] || 'TERMINAL';
  }

  function injectStyles() {
    if (document.getElementById('sgn-boot-styles')) return;
    var style = document.createElement('style');
    style.id = 'sgn-boot-styles';
    style.textContent = [
      '#sgn-boot-overlay {',
      '  position: fixed; inset: 0; z-index: 99999; background: #050810;',
      '  display: flex; align-items: center; justify-content: center;',
      '  opacity: 1; transition: opacity 0.6s ease; pointer-events: all;',
      '}',
      '#sgn-boot-overlay.fade-out { opacity: 0; pointer-events: none; }',
      '#sgn-boot-overlay::before {',
      '  content: ""; position: absolute; inset: 0;',
      '  background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,.06) 3px, rgba(0,0,0,.06) 4px);',
      '  pointer-events: none;',
      '}',
      '.boot-watermark {',
      '  position: absolute; top: 50%; left: 50%;',
      '  transform: translate(-50%, -50%);',
      '  pointer-events: none; user-select: none;',
      '  opacity: 0.04; width: 320px; height: 320px; object-fit: contain;',
      '}',
      '.boot-console {',
      '  font-family: "Share Tech Mono", monospace; font-size: 12px;',
      '  line-height: 2.4; max-width: 580px; width: 90%;',
      '  position: relative; z-index: 1;',
      '}',
      '.boot-line { opacity: 0; transform: translateY(2px); white-space: nowrap; overflow: hidden; }',
      '.boot-line.visible { opacity: 1; transform: translateY(0); transition: opacity 0.15s ease, transform 0.15s ease; }',
      '.boot-prefix { color: #0e1a2a; }',
      '.boot-text   { color: #1a7090; }',
      '.boot-ok     { color: #5cdb7a; }',
      '.boot-cyan   { color: #38e8ff; }',
      '.boot-gold   { color: #f5c542; }',
      '.boot-dim    { color: #0e1a2a; }',
      '.boot-ready  { color: #38e8ff; font-size: 13px; letter-spacing: 2px; }',
      '.boot-cursor {',
      '  display: inline-block; width: 7px; height: 13px;',
      '  background: #1a7090; margin-left: 2px; vertical-align: text-bottom;',
      '  animation: boot-blink 0.6s step-end infinite;',
      '}',
      '@keyframes boot-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }',
      '.boot-progress-wrap { margin-top: 8px; opacity: 0; transition: opacity 0.3s; }',
      '.boot-progress-wrap.visible { opacity: 1; }',
      '.boot-progress-bar { width: 100%; height: 2px; background: rgba(26,45,70,.3); border-radius: 1px; overflow: hidden; }',
      '.boot-progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #1a7090, #38e8ff); border-radius: 1px; transition: width 0.3s ease; }',
      '#sgn-transition-overlay { position: fixed; inset: 0; z-index: 99998; pointer-events: none; display: none; }',
      '#sgn-transition-overlay.active { display: block; pointer-events: all; }',
      '.trans-scanline {',
      '  position: absolute; left: 0; right: 0; height: 3px;',
      '  background: linear-gradient(90deg, transparent 5%, rgba(56,232,255,.6) 30%, #38e8ff 50%, rgba(56,232,255,.6) 70%, transparent 95%);',
      '  box-shadow: 0 0 20px rgba(56,232,255,.5), 0 0 60px rgba(56,232,255,.2), 0 -4px 12px rgba(56,232,255,.15), 0 4px 12px rgba(56,232,255,.15);',
      '  top: 0; opacity: 0;',
      '}',
      '.trans-flash { position: absolute; inset: 0; background: rgba(56,232,255,.03); opacity: 0; }',
      '.trans-grid {',
      '  position: absolute; inset: 0;',
      '  background-image: radial-gradient(circle at 1px 1px, rgba(56,232,255,.04) 1px, transparent 0);',
      '  background-size: 24px 24px; opacity: 0;',
      '}',
      '.trans-label {',
      '  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);',
      '  font-family: "Share Tech Mono", monospace; font-size: 11px;',
      '  letter-spacing: 4px; text-transform: uppercase;',
      '  color: rgba(56,232,255,.4); white-space: nowrap; opacity: 0;',
      '}',
      '@keyframes trans-scan-sweep { 0% { top: -3px; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { top: 100%; opacity: 0; } }',
      '@keyframes trans-flash-pulse { 0% { opacity: 0; } 15% { opacity: 1; } 40% { opacity: 0; } 100% { opacity: 0; } }',
      '@keyframes trans-grid-flash { 0% { opacity: 0; } 10% { opacity: 0.5; } 50% { opacity: 0.3; } 100% { opacity: 0; } }',
      '@keyframes trans-label-flash { 0% { opacity: 0; } 15% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }'
    ].join('\n');
    document.head.appendChild(style);
  }

  function getDataCounts() {
    var counts = { systems: 0, fleets: 0, lexicon: 0, personnel: 0, codex: 0, orbats: 0 };
    try { var m = localStorage.getItem('sgn_map_state_v1'); if (m) { var d = JSON.parse(m); counts.systems = (d.systems && d.systems.length) || 0; } } catch(e) {}
    try { var f = localStorage.getItem('sgn_fleets_v1'); if (f) { var d = JSON.parse(f); counts.fleets = Array.isArray(d) ? d.length : 0; } } catch(e) {}
    try { var l = localStorage.getItem('sgn_language_v1'); if (l) { var d = JSON.parse(l); counts.lexicon = (d.entries && d.entries.length) || 0; } } catch(e) {}
    try { var p = localStorage.getItem('sgn_personnel_v1'); if (p) { var d = JSON.parse(p); counts.personnel = Array.isArray(d) ? d.length : 0; } } catch(e) {}
    try { var c = localStorage.getItem('sgn_codex_v1'); if (c) { var d = JSON.parse(c); counts.codex = Array.isArray(d) ? d.length : 0; } } catch(e) {}
    try { var o = localStorage.getItem('sgn_orbat_v1'); if (o) { var d = JSON.parse(o); counts.orbats = Array.isArray(d) ? d.length : 0; } } catch(e) {}
    return counts;
  }

  function getStardateString() {
    var ANCHOR = new Date('2026-03-14T00:00:00Z').getTime();
    var YEAR = 4180;
    var REAL_SEC_PER_YEAR = 604800;
    var DAYS_PER_YEAR = 360;
    var REAL_SEC_PER_DAY = REAL_SEC_PER_YEAR / DAYS_PER_YEAR;
    var MONTHS = [
      'Luinavas','Silquendil','Tirnvar\u00EB','Lissuinion','Valandaril\u00EB','Urithiel',
      'Narviond\u00EB','Fanyamar\u00EB','Myndarial','Rilyarion','Morilthil\u00EB','Vanyasilm\u00EB'
    ];
    var realSec = (Date.now() - ANCHOR) / 1000;
    var totalDays = realSec / REAL_SEC_PER_DAY;
    var yearsElapsed = Math.floor(totalDays / DAYS_PER_YEAR);
    var year = YEAR + yearsElapsed;
    var dayOfYear = totalDays - (yearsElapsed * DAYS_PER_YEAR);
    if (dayOfYear < 0) dayOfYear = 0;
    var monthIdx = Math.min(Math.floor(dayOfYear / 30), 11);
    var day = Math.floor(dayOfYear - (monthIdx * 30)) + 1;
    var month = monthIdx + 1;
    function pad(n) { return String(n).padStart(2, '0'); }
    return {
      dateStr: 'ANV ' + year + '.' + pad(month) + '.' + pad(day),
      monthName: MONTHS[monthIdx]
    };
  }

  function runBootSequence() {
    injectStyles();
    var overlay = document.createElement('div');
    overlay.id = 'sgn-boot-overlay';
    var counts = getDataCounts();
    var sd = getStardateString();

    var syncParts = [];
    if (counts.systems)   syncParts.push(counts.systems + ' systems');
    if (counts.fleets)    syncParts.push(counts.fleets + ' fleets');
    if (counts.personnel) syncParts.push(counts.personnel + ' personnel');
    if (counts.codex)     syncParts.push(counts.codex + ' codex entries');
    if (counts.orbats)    syncParts.push(counts.orbats + ' ORBATs');
    if (counts.lexicon)   syncParts.push(counts.lexicon + ' lexicon entries');
    var syncStr = syncParts.length ? syncParts.join(' \u00B7 ') : 'empty datacore';

    var lines = [
      { prefix: '[SYS]',  text: 'Establishing link to AEN Command Network', cursor: true },
      { prefix: '[NET]',  text: 'Connection secured \u00B7 Encryption: <span class="boot-cyan">VALARIND\u00CB AUTHORITY</span>', ok: true },
      { prefix: '[AUTH]', text: 'Authenticating terminal credentials', cursor: true },
      { prefix: '[AUTH]', text: 'Clearance verified \u00B7 Tier: <span class="boot-gold">COMMAND</span>', ok: true },
      { prefix: '[SYNC]', text: 'Synchronizing datacore \u00B7 ' + syncStr, cursor: true },
      { prefix: '[SYNC]', text: 'Datacore online', ok: true },
      { prefix: '[TIME]', text: 'Anorvalas Standard: <span class="boot-gold">' + sd.dateStr + ' \u00B7 ' + sd.monthName.toUpperCase() + '</span>' },
      { prefix: '',       text: '<span class="boot-ready">AEN TERMINAL READY</span> <span class="boot-ok">\u00B7 ALL SYSTEMS NOMINAL \u00B7</span> <span class="boot-dim">Alcar i Arandor\u00EB</span>' }
    ];

    var html = '<img src="./symbol.png" alt="" class="boot-watermark">';
    html += '<div class="boot-console" id="boot-console">';
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      html += '<div class="boot-line" data-idx="' + i + '">';
      html += '<span class="boot-prefix">' + l.prefix + '</span> ';
      html += '<span class="boot-text">' + l.text + '</span>';
      if (l.ok) html += '<span class="boot-ok"> \u2713</span>';
      if (l.cursor) html += '<span class="boot-cursor"></span>';
      html += '</div>';
    }
    html += '<div class="boot-progress-wrap" id="boot-progress">';
    html += '<div class="boot-progress-bar"><div class="boot-progress-fill" id="boot-progress-fill"></div></div>';
    html += '</div></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    var lineEls = overlay.querySelectorAll('.boot-line');
    var progressWrap = overlay.querySelector('#boot-progress');
    var progressFill = overlay.querySelector('#boot-progress-fill');
    var delays = [200, 800, 1600, 2300, 3100, 3900, 4500, 5200];
    var progress = 0;

    setTimeout(function() { progressWrap.classList.add('visible'); }, 300);

    delays.forEach(function(delay, idx) {
      setTimeout(function() {
        lineEls[idx].classList.add('visible');
        if (idx > 0) {
          var prevCursor = lineEls[idx - 1].querySelector('.boot-cursor');
          if (prevCursor) prevCursor.style.display = 'none';
        }
        progress = ((idx + 1) / lines.length) * 100;
        progressFill.style.width = progress + '%';
      }, delay);
    });

    var totalTime = delays[delays.length - 1] + 1200;
    setTimeout(function() {
      overlay.classList.add('fade-out');
      setTimeout(function() { overlay.remove(); }, 700);
    }, totalTime);

    sessionStorage.setItem(BOOT_SESSION_KEY, '1');
  }

  function createTransitionOverlay() {
    if (document.getElementById('sgn-transition-overlay')) return;
    injectStyles();
    var overlay = document.createElement('div');
    overlay.id = 'sgn-transition-overlay';
    overlay.innerHTML = '<div class="trans-grid"></div><div class="trans-flash"></div><div class="trans-scanline"></div><div class="trans-label"></div>';
    document.body.appendChild(overlay);
  }

  function playTransition(targetPageName, href) {
    createTransitionOverlay();
    var overlay = document.getElementById('sgn-transition-overlay');
    var scanline = overlay.querySelector('.trans-scanline');
    var flash = overlay.querySelector('.trans-flash');
    var grid = overlay.querySelector('.trans-grid');
    var label = overlay.querySelector('.trans-label');

    label.textContent = '\u25C8 SWITCHING TO ' + targetPageName + ' \u25C8';
    overlay.classList.add('active');
    scanline.style.animation = 'trans-scan-sweep 0.45s ease-in-out forwards';
    flash.style.animation = 'trans-flash-pulse 0.45s ease-in-out forwards';
    grid.style.animation = 'trans-grid-flash 0.45s ease-in-out forwards';
    label.style.animation = 'trans-label-flash 0.45s ease-in-out forwards';
    sessionStorage.setItem(TRANSITION_KEY, targetPageName);
    setTimeout(function() { window.location.href = href; }, 220);
  }

  function playArrivalTransition() {
    var targetName = sessionStorage.getItem(TRANSITION_KEY);
    if (!targetName) return;
    sessionStorage.removeItem(TRANSITION_KEY);
    createTransitionOverlay();
    var overlay = document.getElementById('sgn-transition-overlay');
    var scanline = overlay.querySelector('.trans-scanline');
    var flash = overlay.querySelector('.trans-flash');
    var grid = overlay.querySelector('.trans-grid');
    overlay.classList.add('active');
    scanline.style.top = '0';
    scanline.style.animation = 'trans-scan-sweep 0.35s ease-out forwards';
    flash.style.animation = 'trans-flash-pulse 0.35s ease-out forwards';
    grid.style.animation = 'trans-grid-flash 0.35s ease-out forwards';
    setTimeout(function() {
      overlay.classList.remove('active');
      scanline.style.animation = '';
      flash.style.animation = '';
      grid.style.animation = '';
    }, 400);
  }

  function wireNavigation() {
    var PAGE_NAMES = {
      'index.html':     'STAR CHART',
      'wiki.html':      'CODEX',
      'personnel.html': 'PERSONNEL',
      'orbat.html':     'ORBAT',
      'language.html':  'LANGUAGE FORGE',
      'briefing.html':  'BRIEFING',
      'galaxy.html':    'GALAXY MAP'
    };

    document.addEventListener('click', function(e) {
      var link = e.target.closest('.hud-nav');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;
      var targetFile = href.replace('./', '');
      var currentFile = window.location.pathname.split('/').pop() || 'index.html';
      if (targetFile === currentFile) return;
      var targetName = PAGE_NAMES[targetFile];
      if (!targetName) return;
      e.preventDefault();
      playTransition(targetName, href);
    });
  }

  function init() {
    var bootDone = sessionStorage.getItem(BOOT_SESSION_KEY) === '1';
    var hasTransition = sessionStorage.getItem(TRANSITION_KEY);
    if (!bootDone && !hasTransition) {
      runBootSequence();
    } else if (hasTransition) {
      playArrivalTransition();
    }
    wireNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
