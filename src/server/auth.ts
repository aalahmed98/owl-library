import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyFormbody from "@fastify/formbody";
import { asRole, type Role } from "../core/role.js";
import { loginPage } from "./render/authpages.js";

// Two roles, one password each, both set by the host in environment variables:
//   admin — ARCHIVE_ADMIN_PASSWORD — may create, upload, edit, move and remove any doc or folder
//   guest — ARCHIVE_GUEST_PASSWORD — read-only
// There are no user accounts and nothing is stored on disk. A role whose
// password is unset or shorter than MIN_PASSWORD cannot sign in at all (there
// are NO defaults), and the two passwords must differ: if they are the same,
// guest sign-in is refused so the guest password can never open the admin role.
//
// Read-only is enforced HERE, centrally, for every route: a guest session may
// only send GET/HEAD requests (plus logout), and guest MCP connections only
// get the read tools. Routes also hide write controls, but that is cosmetic.
export const MIN_PASSWORD = 12;

const ENV_NAME: Record<Role, string> = {
  admin: "ARCHIVE_ADMIN_PASSWORD",
  guest: "ARCHIVE_GUEST_PASSWORD",
};

function resolvePasswords(): Record<Role, string | null> {
  const read = (role: Role): string | null => {
    const v = process.env[ENV_NAME[role]];
    if (v && v.length >= MIN_PASSWORD) return v;
    console.error(
      `[archive] SECURITY: ${ENV_NAME[role]} is ${v ? `shorter than ${MIN_PASSWORD} characters` : "not set"}. ` +
        `${role} sign-in is disabled until the host sets it and restarts.`,
    );
    return null;
  };
  const out = { admin: read("admin"), guest: read("guest") };
  if (out.admin && out.guest && out.admin === out.guest) {
    console.error("[archive] SECURITY: the admin and guest passwords are identical. guest sign-in is disabled until they differ.");
    out.guest = null;
  }
  return out;
}
const PASSWORDS = resolvePasswords();

const SESSION_COOKIE = "owl_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface Session {
  role: Role;
  expires: number;
}
const sessions = new Map<string, Session>();

/** Constant-time string comparison (hash first so lengths never leak). */
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function sessionFor(req: FastifyRequest): Session | undefined {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return undefined;
  const sess = sessions.get(token);
  if (!sess) return undefined;
  if (sess.expires <= Date.now()) {
    sessions.delete(token);
    return undefined;
  }
  return sess;
}

/** Role of the signed-in browser session; null when not signed in. */
export function currentRole(req: FastifyRequest): Role | null {
  return sessionFor(req)?.role ?? null;
}

// ── brute-force protection ─────────────────────────────────────────────
// Every password check (website sign-in and MCP bearer token) is counted.
// Two limits apply, both over a rolling 15-minute window:
//   - per client address: MAX_FAILS_PER_CLIENT wrong guesses at a role locks
//     that address out of that role for LOCK_MS;
//   - per role, across ALL addresses: MAX_FAILS_PER_TARGET wrong guesses locks
//     the role for LOCK_MS, which stops guessing spread over many addresses.
//     Addresses that have signed in to that role successfully before are
//     exempt from the role-wide lock, so an attacker can't lock the owner out.
// State is in memory: a restart clears it (and logs everyone out anyway).
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_CLIENT = 5;
const MAX_FAILS_PER_TARGET = 25;
const KNOWN_GOOD_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TRACKED = 20_000;

interface Bucket {
  fails: number;
  windowStart: number;
  lockedUntil: number;
}
const buckets = new Map<string, Bucket>();
const knownGood = new Map<string, number>();

/** Real client address. The server only listens on 127.0.0.1, so this header can only come from the local tunnel. */
function clientAddress(req: FastifyRequest): string {
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf.length > 0 && cf.length <= 64) return cf;
  return req.ip;
}

