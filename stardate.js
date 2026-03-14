/* ══════════════════════════════════════════════════════════════
   SGN — ANORVALAS STANDARD STARDATE CLOCK
   
   Calendar: 12 months × 30 days = 360-day year
   Time ratio: 1 real week = 1 in-world year
   Anchor: 2026-03-14T00:00:00Z = ANV 4180.01.01
   
   Display: ANV 4180.02.17 · SILQUENDIL
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Calendar definitions ── */
  const MONTHS = [
    { name: 'Luinavas',    meaning: 'Deep Blue Awakening' },
    { name: 'Silquendil',  meaning: 'Gleam of Silver' },
    { name: 'Tirnvarë',    meaning: "Guardian's Song" },
    { name: 'Lissuinion',  meaning: 'Blossom of Sweet Fragrance' },
    { name: 'Valandarië',  meaning: 'The Golden Days' },
    { name: 'Urithiel',    meaning: 'Flame of the Sky' },
    { name: 'Narviondë',   meaning: "The Ember's Rest" },
    { name: 'Fanyamarë',   meaning: 'Veil of the Heavens' },
    { name: 'Myndarial',   meaning: 'Echoes of Twilight' },
    { name: 'Rilyarion',   meaning: 'Crimson Leaves' },
    { name: 'Morilthië',   meaning: 'Dimming of the Light' },
    { name: 'Vanyasilmë',  meaning: 'Radiance of Starlight' },
  ];

  const DAYS_PER_MONTH = 30;
  const MONTHS_PER_YEAR = 12;
  const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR; // 360

  /* ── Time ratio ── */
  const REAL_SECONDS_PER_YEAR = 7 * 24 * 60 * 60; // 604800 (1 week)
  const REAL_SECONDS_PER_DAY = REAL_SECONDS_PER_YEAR / DAYS_PER_YEAR; // ~1680 seconds (~28 min)
  const IN_WORLD_SECONDS_PER_REAL_SECOND = (DAYS_PER_YEAR * 24 * 60 * 60) / REAL_SECONDS_PER_YEAR;
  // = 31,104,000 / 604,800 ≈ 51.43

  /* ── Anchor point ── */
  const ANCHOR_REAL = new Date('2026-03-14T00:00:00Z').getTime();
  const ANCHOR_YEAR = 4180;
  const ANCHOR_DAY = 0; // day 0 of year 4180 (= month 1, day 1)

  /* ── Compute current stardate ── */
  function getStardate(now) {
    const realMs = (now || Date.now()) - ANCHOR_REAL;
    const realSeconds = realMs / 1000;

    /* Total in-world days elapsed since anchor */
    const totalInWorldDays = (realSeconds / REAL_SECONDS_PER_DAY) + ANCHOR_DAY;

    /* Year */
    const yearsElapsed = Math.floor(totalInWorldDays / DAYS_PER_YEAR);
    const year = ANCHOR_YEAR + yearsElapsed;

    /* Day within current year (0-indexed) */
    let dayOfYear = totalInWorldDays - (yearsElapsed * DAYS_PER_YEAR);
    if (dayOfYear < 0) dayOfYear = 0;

    /* Month (1-indexed) and day (1-indexed) */
    const monthIndex = Math.min(Math.floor(dayOfYear / DAYS_PER_MONTH), MONTHS_PER_YEAR - 1);
    const dayInMonth = Math.floor(dayOfYear - (monthIndex * DAYS_PER_MONTH)) + 1;
    const month = monthIndex + 1;

    /* In-world time of day */
    const fractionalDay = dayOfYear - Math.floor(dayOfYear);
    const totalDaySeconds = fractionalDay * 24 * 60 * 60;
    const hours = Math.floor(totalDaySeconds / 3600);
    const minutes = Math.floor((totalDaySeconds % 3600) / 60);
    const seconds = Math.floor(totalDaySeconds % 60);

    return {
      year,
      month,
      day: Math.min(dayInMonth, DAYS_PER_MONTH),
      hours, minutes, seconds,
      monthName: MONTHS[monthIndex].name,
      monthMeaning: MONTHS[monthIndex].meaning,
      dayOfYear: Math.floor(dayOfYear) + 1,
      totalDays: DAYS_PER_YEAR,
    };
  }

  /* ── Format helpers ── */
  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatStardate(sd) {
    return `ANV ${sd.year}.${pad2(sd.month)}.${pad2(sd.day)}`;
  }

  function formatFull(sd) {
    return `${formatStardate(sd)} · ${sd.monthName.toUpperCase()}`;
  }

  function formatTime(sd) {
    return `${pad2(sd.hours)}:${pad2(sd.minutes)}:${pad2(sd.seconds)}`;
  }

  /* ── Inject styles ── */
  function injectStyles() {
    if (document.getElementById('sgn-stardate-styles')) return;
    const style = document.createElement('style');
    style.id = 'sgn-stardate-styles';
    style.textContent = `
      .stardate-block {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'Share Tech Mono', monospace;
        font-size: 11px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        pointer-events: all;
        position: relative;
      }
      .stardate-prefix {
        color: var(--cyan-dim, #1a7090);
        font-size: 9px;
        letter-spacing: 2px;
      }
      .stardate-date {
        color: var(--cyan, #38e8ff);
        text-shadow: 0 0 8px rgba(56,232,255,.3);
      }
      .stardate-sep {
        color: var(--text-muted, #2e4a66);
        font-size: 10px;
      }
      .stardate-month {
        color: var(--gold, #f5c542);
        font-size: 10px;
        letter-spacing: 1px;
      }
      .stardate-time {
        color: var(--text-dim, #5a7a99);
        font-size: 10px;
        letter-spacing: 1px;
        font-variant-numeric: tabular-nums;
      }
      .stardate-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--cyan, #38e8ff);
        box-shadow: 0 0 4px var(--cyan, #38e8ff);
        animation: sd-blink 2s ease-in-out infinite;
        flex-shrink: 0;
      }
      @keyframes sd-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
      }

      /* Tooltip on hover showing meaning */
      .stardate-block .stardate-tip {
        display: none;
        position: absolute;
        bottom: 100%;
        right: 0;
        margin-bottom: 8px;
        background: rgba(8,13,24,.95);
        border: 1px solid var(--border2, #243d5e);
        border-radius: 3px;
        padding: 6px 10px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 100;
        box-shadow: 0 4px 16px rgba(0,0,0,.5);
      }
      .stardate-tip-label {
        font-family: 'Share Tech Mono', monospace;
        font-size: 9px;
        color: var(--text-muted, #2e4a66);
        letter-spacing: 1.5px;
        margin-bottom: 3px;
      }
      .stardate-tip-name {
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: var(--gold, #f5c542);
        letter-spacing: 0.5px;
        text-transform: none;
      }
      .stardate-tip-meaning {
        font-family: 'Exo 2', sans-serif;
        font-size: 11px;
        color: var(--text-dim, #5a7a99);
        font-style: italic;
        text-transform: none;
        letter-spacing: 0;
        margin-top: 1px;
      }
      .stardate-tip-detail {
        font-family: 'Share Tech Mono', monospace;
        font-size: 9px;
        color: var(--text-muted, #2e4a66);
        letter-spacing: 1px;
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px solid var(--border, #1a2d46);
      }
      .stardate-block:hover .stardate-tip {
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  /* ── Create the stardate DOM element ── */
  function createStardateElement() {
    const el = document.createElement('div');
    el.className = 'stardate-block';
    el.id = 'sgn-stardate';
    el.innerHTML = `
      <div class="stardate-dot"></div>
      <span class="stardate-date" id="sd-date">—</span>
      <span class="stardate-sep">·</span>
      <span class="stardate-month" id="sd-month">—</span>
      <span class="stardate-sep">·</span>
      <span class="stardate-time" id="sd-time">--:--:--</span>
      <div class="stardate-tip" id="sd-tip">
        <div class="stardate-tip-label">ANORVALAS STANDARD</div>
        <div class="stardate-tip-name" id="sd-tip-name">—</div>
        <div class="stardate-tip-meaning" id="sd-tip-meaning">—</div>
        <div class="stardate-tip-detail" id="sd-tip-detail">—</div>
      </div>
    `;
    return el;
  }

  /* ── Mount into status bar or summary bar ── */
  function mount() {
    injectStyles();

    /* Star Chart — has #statusBar (already full-width fixed), insert before the save button */
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
      const el = createStardateElement();
      const saveBtn = statusBar.querySelector('.sb-save-btn');
      if (saveBtn) {
        statusBar.insertBefore(el, saveBtn);
      } else {
        statusBar.appendChild(el);
      }
      startTicking(el);
      return;
    }

    /* ORBAT, Personnel, Codex — create a full-width fixed footer bar */
    const app = document.getElementById('app');
    if (app) {
      const bar = document.createElement('div');
      bar.id = 'sgn-stardate-bar';
      bar.style.cssText = `
        height: 32px;
        background: rgba(5,8,16,.9);
        border-top: 1px solid var(--border, #1a2d46);
        display: flex;
        align-items: center;
        padding: 0 14px;
        gap: 16px;
        flex-shrink: 0;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 40;
      `;
      const el = createStardateElement();
      const spacer = document.createElement('div');
      spacer.style.flex = '1';
      bar.appendChild(spacer);
      bar.appendChild(el);
      document.body.appendChild(bar);

      /* Adjust app to account for the bar */
      app.style.height = 'calc(100vh - 32px)';

      startTicking(el);
    }
  }

  /* ── Tick loop ── */
  function startTicking(el) {
    const sdDate = el.querySelector('#sd-date');
    const sdMonth = el.querySelector('#sd-month');
    const sdTime = el.querySelector('#sd-time');
    const sdTipName = el.querySelector('#sd-tip-name');
    const sdTipMeaning = el.querySelector('#sd-tip-meaning');
    const sdTipDetail = el.querySelector('#sd-tip-detail');

    function tick() {
      const sd = getStardate();
      sdDate.textContent = `ANV ${sd.year}.${pad2(sd.month)}.${pad2(sd.day)}`;
      sdMonth.textContent = sd.monthName.toUpperCase();
      sdTime.textContent = formatTime(sd);
      sdTipName.textContent = sd.monthName;
      sdTipMeaning.textContent = sd.monthMeaning;
      sdTipDetail.textContent = `DAY ${sd.dayOfYear} OF ${sd.totalDays} · ${formatTime(sd)} LOCAL`;
    }

    tick();
    setInterval(tick, 500); // update twice per second for smooth seconds display
  }

  /* ── Boot on DOM ready ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  /* ── Expose API ── */
  window.SGNStardate = { getStardate, formatStardate, formatFull, formatTime, MONTHS };
})();
