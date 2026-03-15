/* ══════════════════════════════════════════
   SGN — GITHUB COMMIT UTILITY
   
   Shared module for committing JSON files
   directly to the GitHub repo via the API.
   
   Token is entered once per session via a
   prompt and stored in sessionStorage (cleared
   when the browser tab closes). The token never
   touches any file or commit.
   
   The repo is hardcoded since it never changes.
   ══════════════════════════════════════════ */

const SGNGitHub = (function () {
  'use strict';

  const SESSION_KEY = 'sgn_github_token';
  const REPO = 'AeliusDesigns/SGN-Star-Map';

  /* ── Get or prompt for token ── */
  function getToken() {
    let token = sessionStorage.getItem(SESSION_KEY);
    if (token) return token;

    token = prompt('Enter GitHub Personal Access Token:');
    if (!token || !token.trim()) return null;

    token = token.trim();
    sessionStorage.setItem(SESSION_KEY, token);
    return token;
  }

  /* ── Check if token is already stored this session ── */
  function isAvailable() {
    return !!sessionStorage.getItem(SESSION_KEY);
  }

  /* ── Forget the token (e.g. on auth failure) ── */
  function clearToken() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  /* ── No-op for backward compatibility ── */
  function loadConfig() {
    return Promise.resolve();
  }

  /* ── Get the current SHA of a file (needed to update it) ── */
  async function getFileSHA(path, token) {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}`,
      { headers: { 'Authorization': `token ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.sha || null;
  }

  /* ── Commit a single file ── */
  async function commitFile(path, content, message) {
    const token = getToken();
    if (!token) throw new Error('No token provided');

    const sha = await getFileSHA(path, token);
    const encoded = btoa(unescape(encodeURIComponent(content)));

    const body = {
      message: message || `Update ${path}`,
      content: encoded,
      branch: 'main'
    };
    if (sha) body.sha = sha;

    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearToken();
        throw new Error('Bad credentials. Token cleared; try saving again.');
      }
      throw new Error(err.message || `GitHub API error ${res.status}`);
    }

    return await res.json();
  }

  /* ── Commit multiple files sequentially ── */
  async function commitFiles(files, messagePrefix) {
    const token = getToken();
    if (!token) throw new Error('No token provided');

    const results = [];
    for (const f of files) {
      const msg = `${messagePrefix || 'SGN'}: update ${f.path}`;
      const result = await commitFile(f.path, f.content, msg);
      results.push({ path: f.path, ok: true, result });
    }
    return results;
  }

  /* ── Public API ── */
  return {
    loadConfig,
    isAvailable,
    commitFile,
    commitFiles,
    clearToken
  };

})();
