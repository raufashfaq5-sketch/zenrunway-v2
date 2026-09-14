import { NextRequest, NextResponse } from "next/server";
import { verifyResetToken, consumeResetToken, updateUserPassword } from "@/lib/db";
import { hashPassword, validatePasswordStrength, verifyJwtToken } from "@/lib/auth";

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

    // Verify JWT signature & expiration
    const jwtPayload = verifyJwtToken(token);
    if (!jwtPayload) {
      return NextResponse.json({ error: "Invalid or expired password reset token." }, { status: 400 });
    }

    // Verify token record in database
    const dbVerification = verifyResetToken(token);
    if (!dbVerification.valid || !dbVerification.email) {
      return NextResponse.json({ error: "Reset token is invalid or has already been used." }, { status: 400 });
    }

    // Hash new password & update DB
    const newPasswordHash = await hashPassword(newPassword);
    const updated = updateUserPassword(dbVerification.email, newPasswordHash);

    if (!updated) {
      return NextResponse.json({ error: "Failed to update user password." }, { status: 500 });
    }

    // Consume the token so it cannot be re-used
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
