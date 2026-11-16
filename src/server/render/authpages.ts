// Sign-in page. Renders outside the main layout (no sidebar/topbar) but shares
// the same tokens, styles, and theme pre-paint so it feels like the rest of the site.
// Layout: a full-height split. The brand panel (solid accent, oversized owl
// mark) is the one loud moment on the site; the form side stays plain and large.
import { esc, owlMark } from "./layout.js";
import type { Role } from "../../core/role.js";

function authShell(title: string, inner: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} · Owl Library</title>
<link rel="stylesheet" href="/assets/design/tokens.css">
<link rel="stylesheet" href="/assets/styles.css">
<script>
// pre-paint theme to avoid flash (same as layout.ts)
(function () {
  var t = localStorage.getItem("archive-theme");
  if (!t) t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = t;
})();
</script>
</head>
<body class="auth-body">
<div class="auth-split">
  <aside class="auth-panel" aria-hidden="true">
    <p class="auth-wordmark">${owlMark}<span>Owl Library</span></p>
    <p class="auth-statement">Notes, lessons and papers, kept in one quiet place.</p>
    <div class="auth-owl">${owlMark}</div>
  </aside>
  <main class="auth-main">
    <div class="auth-form">
${inner}
    </div>
  </main>
</div>
</body>
</html>`;
}

export function loginPage(next: string, role: Role, error?: string): string {
  const seg = (value: Role, label: string): string =>
    `<label class="role-opt"><input type="radio" name="role" value="${value}" id="role-${value}"${role === value ? " checked" : ""}><span>${label}</span></label>`;
  return authShell("Sign in", `
      <p class="auth-mobile-brand">${owlMark}<span>Owl Library</span></p>
      <h1>Sign in</h1>
      <p class="auth-lede">Pick how you are signing in, then enter that password.</p>
      <form method="post" action="/login">
        <input type="hidden" name="next" value="${esc(next)}">
        <div class="role-seg" role="radiogroup" aria-label="Sign in as">
          ${seg("guest", "Guest")}
          ${seg("admin", "Admin")}
        </div>
        <p class="role-hint"><span class="for-guest">Guests can read and search everything, and change nothing.</span><span class="for-admin">The admin can add, edit, move and remove documents and folders.</span></p>
        <label class="auth-field" for="auth-password">Password</label>
        <input class="auth-input" id="auth-password" type="password" name="password" autocomplete="current-password" autofocus required>
        ${error ? `<p class="banner banner-warn" role="alert">${esc(error)}</p>` : ""}
        <button class="btn btn-primary auth-submit" type="submit">Sign in</button>
      </form>
      <p class="auth-foot">Five wrong attempts pause sign-in from your connection for 15 minutes.</p>`);
}
