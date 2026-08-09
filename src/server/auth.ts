import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyFormbody from "@fastify/formbody";

// Deliberately soft: one shared password (default "nbb123", override with
// ARCHIVE_PASSWORD) meant to keep casual passers-by out while letting anyone
// with the password in. The Haman/Ali identity picker is NOT an access
// boundary — see DEFAULT_SPACE in core/meta.ts. It's just which draft
// workspace tab you land on / attribute new docs to.
export const PASSWORD = process.env.ARCHIVE_PASSWORD || "nbb123";

const SESSION_COOKIE = "owl_session";
const IDENTITY_COOKIE = "owl_identity";
const sessions = new Set<string>();

const PUBLIC_PATHS = new Set(["/login", "/favicon.ico"]);
const PUBLIC_PREFIXES = ["/assets/"];

function isPublicPath(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  if (PUBLIC_PATHS.has(path)) return true;
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

function bearerToken(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length).trim();
}

function isAuthed(req: FastifyRequest): boolean {
  const cookieToken = req.cookies[SESSION_COOKIE];
  if (cookieToken && sessions.has(cookieToken)) return true;
  // Header auth for programmatic clients (remote MCP) that can't do a cookie login flow.
  return bearerToken(req) === PASSWORD;
}

export function currentIdentity(req: FastifyRequest): "haman" | "ali" {
  return req.cookies[IDENTITY_COOKIE] === "ali" ? "ali" : "haman";
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCookie);
  await app.register(fastifyFormbody);

  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    if (isPublicPath(req.url)) return;
    if (isAuthed(req)) return;
    if (req.url.startsWith("/mcp")) {
      return reply.code(401).send({ error: "unauthorized: pass the password via Authorization: Bearer <password>" });
    }
    return reply.redirect(`/login?next=${encodeURIComponent(req.url)}`);
  });

  app.get<{ Querystring: { next?: string; error?: string } }>("/login", async (req, reply) => {
    reply.type("text/html");
    return loginPage(req.query.next ?? "/", req.query.error === "1");
  });

  app.post<{ Body: { password?: string; next?: string } }>("/login", async (req, reply) => {
    if (req.body?.password !== PASSWORD) {
      return reply.redirect(`/login?error=1&next=${encodeURIComponent(req.body?.next || "/")}`);
    }
    const token = crypto.randomBytes(24).toString("hex");
    sessions.add(token);
    reply.setCookie(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    return reply.redirect(req.body?.next || "/");
  });

  app.post<{ Body: { identity?: string; next?: string } }>("/identity", async (req, reply) => {
    const identity = req.body?.identity === "ali" ? "ali" : "haman";
    reply.setCookie(IDENTITY_COOKIE, identity, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return reply.redirect(req.body?.next || "/");
  });

  app.post("/logout", async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) sessions.delete(token);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.redirect("/login");
  });
}

function loginPage(next: string, error: boolean): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Owl Library</title>
<link rel="stylesheet" href="/assets/design/tokens.css">
<link rel="stylesheet" href="/assets/styles.css">
</head><body class="login-body">
<form class="login-card" method="post" action="/login">
  <h1>Owl<strong>Library</strong></h1>
  <input type="hidden" name="next" value="${next.replace(/"/g, "&quot;")}">
  <label class="field">Password
    <input type="password" name="password" autofocus required>
  </label>
  ${error ? '<p class="banner banner-warn">Wrong password.</p>' : ""}
  <button class="btn btn-primary" type="submit">Enter</button>
</form>
</body></html>`;
}
