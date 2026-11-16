// Sign-in page. Renders outside the main layout (no sidebar/topbar) but shares
// the same tokens, styles, and theme pre-paint so it feels like the rest of the site.
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
<main class="auth-card">
  <p class="auth-brand">${owlMark}<span>Owl Library</span></p>
  <div class="auth-rule"></div>
${inner}
</main>
</body>
</html>`;
}

export function loginPage(next: string, role: Role, error?: string): string {
  const choice = (value: Role, label: string, hint: string): string => `
      <label class="picker-choice">
        <input type="radio" name="role" value="${value}"${role === value ? " checked" : ""}>
        <span class="picker-name">${label}</span>
        <span class="muted small">${hint}</span>
      </label>`;
  return authShell("Sign in", `
  <h1>Sign in</h1>
  <p class="muted small">Choose how you are signing in, then enter that password.</p>
  <form method="post" action="/login">
    <input type="hidden" name="next" value="${esc(next)}">
    <div class="picker-grid" role="radiogroup" aria-label="Sign in as">
${choice("guest", "Guest", "Read only")}
${choice("admin", "Admin", "Full access")}
    </div>
    <label class="field">Password
      <input type="password" name="password" autocomplete="current-password" autofocus required>
    </label>
    ${error ? `<p class="banner banner-warn">${esc(error)}</p>` : ""}
    <button class="btn btn-primary auth-submit" type="submit">Enter</button>
  </form>`);
}
