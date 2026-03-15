/* ══════════════════════════════════════════
   SGN — GITHUB COMMIT UTILITY
   
   Shared module for committing JSON files
   directly to the GitHub repo via the API.
   
   Reads credentials from editor.json:
     { "pw": "...", "github_token": "...", "github_repo": "owner/repo" }
   
   The editor.json file is gitignored, so visitors
   on the live Netlify site will never have access
   to the token. Saves will simply fail gracefully.
   ══════════════════════════════════════════ */

const SGNGitHub = (function () {
  'use strict';

  let _token = null;
  let _repo  = null;
  let _ready = false;
  let _loadPromise = null;

  /* ── Load credentials from editor.json ── */
  function loadConfig() {
    if (_loadPromise) return _loadPromise;
    _loadPromise = (async () => {
      try {
        const r = await fetch('./editor.json', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        if (d.github_token && d.github_repo) {
          _token = d.github_token;
          _repo  = d.github_repo;
          _ready = true;
        }
      } catch { /* editor.json missing or malformed, that is fine */ }
    })();
    return _loadPromise;
  }

  /* Kick off loading immediately */
  loadConfig();

  /* ── Check if GitHub save is available ── */
  function isAvailable() {
    return _ready;
  }

  /* ── Get the current SHA of a file (needed to update it) ── */
  async function getFileSHA(path) {
    const res = await fetch(
      `https://api.github.com/repos/${_repo}/contents/${encodeURIComponent(path)}`,
      { headers: { 'Authorization': `token ${_token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.sha || null;
  }

  /* ── Commit a single file ── */
  async function commitFile(path, content, message) {
    if (!_ready) throw new Error('GitHub credentials not loaded');

    const sha = await getFileSHA(path);
    const encoded = btoa(unescape(encodeURIComponent(content)));

    const body = {
      message: message || `Update ${path}`,
      content: encoded,
      branch: 'main'
    };
    if (sha) body.sha = sha;

    const res = await fetch(
      `https://api.github.com/repos/${_repo}/contents/${encodeURIComponent(path)}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error ${res.status}`);
    }

    return await res.json();
  }

  /* ── Commit multiple files sequentially ── */
  async function commitFiles(files, messagePrefix) {
    if (!_ready) throw new Error('GitHub credentials not loaded');

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
    commitFiles
  };

})();
