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
//   1. site password (shared, default "nbb123", override ARCHIVE_PASSWORD) -> session
//   2. identity picker + personal password -> identity bound to the session server-side
// Personal passwords are stored ONLY as salted scrypt hashes in .auth.json
// (gitignored) — the plaintext is never persisted, so the host can't read it.
// Identity is an ACCESS boundary: each person's private docs are invisible to
// the other. Switching identity requires logout (owner decision).
export const SITE_PASSWORD = process.env.ARCHIVE_PASSWORD || "nbb123";

const AUTH_FILE = path.join(ARCHIVE_ROOT, ".auth.json");
const SESSION_COOKIE = "owl_session";
const IDENTITY_LABEL: Record<Identity, string> = { haman: "Haman", ali: "Ali" };

interface Session {
  identity?: Identity;
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

function asIdentity(v: unknown): Identity | null {
  return v === "haman" || v === "ali" ? v : null;
}

function sessionFor(req: FastifyRequest): Session | undefined {
  const token = req.cookies[SESSION_COOKIE];
  return token ? sessions.get(token) : undefined;
}

/** Identity of the logged-in browser session; null before the picker step. */
export function currentIdentity(req: FastifyRequest): Identity | null {
  return sessionFor(req)?.identity ?? null;
}

/** Identity of an MCP request authenticated via `Authorization: Bearer <haman|ali>:<personal-password>`. */
export function mcpIdentityFor(req: FastifyRequest): Identity | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  const sep = token.indexOf(":");
  if (sep === -1) return null;
  const identity = asIdentity(token.slice(0, sep));
  if (!identity) return null;
  return verifyIdentityPassword(identity, token.slice(sep + 1)) ? identity : null;
}

const PUBLIC_PATHS = new Set(["/login", "/favicon.ico"]);
const PUBLIC_PREFIXES = ["/assets/"];

function isPublicPath(url: string): boolean {
  const p = url.split("?")[0] ?? url;
  if (PUBLIC_PATHS.has(p)) return true;
  return PUBLIC_PREFIXES.some((prefix) => p.startsWith(prefix));
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCookie);
  await app.register(fastifyFormbody);

  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    if (isPublicPath(req.url)) return;

    if (req.url.startsWith("/mcp")) {
      if (mcpIdentityFor(req)) return;
      return reply
        .code(401)
        .send({ error: "unauthorized: pass Authorization: Bearer <haman|ali>:<your-personal-password>" });
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

  app.get<{ Querystring: { next?: string; error?: string } }>("/login", async (req, reply) => {
    if (sessionFor(req)?.identity) return reply.redirect("/");
    reply.type("text/html");
    return loginPage(req.query.next ?? "/", req.query.error === "1");
  });

  app.post<{ Body: { password?: string; next?: string } }>("/login", async (req, reply) => {
    const next = req.body?.next || "/";
    if (req.body?.password !== SITE_PASSWORD) {
      return reply.redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
    }
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, {});
    reply.setCookie(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
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

      if (!claimed) {
        if (password.length < 4) {
          return reply.redirect(`/pick/${who}?error=${encodeURIComponent("Password must be at least 4 characters.")}`);
        }
        if (password !== req.body?.confirm) {
          return reply.redirect(`/pick/${who}?error=${encodeURIComponent("Passwords don't match.")}`);
        }
        claimIdentity(who, password);
      } else if (!verifyIdentityPassword(who, password)) {
        return reply.redirect(`/pick/${who}?error=${encodeURIComponent("Wrong password.")}`);
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
