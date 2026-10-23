/**
 * lib/db.ts
 * All user-persistence operations backed by Prisma + Supabase PostgreSQL.
 * The local db.json / fs fallback has been removed entirely.
 */
import { prisma } from "@/lib/prisma";

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string; // ISO string for API compatibility
}

// ── User helpers ─────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function createUser(
  email: string,
  passwordHash: string
): Promise<UserRecord> {
  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      passwordHash,
    },
  });
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function updateUserPassword(
  email: string,
  newPasswordHash: string
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { email: email.trim().toLowerCase() },
      data: { passwordHash: newPasswordHash },
    });
    return true;
  } catch {
    return false;
  }
}

// ── Reset-token helpers (stateless JWT — no DB storage needed) ───────────────
// These are kept as no-ops so that any remaining import sites compile cleanly.
// The actual OTP/reset flow is stateless (JWT signed in forgot-password).

export function saveResetToken(
  _email: string,
  _token: string,
  _expiresInMs?: number
): void {
  // Stateless JWT flow — nothing to persist.
}

export function verifyResetToken(_token: string): { valid: boolean; email?: string } {
  // Stateless — verification is done by jwt.verify in the route itself.
  return { valid: false };
}

export function consumeResetToken(_token: string): void {
  // Stateless JWT flow — nothing to consume.
}
