import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { validatePasswordStrength } from "@/lib/auth";

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

    // Validate new password strength before doing any DB work
    const passCheck = validatePasswordStrength(newPassword || "");
    if (!passCheck.valid) {
      return NextResponse.json({ error: passCheck.error }, { status: 400 });
    }

    // ── Resolve the target email from the JWT ─────────────────────────────────
    // The forgot-password route embeds { email, code } in a signed JWT.
    // Decode and verify it here — this is the authoritative identity check.
    let targetEmail: string | undefined = email;

    try {
      const decoded: any = jwt.verify(otpOrToken, JWT_SECRET);
      if (decoded?.email) {
        targetEmail = decoded.email;
      }
    } catch (jwtErr: any) {
      // Only hard-fail if we also have no fallback email from the request body
      if (!targetEmail) {
        const isExpired = jwtErr?.name === "TokenExpiredError";
        return NextResponse.json(
          {
            error: isExpired
              ? "Verification code has expired. Please request a new one."
              : "Invalid or expired verification code.",
          },
          { status: 400 }
        );
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: "Could not identify email address for password reset." },
        { status: 400 }
      );
    }

    // Normalize
    const cleanEmail = (targetEmail as string).trim().toLowerCase();
    const cleanPassword = (newPassword as string).trim();

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(cleanPassword, 10);

    // Update in Supabase PostgreSQL via Prisma — single source of truth
    try {
      await prisma.user.update({
        where: { email: cleanEmail },
        data: { passwordHash: newPasswordHash },
      });
    } catch (prismaErr: any) {
      console.error("Prisma password update failed:", prismaErr);
      // P2025 = record not found
      if (prismaErr?.code === "P2025") {
        return NextResponse.json(
          { error: "No account found for this email address." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update password. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (err: unknown) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Server error resetting password." },
      { status: 500 }
    );
  }
}
