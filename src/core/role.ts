/**
 * The two ways to be signed in.
 *   admin — the owner: may create, upload, edit, move, rename and remove any doc or folder.
 *   guest — read-only: may browse, read and search, nothing else.
 */
export type Role = "admin" | "guest";

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", guest: "Guest" };

export function asRole(v: unknown): Role | null {
  return v === "admin" || v === "guest" ? v : null;
}

export function canWrite(role: Role): boolean {
  return role === "admin";
}
