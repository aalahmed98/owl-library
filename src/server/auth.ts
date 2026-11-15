import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyFormbody from "@fastify/formbody";
import { ARCHIVE_ROOT } from "../core/config.js";
import type { Identity } from "../core/meta.js";
import { loginPage, pickerPage, identityFormPage } from "./render/authpages.js";

// Two-stage auth:
//   1. site password (shared, from the ARCHIVE_PASSWORD env var) -> session
//   2. identity picker + personal password -> identity bound to the session server-side
// Personal passwords are stored ONLY as salted scrypt hashes in .auth.json
// (gitignored) — the plaintext is never persisted, so the host can't read it.
// Identity is an ACCESS boundary: each person's private docs are invisible to
// the other. Switching identity requires logout (owner decision).
//
// There is NO default site password. If ARCHIVE_PASSWORD is unset or shorter
// than MIN_SITE_PASSWORD, website sign-in is refused until the host sets one
// (MCP access, which uses personal passwords, keeps working).
export const MIN_SITE_PASSWORD = 12;
export const MIN_PERSONAL_PASSWORD = 12;

function resolveSitePassword(): string | null {
  const fromEnv = process.env.ARCHIVE_PASSWORD;
  if (fromEnv && fromEnv.length >= MIN_SITE_PASSWORD) return fromEnv;
  console.error(
    `[archive] SECURITY: ARCHIVE_PASSWORD is ${fromEnv ? `shorter than ${MIN_SITE_PASSWORD} characters` : "not set"}. ` +
      "Website sign-in is disabled until the host sets a long ARCHIVE_PASSWORD and restarts.",
  );
  return null;
}
const SITE_PASSWORD = resolveSitePassword();

const AUTH_FILE = path.join(ARCHIVE_ROOT, ".auth.json");
const SESSION_COOKIE = "owl_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const IDENTITY_LABEL: Record<Identity, string> = { haman: "Haman", ali: "Ali" };

interface Session {
  identity?: Identity;
  expires: number;
}
const sessions = new Map<string, Session>();

interface StoredUser {
  salt: string;
  hash: string;
}
type UserStore = Partial<Record<Identity, StoredUser>>;

function loadUsers(): UserStore {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, "utf8")) as UserStore;
  } catch {
    return {};
  }
}

function saveUsers(users: UserStore): void {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(users, null, 2) + "\n", { mode: 0o600 });
}

function hashPassword(password: string, saltHex: string): Buffer {
  return crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 64);
}

function claimIdentity(identity: Identity, password: string): void {
  const users = loadUsers();
  const salt = crypto.randomBytes(16).toString("hex");
  users[identity] = { salt, hash: hashPassword(password, salt).toString("hex") };
  saveUsers(users);
}

