// Auth flow pages (login → identity picker → personal password). These render
// outside the main layout (no sidebar/topbar) but share the same tokens,
// styles, and theme pre-paint so they feel like the rest of the site.
import { esc, owlMark } from "./layout.js";
import type { Identity } from "../../core/meta.js";

function authShell(title: string, inner: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
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

export function loginPage(next: string, error: boolean): string {
  return authShell("Sign in", `
  <h1>Sign in</h1>
  <p class="muted small">Enter the library password to continue.</p>
  <form method="post" action="/login">
    <input type="hidden" name="next" value="${esc(next)}">
    <label class="field">Password
      <input type="password" name="password" autocomplete="current-password" autofocus required>
    </label>
    ${error ? '<p class="banner banner-warn">Wrong password.</p>' : ""}
    <button class="btn btn-primary auth-submit" type="submit">Enter</button>
  </form>`);
}

export function pickerPage(claimed: Record<Identity, boolean>): string {
  const card = (who: Identity, label: string): string => `
    <a class="picker-choice" href="/pick/${who}">
      <span class="picker-avatar">${label.slice(0, 1)}</span>
      <span class="picker-name">${label}</span>
      <span class="muted small">${claimed[who] ? "Enter your password" : "First visit: set your password"}</span>
    </a>`;
  return authShell("Who are you?", `
  <h1>Who are you?</h1>
  <p class="muted small">Your choice decides which private docs you see. It's protected by a personal password.</p>
  <div class="picker-grid">
${card("haman", "Haman")}
${card("ali", "Ali")}
  </div>
  <form method="post" action="/logout" class="auth-alt"><button class="btn-link" type="submit">← Back to sign in</button></form>`);
}

export function identityFormPage(who: Identity, label: string, claimed: boolean, error?: string): string {
  const inner = claimed
    ? `
  <h1>Hi, ${esc(label)}</h1>
  <p class="muted small">Enter your personal password.</p>
  <form method="post" action="/pick/${who}">
    <label class="field">Your password
      <input type="password" name="password" autocomplete="current-password" autofocus required>
    </label>
    ${error ? `<p class="banner banner-warn">${esc(error)}</p>` : ""}
    <button class="btn btn-primary auth-submit" type="submit">Continue</button>
  </form>`
    : `
  <h1>Welcome, ${esc(label)}</h1>
  <p class="muted small">Set a personal password for your private docs. Only a hash is stored; nobody (including the host) can read it back.</p>
  <form method="post" action="/pick/${who}">
    <label class="field">Choose a password
      <input type="password" name="password" autocomplete="new-password" minlength="4" autofocus required>
    </label>
    <label class="field">Repeat it
      <input type="password" name="confirm" autocomplete="new-password" minlength="4" required>
    </label>
    ${error ? `<p class="banner banner-warn">${esc(error)}</p>` : ""}
    <button class="btn btn-primary auth-submit" type="submit">Set password &amp; enter</button>
  </form>`;
  return authShell(label, `${inner}
  <p class="auth-alt"><a href="/pick">← Not ${esc(label)}?</a></p>`);
}