function lockRemainingMs(key: string, now: number): number {
  const b = buckets.get(key);
  return b && b.lockedUntil > now ? b.lockedUntil - now : 0;
}

function recordFailure(key: string, max: number, now: number): void {
  if (buckets.size >= MAX_TRACKED) pruneLimiter(now);
  let b = buckets.get(key);
  if (!b || now - b.windowStart > WINDOW_MS) {
    b = { fails: 0, windowStart: now, lockedUntil: 0 };
    buckets.set(key, b);
  }
  b.fails += 1;
  if (b.fails >= max) {
    b.lockedUntil = now + LOCK_MS;
    b.fails = 0;
    b.windowStart = now;
  }
}

function pruneLimiter(now: number): void {
  for (const [k, b] of buckets) {
    if (b.lockedUntil <= now && now - b.windowStart > WINDOW_MS) buckets.delete(k);
  }
  for (const [k, t] of knownGood) {
    if (now - t > KNOWN_GOOD_TTL_MS) knownGood.delete(k);
  }
  for (const [k, s] of sessions) {
    if (s.expires <= now) sessions.delete(k);
  }
  if (buckets.size >= MAX_TRACKED) buckets.clear();
}
setInterval(() => pruneLimiter(Date.now()), 10 * 60 * 1000).unref();

/** Milliseconds this client must wait before another guess at `role`; 0 if allowed. */
function attemptBlockedMs(req: FastifyRequest, role: Role): number {
  const now = Date.now();
  const addr = clientAddress(req);
  const clientWait = lockRemainingMs(`client:${addr}:${role}`, now);
  if (clientWait) return clientWait;
  const good = knownGood.get(`${addr}:${role}`);
  if (good && now - good <= KNOWN_GOOD_TTL_MS) return 0;
  return lockRemainingMs(`role:${role}`, now);
}

function noteFailure(req: FastifyRequest, role: Role): void {
  const now = Date.now();
  recordFailure(`client:${clientAddress(req)}:${role}`, MAX_FAILS_PER_CLIENT, now);
  recordFailure(`role:${role}`, MAX_FAILS_PER_TARGET, now);
}

function noteSuccess(req: FastifyRequest, role: Role): void {
  const addr = clientAddress(req);
  buckets.delete(`client:${addr}:${role}`);
  knownGood.set(`${addr}:${role}`, Date.now());
}

