/* ══════════════════════════════════════════════════════════════
   SGN — BOOT SEQUENCE & PAGE TRANSITION
   
   Boot: Typewriter terminal initialization, once per browser session.
   Transition: Cyan scan-line wipe when navigating between SGN pages.
   
   Load this script on every page BEFORE other scripts.
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const BOOT_SESSION_KEY = 'sgn_boot_done';
  const TRANSITION_KEY   = 'sgn_transition_pending';

  /* ── Detect current page ── */
  function currentPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const map = {
      'index.html':     'STAR CHART',
      'wiki.html':      'CODEX',
      'personnel.html': 'PERSONNEL',
      'orbat.html':     'ORBAT',
      'language.html':  'LANGUAGE FORGE'
    };
    return map[path] || 'TERMINAL';
  }

  /* ══════════════════════════════════════════
     INJECT STYLES (shared for both features)
     ══════════════════════════════════════════ */

  function injectStyles() {
    if (document.getElementById('sgn-boot-styles')) return;
    const style = document.createElement('style');
    style.id = 'sgn-boot-styles';
    style.textContent = `
      /* ── Boot overlay ── */
      #sgn-boot-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: #050810;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
        transition: opacity 0.6s ease;
        pointer-events: all;
      }
      #sgn-boot-overlay.fade-out {
        opacity: 0;
        pointer-events: none;
      }
      #sgn-boot-overlay::before {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 3px,
          rgba(0,0,0,.06) 3px,
          rgba(0,0,0,.06) 4px
        );
        pointer-events: none;
      }

      .boot-watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Rajdhani', sans-serif;
        font-weight: 700;
        font-size: 80px;
        letter-spacing: 20px;
        color: rgba(56,232,255,.03);
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
      }

      .boot-console {
        font-family: 'Share Tech Mono', monospace;
        font-size: 12px;
        line-height: 2.4;
        max-width: 580px;
        width: 90%;
        position: relative;
        z-index: 1;
      }

      .boot-line {
        opacity: 0;
        transform: translateY(2px);
        white-space: nowrap;
        overflow: hidden;
      }
      .boot-line.visible {
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.15s ease, transform 0.15s ease;
      }

      .boot-prefix { color: #0e1a2a; }
      .boot-text   { color: #1a7090; }
      .boot-ok     { color: #5cdb7a; }
      .boot-cyan   { color: #38e8ff; }
      .boot-gold   { color: #f5c542; }
      .boot-dim    { color: #0e1a2a; }
      .boot-ready  { color: #38e8ff; font-size: 13px; letter-spacing: 2px; }

      .boot-cursor {
        display: inline-block;
        width: 7px;
        height: 13px;
        background: #1a7090;
        margin-left: 2px;
        vertical-align: text-bottom;
        animation: boot-blink 0.6s step-end infinite;
      }
      @keyframes boot-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }

      .boot-progress-wrap {
        margin-top: 8px;
        opacity: 0;
        transition: opacity 0.3s;
      }
      .boot-progress-wrap.visible { opacity: 1; }
      .boot-progress-bar {
        width: 100%;
        height: 2px;
        background: rgba(26,45,70,.3);
        border-radius: 1px;
        overflow: hidden;
      }
      .boot-progress-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #1a7090, #38e8ff);
        border-radius: 1px;
        transition: width 0.3s ease;
      }

      /* ── Page transition overlay ── */
      #sgn-transition-overlay {
        position: fixed;
        inset: 0;
        z-index: 99998;
        pointer-events: none;
        display: none;
      }
      #sgn-transition-overlay.active {
        display: block;
        pointer-events: all;
      }

      .trans-scanline {
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(
          90deg,
          transparent 5%,
          rgba(56,232,255,.6) 30%,
          #38e8ff 50%,
          rgba(56,232,255,.6) 70%,
          transparent 95%
        );
        box-shadow:
          0 0 20px rgba(56,232,255,.5),
          0 0 60px rgba(56,232,255,.2),
          0 -4px 12px rgba(56,232,255,.15),
          0 4px 12px rgba(56,232,255,.15);
        top: 0;
        opacity: 0;
      }

      .trans-flash {
        position: absolute;
        inset: 0;
        background: rgba(56,232,255,.03);
        opacity: 0;
      }

      .trans-grid {
        position: absolute;
        inset: 0;
        background-image: radial-gradient(
          circle at 1px 1px,
          rgba(56,232,255,.04) 1px,
          transparent 0
        );
        background-size: 24px 24px;
        opacity: 0;
      }

      .trans-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Share Tech Mono', monospace;
        font-size: 11px;
        letter-spacing: 4px;
        text-transform: uppercase;
        color: rgba(56,232,255,.4);
        white-space: nowrap;
        opacity: 0;
      }

      /* Transition animations */
      @keyframes trans-scan-sweep {
        0%   { top: -3px; opacity: 0; }
        8%   { opacity: 1; }
        92%  { opacity: 1; }
        100% { top: 100%; opacity: 0; }
      }
      @keyframes trans-flash-pulse {
        0%   { opacity: 0; }
        15%  { opacity: 1; }
        40%  { opacity: 0; }
        100% { opacity: 0; }
      }
      @keyframes trans-grid-flash {
        0%   { opacity: 0; }
        10%  { opacity: 0.5; }
        50%  { opacity: 0.3; }
        100% { opacity: 0; }
      }
      @keyframes trans-label-flash {
        0%   { opacity: 0; }
        15%  { opacity: 1; }
        70%  { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════
     BOOT SEQUENCE
     ══════════════════════════════════════════ */

  function getDataCounts() {
    const counts = { systems: 0, fleets: 0, lexicon: 0, personnel: 0, codex: 0, orbats: 0 };
    try {
      const map = localStorage.getItem('sgn_map_state_v1');
      if (map) { const d = JSON.parse(map); counts.systems = d.systems?.length || 0; }
    } catch {}
    try {
      const fl = localStorage.getItem('sgn_fleets_v1');
      if (fl) { const d = JSON.parse(fl); counts.fleets = Array.isArray(d) ? d.length : 0; }
    } catch {}
    try {
      const lang = localStorage.getItem('sgn_language_v1');
      if (lang) { const d = JSON.parse(lang); counts.lexicon = d.entries?.length || 0; }
    } catch {}
    try {
      const per = localStorage.getItem('sgn_personnel_v1');
      if (per) { const d = JSON.parse(per); counts.personnel = Array.isArray(d) ? d.length : 0; }
    } catch {}
    try {
      const cx = localStorage.getItem('sgn_codex_v1');
      if (cx) { const d = JSON.parse(cx); counts.codex = Array.isArray(d) ? d.length : 0; }
    } catch {}
    try {
      const ob = localStorage.getItem('sgn_orbat_v1');
      if (ob) { const d = JSON.parse(ob); counts.orbats = Array.isArray(d) ? d.length : 0; }
    } catch {}
    return counts;
  }

  function getStardateString() {
    /* Replicate stardate calculation inline so boot doesn't depend on stardate.js loading first */
    const ANCHOR = new Date('2026-03-14T00:00:00Z').getTime();
    const YEAR = 4180;
    const REAL_SEC_PER_YEAR = 604800;
    const DAYS_PER_YEAR = 360;
    const REAL_SEC_PER_DAY = REAL_SEC_PER_YEAR / DAYS_PER_YEAR;
    const MONTHS = [
      'Luinavas','Silquendil','Tirnvarë','Lissuinion','Valandarië','Urithiel',
      'Narviondë','Fanyamarë','Myndarial','Rilyarion','Morilthië','Vanyasilmë'
    ];

    const realSec = (Date.now() - ANCHOR) / 1000;
    const totalDays = realSec / REAL_SEC_PER_DAY;
    const yearsElapsed = Math.floor(totalDays / DAYS_PER_YEAR);
    const year = YEAR + yearsElapsed;
    let dayOfYear = totalDays - (yearsElapsed * DAYS_PER_YEAR);
    if (dayOfYear < 0) dayOfYear = 0;
    const monthIdx = Math.min(Math.floor(dayOfYear / 30), 11);
    const day = Math.floor(dayOfYear - (monthIdx * 30)) + 1;
    const month = monthIdx + 1;
    const pad = n => String(n).padStart(2, '0');

    return {
      dateStr: `ANV ${year}.${pad(month)}.${pad(day)}`,
      monthName: MONTHS[monthIdx]
    };
  }

  function runBootSequence() {
    injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'sgn-boot-overlay';

    const counts = getDataCounts();
    const sd = getStardateString();
    const pageName = currentPage();

    /* Build sync summary */
    const syncParts = [];
    if (counts.systems)   syncParts.push(`${counts.systems} systems`);
    if (counts.fleets)    syncParts.push(`${counts.fleets} fleets`);
    if (counts.personnel) syncParts.push(`${counts.personnel} personnel`);
    if (counts.codex)     syncParts.push(`${counts.codex} codex entries`);
    if (counts.orbats)    syncParts.push(`${counts.orbats} ORBATs`);
    if (counts.lexicon)   syncParts.push(`${counts.lexicon} lexicon entries`);
    const syncStr = syncParts.length ? syncParts.join(' \u00b7 ') : 'empty datacore';

    const lines = [
      { prefix: '[SYS]',  text: `Establishing link to AEN Command Network`,      cursor: true },
      { prefix: '[NET]',  text: `Connection secured \u00b7 Encryption: <span class="boot-cyan">VALARINDË AUTHORITY</span>`, ok: true },
      { prefix: '[AUTH]', text: `Authenticating terminal credentials`,            cursor: true },
      { prefix: '[AUTH]', text: `Clearance verified \u00b7 Tier: <span class="boot-gold">COMMAND</span>`, ok: true },
      { prefix: '[SYNC]', text: `Synchronizing datacore \u00b7 ${syncStr}`,      cursor: true },
      { prefix: '[SYNC]', text: `Datacore online`,                                ok: true },
      { prefix: '[TIME]', text: `Anorvalas Standard: <span class="boot-gold">${sd.dateStr} \u00b7 ${sd.monthName.toUpperCase()}</span>` },
      { prefix: '',       text: `<span class="boot-ready">AEN TERMINAL READY</span> <span class="boot-ok">\u00b7 ALL SYSTEMS NOMINAL \u00b7</span> <span class="boot-dim">Alcar i Arandor\u00eb</span>` },
    ];

    overlay.innerHTML = `
      <div class="boot-watermark">AEN</div>
      <div class="boot-console" id="boot-console">
        ${lines.map((l, i) => `
          <div class="boot-line" data-idx="${i}">
            <span class="boot-prefix">${l.prefix}</span>
            <span class="boot-text">${l.text}</span>
            ${l.ok ? '<span class="boot-ok"> \u2713</span>' : ''}
            ${l.cursor ? '<span class="boot-cursor"></span>' : ''}
          </div>
        `).join('')}
        <div class="boot-progress-wrap" id="boot-progress">
          <div class="boot-progress-bar"><div class="boot-progress-fill" id="boot-progress-fill"></div></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    /* Sequence timing */
    const lineEls = overlay.querySelectorAll('.boot-line');
    const progressWrap = overlay.querySelector('#boot-progress');
    const progressFill = overlay.querySelector('#boot-progress-fill');
    const delays = [200, 800, 1600, 2300, 3100, 3900, 4500, 5200];
    let progress = 0;

    /* Show progress bar early */
    setTimeout(() => {
      progressWrap.classList.add('visible');
    }, 300);

    delays.forEach((delay, i) => {
      setTimeout(() => {
        lineEls[i].classList.add('visible');
        /* Remove cursor from previous lines */
        if (i > 0) {
          const prevCursor = lineEls[i - 1].querySelector('.boot-cursor');
          if (prevCursor) prevCursor.style.display = 'none';
        }
        /* Update progress */
        progress = ((i + 1) / lines.length) * 100;
        progressFill.style.width = progress + '%';
      }, delay);
    });

    /* Fade out and remove */
    const totalTime = delays[delays.length - 1] + 1200;
    setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.remove();
      }, 700);
    }, totalTime);

    /* Mark boot as done for this session */
    sessionStorage.setItem(BOOT_SESSION_KEY, '1');
  }

  /* ══════════════════════════════════════════
     PAGE TRANSITION
     ══════════════════════════════════════════ */

  function createTransitionOverlay() {
    if (document.getElementById('sgn-transition-overlay')) return;
    injectStyles();
    const overlay = document.createElement('div');
    overlay.id = 'sgn-transition-overlay';
    overlay.innerHTML = `
      <div class="trans-grid"></div>
      <div class="trans-flash"></div>
      <div class="trans-scanline"></div>
      <div class="trans-label"></div>
    `;
    document.body.appendChild(overlay);
  }

  function playTransition(targetPageName, href) {
    createTransitionOverlay();
    const overlay = document.getElementById('sgn-transition-overlay');
    const scanline = overlay.querySelector('.trans-scanline');
    const flash = overlay.querySelector('.trans-flash');
    const grid = overlay.querySelector('.trans-grid');
    const label = overlay.querySelector('.trans-label');

    label.textContent = `\u25C8 SWITCHING TO ${targetPageName} \u25C8`;

    overlay.classList.add('active');

    /* Animate */
    scanline.style.animation = 'trans-scan-sweep 0.45s ease-in-out forwards';
    flash.style.animation = 'trans-flash-pulse 0.45s ease-in-out forwards';
    grid.style.animation = 'trans-grid-flash 0.45s ease-in-out forwards';
    label.style.animation = 'trans-label-flash 0.45s ease-in-out forwards';

    /* Mark that a transition is pending so the target page shows arrival */
    sessionStorage.setItem(TRANSITION_KEY, targetPageName);

    /* Navigate after the sweep passes the middle of the screen */
    setTimeout(() => {
      window.location.href = href;
    }, 220);
  }

  function playArrivalTransition() {
    const targetName = sessionStorage.getItem(TRANSITION_KEY);
    if (!targetName) return;
    sessionStorage.removeItem(TRANSITION_KEY);

    createTransitionOverlay();
    const overlay = document.getElementById('sgn-transition-overlay');
    const scanline = overlay.querySelector('.trans-scanline');
    const flash = overlay.querySelector('.trans-flash');
    const grid = overlay.querySelector('.trans-grid');

    overlay.classList.add('active');

    /* Play the second half of the sweep (arriving) */
    scanline.style.top = '0';
    scanline.style.animation = 'trans-scan-sweep 0.35s ease-out forwards';
    flash.style.animation = 'trans-flash-pulse 0.35s ease-out forwards';
    grid.style.animation = 'trans-grid-flash 0.35s ease-out forwards';

    setTimeout(() => {
      overlay.classList.remove('active');
      /* Reset animations */
      scanline.style.animation = '';
      flash.style.animation = '';
      grid.style.animation = '';
    }, 400);
  }

  /* ── Intercept navigation clicks on HUD nav links ── */
  function wireNavigation() {
    const PAGE_NAMES = {
      'index.html':     'STAR CHART',
      'wiki.html':      'CODEX',
      'personnel.html': 'PERSONNEL',
      'orbat.html':     'ORBAT',
      'language.html':  'LANGUAGE FORGE'
      'briefing.html':  'BRIEFING'
      'galaxy.html':  'GALAXY MAP'
    };

    document.addEventListener('click', e => {
      const link = e.target.closest('.hud-nav');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href) return;

      /* Don't transition if clicking the current page */
      const targetFile = href.replace('./', '');
      const currentFile = window.location.pathname.split('/').pop() || 'index.html';
      if (targetFile === currentFile) return;

      /* Check if this is an SGN page */
      const targetName = PAGE_NAMES[targetFile];
      if (!targetName) return;

      e.preventDefault();
      playTransition(targetName, href);
    });
  }

  /* ══════════════════════════════════════════
     INIT
     ══════════════════════════════════════════ */

  function init() {
    const bootDone = sessionStorage.getItem(BOOT_SESSION_KEY) === '1';
    const hasTransition = sessionStorage.getItem(TRANSITION_KEY);

    if (!bootDone && !hasTransition) {
      /* First visit this session: play boot sequence */
      runBootSequence();
    } else if (hasTransition) {
      /* Arriving from a page transition: play arrival sweep */
      playArrivalTransition();
    }

    /* Always wire up navigation for future clicks */
    wireNavigation();
  }

  /* Run on DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
