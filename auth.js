/* ══════════════════════════════════════════
   SGN — AUTH / CLEARANCE MODULE

   Single source of truth for login, clearance
   tiers, and per-tier content encryption.

   Tier hierarchy (monotonic — higher sees all
   below):
     0 PUBLIC      — anyone, no login
     1 DIPLOMATIC  — allied state accounts
     2 MILITARY    — joint-operations clearance
     3 COMMAND     — Arandorë inner circle
     4 ADMIN       — site author; only tier
                     allowed to edit content

   Crypto:
     PBKDF2-SHA256, 200k iters → password key
     AES-GCM, 96-bit IV         → content + keyring

   accounts.json shape (committed to repo, holds
   only ciphertext + hashes — safe to publish):
     {
       "version": 1,
       "tiers":   [DIPLOMATIC, MILITARY, COMMAND],
       "accounts": [
         {
           "username":   "admin",
           "level":      4,
           "salt":       "<base64>",
           "keyringIv":  "<base64>",
           "keyringEnc": "<base64>"
         },
         ...
       ]
     }

   The encrypted keyring decrypts to a JSON object
   mapping tier-level → base64 raw 32-byte AES-GCM
   key. A logged-in user only has the keys their
   tier grants them.
   ══════════════════════════════════════════ */

window.SGNAuth = (function () {
  'use strict';

  /* ── Tier constants ── */
  const TIER = Object.freeze({
    PUBLIC: 0, DIPLOMATIC: 1, MILITARY: 2, COMMAND: 3, ADMIN: 4
  });
  const TIER_NAMES = Object.freeze({
    0: 'PUBLIC', 1: 'DIPLOMATIC', 2: 'MILITARY', 3: 'COMMAND', 4: 'ADMIN'
  });
  const TIER_LIST = Object.freeze(['PUBLIC', 'DIPLOMATIC', 'MILITARY', 'COMMAND', 'ADMIN']);

  /* ── Crypto config ── */
  const PBKDF2_ITERS = 200000;
  const SALT_BYTES = 16;
  const IV_BYTES = 12;
  const KEY_BITS = 256;

  /* ── Storage keys ── */
  const SESSION_KEY = 'sgn_auth_v1';
  const LEGACY_FLAGS = ['starmap_editor_ok', 'galaxy_editor_ok'];

  /* ── State ── */
  let _user = null;            // { username, level, tierKeys: { 1: CryptoKey, ... } }
  let _accountsP = null;       // cached fetch of accounts.json
  const _listeners = new Set();

  /* ── Base64 helpers ── */
  function b64encode(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b64decode(str) {
    const s = atob(str);
    const a = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }

  /* ── PBKDF2 derive password key ── */
  async function derivePwKey(password, saltBytes) {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: KEY_BITS },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /* ── Generate a fresh random tier key as base64 raw bytes ── */
  async function generateTierKeyB64() {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: KEY_BITS },
      true,
      ['encrypt', 'decrypt']
    );
    const raw = await crypto.subtle.exportKey('raw', key);
    return b64encode(new Uint8Array(raw));
  }

  /* ── Build an encrypted account record from password + keyring object ──
       keyringObj: { "1": "<tierKeyB64>", ... }
       returns { username, level, salt, keyringIv, keyringEnc }
       (caller fills in username/level)
  */
  async function buildAccountRecord(password, keyringObj) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const pwKey = await derivePwKey(password, salt);
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      pwKey,
      new TextEncoder().encode(JSON.stringify(keyringObj))
    );
    return {
      salt: b64encode(salt),
      keyringIv: b64encode(iv),
      keyringEnc: b64encode(new Uint8Array(ct))
    };
  }

  /* ── Load accounts.json (cached) ── */
  function loadAccounts(force) {
    if (force) _accountsP = null;
    if (!_accountsP) {
      _accountsP = fetch('./accounts.json', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);
    }
    return _accountsP;
  }

  /* ── Login ── */
  async function login(username, password) {
    const data = await loadAccounts();
    if (!data || !Array.isArray(data.accounts)) {
      throw new Error('No accounts.json found. Run sgn-admin.html bootstrap first.');
    }
    const acct = data.accounts.find(a => a.username === username);
    if (!acct) throw new Error('Unknown account.');

    const salt = b64decode(acct.salt);
    const pwKey = await derivePwKey(password, salt);

    let keyringObj;
    try {
      const ct = b64decode(acct.keyringEnc);
      const iv = b64decode(acct.keyringIv);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, pwKey, ct);
      keyringObj = JSON.parse(new TextDecoder().decode(pt));
    } catch (e) {
      throw new Error('Wrong password.');
    }

    const tierKeys = {};
    for (const [lvl, keyB64] of Object.entries(keyringObj)) {
      tierKeys[Number(lvl)] = await crypto.subtle.importKey(
        'raw',
        b64decode(keyB64),
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );
    }

    _user = { username: acct.username, level: acct.level, tierKeys };
    await _persistSession();
    _emit();
    return { username: _user.username, level: _user.level };
  }

  /* ── Logout ── */
  function logout() {
    _user = null;
    sessionStorage.removeItem(SESSION_KEY);
    LEGACY_FLAGS.forEach(k => sessionStorage.removeItem(k));
    _emit();
  }

  /* ── Session persistence (so reloads stay logged in) ── */
  async function _persistSession() {
    if (!_user) { sessionStorage.removeItem(SESSION_KEY); return; }
    const exported = {};
    for (const [lvl, key] of Object.entries(_user.tierKeys)) {
      const raw = await crypto.subtle.exportKey('raw', key);
      exported[lvl] = b64encode(new Uint8Array(raw));
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      username: _user.username,
      level: _user.level,
      keys: exported
    }));
  }

  async function _restoreSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const sess = JSON.parse(raw);
      const tierKeys = {};
      for (const [lvl, b64] of Object.entries(sess.keys || {})) {
        tierKeys[Number(lvl)] = await crypto.subtle.importKey(
          'raw',
          b64decode(b64),
          { name: 'AES-GCM' },
          true,
          ['encrypt', 'decrypt']
        );
      }
      _user = { username: sess.username, level: sess.level, tierKeys };
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  /* ── Public state queries ── */
  function currentUser() {
    return _user ? { username: _user.username, level: _user.level } : null;
  }
  function currentLevel() { return _user ? _user.level : 0; }
  function isAdmin() { return currentLevel() >= TIER.ADMIN; }
  function tierName(lvl) { return TIER_NAMES[lvl] || 'UNKNOWN'; }

  /* ── Gate helpers ── */
  async function requireLevel(needed) {
    if (currentLevel() >= needed) return true;
    if (window.SGNAuthUI && SGNAuthUI.promptLogin) {
      await SGNAuthUI.promptLogin(needed);
      return currentLevel() >= needed;
    }
    return false;
  }

  /* ── Content encryption (only ADMIN ever calls this) ── */
  async function encryptForTier(plaintext, tierLevel) {
    if (!_user) throw new Error('Not logged in.');
    const key = _user.tierKeys[tierLevel];
    if (!key) throw new Error('No key for tier ' + tierLevel + ' in your keyring.');
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext)
    );
    return { enc: b64encode(new Uint8Array(ct)), iv: b64encode(iv), tier: tierLevel };
  }

  /* ── Content decryption ── */
  async function decryptBlob(blob) {
    if (!_user || !blob || typeof blob.tier !== 'number') return null;
    const key = _user.tierKeys[blob.tier];
    if (!key) return null;
    try {
      const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64decode(blob.iv) },
        key,
        b64decode(blob.enc)
      );
      return new TextDecoder().decode(pt);
    } catch {
      return null;
    }
  }

  /* ── Change subscription ── */
  function _emit() {
    _listeners.forEach(fn => { try { fn(currentUser()); } catch (e) {} });
  }
  function onChange(fn) {
    _listeners.add(fn);
    try { fn(currentUser()); } catch (e) {}
    return () => _listeners.delete(fn);
  }

  /* ── Initialize ── */
  const _ready = _restoreSession().then(() => _emit());

  return {
    /* Constants */
    TIER, TIER_NAMES, TIER_LIST,

    /* Lifecycle */
    ready: () => _ready,

    /* Auth */
    login, logout,
    currentUser, currentLevel, isAdmin, tierName,
    requireLevel,

    /* Content crypto */
    encryptForTier, decryptBlob,

    /* Events */
    onChange,

    /* Internals exposed for sgn-admin.html */
    _internal: {
      b64encode, b64decode,
      derivePwKey,
      generateTierKeyB64,
      buildAccountRecord,
      loadAccounts,
      PBKDF2_ITERS, SALT_BYTES, IV_BYTES, KEY_BITS
    }
  };
})();