function waitMessage(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

type Check = { ok: true } | { ok: false; reason: "disabled" | "locked" | "wrong"; waitMs?: number };

/** One counted password check for a role. */
function checkPassword(req: FastifyRequest, role: Role, supplied: string): Check {
  const expected = PASSWORDS[role];
  if (!expected) return { ok: false, reason: "disabled" };
  const wait = attemptBlockedMs(req, role);
  if (wait) return { ok: false, reason: "locked", waitMs: wait };
  if (!safeEqual(supplied, expected)) {
    noteFailure(req, role);
    return { ok: false, reason: "wrong" };
  }
  noteSuccess(req, role);
  return { ok: true };
}

// ── MCP bearer auth ────────────────────────────────────────────────────
type McpAuth = { role: Role } | { status: 401 | 429; error: string; retryAfterSec?: number };
const mcpAuthCache = new WeakMap<FastifyRequest, McpAuth>();

function authenticateMcp(req: FastifyRequest): McpAuth {
  const cached = mcpAuthCache.get(req);
  if (cached) return cached;
  const result = checkMcpBearer(req);
  mcpAuthCache.set(req, result);
  return result;
}

function checkMcpBearer(req: FastifyRequest): McpAuth {
  const unauthorized: McpAuth = {
    status: 401,
    error: "unauthorized: pass Authorization: Bearer <admin|guest>:<that role's password>",
  };
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return unauthorized;
  const token = header.slice("Bearer ".length).trim();
  const sep = token.indexOf(":");
  if (sep === -1) return unauthorized;
  const role = asRole(token.slice(0, sep));
  if (!role) return unauthorized;

  const res = checkPassword(req, role, token.slice(sep + 1));
  if (res.ok) return { role };
  if (res.reason === "locked") {
    const wait = res.waitMs ?? LOCK_MS;
    return { status: 429, error: waitMessage(wait), retryAfterSec: Math.ceil(wait / 1000) };
  }
  return unauthorized;
}

/** Role of an MCP request authenticated via `Authorization: Bearer <admin|guest>:<password>`. */
export function mcpRoleFor(req: FastifyRequest): Role | null {
  const auth = authenticateMcp(req);
  return "role" in auth ? auth.role : null;
}

const PUBLIC_PATHS = new Set(["/login", "/favicon.ico"]);
const PUBLIC_PREFIXES = ["/assets/"];

function isPublicPath(url: string): boolean {
  const p = url.split("?")[0] ?? url;
  if (PUBLIC_PATHS.has(p)) return true;
  return PUBLIC_PREFIXES.some((prefix) => p.startsWith(prefix));
}

function isHttps(req: FastifyRequest): boolean {
  return req.headers["x-forwarded-proto"] === "https";
}

/** Pages that only make sense for someone who can write. */
function isWritePage(p: string): boolean {
  return p === "/new" || p.startsWith("/edit/");
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCookie);
  await app.register(fastifyFormbody);

  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    if (isPublicPath(req.url)) return;

    if (req.url.startsWith("/mcp")) {
      const auth = authenticateMcp(req);
      if ("role" in auth) return;
      if (auth.retryAfterSec) reply.header("retry-after", String(auth.retryAfterSec));
      return reply.code(auth.status).send({ error: auth.error });
    }

    const p = req.url.split("?")[0] ?? req.url;
    const sess = sessionFor(req);
    if (!sess) {
      return reply.redirect(`/login?next=${encodeURIComponent(req.url)}`);
    }

    if (sess.role === "guest" && p !== "/logout") {
      const mutating = req.method !== "GET" && req.method !== "HEAD";
      if (mutating) return reply.code(403).send({ error: "read-only: guests cannot change the library" });
      if (isWritePage(p)) return reply.redirect("/");
    }
  });

  app.get<{ Querystring: { next?: string; error?: string; wait?: string; role?: string } }>("/login", async (req, reply) => {
    if (sessionFor(req)) return reply.redirect("/");
    const role = asRole(req.query.role) ?? "guest";
    let error: string | undefined;
    if (req.query.error === "wrong") error = "Wrong password.";
    if (req.query.error === "disabled") error = `${role === "admin" ? "Admin" : "Guest"} sign-in is switched off until the host sets its password.`;
    if (req.query.error === "locked") {
      const minutes = Math.min(Number(req.query.wait) || 15, 15);
      error = waitMessage(minutes * 60_000);
    }
    reply.type("text/html");
    return loginPage(req.query.next ?? "/", role, error);
  });

  app.post<{ Body: { role?: string; password?: string; next?: string } }>("/login", async (req, reply) => {
    const next = encodeURIComponent(req.body?.next || "/");
    const role = asRole(req.body?.role);
    if (!role) return reply.redirect(`/login?error=wrong&next=${next}`);

    const res = checkPassword(req, role, req.body?.password ?? "");
    if (!res.ok) {
      const wait = res.reason === "locked" ? `&wait=${Math.ceil((res.waitMs ?? LOCK_MS) / 60_000)}` : "";
      return reply.redirect(`/login?error=${res.reason}${wait}&role=${role}&next=${next}`);
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { role, expires: Date.now() + SESSION_TTL_MS });
    reply.setCookie(SESSION_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps(req),
      maxAge: SESSION_TTL_MS / 1000,
    });
    return reply.redirect("/");
  });

  app.post("/logout", async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) sessions.delete(token);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.redirect("/login");
  });
}
