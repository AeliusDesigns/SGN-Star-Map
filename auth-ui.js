/* ══════════════════════════════════════════
   SGN — AUTH UI

   Floating "AUTH" badge in the top-right
   corner + login modal. Mounted automatically
   on DOMContentLoaded. Pages just need to
   include both auth.js and auth-ui.js.

   Public API:
     SGNAuthUI.promptLogin([reasonLevel])
        → Promise<bool>  true if logged in after
   ══════════════════════════════════════════ */

window.SGNAuthUI = (function () {
  'use strict';

  let _modalEl = null;
  let _badgeEl = null;
  const _resolvers = [];

  /* ── Inject CSS once ── */
  function _mountStyles() {
    if (document.getElementById('sgn-auth-styles')) return;
    const s = document.createElement('style');
    s.id = 'sgn-auth-styles';
    s.textContent = `
      .sgn-auth-badge {
        position: fixed; top: 14px; right: 14px; z-index: 9998;
        font-family: 'Share Tech Mono', 'Courier New', monospace;
        font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
        background: rgba(5,8,16,.85); color: #5a7a99;
        border: 1px solid #1a2d46; border-radius: 3px;
        padding: 6px 12px; cursor: pointer; user-select: none;
        backdrop-filter: blur(6px); transition: all .15s;
      }
      .sgn-auth-badge:hover { border-color: #38e8ff; color: #c8deff; }
      .sgn-auth-badge.logged-in { color: #c8deff; border-color: rgba(56,232,255,.35); }
      .sgn-auth-badge.tier-4 { color: #ffd75c; border-color: rgba(255,215,92,.45); }
      .sgn-auth-badge.tier-3 { color: #ff7a7a; border-color: rgba(255,122,122,.45); }
      .sgn-auth-badge.tier-2 { color: #b0c4ff; border-color: rgba(176,196,255,.45); }
      .sgn-auth-badge.tier-1 { color: #5cdb75; border-color: rgba(92,219,117,.45); }
      .sgn-auth-badge .sgn-auth-tier { font-weight: bold; margin-right: 6px; }

      .sgn-auth-modal-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(2,4,9,.78); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        font-family: 'Share Tech Mono', 'Courier New', monospace;
      }
      .sgn-auth-modal {
        background: #050810; border: 1px solid #1a3a5a;
        border-radius: 4px; padding: 28px 32px 22px; width: 360px;
        box-shadow: 0 8px 40px rgba(56,232,255,.08), 0 0 1px rgba(56,232,255,.3);
        color: #c8deff;
      }
      .sgn-auth-title {
        color: #38e8ff; font-size: 14px; letter-spacing: 3px;
        margin-bottom: 4px; font-weight: 600;
      }
      .sgn-auth-sub {
        color: #5a7a99; font-size: 11px; letter-spacing: 1px;
        margin-bottom: 22px; text-transform: uppercase;
      }
      .sgn-auth-input {
        width: 100%; box-sizing: border-box;
        background: #080d18; border: 1px solid #243d5e; color: #c8deff;
        padding: 10px 12px; font-family: inherit; font-size: 13px;
        border-radius: 3px; outline: none; margin-bottom: 12px;
      }
      .sgn-auth-input:focus { border-color: #38e8ff; }
      .sgn-auth-error {
        color: #ff7a7a; font-size: 11px; min-height: 14px;
        margin: 4px 0 12px; letter-spacing: .5px;
      }
      .sgn-auth-actions {
        display: flex; justify-content: flex-end; gap: 10px;
      }
      .sgn-auth-actions button {
        background: transparent; color: #c8deff;
        font-family: inherit; font-size: 11px; letter-spacing: 2px;
        text-transform: uppercase; padding: 8px 18px;
        border: 1px solid #243d5e; border-radius: 3px; cursor: pointer;
        transition: all .15s;
      }
      .sgn-auth-cancel:hover { border-color: #5a7a99; }
      .sgn-auth-submit { color: #38e8ff !important; border-color: #1a7090 !important; }
      .sgn-auth-submit:hover { background: rgba(56,232,255,.08); }
    `;
    document.head.appendChild(s);
  }

  /* ── Status badge ── */
  function _mountBadge() {
    if (_badgeEl || !document.body) return;
    const el = document.createElement('div');
    el.className = 'sgn-auth-badge';
    el.id = 'sgn-auth-badge';
    el.title = 'Click to sign in / out';
    document.body.appendChild(el);
    _badgeEl = el;
    _renderBadge(SGNAuth.currentUser());
    SGNAuth.onChange(_renderBadge);
    el.addEventListener('click', () => {
      if (SGNAuth.currentUser()) {
        if (confirm('Log out of SGN?')) SGNAuth.logout();
      } else {
        promptLogin();
      }
    });
  }

  function _renderBadge(user) {
    if (!_badgeEl) return;
    _badgeEl.classList.remove('logged-in', 'tier-1', 'tier-2', 'tier-3', 'tier-4');
    if (user) {
      _badgeEl.innerHTML =
        '<span class="sgn-auth-tier">' + SGNAuth.tierName(user.level) + '</span>· ' +
        _esc(user.username);
      _badgeEl.classList.add('logged-in', 'tier-' + user.level);
    } else {
      _badgeEl.textContent = 'PUBLIC ACCESS · SIGN IN';
    }
  }

  function _esc(s) {
    const d = document.createElement('div'); d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  /* ── Login modal ── */
  function promptLogin(reasonLevel) {
    return new Promise(resolve => {
      _resolvers.push(resolve);
      _showModal(reasonLevel);
    });
  }

  function _showModal(reasonLevel) {
    if (!_modalEl) _buildModal();
    _modalEl.style.display = 'flex';
    const sub = _modalEl.querySelector('.sgn-auth-sub');
    if (typeof reasonLevel === 'number' && SGNAuth.TIER_NAMES[reasonLevel]) {
      sub.textContent = 'Requires ' + SGNAuth.tierName(reasonLevel) + ' clearance';
    } else {
      sub.textContent = 'Sign in to view restricted material';
    }
    _modalEl.querySelector('#sgn-auth-error').textContent = '';
    _modalEl.querySelector('#sgn-auth-pw').value = '';
    setTimeout(() => {
      const u = _modalEl.querySelector('#sgn-auth-user');
      (u.value ? _modalEl.querySelector('#sgn-auth-pw') : u).focus();
    }, 0);
  }

  function _hideModal(loggedIn) {
    if (_modalEl) _modalEl.style.display = 'none';
    while (_resolvers.length) _resolvers.shift()(!!loggedIn);
  }

  function _buildModal() {
    const overlay = document.createElement('div');
    overlay.className = 'sgn-auth-modal-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="sgn-auth-modal" role="dialog" aria-modal="true">
        <div class="sgn-auth-title">SECURE ACCESS</div>
        <div class="sgn-auth-sub">Sign in to view restricted material</div>
        <input class="sgn-auth-input" id="sgn-auth-user" placeholder="Username" autocomplete="username" autocapitalize="off" spellcheck="false">
        <input class="sgn-auth-input" id="sgn-auth-pw" type="password" placeholder="Password" autocomplete="current-password">
        <div class="sgn-auth-error" id="sgn-auth-error"></div>
        <div class="sgn-auth-actions">
          <button class="sgn-auth-cancel" id="sgn-auth-cancel" type="button">Cancel</button>
          <button class="sgn-auth-submit" id="sgn-auth-submit" type="button">Sign In</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    _modalEl = overlay;

    const userIn = overlay.querySelector('#sgn-auth-user');
    const pwIn = overlay.querySelector('#sgn-auth-pw');
    const err = overlay.querySelector('#sgn-auth-error');
    const submit = overlay.querySelector('#sgn-auth-submit');
    const cancel = overlay.querySelector('#sgn-auth-cancel');

    cancel.addEventListener('click', () => _hideModal(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) _hideModal(false); });
    document.addEventListener('keydown', e => {
      if (overlay.style.display === 'flex' && e.key === 'Escape') _hideModal(false);
    });

    async function attempt() {
      const u = userIn.value.trim();
      const p = pwIn.value;
      if (!u || !p) { err.textContent = 'Enter username and password.'; return; }
      err.textContent = 'Verifying…'; submit.disabled = true;
      try {
        await SGNAuth.login(u, p);
        err.textContent = '';
        _hideModal(true);
      } catch (e) {
        err.textContent = (e && e.message) || 'Login failed.';
      } finally {
        submit.disabled = false;
      }
    }
    submit.addEventListener('click', attempt);
    [userIn, pwIn].forEach(el => el.addEventListener('keydown', e => {
      if (e.key === 'Enter') attempt();
    }));
  }

  /* ── Boot ── */
  function _boot() { _mountStyles(); _mountBadge(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  return { promptLogin };
})();
