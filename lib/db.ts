import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface ResetTokenRecord {
  token: string;
  email: string;
  expiresAt: number; // Unix timestamp in ms
}

interface DatabaseSchema {
  users: UserRecord[];
  resetTokens: ResetTokenRecord[];
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

function ensureDbExists(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    // Pre-seed a default admin user: admin@zenrunway.io / Password123!
    const defaultSalt = bcrypt.genSaltSync(10);
    const defaultHash = bcrypt.hashSync("Password123!", defaultSalt);

    const initialData: DatabaseSchema = {
      users: [
        {
          id: "usr-admin-1",
          email: "admin@zenrunway.io",
          passwordHash: defaultHash,
          createdAt: new Date().toISOString(),
        },
      ],
      resetTokens: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!Array.isArray(parsed.users)) parsed.users = [];
    if (!Array.isArray(parsed.resetTokens)) parsed.resetTokens = [];
    return parsed;
  } catch (err) {
    console.error("Error reading db.json, re-initializing:", err);
    const fallback: DatabaseSchema = { users: [], resetTokens: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), "utf-8");
    return fallback;
  }
}

function writeDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db.json:", err);
  }
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const db = ensureDbExists();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createUser(email: string, passwordHash: string): UserRecord {
  const db = ensureDbExists();
  const newUser: UserRecord = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

export function updateUserPassword(email: string, newPasswordHash: string): boolean {
  const db = ensureDbExists();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return false;
  user.passwordHash = newPasswordHash;
  writeDb(db);
  return true;
}

export function saveResetToken(email: string, token: string, expiresInMs: number = 15 * 60 * 1000): void {
  const db = ensureDbExists();
  // Remove existing tokens for this email
  db.resetTokens = db.resetTokens.filter((t) => t.email.toLowerCase() !== email.toLowerCase());
  db.resetTokens.push({
    token,
    email: email.toLowerCase(),
    expiresAt: Date.now() + expiresInMs,
  });
  writeDb(db);
}

export function verifyResetToken(token: string): { valid: boolean; email?: string } {
  const db = ensureDbExists();
  const found = db.resetTokens.find((t) => t.token === token);
  if (!found) return { valid: false };

  if (Date.now() > found.expiresAt) {
    // Expired - clean it up
    db.resetTokens = db.resetTokens.filter((t) => t.token !== token);
    writeDb(db);
    return { valid: false };
  }

  return { valid: true, email: found.email };
}

export function consumeResetToken(token: string): void {
  const db = ensureDbExists();
  db.resetTokens = db.resetTokens.filter((t) => t.token !== token);
  writeDb(db);
}
