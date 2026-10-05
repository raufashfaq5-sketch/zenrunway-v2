import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { verifyResetToken, consumeResetToken, updateUserPassword } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const JWT_SECRET =
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "zenrunway-secret-key-2026";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token) {
      return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
    }

    const passCheck = validatePasswordStrength(newPassword || "");
    if (!passCheck.valid) {
      return NextResponse.json({ error: passCheck.error }, { status: 400 });
    }

    // Verify incoming JWT token using exact fallback secret key
    let decoded: any = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      console.error("JWT verification error:", jwtErr);
      return NextResponse.json({ error: "Invalid or expired password reset token." }, { status: 400 });
    }

    const targetEmail = decoded?.email;
    if (!targetEmail) {
      return NextResponse.json({ error: "Invalid token payload: email missing." }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user password in Prisma database if present
    try {
      await prisma.user.update({
        where: { email: targetEmail.toLowerCase() },
        data: { passwordHash: newPasswordHash },
      });
    } catch (prismaErr) {
      console.warn("Prisma user update skipped or failed (fallback db will be updated):", prismaErr);
    }

    // Update user password in db.json fallback store
    updateUserPassword(targetEmail, newPasswordHash);

    // Consume the token if recorded
    consumeResetToken(token);

    return NextResponse.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (err: unknown) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Server error resetting password." }, { status: 500 });
  }
}
