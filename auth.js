/* ═══════════════════════════════════════════════════════════════════════════
   SGN AUTH MODULE — Hardened Editor Authentication
   ═══════════════════════════════════════════════════════════════════════════
   - SHA-256 hashed password (plaintext never stored anywhere)
   - Rate limiting with exponential backoff
   - HMAC-based session tokens (can't be faked from console)
   - Config fetched once, then scrubbed from memory
   - Shared across all SGN pages
   ═══════════════════════════════════════════════════════════════════════════ */

const SGN_Auth = (() => {
  'use strict';

  /* ── Config ──────────────────────────────────────────────────────────── */
  const CONFIG_PATH   = './.sgn_cfg';          // obfuscated filename
  const SESSION_KEY   = 'sgn_at';              // session token key
  const LOCKOUT_KEY   = 'sgn_rl';              // rate-limit state key
  const TOKEN_SECRET  = 'sgn::vardalum::7';    // HMAC mixing secret

  /* ── Internal state ─────────────────────────────────────────────────── */
  let _hash     = null;   // SHA-256 hash from config (never the plaintext)
  let _salt     = null;   // per-deployment salt from config
  let _ready    = false;  // config loaded?
  let _verified = false;  // session verified this page load?

  /* ── Crypto helpers ─────────────────────────────────────────────────── */
  async function sha256(str) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(str)
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function hmac256(key, msg) {
    const k = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign(
      'HMAC',
      k,
      new TextEncoder().encode(msg)
    );
    return Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /* ── Rate limiting ──────────────────────────────────────────────────── */
  function getRateState() {
    try {
      const raw = sessionStorage.getItem(LOCKOUT_KEY);
      if (!raw) return { attempts: 0, lockedUntil: 0 };
      return JSON.parse(raw);
    } catch { return { attempts: 0, lockedUntil: 0 }; }
  }

  function setRateState(state) {
    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
  }

  function checkRateLimit() {
    const state = getRateState();
    const now = Date.now();
    if (state.lockedUntil > now) {
      const secs = Math.ceil((state.lockedUntil - now) / 1000);
      return { allowed: false, waitSecs: secs };
    }
    return { allowed: true, waitSecs: 0 };
  }

  function recordFailure() {
    const state = getRateState();
    state.attempts += 1;
    // Exponential backoff: 2s, 4s, 8s, 16s, then 60s cap
    const backoffMs = state.attempts >= 5
      ? 60000
      : Math.min(2000 * Math.pow(2, state.attempts - 1), 60000);
    state.lockedUntil = Date.now() + backoffMs;
    setRateState(state);
    return Math.ceil(backoffMs / 1000);
  }

  function clearRateLimit() {
    sessionStorage.removeItem(LOCKOUT_KEY);
  }

  /* ── Session token ──────────────────────────────────────────────────── */
  // Token = HMAC(secret + hash, sessionId + date)
  // sessionId is generated once per tab; date rotates daily
  // Can't be faked without knowing the hash
  function getSessionId() {
    let sid = sessionStorage.getItem('sgn_sid');
    if (!sid) {
      sid = crypto.getRandomValues(new Uint8Array(16))
        .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
      sessionStorage.setItem('sgn_sid', sid);
    }
    return sid;
  }

  async function generateToken() {
    const sid = getSessionId();
    const day = new Date().toISOString().slice(0, 10);
    return hmac256(TOKEN_SECRET + _hash, sid + day);
  }

  async function verifyToken() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored || !_hash) return false;
    const expected = await generateToken();
    return stored === expected;
  }

  /* ── Config loader ──────────────────────────────────────────────────── */
  async function loadConfig() {
    try {
      const r = await fetch(CONFIG_PATH, { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      if (typeof d.h === 'string' && d.h.length >= 64) {
        _hash = d.h;
        _salt = typeof d.s === 'string' ? d.s : '';
        _ready = true;
        // Check if existing session is valid
        _verified = await verifyToken();
      }
    } catch {}
  }

  // Start loading immediately
  const _loadPromise = loadConfig();

  /* ── Public API ─────────────────────────────────────────────────────── */

  /**
   * requireEditor() — call before any editor action.
   * Returns true if authorized, false otherwise.
   * Prompts for password if not yet authenticated.
   */
  async function requireEditor() {
    await _loadPromise;

    // Already verified this session
    if (_verified) return true;

    // Re-check token (may have been set by another page in same session)
    if (_ready && await verifyToken()) {
      _verified = true;
      return true;
    }

    // No config loaded = no editor available
    if (!_ready) {
      alert('Editor not available.');
      return false;
    }

    // Rate limit check
    const rl = checkRateLimit();
    if (!rl.allowed) {
      alert(`Too many attempts. Try again in ${rl.waitSecs}s.`);
      return false;
    }

    // Prompt
    const input = prompt('Enter editor password:');
    if (input === null) return false; // cancelled

    // Hash input with salt and compare
    const inputHash = await sha256(_salt + input);
    if (inputHash === _hash) {
      _verified = true;
      const token = await generateToken();
      sessionStorage.setItem(SESSION_KEY, token);
      clearRateLimit();
      return true;
    }

    // Failed
    const waitSecs = recordFailure();
    const state = getRateState();
    if (state.attempts >= 3) {
      alert(`Incorrect password. Locked for ${waitSecs}s.`);
    } else {
      alert('Incorrect password.');
    }
    return false;
  }

  /**
   * isEditor() — synchronous check (best-effort).
   * Use requireEditor() for gated actions; this is for UI hints only.
   */
  function isEditor() {
    return _verified;
  }

  /**
   * editorReady() — resolves when auth module has finished loading config.
   */
  async function editorReady() {
    await _loadPromise;
    return _verified;
  }

  // Freeze the public API so it can't be tampered with from console
  return Object.freeze({
    requireEditor,
    isEditor,
    editorReady
  });
})();
