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
    const { token, otp, code, newPassword, email } = body;
    const otpOrToken = (token || otp || code || "").toString().trim();

    if (!otpOrToken) {
      return NextResponse.json(
        { error: "Verification code or reset token is required." },
        { status: 400 }
      );
    }

    const passCheck = validatePasswordStrength(newPassword || "");
    if (!passCheck.valid) {
      return NextResponse.json({ error: passCheck.error }, { status: 400 });
    }

    let targetEmail: string | undefined = email;

    // 1. Check 6-digit OTP in db store
    const dbVerification = verifyResetToken(otpOrToken);
    if (dbVerification.valid && dbVerification.email) {
      targetEmail = dbVerification.email;
    } else {
      // 2. Fallback check as JWT token
      try {
        const decoded: any = jwt.verify(otpOrToken, JWT_SECRET);
        if (decoded?.email) {
          targetEmail = decoded.email;
        }
      } catch {
        if (!targetEmail) {
          return NextResponse.json(
            { error: "Invalid or expired 6-digit verification code." },
            { status: 400 }
          );
        }
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: "Could not identify email address for password reset." },
        { status: 400 }
      );
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
      console.warn("Prisma user update skipped/failed (fallback db will be updated):", prismaErr);
    }

    // Update user password in db.json fallback store
    updateUserPassword(targetEmail, newPasswordHash);

    // Consume the token / OTP code
    consumeResetToken(otpOrToken);

    return NextResponse.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (err: unknown) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Server error resetting password." }, { status: 500 });
  }
}