export function verifyIdentityPassword(identity: Identity, password: string): boolean {
  const user = loadUsers()[identity];
  if (!user) return false;
  const expected = Buffer.from(user.hash, "hex");
  const actual = hashPassword(password, user.salt);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Constant-time string comparison (hash first so lengths never leak). */
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function asIdentity(v: unknown): Identity | null {
  return v === "haman" || v === "ali" ? v : null;
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

/** Identity of the logged-in browser session; null before the picker step. */
export function currentIdentity(req: FastifyRequest): Identity | null {
  return sessionFor(req)?.identity ?? null;
}

// ── brute-force protection ─────────────────────────────────────────────
// Every password check (site password, personal password, MCP bearer token)
// is counted. Two limits apply, both over a rolling 15-minute window:
//   - per client address: MAX_FAILS_PER_CLIENT wrong guesses locks that
//     address out of that stage for LOCK_MS;
//   - per target (the site password, or one person's password), across ALL
//     addresses: MAX_FAILS_PER_TARGET wrong guesses locks the target for
//     LOCK_MS, which stops guessing spread over many addresses. Addresses
//     that have signed in to that target successfully before are exempt from
//     the target lock, so an attacker can't lock the real users out.
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

type Target = "site" | `id:${Identity}`;

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

/** Milliseconds this client must wait before another guess at `target`; 0 if allowed. */
function attemptBlockedMs(req: FastifyRequest, target: Target): number {
  const now = Date.now();
  const addr = clientAddress(req);
  const clientWait = lockRemainingMs(`client:${addr}:${target}`, now);
  if (clientWait) return clientWait;
  const good = knownGood.get(`${addr}:${target}`);
  if (good && now - good <= KNOWN_GOOD_TTL_MS) return 0;
  return lockRemainingMs(`target:${target}`, now);
}

function noteFailure(req: FastifyRequest, target: Target): void {
  const now = Date.now();
  recordFailure(`client:${clientAddress(req)}:${target}`, MAX_FAILS_PER_CLIENT, now);
  recordFailure(`target:${target}`, MAX_FAILS_PER_TARGET, now);
}

function noteSuccess(req: FastifyRequest, target: Target): void {
  const addr = clientAddress(req);
  buckets.delete(`client:${addr}:${target}`);
  knownGood.set(`${addr}:${target}`, Date.now());
}

function waitMessage(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

// ── MCP bearer auth ────────────────────────────────────────────────────
type McpAuth = { identity: Identity } | { status: 401 | 429; error: string; retryAfterSec?: number };
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
    error: "unauthorized: pass Authorization: Bearer <haman|ali>:<your-personal-password>",
  };
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return unauthorized;
  const token = header.slice("Bearer ".length).trim();
  const sep = token.indexOf(":");
  if (sep === -1) return unauthorized;
  const identity = asIdentity(token.slice(0, sep));
  if (!identity) return unauthorized;

  const target: Target = `id:${identity}`;
  const wait = attemptBlockedMs(req, target);
  if (wait) return { status: 429, error: waitMessage(wait), retryAfterSec: Math.ceil(wait / 1000) };

  if (!verifyIdentityPassword(identity, token.slice(sep + 1))) {
    noteFailure(req, target);
    return unauthorized;
  }
  noteSuccess(req, target);
  return { identity };
}

/** Identity of an MCP request authenticated via `Authorization: Bearer <haman|ali>:<personal-password>`. */
export function mcpIdentityFor(req: FastifyRequest): Identity | null {
  const auth = authenticateMcp(req);
  return "identity" in auth ? auth.identity : null;
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

const LOGIN_ERRORS: Record<string, string> = {
  "1": "Wrong password.",
  unset: "Sign-in is switched off until the host sets a library password.",
};

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCookie);
  await app.register(fastifyFormbody);

  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    if (isPublicPath(req.url)) return;

    if (req.url.startsWith("/mcp")) {
      const auth = authenticateMcp(req);
      if ("identity" in auth) return;
      if (auth.retryAfterSec) reply.header("retry-after", String(auth.retryAfterSec));
      return reply.code(auth.status).send({ error: auth.error });
    }

    const p = req.url.split("?")[0] ?? req.url;
    const sess = sessionFor(req);
    if (!sess) {
      return reply.redirect(`/login?next=${encodeURIComponent(req.url)}`);
    }
    if (!sess.identity && !p.startsWith("/pick") && p !== "/logout") {
      return reply.redirect("/pick");
    }
  });

  app.get<{ Querystring: { next?: string; error?: string; wait?: string } }>("/login", async (req, reply) => {
    if (sessionFor(req)?.identity) return reply.redirect("/");
    let error = req.query.error ? LOGIN_ERRORS[req.query.error] : undefined;
    if (req.query.error === "locked") error = waitMessage(Number(req.query.wait) * 60_000 || LOCK_MS);
    reply.type("text/html");
    return loginPage(req.query.next ?? "/", error);
  });

  app.post<{ Body: { password?: string; next?: string } }>("/login", async (req, reply) => {
    const next = encodeURIComponent(req.body?.next || "/");
    if (!SITE_PASSWORD) return reply.redirect(`/login?error=unset&next=${next}`);

    const wait = attemptBlockedMs(req, "site");
    if (wait) return reply.redirect(`/login?error=locked&wait=${Math.ceil(wait / 60_000)}&next=${next}`);

    if (!safeEqual(req.body?.password ?? "", SITE_PASSWORD)) {
      noteFailure(req, "site");
      return reply.redirect(`/login?error=1&next=${next}`);
    }
    noteSuccess(req, "site");
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { expires: Date.now() + SESSION_TTL_MS });
    reply.setCookie(SESSION_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps(req),
      maxAge: SESSION_TTL_MS / 1000,
    });
    return reply.redirect("/pick");
  });

  app.get("/pick", async (req, reply) => {
    if (sessionFor(req)?.identity) return reply.redirect("/");
    const users = loadUsers();
    reply.type("text/html");
    return pickerPage({ haman: Boolean(users.haman), ali: Boolean(users.ali) });
  });

  app.get<{ Params: { who: string }; Querystring: { error?: string } }>("/pick/:who", async (req, reply) => {
    const who = asIdentity(req.params.who);
    if (!who) return reply.redirect("/pick");
    if (sessionFor(req)?.identity) return reply.redirect("/");
    reply.type("text/html");
    return identityFormPage(who, IDENTITY_LABEL[who], Boolean(loadUsers()[who]), req.query.error);
  });

  app.post<{ Params: { who: string }; Body: { password?: string; confirm?: string } }>(
    "/pick/:who",
    async (req, reply) => {
      const who = asIdentity(req.params.who);
      if (!who) return reply.redirect("/pick");
      const sess = sessionFor(req);
      if (!sess) return reply.redirect("/login");
      const password = req.body?.password ?? "";
      const claimed = Boolean(loadUsers()[who]);
      const fail = (message: string): FastifyReply => reply.redirect(`/pick/${who}?error=${encodeURIComponent(message)}`);

      if (!claimed) {
        if (password.length < MIN_PERSONAL_PASSWORD) {
          return fail(`Password must be at least ${MIN_PERSONAL_PASSWORD} characters.`);
        }
        if (password !== req.body?.confirm) return fail("Passwords don't match.");
        claimIdentity(who, password);
      } else {
        const target: Target = `id:${who}`;
        const wait = attemptBlockedMs(req, target);
        if (wait) return fail(waitMessage(wait));
        if (!verifyIdentityPassword(who, password)) {
          noteFailure(req, target);
          return fail("Wrong password.");
        }
        noteSuccess(req, target);
      }

      sess.identity = who;
      return reply.redirect("/");
    },
  );

  app.post("/logout", async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) sessions.delete(token);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.redirect("/login");
  });
}
